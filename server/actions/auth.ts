"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ERROR_MESSAGES, maskError } from "@/utils/errors";
import { normalizePhone } from "@/utils/helper/normalizePhone";
import * as v from "valibot";
import { SignUpSchema, SignInSchema } from "@/utils/validation/auth";
import { sendOTPWhatsApp } from "@/utils/fonnte/whatsapp";

export type ActionResponse = {
  error?: string;
  success?: boolean;
  message?: string;
};

export async function signUpAction(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const nama = formData.get("nama") as string;
  const identifier = formData.get("identifier") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  // Validate using Valibot
  const result = v.safeParse(SignUpSchema, { nama, identifier, password, confirmPassword });
  if (!result.success) {
    return { error: result.issues[0].message };
  }

  const validated = result.output;
  const isEmail = validated.identifier.includes("@");
  const emailValue = isEmail ? validated.identifier.toLowerCase() : "";
  const normalizedPhone = isEmail ? null : normalizePhone(validated.identifier);

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Check if already exists in kopasnow_customers to prevent duplicate profile
  try {
    let query = supabase.from("kopasnow_customers").select("*");
    if (isEmail) {
      query = query.eq("email", emailValue);
    } else {
      query = query.eq("phone", normalizedPhone);
    }

    const { data: existing, error: checkError } = await query.maybeSingle();

    if (checkError) {
      return { error: maskError(checkError) };
    }

    if (existing) {
      return {
        error: isEmail
          ? ERROR_MESSAGES.EMAIL_ALREADY_REGISTERED
          : ERROR_MESSAGES.PHONE_ALREADY_REGISTERED,
      };
    }
  } catch (err) {
    return { error: maskError(err) };
  }

  const authEmail = isEmail ? emailValue : `${normalizedPhone}@phone.kopasnow.com`;

  // Perform Supabase Auth SignUp
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: authEmail,
    password: validated.password,
    options: {
      data: {
        nama: validated.nama,
        phone: isEmail ? null : normalizedPhone,
      },
    },
  });

  if (authError) {
    return { error: maskError(authError, ERROR_MESSAGES.SIGNUP_FAILED) };
  }

  const user = authData.user;
  if (!user) {
    return { error: ERROR_MESSAGES.SIGNUP_FAILED };
  }

  // Set the session on the server client if available so subsequent insert is authenticated
  if (authData.session) {
    await supabase.auth.setSession(authData.session);
  }

  // Insert profile into kopasnow_customers
  const { error: insertError } = await supabase.from("kopasnow_customers").insert({
    user_id: user.id,
    nama: validated.nama,
    email: isEmail ? emailValue : null,
    phone: isEmail ? null : normalizedPhone,
  });

  if (insertError) {
    return { error: maskError(insertError, ERROR_MESSAGES.PROFILE_CREATION_FAILED) };
  }

  // Return success to allow client-side handling and smooth transition
  return { success: true };
}

export async function signInAction(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const identifier = formData.get("identifier") as string;
  const password = formData.get("password") as string;

  // Validate using Valibot
  const result = v.safeParse(SignInSchema, { identifier, password });
  if (!result.success) {
    return { error: result.issues[0].message };
  }

  const validated = result.output;
  const isEmail = validated.identifier.includes("@");
  let loginEmail = "";

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  if (isEmail) {
    loginEmail = validated.identifier.toLowerCase();
  } else {
    const normalizedPhone = normalizePhone(validated.identifier);
    // Find associated user in kopasnow_customers
    const { data: customer, error: dbError } = await supabase
      .from("kopasnow_customers")
      .select("*")
      .eq("phone", normalizedPhone)
      .maybeSingle();

    if (dbError) {
      return { error: maskError(dbError) };
    }

    if (!customer) {
      return { error: ERROR_MESSAGES.PHONE_NOT_REGISTERED };
    }

    // Use their registered email (could be dummy email or actual email if linked)
    loginEmail = customer.email || `${normalizedPhone}@phone.kopasnow.com`;
  }

  // Perform Supabase Auth SignIn
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: loginEmail,
    password: validated.password,
  });

  if (authError) {
    return { error: maskError(authError, ERROR_MESSAGES.INVALID_CREDENTIALS) };
  }

  // Return success to allow client-side handling and smooth transition
  return { success: true };
}

