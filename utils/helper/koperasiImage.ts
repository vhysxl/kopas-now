/**
 * Foto koperasi.
 *
 * PENTING: tabel `kopasnow_koperasi` belum punya kolom gambar, jadi ini
 * foto stok — bukan foto asli koperasi yang bersangkutan. Dipakai sebagai
 * placeholder tampilan sampai fase backend menambah kolom `foto_url`.
 *
 * Seed-nya diambil dari id koperasi supaya satu koperasi selalu mendapat
 * foto yang sama di setiap halaman dan setiap render (tidak acak-acakan).
 *
 * Cara mengganti nanti: baca `koperasi.foto_url` dan pakai fungsi ini hanya
 * sebagai cadangan bila kolomnya kosong.
 */
export function koperasiImage(id: string, width = 800, height = 400): string {
  return `https://picsum.photos/seed/kopas-${id}/${width}/${height}`;
}
