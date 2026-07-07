export const ERROR_MESSAGES = {
  ALL_FIELDS_REQUIRED: "Semua kolom (Nama, Email/No HP, Password) wajib diisi.",
  PASSWORD_TOO_SHORT: "Password minimal harus 6 karakter.",
  INVALID_PHONE_FORMAT: "Format nomor HP tidak valid. Masukkan nomor HP yang benar (misal: 0812xxxx).",
  EMAIL_ALREADY_REGISTERED: "Email sudah terdaftar di koperasi kami.",
  PHONE_ALREADY_REGISTERED: "Nomor HP sudah terdaftar di koperasi kami.",
  SIGNUP_FAILED: "Gagal mendaftarkan user. Silakan coba lagi.",
  PROFILE_CREATION_FAILED: "Pendaftaran berhasil tetapi terjadi kendala saat menyimpan profil. Silakan hubungi admin.",
  LOGIN_FIELDS_REQUIRED: "Email/Nomor HP dan Password wajib diisi.",
  PHONE_NOT_REGISTERED: "Nomor HP belum terdaftar. Silakan daftar terlebih dahulu.",
  INVALID_CREDENTIALS: "Email/Nomor HP atau password salah. Silakan periksa kembali.",
  SYSTEM_ERROR: "Terjadi kesalahan sistem. Silakan coba lagi nanti.",
  RATE_LIMIT_EXCEEDED: "Terlalu banyak permintaan pendaftaran. Silakan coba beberapa saat lagi.",
  RLS_VIOLATION: "Sistem sedang mengalami kendala otorisasi database. Silakan hubungi admin koperasi.",
};

/**
 * Mask raw database or network errors to prevent leaking stack traces or technical details.
 * Logs the actual error internally to the server console, but returns a clean, safe message.
 */
export function maskError(error: any, fallbackMessage: string = ERROR_MESSAGES.SYSTEM_ERROR): string {
  if (!error) {
    return fallbackMessage;
  }

  // Log the actual error internally with full detail for developer debugging
  console.error("[INTERNAL AUTH ERROR DETECTED]:", {
    message: error.message || error,
    code: error.code || null,
    details: error.details || null,
    hint: error.hint || null,
    stack: error.stack || null,
  });

  // Handle Postgres RLS policy violations (Code 42501)
  if (error.code === "42501" || (error.message && error.message.toLowerCase().includes("row-level security"))) {
    return ERROR_MESSAGES.RLS_VIOLATION;
  }

  // Handle Supabase Auth / Rate limits / Invalid credentials
  if (error.message) {
    const msg = error.message.toLowerCase();
    if (msg.includes("rate limit")) {
      return ERROR_MESSAGES.RATE_LIMIT_EXCEEDED;
    }
    if (msg.includes("invalid login credentials")) {
      return ERROR_MESSAGES.INVALID_CREDENTIALS;
    }
    if (msg.includes("already registered") || msg.includes("already exists")) {
      return "Akun sudah terdaftar.";
    }
  }

  return fallbackMessage;
}
