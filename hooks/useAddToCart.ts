"use client";

import { useCallback, useState } from "react";
import { useCartStore } from "@/store/useCartStore";
import { useToast } from "@/components/kopasnow/ToastProvider";
import type { KopasnowProduct } from "@/server/actions/getProducts";

export interface CartKoperasi {
  id: string;
  nama: string;
}

interface PendingAdd {
  product: KopasnowProduct;
  koperasi: CartKoperasi;
}

/**
 * Menambahkan barang ke keranjang, lengkap dengan aturan "satu koperasi per
 * keranjang". Dipakai bersama oleh beranda, katalog koperasi, dan halaman
 * detail produk supaya ketiganya tidak pernah berbeda perilaku.
 *
 * Koperasi diberikan saat pemanggilan, bukan saat hook dibuat, karena di
 * beranda satu daftar produk bisa berasal dari koperasi yang berbeda-beda.
 *
 * Saat pengguna menambah barang dari koperasi lain, `pending` terisi —
 * pemanggil menampilkan <CartConflictDialog>, lalu memanggil `confirmReplace()`
 * atau `cancelReplace()`.
 */
export function useAddToCart() {
  const cartKoperasiId = useCartStore((s) => s.koperasiId);
  const cartKoperasiName = useCartStore((s) => s.koperasiName);
  const items = useCartStore((s) => s.items);
  const hasHydrated = useCartStore((s) => s._hasHydrated);
  const addItem = useCartStore((s) => s.addItem);
  const clear = useCartStore((s) => s.clear);
  const { showToast } = useToast();

  const [pending, setPending] = useState<PendingAdd | null>(null);

  const insert = useCallback(
    (product: KopasnowProduct, koperasi: CartKoperasi) => {
      addItem(koperasi.id, koperasi.nama, {
        productId: product.id_produk,
        name: product.nama_produk,
        price: parseFloat(product.harga_produk),
        unit: product.satuan_produk || "pcs",
        photoUrl: product.foto_url,
        stock: product.stok_tersedia,
      });
    },
    [addItem]
  );

  const addToCart = useCallback(
    (product: KopasnowProduct, koperasi: CartKoperasi) => {
      const fromOtherKoperasi =
        hasHydrated && cartKoperasiId && cartKoperasiId !== koperasi.id && items.length > 0;

      if (fromOtherKoperasi) {
        setPending({ product, koperasi });
        return;
      }

      insert(product, koperasi);
      showToast(`${product.nama_produk} masuk keranjang`);
    },
    [hasHydrated, cartKoperasiId, items.length, insert, showToast]
  );

  const confirmReplace = useCallback(() => {
    if (!pending) return;
    clear();
    insert(pending.product, pending.koperasi);
    showToast(`Keranjang dikosongkan, ${pending.product.nama_produk} masuk keranjang`);
    setPending(null);
  }, [pending, clear, insert, showToast]);

  const cancelReplace = useCallback(() => setPending(null), []);

  /** Jumlah barang ini di keranjang, 0 bila keranjang milik koperasi lain. */
  const getQty = useCallback(
    (productId: string, koperasiId: string): number => {
      if (!hasHydrated || cartKoperasiId !== koperasiId) return 0;
      return items.find((i) => i.productId === productId)?.qty ?? 0;
    },
    [hasHydrated, cartKoperasiId, items]
  );

  return {
    addToCart,
    getQty,
    pending,
    confirmReplace,
    cancelReplace,
    cartKoperasiName,
    hasHydrated,
  };
}
