"use client";

import { useState, useMemo } from "react";
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
      <div className="text-center py-16 px-6 bg-surface-container-lowest rounded-xl border border-outline-variant flex flex-col items-center shadow-sm">
        <span className="material-symbols-outlined text-5xl text-surface-variant mb-4" aria-hidden>package</span>
        <p className="text-title-lg font-title-lg font-bold text-on-surface">Belum ada barang yang dijual</p>
        <p className="text-body-md font-body-md text-secondary mt-1">
          Koperasi ini sedang menyiapkan daftar barangnya. Silakan cek lagi nanti.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center mt-5 min-h-[48px] px-8 bg-primary hover:bg-surface-tint text-on-primary rounded-full text-label-md font-label-md font-bold transition-colors shadow-sm"
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
          <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-secondary">
            <span className="material-symbols-outlined text-[20px]" aria-hidden>search</span>
          </span>
          <input
            type="text"
            placeholder="Cari barang di koperasi ini..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-h-[48px] pl-11 pr-4 bg-surface-container-lowest border border-outline-variant rounded-full text-body-md font-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors shadow-sm"
          />
        </div>

        {categories.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-5 px-5 md:mx-0 md:px-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 px-4 py-2 rounded-full text-label-sm font-label-sm font-bold border transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-primary text-on-primary border-primary shadow-sm"
                    : "bg-surface-container-lowest text-secondary border-outline-variant hover:border-outline shadow-sm"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {filteredProducts.length === 0 ? (
        <div className="text-center py-12 px-6 bg-surface-container-lowest rounded-xl border border-outline-variant flex flex-col items-center shadow-sm">
          <span className="material-symbols-outlined text-5xl text-surface-variant mb-4" aria-hidden>search_off</span>
          <p className="text-title-md font-title-md font-bold text-on-surface">Barang tidak ditemukan</p>
          <p className="text-body-sm font-body-sm text-secondary mt-1">
            Coba gunakan kata kunci lain atau pilih kategori "Semua".
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("Semua");
            }}
            className="inline-flex items-center justify-center mt-4 px-6 py-2 bg-surface-variant hover:bg-surface-container-high text-secondary rounded-full text-label-sm font-label-sm font-bold transition-colors cursor-pointer"
          >
            Hapus Pencarian
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {filteredProducts.map((prod) => {
            const qty = getQty(prod.id_produk, koperasi.id);
            const price = parseFloat(prod.harga_produk);
            const outOfStock = prod.stok_tersedia === 0;

            return (
              <div
                key={prod.id_produk}
                className="bg-surface-container-lowest rounded-xl p-2.5 sm:p-3 border border-outline-variant flex flex-col shadow-sm"
              >
                {/* Foto & nama membuka detail barang */}
                <Link href={`/produk/${prod.id_produk}`} className="flex flex-col">
                  <div className="aspect-square bg-surface-container-low rounded-lg mb-3 overflow-hidden border border-outline-variant/30 flex items-center justify-center relative">
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
                        <span className="material-symbols-outlined text-4xl text-surface-variant">shopping_bag</span>
                      </div>
                    )}
                    {outOfStock ? (
                      <span className="absolute top-2 left-2 bg-error/90 text-[10px] font-bold text-on-error px-2 py-1 rounded border border-error">
                        Habis
                      </span>
                    ) : (
                      <span className="absolute top-2 left-2 bg-surface-container-lowest/95 text-[10px] font-bold text-on-surface px-2 py-1 rounded border border-outline-variant shadow-sm backdrop-blur-sm">
                        Sisa {prod.stok_tersedia} {prod.satuan_produk}
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-body-md text-on-surface leading-snug line-clamp-2 min-h-[2.5rem]">
                    {prod.nama_produk}
                  </h3>
                  <p className="text-title-md font-title-md font-extrabold text-primary mt-1">
                    Rp {price.toLocaleString("id-ID")}
                    <span className="text-label-sm font-label-sm font-semibold text-secondary">
                      {" "}/ {prod.satuan_produk}
                    </span>
                  </p>
                </Link>

                {/* Tombol tambah / pengatur jumlah */}
                <div className="mt-auto pt-3">
                  {outOfStock ? (
                    <div className="w-full min-h-[44px] bg-surface-variant text-secondary rounded-full text-label-sm font-label-sm font-bold flex items-center justify-center">
                      Stok Habis
                    </div>
                  ) : qty === 0 ? (
                    <button
                      onClick={() => addToCart(prod, koperasi)}
                      className="w-full min-h-[44px] bg-primary hover:bg-surface-tint text-on-primary rounded-full text-label-sm font-label-sm font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[18px]">add</span> Tambah
                    </button>
                  ) : (
                    <div className="w-full flex items-center justify-between gap-1 bg-primary-container/30 border border-primary/20 rounded-full p-1">
                      <button
                        onClick={() => decrement(prod.id_produk)}
                        aria-label={`Kurangi ${prod.nama_produk}`}
                        className="w-7 h-7 sm:w-9 sm:h-9 bg-surface-container-lowest border border-outline-variant text-primary rounded-full text-lg sm:text-xl font-bold flex items-center justify-center cursor-pointer shadow-sm hover:bg-surface-variant transition-colors"
                      >
                        −
                      </button>
                      <span className="text-label-lg font-label-lg font-extrabold text-on-surface min-w-[2rem] text-center">
                        {qty}
                      </span>
                      <button
                        onClick={() => increment(prod.id_produk)}
                        disabled={qty >= prod.stok_tersedia}
                        aria-label={`Tambah ${prod.nama_produk}`}
                        className="w-7 h-7 sm:w-9 sm:h-9 bg-primary text-on-primary rounded-full text-lg sm:text-xl font-bold flex items-center justify-center disabled:opacity-40 cursor-pointer shadow-sm hover:bg-surface-tint transition-colors"
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
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-gradient-to-t from-background via-background/90 to-transparent">
          <Link
            href="/keranjang"
            className="max-w-screen-md mx-auto min-h-[56px] bg-primary hover:bg-surface-tint text-on-primary rounded-full shadow-lg flex items-center justify-between px-6 transition-colors"
          >
            <span className="text-label-md font-label-md font-bold flex items-center gap-2">
              <span className="material-symbols-outlined" aria-hidden>shopping_bag</span> {totalItems} barang
            </span>
            <span className="text-title-md font-title-md font-extrabold flex items-center gap-2">
              Rp {totalPrice.toLocaleString("id-ID")}
              <span className="material-symbols-outlined text-[20px]" aria-hidden>arrow_forward</span>
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
