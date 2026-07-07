"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ERROR_MESSAGES, maskError } from "@/utils/errors";
import { normalizePhone } from "@/utils/helper/normalizePhone";
import * as v from "valibot";
import { SignUpSchema, SignInSchema } from "@/utils/validation/auth";

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
  const normalizedPhone = isEmail ? "" : normalizePhone(validated.identifier);

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
        phone: isEmail ? "" : normalizedPhone,
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
    phone: isEmail ? "" : normalizedPhone,
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
