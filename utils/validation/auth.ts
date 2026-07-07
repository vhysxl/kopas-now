import * as v from "valibot";
import { normalizePhone } from "@/utils/helper/normalizePhone";
import { ERROR_MESSAGES } from "@/utils/errors";

const isValidEmail = (val: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
};

const isValidPhone = (val: string) => {
  const cleaned = normalizePhone(val);
  return cleaned.length >= 9 && cleaned.length <= 15;
};

export const SignUpSchema = v.object({
  nama: v.pipe(
    v.string("Nama lengkap harus berupa teks."),
    v.trim(),
    v.nonEmpty("Nama lengkap wajib diisi.")
  ),
  identifier: v.pipe(
    v.string("Email atau Nomor HP harus berupa teks."),
    v.trim(),
    v.nonEmpty("Email atau Nomor HP wajib diisi."),
    v.check((val) => {
      if (val.includes("@")) {
        return isValidEmail(val);
      } else {
        return isValidPhone(val);
      }
    }, "Format Email atau Nomor HP tidak valid. Masukkan email yang benar atau nomor HP (misal: 0812xxxx).")
  ),
  password: v.pipe(
    v.string("Password harus berupa teks."),
    v.nonEmpty("Password wajib diisi."),
    v.minLength(6, ERROR_MESSAGES.PASSWORD_TOO_SHORT)
  ),
});

export const SignInSchema = v.object({
  identifier: v.pipe(
    v.string("Email atau Nomor HP harus berupa teks."),
    v.trim(),
    v.nonEmpty("Email/Nomor HP wajib diisi.")
  ),
  password: v.pipe(
    v.string("Password harus berupa teks."),
    v.nonEmpty("Password wajib diisi.")
  ),
});

export type SignUpInput = v.InferInput<typeof SignUpSchema>;
export type SignInInput = v.InferInput<typeof SignInSchema>;
