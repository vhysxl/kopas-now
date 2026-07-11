"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { parseWKBHex } from "@/utils/helper/geo";

export interface KopasnowProduct {
  id_produk: string;
  koperasi_id: string;
  nama_produk: string;
  deskripsi_produk: string | null;
  harga_produk: string;
  satuan_produk: string;
  stok_tersedia: number;
  foto_url: string | null;
  kategori_produk: string[] | null;
}

/** Produk beserta koperasi pemiliknya, untuk halaman detail produk. */
export interface KopasnowProductWithKoperasi extends KopasnowProduct {
  koperasi: {
    id: string;
    nama: string;
    alamat: string | null;
    lat: number;
    lng: number;
  };
}

export async function getAllActiveProducts(): Promise<{
  data: KopasnowProduct[] | null;
  error: string | null;
}> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // foto_url sengaja tidak diikutkan di sini: sebagian baris menyimpan
    // gambar base64 penuh (~1 MB per baris) langsung di kolom teks, bukan
    // tautan ke object storage. Mengambilnya untuk seluruh daftar produk
    // membuat query ini timeout di Postgres. Foto asli tetap tampil di
    // halaman detail produk lewat getProductById (satu baris saja).
    // TODO(fase backend): pindahkan gambar ke Supabase Storage, simpan
    // hanya URL-nya di foto_url, lalu kolom ini bisa diikutkan lagi di sini.
    const { data, error } = await supabase
      .from("kopasnow_products")
      .select("id_produk, koperasi_id, nama_produk, deskripsi_produk, harga_produk, satuan_produk, stok_tersedia, kategori_produk")
      .eq("is_active", true)
      .order("nama_produk");

    if (error) {
      console.error("Error fetching products:", error);
      return { data: null, error: error.message };
    }

    // foto_url tidak diambil di query (lihat catatan di atas) — isi null
    // dan biarkan UI daftar produk memakai ikon bawaan sebagai gantinya.
    const withPhoto: KopasnowProduct[] = (data ?? []).map((p) => ({
      ...p,
      foto_url: null,
    }));

    return { data: withPhoto, error: null };
  } catch (err) {
    console.error("Unexpected error in getAllActiveProducts:", err);
    return { data: null, error: "Gagal memuat data produk" };
  }
}

/**
 * Ambil satu produk beserta koperasi pemiliknya. Koordinat koperasi ikut
 * dibawa (di-decode dari PostGIS EWKB) supaya halaman produk bisa menampilkan
 * jarak tanpa permintaan tambahan.
 */
export async function getProductById(id: string): Promise<{
  data: KopasnowProductWithKoperasi | null;
  error: string | null;
}> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase
      .from("kopasnow_products")
      .select(
        "id_produk, koperasi_id, nama_produk, deskripsi_produk, harga_produk, satuan_produk, stok_tersedia, foto_url, kategori_produk, kopasnow_koperasi(id, nama, alamat, lokasi)"
      )
      .eq("id_produk", id)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.error(`Error fetching product ${id}:`, error);
      return { data: null, error: error.message };
    }

    if (!data) {
      return { data: null, error: null };
    }

    // Supabase mengembalikan relasi to-one sebagai objek, tetapi tipe
    // bawaannya melebar jadi array — dinormalkan di sini.
    const relation = data.kopasnow_koperasi as unknown as {
      id: string;
      nama: string;
      alamat: string | null;
      lokasi: string;
    } | null;

    if (!relation) {
      return { data: null, error: "Koperasi pemilik produk tidak ditemukan" };
    }

    const [lat, lng] = parseWKBHex(relation.lokasi);

    const { kopasnow_koperasi: _relation, ...product } = data;
    void _relation;

    return {
      data: {
        ...(product as KopasnowProduct),
        koperasi: { id: relation.id, nama: relation.nama, alamat: relation.alamat, lat, lng },
      },
      error: null,
    };
  } catch (err) {
    console.error(`Unexpected error in getProductById for ${id}:`, err);
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

    // foto_url dikecualikan — sama seperti getAllActiveProducts, sebagian
    // baris menyimpan gambar base64 ~1 MB langsung di kolom teks sehingga
    // rawan memperlambat/timeout katalog koperasi yang kebetulan menjual
    // produk tersebut. Foto asli tetap tampil di halaman detail produk.
    const { data, error } = await supabase
      .from("kopasnow_products")
      .select("id_produk, koperasi_id, nama_produk, deskripsi_produk, harga_produk, satuan_produk, stok_tersedia, kategori_produk")
      .eq("koperasi_id", koperasiId)
      .eq("is_active", true)
      .order("nama_produk");

    if (error) {
      console.error(`Error fetching products for koperasi ${koperasiId}:`, error);
      return { data: null, error: error.message };
    }

    const withPhoto: KopasnowProduct[] = (data ?? []).map((p) => ({
      ...p,
      foto_url: null,
    }));

    return { data: withPhoto, error: null };
  } catch (err) {
    console.error(`Unexpected error in getProductsByKoperasiId for ${koperasiId}:`, err);
    return { data: null, error: "Gagal memuat data produk koperasi" };
  }
}
