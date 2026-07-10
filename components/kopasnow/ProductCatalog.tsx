"use client";

import { useState } from "react";
import Link from "next/link";
import { useCartStore, cartTotalItems, cartTotalPrice } from "@/store/useCartStore";
import type { KopasnowProduct } from "@/server/actions/getProducts";

interface ProductCatalogProps {
  koperasi: {
    id: string;
    nama: string;
  };
  products: KopasnowProduct[];
}

export default function ProductCatalog({ koperasi, products }: ProductCatalogProps) {
  const cartKoperasiId = useCartStore((state) => state.koperasiId);
  const cartKoperasiName = useCartStore((state) => state.koperasiName);
  const items = useCartStore((state) => state.items);
  const hasHydrated = useCartStore((state) => state._hasHydrated);
  const addItem = useCartStore((state) => state.addItem);
  const increment = useCartStore((state) => state.increment);
  const decrement = useCartStore((state) => state.decrement);
  const clear = useCartStore((state) => state.clear);

  // Barang yang mau ditambahkan saat keranjang masih berisi koperasi lain
  const [pendingProduct, setPendingProduct] = useState<KopasnowProduct | null>(null);

  const totalItems = hasHydrated ? cartTotalItems(items) : 0;
  const totalPrice = hasHydrated ? cartTotalPrice(items) : 0;

  const getQty = (productId: string): number => {
    if (!hasHydrated || cartKoperasiId !== koperasi.id) return 0;
    return items.find((i) => i.productId === productId)?.qty ?? 0;
  };

  const handleAdd = (product: KopasnowProduct) => {
    if (hasHydrated && cartKoperasiId && cartKoperasiId !== koperasi.id && items.length > 0) {
      setPendingProduct(product);
      return;
    }
    addItem(koperasi.id, koperasi.nama, {
      productId: product.id_produk,
      name: product.nama_produk,
      price: parseInt(product.harga_produk),
      unit: product.satuan_produk,
      photoUrl: product.foto_url,
      stock: product.stok_tersedia,
    });
  };

  const confirmReplaceCart = () => {
    if (!pendingProduct) return;
    clear();
    addItem(koperasi.id, koperasi.nama, {
      productId: pendingProduct.id_produk,
      name: pendingProduct.nama_produk,
      price: parseInt(pendingProduct.harga_produk),
      unit: pendingProduct.satuan_produk,
      photoUrl: pendingProduct.foto_url,
      stock: pendingProduct.stok_tersedia,
    });
    setPendingProduct(null);
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-16 px-6 bg-white rounded-2xl border border-slate-200">
        <div className="text-5xl mb-3">📦</div>
        <p className="text-lg font-bold text-slate-900">Belum ada barang yang dijual</p>
        <p className="text-base text-slate-600 mt-1">
          Koperasi ini sedang menyiapkan daftar barangnya. Silakan cek lagi nanti.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center mt-5 min-h-[52px] px-8 bg-[#CE1126] hover:bg-[#A50E1E] text-white rounded-xl text-base font-bold transition-colors"
        >
          Cari Koperasi Lain
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {products.map((prod) => {
          const qty = getQty(prod.id_produk);
          const price = parseInt(prod.harga_produk);
          const outOfStock = prod.stok_tersedia === 0;

          return (
            <div
              key={prod.id_produk}
              className="bg-white rounded-2xl p-3 border border-slate-200 flex flex-col"
            >
              {/* Foto barang */}
              <div className="aspect-square bg-slate-50 rounded-xl mb-3 overflow-hidden border border-slate-100 flex items-center justify-center relative">
                {prod.foto_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={prod.foto_url}
                    alt={prod.nama_produk}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-5xl" aria-hidden>🛒</span>
                )}
                {outOfStock ? (
                  <span className="absolute top-2 left-2 bg-slate-800/90 text-sm font-bold text-white px-2.5 py-1 rounded-lg">
                    Habis
                  </span>
                ) : (
                  <span className="absolute top-2 left-2 bg-white/95 text-sm font-bold text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200">
                    Sisa {prod.stok_tersedia} {prod.satuan_produk}
                  </span>
                )}
              </div>

              {/* Nama & harga */}
              <h3 className="font-bold text-base text-slate-900 leading-snug line-clamp-2 min-h-[3rem]">
                {prod.nama_produk}
              </h3>
              <p className="text-lg font-extrabold text-[#CE1126] mt-1">
                Rp {price.toLocaleString("id-ID")}
                <span className="text-sm font-semibold text-slate-500">
                  {" "}/ {prod.satuan_produk}
                </span>
              </p>

              {/* Tombol tambah / pengatur jumlah */}
              <div className="mt-auto pt-3">
                {outOfStock ? (
                  <div className="w-full min-h-[48px] bg-slate-100 text-slate-400 rounded-xl text-base font-bold flex items-center justify-center">
                    Stok Habis
                  </div>
                ) : qty === 0 ? (
                  <button
                    onClick={() => handleAdd(prod)}
                    className="w-full min-h-[48px] bg-[#CE1126] hover:bg-[#A50E1E] active:bg-[#8E0C1A] text-white rounded-xl text-base font-bold transition-colors cursor-pointer"
                  >
                    + Tambah
                  </button>
                ) : (
                  <div className="w-full flex items-center justify-between gap-1 bg-red-50 border-2 border-[#CE1126]/30 rounded-xl p-1">
                    <button
                      onClick={() => decrement(prod.id_produk)}
                      aria-label={`Kurangi ${prod.nama_produk}`}
                      className="w-11 h-11 bg-white border border-slate-200 text-[#CE1126] rounded-lg text-2xl font-bold flex items-center justify-center cursor-pointer"
                    >
                      −
                    </button>
                    <span className="text-lg font-extrabold text-slate-900 min-w-[2rem] text-center">
                      {qty}
                    </span>
                    <button
                      onClick={() => increment(prod.id_produk)}
                      disabled={qty >= prod.stok_tersedia}
                      aria-label={`Tambah ${prod.nama_produk}`}
                      className="w-11 h-11 bg-[#CE1126] text-white rounded-lg text-2xl font-bold flex items-center justify-center disabled:opacity-40 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bar keranjang melayang di bawah (zona jempol) */}
      {totalItems > 0 && cartKoperasiId === koperasi.id && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-3 bg-gradient-to-t from-white via-white to-transparent">
          <Link
            href="/keranjang"
            className="max-w-2xl mx-auto min-h-[60px] bg-[#CE1126] hover:bg-[#A50E1E] text-white rounded-2xl shadow-lg flex items-center justify-between px-5 transition-colors"
          >
            <span className="text-base font-bold">
              🛒 {totalItems} barang di keranjang
            </span>
            <span className="text-lg font-extrabold flex items-center gap-2">
              Rp {totalPrice.toLocaleString("id-ID")}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </span>
          </Link>
        </div>
      )}

      {/* Konfirmasi ganti koperasi (keranjang hanya boleh dari satu koperasi) */}
      {pendingProduct && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 text-center">
            <div className="text-4xl mb-2">🧺</div>
            <h3 className="text-lg font-bold text-slate-900">
              Keranjang Anda masih berisi barang dari {cartKoperasiName}
            </h3>
            <p className="text-base text-slate-600 mt-2">
              Satu pesanan hanya bisa dari satu koperasi. Kosongkan keranjang dan
              mulai belanja di sini?
            </p>
            <div className="flex flex-col gap-3 mt-5">
              <button
                onClick={confirmReplaceCart}
                className="w-full min-h-[52px] bg-[#CE1126] hover:bg-[#A50E1E] text-white rounded-xl text-base font-bold transition-colors cursor-pointer"
              >
                Ya, Kosongkan &amp; Belanja di Sini
              </button>
              <button
                onClick={() => setPendingProduct(null)}
                className="w-full min-h-[52px] bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-300 rounded-xl text-base font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
