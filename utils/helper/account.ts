import type { User } from "@supabase/supabase-js";
import type { Customer } from "@/store/useUserStore";

/**
 * Akun yang mendaftar lewat nomor HP tidak punya email sungguhan.
 * Supabase Auth mewajibkan email, jadi dibuatkan alamat sintetis
 * `<nomor>@phone.kopasnow.com` yang tidak boleh pernah tampil ke pengguna.
 */
export const PHONE_EMAIL_DOMAIN = "@phone.kopasnow.com";

export function isSyntheticEmail(email: string | null | undefined): boolean {
  return !!email && email.endsWith(PHONE_EMAIL_DOMAIN);
}

/** Email asli pengguna, atau null bila akunnya berbasis nomor HP. */
export function realEmail(user: User | null, customer: Customer | null): string | null {
  if (customer?.email) return customer.email;
  if (user?.email && !isSyntheticEmail(user.email)) return user.email;
  return null;
}

/** Nomor HP pengguna, dipulihkan dari email sintetis bila profil belum termuat. */
export function displayPhone(user: User | null, customer: Customer | null): string | null {
  if (customer?.phone) return customer.phone;
  const metaPhone = user?.user_metadata?.phone;
  if (typeof metaPhone === "string" && metaPhone) return metaPhone;
  if (isSyntheticEmail(user?.email)) {
    return user!.email!.slice(0, -PHONE_EMAIL_DOMAIN.length);
  }
  return null;
}

/**
 * Nama yang aman ditampilkan. Tidak pernah memakai bagian depan email,
 * karena untuk akun berbasis HP isinya adalah nomor telepon.
 */
export function displayName(user: User | null, customer: Customer | null): string {
  if (customer?.nama) return customer.nama;

  const metaName = user?.user_metadata?.nama;
  if (typeof metaName === "string" && metaName.trim()) return metaName.trim();

  const email = realEmail(user, customer);
  if (email) return email.split("@")[0];

  return "Anggota";
}
