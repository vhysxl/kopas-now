"use client";

import Link from "next/link";
import { useAddToCart } from "@/hooks/useAddToCart";
import CartConflictDialog from "@/components/kopasnow/CartConflictDialog";
import { useCartStore, cartTotalItems } from "@/store/useCartStore";
import { ShoppingCart } from "lucide-react";
import type { KopasnowProduct } from "@/server/actions/getProducts";

interface ProductDetailActionsProps {
  product: KopasnowProduct;
  koperasi: { id: string; nama: string };
}

export default function ProductDetailActions({
  product,
  koperasi,
}: ProductDetailActionsProps) {
  const items = useCartStore((s) => s.items);
  const hasHydrated = useCartStore((s) => s._hasHydrated);
  const increment = useCartStore((s) => s.increment);
  const decrement = useCartStore((s) => s.decrement);

  const { addToCart, getQty, pending, confirmReplace, cancelReplace, cartKoperasiName } =
    useAddToCart();

  const qty = getQty(product.id_produk, koperasi.id);
  const outOfStock = product.stok_tersedia === 0;
  const totalItems = hasHydrated ? cartTotalItems(items) : 0;

  if (outOfStock) {
    return (
      <div className="w-full min-h-[56px] bg-slate-100 text-slate-500 rounded-xl text-lg font-bold flex items-center justify-center">
        Stok Habis
      </div>
    );
  }

  return (
    <>
      {qty === 0 ? (
        <button
          onClick={() => addToCart(product, koperasi)}
          className="w-full min-h-[56px] bg-[#CE1126] hover:bg-[#A50E1E] active:bg-[#8E0C1A] text-white rounded-xl text-lg font-extrabold transition-colors cursor-pointer"
        >
          + Masukkan Keranjang
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 bg-red-50 border-2 border-[#CE1126]/30 rounded-xl p-2">
            <button
              onClick={() => decrement(product.id_produk)}
              aria-label={`Kurangi ${product.nama_produk}`}
              className="w-14 h-14 bg-white border border-slate-200 text-[#CE1126] rounded-lg text-3xl font-bold flex items-center justify-center cursor-pointer"
            >
              −
            </button>
            <span className="text-xl font-extrabold text-slate-900">
              {qty} {product.satuan_produk}
            </span>
            <button
              onClick={() => increment(product.id_produk)}
              disabled={qty >= product.stok_tersedia}
              aria-label={`Tambah ${product.nama_produk}`}
              className="w-14 h-14 bg-[#CE1126] text-white rounded-lg text-3xl font-bold flex items-center justify-center disabled:opacity-40 cursor-pointer"
            >
              +
            </button>
          </div>

          <Link
            href="/keranjang"
            className="w-full min-h-[56px] bg-[#CE1126] hover:bg-[#A50E1E] text-white rounded-xl text-lg font-extrabold flex items-center justify-center gap-2 transition-colors"
          >
            <ShoppingCart className="w-5 h-5" /> Lihat Keranjang ({totalItems} barang)
          </Link>
        </div>
      )}

      {/* Konfirmasi ganti koperasi — satu pesanan hanya dari satu koperasi */}
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
