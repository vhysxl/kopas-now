"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export interface CustomerRecord {
  id: string;
  user_id: string;
  nama: string;
  email: string | null;
  phone: string | null;
  created_at?: string;
}

/**
 * Ambil profil pelanggan milik sesi yang sedang aktif.
 *
 * Wajib lewat admin client: tabel `kopasnow_customers` mengaktifkan RLS tetapi
 * hanya memiliki policy INSERT — tanpa policy SELECT, query dari client anon
 * maupun authenticated selalu mengembalikan nol baris tanpa pesan error.
 * (Perbaikan permanennya ada di migrations/003_customers_select_policy.sql,
 * dijadwalkan pada fase backend.)
 */
export async function getCurrentCustomer(): Promise<CustomerRecord | null> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("kopasnow_customers")
    .select("id, user_id, nama, email, phone, created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("getCurrentCustomer error:", error);
    return null;
  }

  return data;
}

/**
 * Update profil pelanggan yang sedang aktif.
 */
export async function updateCustomerProfile(data: { nama: string; email: string }) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Tidak ada sesi yang aktif");

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("kopasnow_customers")
    .update({ 
      nama: data.nama, 
      email: data.email || null 
    })
    .eq("user_id", user.id);

  if (error) {
    console.error("updateCustomerProfile error:", error);
    throw new Error(error.message);
  }
}