export async function signOutAction(): Promise<void> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  await supabase.auth.signOut();
  redirect("/auth");
}

/**
 * Generate a 6-digit OTP code
 */
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export type OtpLoginResponse = ActionResponse & {
  /** true jika nomor belum terdaftar — UI akan meminta nama untuk pendaftaran */
  isNewUser?: boolean;
};

/**
 * Login/daftar tanpa kata sandi — langkah 1: kirim kode OTP lewat WhatsApp.
 * Memakai infra yang sama dengan reset password (tabel kopasnow_otp + Fonnte),
 * dengan purpose "login". Nomor yang belum terdaftar tetap dikirimi kode
 * (pendaftaran terjadi saat verifikasi).
 */
export async function requestLoginOTP(
  prevState: OtpLoginResponse | null,
  formData: FormData
): Promise<OtpLoginResponse> {
  const phoneInput = formData.get("phone") as string;

  if (!phoneInput || phoneInput.trim() === "") {
    return { error: "Tolong isi nomor HP Anda dulu." };
  }

  const normalizedPhone = normalizePhone(phoneInput);
  if (!/^08\d{8,12}$/.test(normalizedPhone)) {
    return { error: "Nomor HP belum benar. Contoh yang benar: 0812xxxxxxxx" };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: customer, error: dbError } = await supabase
    .from("kopasnow_customers")
    .select("id")
    .eq("phone", normalizedPhone)
    .maybeSingle();

  if (dbError) {
    return { error: maskError(dbError) };
  }

  const otpCode = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // berlaku 5 menit

  const { error: insertError } = await supabase.from("kopasnow_otp").insert({
    phone: normalizedPhone,
    otp_code: otpCode,
    purpose: "login",
    expires_at: expiresAt.toISOString(),
  });

  if (insertError) {
    return { error: maskError(insertError, "Kode belum bisa dibuat. Silakan coba lagi.") };
  }

  // SEMENTARA (mode uji coba UI): FONNTE_API_KEY belum disambungkan di fase ini,
  // jadi kode ditampilkan langsung di layar alih-alih dikirim ke WhatsApp asli.
  // Kode tetap tersimpan sungguhan di kopasnow_otp sehingga verifyLoginOTP tetap
  // berjalan normal. Hapus blok ini setelah FONNTE_API_KEY dikonfigurasi di fase backend.
  if (!process.env.FONNTE_API_KEY) {
    return {
      success: true,
      message: `[MODE UJI COBA] WhatsApp belum disambungkan. Kode OTP Anda: ${otpCode}`,
      isNewUser: !customer,
    };
  }

  try {
    await sendOTPWhatsApp(normalizedPhone, otpCode);
    return {
      success: true,
      message: "Kode sudah dikirim ke WhatsApp Anda.",
      isNewUser: !customer,
    };
  } catch (error) {
    console.error("Failed to send login OTP via WhatsApp:", error);
    return {
      error:
        "Kode belum bisa dikirim ke WhatsApp. Periksa nomor Anda, lalu coba lagi.",
    };
  }
}

/**
 * Login/daftar tanpa kata sandi — langkah 2: cocokkan kode OTP lalu buat sesi.
 * Untuk nomor baru, akun dibuat otomatis (butuh nama). Sesi dibuat lewat
 * admin generateLink(magiclink) + verifyOtp(token_hash) tanpa kata sandi.
 */
