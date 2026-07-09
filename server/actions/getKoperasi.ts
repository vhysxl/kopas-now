"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { parseWKBHex, type KoperasiLocation } from "@/utils/helper/geo";

/**
 * Fetch all active koperasi with parsed lat/lng coordinates.
 * Decodes PostGIS EWKB hex from the `lokasi` column server-side.
 */
export async function getKoperasiList(): Promise<{
  data: KoperasiLocation[] | null;
  error: string | null;
}> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase
      .from("kopasnow_koperasi")
      .select("id, nama, kode_koperasi, lokasi, alamat, admin_phone, status, created_at")
      .eq("status", "active")
      .order("nama");

    console.log("[getKoperasiList] query result:", { dataCount: data?.length ?? 0, error });

    if (error) {
      console.error("Error fetching koperasi:", error);
      return { data: null, error: error.message };
    }

    if (!data || data.length === 0) {
      console.warn("[getKoperasiList] No koperasi returned — possible RLS issue");
      return { data: [], error: null };
    }

    // Parse WKB hex to lat/lng for each koperasi
    const parsed: KoperasiLocation[] = data.map((row) => {
      const [lat, lng] = parseWKBHex(row.lokasi as string);
      return {
        id: row.id,
        nama: row.nama,
        kode_koperasi: row.kode_koperasi,
        alamat: row.alamat,
        admin_phone: row.admin_phone,
        status: row.status,
        lat,
        lng,
        created_at: row.created_at,
      };
    });

    return { data: parsed, error: null };
  } catch (err) {
    console.error("Unexpected error in getKoperasiList:", err);
    return { data: null, error: "Gagal memuat data koperasi" };
  }
}

/**
 * Fetch a single koperasi by ID.
 */
export async function getKoperasiById(id: string): Promise<{
  data: KoperasiLocation | null;
  error: string | null;
}> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase
      .from("kopasnow_koperasi")
      .select("id, nama, kode_koperasi, lokasi, alamat, admin_phone, status, created_at")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching koperasi by id:", error);
      return { data: null, error: error.message };
    }

    if (!data) {
      return { data: null, error: "Koperasi tidak ditemukan" };
    }

    const [lat, lng] = parseWKBHex(data.lokasi as string);
    const parsed: KoperasiLocation = {
      id: data.id,
      nama: data.nama,
      kode_koperasi: data.kode_koperasi,
      alamat: data.alamat,
      admin_phone: data.admin_phone,
      status: data.status,
      lat,
      lng,
      created_at: data.created_at,
    };

    return { data: parsed, error: null };
  } catch (err) {
    console.error("Unexpected error in getKoperasiById:", err);
    return { data: null, error: "Gagal memuat data koperasi" };
  }
}
