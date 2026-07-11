"use client";

import { useState, useMemo } from "react";
import { Package, ShoppingCart, Search } from "lucide-react";
import Link from "next/link";
import { useCartStore, cartTotalItems, cartTotalPrice } from "@/store/useCartStore";
import { useAddToCart } from "@/hooks/useAddToCart";
import CartConflictDialog from "@/components/kopasnow/CartConflictDialog";
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
  const items = useCartStore((state) => state.items);
  const hasHydrated = useCartStore((state) => state._hasHydrated);
  const increment = useCartStore((state) => state.increment);
  const decrement = useCartStore((state) => state.decrement);

  const { addToCart, getQty, pending, confirmReplace, cancelReplace, cartKoperasiName } =
    useAddToCart();

  const totalItems = hasHydrated ? cartTotalItems(items) : 0;
  const totalPrice = hasHydrated ? cartTotalPrice(items) : 0;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");

  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => {
      if (p.kategori_produk) {
        p.kategori_produk.forEach((c) => cats.add(c));
      }
    });
    return ["Semua", ...Array.from(cats)].sort((a, b) => {
      if (a === "Semua") return -1;
      if (b === "Semua") return 1;
      return a.localeCompare(b);
    });
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = p.nama_produk.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "Semua" ||
        (p.kategori_produk && p.kategori_produk.includes(selectedCategory));
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  if (products.length === 0) {
    return (
      <div className="text-center py-16 px-6 bg-white rounded-2xl border border-slate-200 flex flex-col items-center">
        <Package className="w-16 h-16 text-slate-300 mb-4" />
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
      {/* Filter and Search */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Cari barang di koperasi ini..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-h-[48px] pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#CE1126] focus:ring-1 focus:ring-[#CE1126] transition-colors"
          />
        </div>

        {categories.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold border transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-[#CE1126] text-white border-[#CE1126]"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {filteredProducts.length === 0 ? (
        <div className="text-center py-12 px-6 bg-white rounded-2xl border border-slate-200 flex flex-col items-center">
          <Search className="w-16 h-16 text-slate-300 mb-4" />
          <p className="text-base font-bold text-slate-900">Barang tidak ditemukan</p>
          <p className="text-sm text-slate-600 mt-1">
            Coba gunakan kata kunci lain atau pilih kategori "Semua".
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("Semua");
            }}
            className="inline-flex items-center justify-center mt-4 px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition-colors cursor-pointer"
          >
            Hapus Pencarian
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {filteredProducts.map((prod) => {
            const qty = getQty(prod.id_produk, koperasi.id);
            const price = parseFloat(prod.harga_produk);
            const outOfStock = prod.stok_tersedia === 0;

            return (
              <div
                key={prod.id_produk}
                className="bg-white rounded-2xl p-3 border border-slate-200 flex flex-col"
              >
                {/* Foto & nama membuka detail barang */}
                <Link href={`/produk/${prod.id_produk}`} className="flex flex-col">
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
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingCart className="w-10 h-10 text-slate-300" />
                      </div>
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

                  <h3 className="font-bold text-base text-slate-900 leading-snug line-clamp-2 min-h-[3rem]">
                    {prod.nama_produk}
                  </h3>
                  <p className="text-lg font-extrabold text-[#CE1126] mt-1">
                    Rp {price.toLocaleString("id-ID")}
                    <span className="text-sm font-semibold text-slate-500">
                      {" "}/ {prod.satuan_produk}
                    </span>
                  </p>
                </Link>

                {/* Tombol tambah / pengatur jumlah */}
                <div className="mt-auto pt-3">
                  {outOfStock ? (
                    <div className="w-full min-h-[48px] bg-slate-100 text-slate-400 rounded-xl text-base font-bold flex items-center justify-center">
                      Stok Habis
                    </div>
                  ) : qty === 0 ? (
                    <button
                      onClick={() => addToCart(prod, koperasi)}
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
      )}

      {/* Bar keranjang melayang di bawah (zona jempol) */}
      {totalItems > 0 && cartKoperasiId === koperasi.id && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-3 bg-gradient-to-t from-white via-white to-transparent">
          <Link
            href="/keranjang"
            className="max-w-2xl mx-auto min-h-[60px] bg-[#CE1126] hover:bg-[#A50E1E] text-white rounded-2xl shadow-lg flex items-center justify-between px-5 transition-colors"
          >
            <span className="text-base font-bold flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" /> {totalItems} barang di keranjang
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
      {pending && (
        <CartConflictDialog
          currentKoperasiName={cartKoperasiName}
          nextKoperasiName={pending.koperasi.nama}
          productName={pending.product.nama_produk}
          onConfirm={confirmReplace}
          onCancel={cancelReplace}
        />
      )}
    </>
  );
}