export async function verifyLoginOTP(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const phoneInput = formData.get("phone") as string;
  const otpCode = formData.get("otp") as string;
  const nama = ((formData.get("nama") as string) || "").trim();

  if (!phoneInput || !otpCode) {
    return { error: "Tolong isi kode yang dikirim ke WhatsApp Anda." };
  }

  const normalizedPhone = normalizePhone(phoneInput);
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Cocokkan kode OTP (belum dipakai, belum kadaluarsa)
  const { data: otpRecord, error: otpError } = await supabase
    .from("kopasnow_otp")
    .select("*")
    .eq("phone", normalizedPhone)
    .eq("otp_code", otpCode)
    .eq("purpose", "login")
    .eq("is_used", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .maybeSingle();

  if (otpError) {
    return { error: maskError(otpError) };
  }

  if (!otpRecord) {
    return { error: "Kode salah atau sudah kadaluarsa. Coba kirim ulang kode." };
  }

  const { error: markUsedError } = await supabase
    .from("kopasnow_otp")
    .update({ is_used: true })
    .eq("id", otpRecord.id);

  if (markUsedError) {
    return { error: maskError(markUsedError) };
  }

  const adminClient = createAdminClient();

  // Cari pelanggan; kalau belum ada, daftarkan otomatis
  const { data: customer, error: customerError } = await adminClient
    .from("kopasnow_customers")
    .select("*")
    .eq("phone", normalizedPhone)
    .maybeSingle();

  if (customerError) {
    return { error: maskError(customerError) };
  }

  let loginEmail: string;

  if (customer) {
    loginEmail = customer.email || `${normalizedPhone}@phone.kopasnow.com`;
  } else {
    if (nama.length < 2) {
      return { error: "Tolong isi nama lengkap Anda untuk mendaftar." };
    }

    loginEmail = `${normalizedPhone}@phone.kopasnow.com`;
    const { data: created, error: createError } =
      await adminClient.auth.admin.createUser({
        email: loginEmail,
        password: crypto.randomUUID(), // akun tanpa sandi — masuk selalu lewat OTP
        email_confirm: true,
        user_metadata: { nama, phone: normalizedPhone },
      });

    if (createError || !created.user) {
      return { error: maskError(createError, ERROR_MESSAGES.SIGNUP_FAILED) };
    }

    const { error: profileError } = await adminClient
      .from("kopasnow_customers")
      .insert({
        user_id: created.user.id,
        nama,
        email: null,
        phone: normalizedPhone,
      });

    if (profileError) {
      return { error: maskError(profileError, ERROR_MESSAGES.PROFILE_CREATION_FAILED) };
    }
  }

  // Buat sesi tanpa kata sandi: magic link di-generate lalu diverifikasi
  // langsung di server sehingga cookie sesi ikut ter-set
  const { data: linkData, error: linkError } =
    await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: loginEmail,
    });

  if (linkError || !linkData.properties?.hashed_token) {
    return { error: maskError(linkError, "Gagal masuk. Silakan coba lagi.") };
  }

  const { error: sessionError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: linkData.properties.hashed_token,
  });

  if (sessionError) {
    return { error: maskError(sessionError, "Gagal masuk. Silakan coba lagi.") };
  }

  return { success: true, message: "Berhasil masuk!" };
}

/**
 * Request OTP for password reset
 */
export async function requestPasswordResetOTP(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const identifier = formData.get("identifier") as string;

  if (!identifier || identifier.trim() === "") {
    return { error: "Nomor telepon wajib diisi" };
  }

  // Only support phone number for OTP via WhatsApp
  if (identifier.includes("@")) {
    return { error: "Reset password via OTP hanya tersedia untuk nomor telepon" };
  }

  const normalizedPhone = normalizePhone(identifier);
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Check if phone exists in kopasnow_customers
  const { data: customer, error: dbError } = await supabase
    .from("kopasnow_customers")
.select("*")
    .eq("phone", normalizedPhone)
    .maybeSingle();

  if (dbError) {
    return { error: maskError(dbError) };
  }

  if (!customer) {
    return { error: ERROR_MESSAGES.PHONE_NOT_REGISTERED };
  }

  // Generate OTP
const otpCode = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

  // Save OTP to database
  const { error: insertError } = await supabase.from("kopasnow_otp").insert({
    phone: normalizedPhone,
    otp_code: otpCode,
    purpose: "password_reset",
    expires_at: expiresAt.toISOString(),
  });

  if (insertError) {
    return { error: maskError(insertError, "Gagal membuat OTP. Silakan coba lagi.") };
  }

  // Send OTP via WhatsApp
  try {
    await sendOTPWhatsApp(normalizedPhone, otpCode);
    return {
      success: true,
      message: "Kode OTP telah dikirim ke WhatsApp Anda",
    };
  } catch (error) {
    console.error("Failed to send OTP via WhatsApp:", error);
    return {
      error: "Gagal mengirim OTP via WhatsApp. Silakan coba lagi.",
    };
  }
}

