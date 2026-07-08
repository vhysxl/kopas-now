"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export interface KopasnowProduct {
  id_produk: string;
  koperasi_id: string;
  nama_produk: string;
  deskripsi_produk: string | null;
  harga_produk: string;
  satuan_produk: string;
  stok_tersedia: number;
  foto_url: string | null;
}

export async function getAllActiveProducts(): Promise<{
  data: KopasnowProduct[] | null;
  error: string | null;
}> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase
      .from("kopasnow_products")
      .select("id_produk, koperasi_id, nama_produk, deskripsi_produk, harga_produk, satuan_produk, stok_tersedia, foto_url")
      .eq("is_active", true)
      .order("nama_produk");

    if (error) {
      console.error("Error fetching products:", error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    console.error("Unexpected error in getAllActiveProducts:", err);
    return { data: null, error: "Gagal memuat data produk" };
  }
}

export async function getProductsByKoperasiId(koperasiId: string): Promise<{
  data: KopasnowProduct[] | null;
  error: string | null;
}> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase
      .from("kopasnow_products")
      .select("id_produk, koperasi_id, nama_produk, deskripsi_produk, harga_produk, satuan_produk, stok_tersedia, foto_url")
      .eq("koperasi_id", koperasiId)
      .eq("is_active", true)
      .order("nama_produk");

    if (error) {
      console.error(`Error fetching products for koperasi ${koperasiId}:`, error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    console.error(`Unexpected error in getProductsByKoperasiId for ${koperasiId}:`, err);
    return { data: null, error: "Gagal memuat data produk koperasi" };
  }
}
