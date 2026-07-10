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