/**
 * Verify OTP code
 */
export async function verifyOTP(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const identifier = formData.get("identifier") as string;
  const otpCode = formData.get("otp") as string;

  if (!identifier || !otpCode) {
    return { error: "Nomor telepon dan kode OTP wajib diisi" };
  }

  const normalizedPhone = normalizePhone(identifier);
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Find valid OTP
  const { data: otpRecord, error: otpError } = await supabase
    .from("kopasnow_otp")
    .select("*")
    .eq("phone", normalizedPhone)
    .eq("otp_code", otpCode)
  .eq("purpose", "password_reset")
    .eq("is_used", false)
    .gt("expires_at", new Date().toISOString())
  .order("created_at", { ascending: false })
 .maybeSingle();

  if (otpError) {
    return { error: maskError(otpError) };
  }

  if (!otpRecord) {
    return { error: "Kode OTP tidak valid atau sudah kadaluarsa" };
  }

  // Mark OTP as used
  const { error: updateError } = await supabase
    .from("kopasnow_otp")
  .update({ is_used: true })
    .eq("id", otpRecord.id);

  if (updateError) {
    return { error: maskError(updateError) };
  }

  return {
    success: true,
    message: "OTP berhasil diverifikasi",
  };
}

/**
 * Reset password after OTP verification
 */
export async function resetPassword(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const identifier = formData.get("identifier") as string;
  const otpCode = formData.get("otp") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!identifier || !otpCode || !newPassword || !confirmPassword) {
    return { error: "Semua field wajib diisi" };
  }

  if (newPassword !== confirmPassword) {
  return { error: "Password dan konfirmasi password tidak cocok" };
  }

  if (newPassword.length < 6) {
    return { error: "Password minimal 6 karakter" };
  }

  const normalizedPhone = normalizePhone(identifier);
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Verify OTP is valid and used
  const { data: otpRecord, error: otpError } = await supabase
    .from("kopasnow_otp")
    .select("*")
    .eq("phone", normalizedPhone)
    .eq("otp_code", otpCode)
    .eq("purpose", "password_reset")
    .eq("is_used", true)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .maybeSingle();

  if (otpError) {
    return { error: maskError(otpError) };
  }

  if (!otpRecord) {
 return { error: "Sesi reset password tidak valid. Silakan mulai ulang proses." };
  }

  // Get customer record
  const { data: customer, error: customerError } = await supabase
    .from("kopasnow_customers")
    .select("*")
    .eq("phone", normalizedPhone)
    .maybeSingle();

  if (customerError || !customer) {
  return { error: "Pengguna tidak ditemukan" };
  }

  // Update password in Supabase Auth using admin client
  try {
  const adminClient = createAdminClient();
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      customer.user_id,
{ password: newPassword }
    );

    if (updateError) {
      return { error: maskError(updateError, "Gagal mengubah password. Silakan coba lagi.") };
    }
  } catch (error) {
    console.error("Failed to update password:", error);
    return { error: "Gagal mengubah password. Silakan coba lagi." };
  }

  return {
    success: true,
    message: "Password berhasil diubah. Silakan login dengan password baru Anda.",
  };
}
