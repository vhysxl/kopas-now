"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export interface KopasnowStaff {
  id_staff: string;
  koperasi_id: string;
  nama_staff: string;
  role: string | null;
  nomor_telepon: string;
}

/**
 * Fetch staff members for a koperasi.
 * Returns the first staff found (typically the admin/owner) for WhatsApp contact.
 */
export async function getStaffByKoperasiId(koperasiId: string): Promise<{
  data: KopasnowStaff | null;
  error: string | null;
}> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase
      .from("kopasnow_staff")
      .select("id_staff, koperasi_id, nama_staff, role, nomor_telepon")
      .eq("koperasi_id", koperasiId)
      .limit(1)
      .single();

    if (error) {
      // PGRST116 = no rows found — not a real error, just no staff registered
      if (error.code === "PGRST116") {
        return { data: null, error: null };
      }
      console.error("Error fetching staff:", error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    console.error("Unexpected error in getStaffByKoperasiId:", err);
    return { data: null, error: "Gagal memuat data staff koperasi" };
  }
}
