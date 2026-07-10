"use client";

import { useState } from "react";
import Link from "next/link";
import { useUserStore } from "@/store/useUserStore";
import { useCartStore, cartTotalItems, cartTotalPrice } from "@/store/useCartStore";
import { createTransaction } from "@/server/actions/transactions";
import BottomNav from "@/components/kopasnow/BottomNav";

type DeliveryMethod = "pickup" | "delivery";

export default function KeranjangPage() {
  const user = useUserStore((state) => state.user);
  const customer = useUserStore((state) => state.customer);

  const koperasiId = useCartStore((state) => state.koperasiId);
  const koperasiName = useCartStore((state) => state.koperasiName);
  const items = useCartStore((state) => state.items);
  const hasHydrated = useCartStore((state) => state._hasHydrated);
  const increment = useCartStore((state) => state.increment);
  const decrement = useCartStore((state) => state.decrement);
  const removeItem = useCartStore((state) => state.removeItem);
  const clear = useCartStore((state) => state.clear);

  // "Ambil sendiri" jadi pilihan awal karena tidak butuh alamat (paling aman)
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("pickup");
  const [address, setAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  const totalItems = cartTotalItems(items);
  const totalPrice = cartTotalPrice(items);
  const needsAddress = deliveryMethod === "delivery" && address.trim().length < 10;

  const handleSubmit = async () => {
    if (!user || !koperasiId || items.length === 0) return;
    if (needsAddress) {
      setSubmitError("Tolong tulis alamat rumah Anda dulu, supaya kurir tidak tersesat.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const result = await createTransaction({
      // createTransaction mencari/membuat record customer berdasarkan user_id auth
      customer_id: user.id,
      koperasi_id: koperasiId,
      total_amount: totalPrice,
      payment_method: "COD",
      delivery_fee: 0,
      tipe_pembelian: "online",
      notes:
        deliveryMethod === "delivery"
          ? `Diantar ke rumah. Alamat: ${address.trim()}`
          : "Diambil sendiri oleh pembeli di koperasi.",
      items: items.map((i) => ({
        product_id: i.productId,
        product_name: i.name,
        quantity: i.qty,
        unit_price: i.price,
        subtotal: i.qty * i.price,
      })),
    });

    setIsSubmitting(false);

    if (result.success && result.transaction_id) {
      setOrderId(result.transaction_id);
      clear();
    } else {
      setSubmitError(
        result.error ||
          "Pesanan belum terkirim. Periksa sambungan internet Anda, lalu tekan Pesan Sekarang sekali lagi."
      );
    }
  };

  // ── Layar konfirmasi sukses ─────────────────────────────────
  if (orderId) {
    return (
      <div className="min-h-screen bg-[#F6F6F6] font-sans text-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-200">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-10 h-10">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-5">
            Pesanan Anda Sudah Diterima!
          </h1>
          <p className="text-base text-slate-600 mt-2">
            Pengurus koperasi akan menghubungi Anda lewat <strong>WhatsApp</strong> untuk
            memastikan pesanan.
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-5">
            <p className="text-sm font-semibold text-slate-500">Nomor pesanan Anda</p>
            <p className="text-lg font-extrabold text-slate-900 break-all">
              {orderId.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <div className="flex flex-col gap-3 mt-6">
            <Link
              href="/orders"
              className="w-full min-h-[56px] bg-[#CE1126] hover:bg-[#A50E1E] text-white rounded-xl text-base font-bold flex items-center justify-center transition-colors"
            >
              Lihat Pesanan Saya
            </Link>
            <Link
              href="/"
              className="w-full min-h-[56px] bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-300 rounded-xl text-base font-bold flex items-center justify-center transition-colors"
            >
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F6F6] font-sans text-slate-900 pb-24 md:pb-8">
      {/* Garis bendera Merah Putih */}
      <div className="w-full h-1.5 flex fixed top-0 left-0 z-50">
        <div className="w-1/2 bg-[#CE1126]" />
        <div className="w-1/2 bg-white border-b border-slate-200" />
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-8">
        <Link
          href={koperasiId ? `/koperasi/${koperasiId}` : "/"}
          className="inline-flex items-center gap-2 min-h-[48px] px-4 -ml-4 text-base font-bold text-slate-700 hover:text-[#CE1126] transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Kembali Belanja
        </Link>

        <h1 className="text-2xl font-extrabold text-slate-900 mt-2">Keranjang Belanja</h1>

        {!hasHydrated ? (
          <div className="mt-4 space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-slate-200/60 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          /* Keranjang kosong */
          <div className="mt-4 bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <div className="text-5xl mb-3">🧺</div>
            <p className="text-lg font-bold text-slate-900">Keranjang Anda masih kosong</p>
            <p className="text-base text-slate-600 mt-1">
              Ayo pilih barang dari koperasi terdekat.
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center mt-5 min-h-[56px] px-8 bg-[#CE1126] hover:bg-[#A50E1E] text-white rounded-xl text-base font-bold transition-colors"
            >
              Cari Barang
            </Link>
          </div>
        ) : (
          <div className="mt-4 space-y-5">
            {/* Dari koperasi mana */}
            <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
              <p className="text-sm font-semibold text-slate-500">Belanja dari:</p>
              <p className="text-base font-bold text-slate-900">{koperasiName}</p>
            </div>

            {/* Daftar barang */}
            <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
              {items.map((item) => (
                <div key={item.productId} className="p-4 flex items-center gap-3">
                  <div className="w-16 h-16 shrink-0 bg-slate-50 rounded-xl border border-slate-100 overflow-hidden flex items-center justify-center">
                    {item.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.photoUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl" aria-hidden>🛒</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-slate-900 leading-snug line-clamp-2">
                      {item.name}
                    </p>
                    <p className="text-base font-extrabold text-[#CE1126] mt-0.5">
                      Rp {(item.qty * item.price).toLocaleString("id-ID")}
                    </p>
                    <div className="flex items-center gap-1 mt-2">
                      <button
                        onClick={() => decrement(item.productId)}
                        aria-label={`Kurangi ${item.name}`}
                        className="w-11 h-11 bg-white border-2 border-slate-300 text-[#CE1126] rounded-lg text-2xl font-bold flex items-center justify-center cursor-pointer"
                      >
                        −
                      </button>
                      <span className="text-lg font-extrabold text-slate-900 min-w-[2.5rem] text-center">
                        {item.qty}
                      </span>
                      <button
                        onClick={() => increment(item.productId)}
                        disabled={item.qty >= item.stock}
                        aria-label={`Tambah ${item.name}`}
                        className="w-11 h-11 bg-[#CE1126] text-white rounded-lg text-2xl font-bold flex items-center justify-center disabled:opacity-40 cursor-pointer"
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="ml-auto min-h-[44px] px-3 text-base font-bold text-slate-500 hover:text-[#CE1126] cursor-pointer"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Cara menerima barang */}
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-3">
                Bagaimana Anda mau menerima barangnya?
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setDeliveryMethod("pickup")}
                  className={`text-left p-4 rounded-2xl border-2 transition-colors cursor-pointer ${
                    deliveryMethod === "pickup"
                      ? "border-[#CE1126] bg-red-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">🚶</span>
                    {deliveryMethod === "pickup" && (
                      <span className="w-6 h-6 bg-[#CE1126] text-white rounded-full flex items-center justify-center text-sm font-bold">✓</span>
                    )}
                  </div>
                  <p className="text-base font-bold text-slate-900 mt-2">Ambil Sendiri</p>
                  <p className="text-sm text-slate-600 mt-0.5">
                    Anda datang ke koperasi untuk mengambil barang.
                  </p>
                </button>
                <button
                  onClick={() => setDeliveryMethod("delivery")}
                  className={`text-left p-4 rounded-2xl border-2 transition-colors cursor-pointer ${
                    deliveryMethod === "delivery"
                      ? "border-[#CE1126] bg-red-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">🛵</span>
                    {deliveryMethod === "delivery" && (
                      <span className="w-6 h-6 bg-[#CE1126] text-white rounded-full flex items-center justify-center text-sm font-bold">✓</span>
                    )}
                  </div>
                  <p className="text-base font-bold text-slate-900 mt-2">Diantar ke Rumah</p>
                  <p className="text-sm text-slate-600 mt-0.5">
                    Kurir koperasi mengantar barang ke alamat Anda.
                  </p>
                </button>
              </div>

              {deliveryMethod === "delivery" && (
                <div className="mt-3">
                  <label htmlFor="alamat" className="text-base font-bold text-slate-900 block mb-1.5">
                    Alamat rumah Anda
                  </label>
                  <textarea
                    id="alamat"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={3}
                    placeholder="Contoh: Jl. Mawar No. 3, RT 02 RW 01, dekat masjid"
                    className="w-full p-4 bg-white border-2 border-slate-200 focus:border-[#CE1126] rounded-xl text-base text-slate-900 placeholder-slate-400 outline-none resize-none"
                  />
                </div>
              )}
            </div>

            {/* Cara bayar (tunai saat terima — paling dikenal) */}
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-3">Cara bayar</h2>
              <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 flex items-center gap-3">
                <span className="text-3xl">💵</span>
                <div>
                  <p className="text-base font-bold text-slate-900">Bayar Tunai</p>
                  <p className="text-sm text-slate-600">
                    Bayar dengan uang pas saat barang diterima. Tidak perlu transfer.
                  </p>
                </div>
              </div>
            </div>

            {/* Total & tombol pesan */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-slate-700">
                  Total ({totalItems} barang)
                </span>
                <span className="text-2xl font-extrabold text-[#CE1126]">
                  Rp {totalPrice.toLocaleString("id-ID")}
                </span>
              </div>

              {submitError && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-base font-semibold text-red-800">{submitError}</p>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !user}
                className="mt-4 w-full min-h-[60px] bg-[#CE1126] hover:bg-[#A50E1E] active:bg-[#8E0C1A] text-white rounded-xl text-lg font-extrabold transition-colors disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? "Mengirim pesanan..." : "Pesan Sekarang"}
              </button>
              <p className="text-sm text-slate-500 text-center mt-3">
                Setelah menekan tombol, pengurus koperasi menerima pesanan Anda
                {customer?.phone ? " dan mengabari lewat WhatsApp" : ""}.
              </p>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
