"use client";

import Link from "next/link";
import { useAddToCart } from "@/hooks/useAddToCart";
import CartConflictDialog from "@/components/kopasnow/CartConflictDialog";
import { useCartStore, cartTotalItems } from "@/store/useCartStore";
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
      <div className="w-full min-h-[56px] bg-surface-variant text-secondary rounded-full text-title-md font-title-md font-bold flex items-center justify-center">
        Stok Habis
      </div>
    );
  }

  return (
    <>
      {qty === 0 ? (
        <button
          onClick={() => addToCart(product, koperasi)}
          className="w-full min-h-[56px] bg-primary hover:bg-surface-tint active:bg-primary text-on-primary rounded-full text-title-md font-title-md font-extrabold transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
        >
          <span className="material-symbols-outlined" aria-hidden>add_shopping_cart</span> Masukkan Keranjang
        </button>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2 bg-primary-container/30 border border-primary/20 rounded-full p-2">
            <button
              onClick={() => decrement(product.id_produk)}
              aria-label={`Kurangi ${product.nama_produk}`}
              className="w-12 h-12 bg-surface-container-lowest border border-outline-variant text-primary rounded-full text-3xl font-bold flex items-center justify-center cursor-pointer shadow-sm hover:bg-surface-variant transition-colors"
            >
              −
            </button>
            <span className="text-title-lg font-title-lg font-extrabold text-on-surface">
              {qty} {product.satuan_produk}
            </span>
            <button
              onClick={() => increment(product.id_produk)}
              disabled={qty >= product.stok_tersedia}
              aria-label={`Tambah ${product.nama_produk}`}
              className="w-12 h-12 bg-primary text-on-primary rounded-full text-3xl font-bold flex items-center justify-center disabled:opacity-40 cursor-pointer shadow-sm hover:bg-surface-tint transition-colors"
            >
              +
            </button>
          </div>

          <Link
            href="/keranjang"
            className="w-full min-h-[56px] bg-primary hover:bg-surface-tint text-on-primary rounded-full text-title-md font-title-md font-extrabold flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined" aria-hidden>shopping_cart</span> Lihat Keranjang ({totalItems} barang)
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
