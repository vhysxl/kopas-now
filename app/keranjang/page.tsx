"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/useUserStore";
import { useCartStore, cartTotalItems, cartTotalPrice } from "@/store/useCartStore";
import { createTransaction } from "@/server/actions/transactions";
import { getKoperasiById } from "@/server/actions/getKoperasi";
import BottomNav from "@/components/kopasnow/BottomNav";
import AddressPicker, { type AddressValue } from "@/components/kopasnow/AddressPicker";
import { displayPhone } from "@/utils/helper/account";
import {
  haversineDistance,
  formatDistance,
  calculateDeliveryFee,
  DELIVERY_FREE_RADIUS_KM,
  MAX_DELIVERY_RADIUS_KM,
} from "@/utils/helper/geo";

type DeliveryMethod = "pickup" | "delivery";

export default function KeranjangPage() {
  const user = useUserStore((state) => state.user);
  const customer = useUserStore((state) => state.customer);
  const router = useRouter();

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
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "TRANSFER">("COD");
  const [address, setAddress] = useState<AddressValue>({ address: "", lat: null, lng: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  // Simpan bersama id-nya supaya koordinat koperasi lama tidak ikut terpakai
  // ketika keranjang berpindah ke koperasi lain.
  const [koperasiGeo, setKoperasiGeo] = useState<{
    id: string;
    pos: [number, number];
  } | null>(null);

  // Koordinat koperasi diperlukan untuk mengukur jarak antar ke rumah pembeli
  useEffect(() => {
    if (!koperasiId) return;

    let cancelled = false;
    getKoperasiById(koperasiId).then((result) => {
      if (cancelled || !result.data) return;
      setKoperasiGeo({ id: koperasiId, pos: [result.data.lat, result.data.lng] });
    });
    return () => {
      cancelled = true;
    };
  }, [koperasiId]);

  const koperasiPos = koperasiGeo?.id === koperasiId ? koperasiGeo.pos : null;

  const totalItems = cartTotalItems(items);
  const totalPrice = cartTotalPrice(items);
  const isDelivery = deliveryMethod === "delivery";
  const addressText = address.address.trim();
  const hasPin = address.lat !== null && address.lng !== null;
  const addressIncomplete = isDelivery && (addressText.length < 10 || !hasPin);

  // Jarak rumah ke koperasi, dihitung begitu titik rumah ditandai
  const deliveryDistanceKm =
    hasPin && koperasiPos
      ? haversineDistance(koperasiPos[0], koperasiPos[1], address.lat as number, address.lng as number)
      : null;
  const isOutOfRange =
    isDelivery && deliveryDistanceKm !== null && deliveryDistanceKm > MAX_DELIVERY_RADIUS_KM;

  // Pratinjau ongkir memakai fungsi yang sama dengan server, jadi angka yang
  // dilihat pembeli tidak akan berbeda dari yang ditagihkan.
  const deliveryFee =
    isDelivery && deliveryDistanceKm !== null && !isOutOfRange
      ? calculateDeliveryFee(deliveryDistanceKm)
      : 0;
  const grandTotal = totalPrice + deliveryFee;

  const handleSubmit = async () => {
    if (!user) {
      router.push("/auth");
      return;
    }
    if (!koperasiId || items.length === 0) return;
    if (addressIncomplete) {
      setSubmitError(
        addressText.length < 10
          ? "Tolong tulis alamat rumah Anda dulu, supaya kurir tidak tersesat."
          : "Tolong tandai titik rumah Anda di peta dulu, supaya kurir tidak tersesat."
      );
      return;
    }
    if (isOutOfRange) {
      setSubmitError(
        `Rumah Anda ${formatDistance(deliveryDistanceKm)} dari ${koperasiName}, melebihi batas antar ${MAX_DELIVERY_RADIUS_KM} km. Silakan pilih "Ambil Sendiri".`
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const result = await createTransaction({
      // createTransaction mencari/membuat record customer berdasarkan user_id auth
      customer_id: user.id,
      koperasi_id: koperasiId,
      total_amount: totalPrice,
      payment_method: paymentMethod,
      tipe_pembelian: "online",
      delivery_lat: isDelivery ? address.lat ?? undefined : undefined,
      delivery_lng: isDelivery ? address.lng ?? undefined : undefined,
      notes: isDelivery
        ? `Diantar ke rumah. Alamat: ${addressText}`
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
      <div className="min-h-screen bg-background font-body-md text-on-background flex items-center justify-center p-5">
        <div className="w-full max-w-sm bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-8 text-center">
          <div className="w-24 h-24 bg-tertiary-container text-on-tertiary-container rounded-full flex items-center justify-center mx-auto border-4 border-tertiary/20">
            <span className="material-symbols-outlined text-5xl" aria-hidden>check_circle</span>
          </div>
          <h1 className="text-headline-sm font-headline-sm font-extrabold text-on-surface mt-6">
            Pesanan Diterima!
          </h1>
          <p className="text-body-md font-body-md text-secondary mt-2">
            Pengurus koperasi akan menghubungi Anda lewat <strong>WhatsApp</strong> untuk
            memastikan pesanan.
          </p>
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5 mt-6">
            <p className="text-label-sm font-label-sm text-secondary">Nomor pesanan Anda</p>
            <p className="text-title-lg font-title-lg font-extrabold text-on-surface break-all mt-1">
              {orderId.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <div className="flex flex-col gap-3 mt-8">
            <Link
              href="/orders"
              className="w-full min-h-[48px] bg-primary hover:bg-surface-tint text-on-primary rounded-full text-label-md font-label-md font-bold flex items-center justify-center transition-colors shadow-sm"
            >
              Lihat Pesanan Saya
            </Link>
            <Link
              href="/"
              className="w-full min-h-[48px] bg-surface-container-lowest hover:bg-surface-container-low text-secondary border border-outline-variant rounded-full text-label-md font-label-md font-bold flex items-center justify-center transition-colors shadow-sm"
            >
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-body-md text-on-background pb-24 md:pb-8">

      <div className="max-w-screen-md mx-auto px-5 pt-8">
        <Link
          href={koperasiId ? `/koperasi/${koperasiId}` : "/"}
          className="inline-flex items-center gap-2 min-h-[48px] px-2 -ml-2 text-label-md font-label-md font-bold text-secondary hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden>arrow_back</span>
          Kembali Belanja
        </Link>

        <h1 className="text-headline-sm font-headline-sm font-extrabold text-on-surface mt-2 mb-4">Keranjang Belanja</h1>

        {!hasHydrated ? (
          <div className="mt-4 space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-surface-container-high animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          /* Keranjang kosong */
          <div className="mt-4 bg-surface-container-lowest rounded-xl border border-outline-variant p-8 text-center shadow-sm flex flex-col items-center">
            <span className="material-symbols-outlined text-6xl text-surface-variant mb-4" aria-hidden>shopping_cart</span>
            <p className="text-title-lg font-title-lg font-bold text-on-surface">Keranjang Anda masih kosong</p>
            <p className="text-body-md font-body-md text-secondary mt-1">
              Ayo pilih barang dari koperasi terdekat.
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center mt-6 min-h-[48px] px-8 bg-primary hover:bg-surface-tint text-on-primary rounded-full text-label-md font-label-md font-bold transition-colors shadow-sm"
            >
              Cari Barang
            </Link>
          </div>
        ) : (
          <div className="mt-4 space-y-5">
            {/* Dari koperasi mana */}
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant px-5 py-4 shadow-sm">
              <p className="text-label-sm font-label-sm text-secondary">Belanja dari:</p>
              <p className="text-title-md font-title-md font-bold text-on-surface mt-0.5">{koperasiName}</p>
            </div>

            {/* Daftar barang */}
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant divide-y divide-outline-variant/30 shadow-sm">
              {items.map((item) => (
                <div key={item.productId} className="p-5 flex items-center gap-4">
                  <div className="w-16 h-16 shrink-0 bg-surface-container-low rounded-lg border border-outline-variant/30 overflow-hidden flex items-center justify-center relative">
                    {item.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.photoUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-3xl text-surface-variant">shopping_bag</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-md font-body-md font-bold text-on-surface leading-snug line-clamp-2">
                      {item.name}
                    </p>
                    <p className="text-title-md font-title-md font-extrabold text-primary mt-1">
                      Rp {(item.qty * item.price).toLocaleString("id-ID")}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <div className="flex items-center justify-between gap-1 bg-primary-container/30 border border-primary/20 rounded-full p-1">
                        <button
                          onClick={() => decrement(item.productId)}
                          aria-label={`Kurangi ${item.name}`}
                          className="w-9 h-9 bg-surface-container-lowest border border-outline-variant text-primary rounded-full text-xl font-bold flex items-center justify-center cursor-pointer shadow-sm hover:bg-surface-variant transition-colors"
                        >
                          −
                        </button>
                        <span className="text-label-lg font-label-lg font-extrabold text-on-surface min-w-[2rem] text-center">
                          {item.qty}
                        </span>
                        <button
                          onClick={() => increment(item.productId)}
                          disabled={item.qty >= item.stock}
                          aria-label={`Tambah ${item.name}`}
                          className="w-9 h-9 bg-primary text-on-primary rounded-full text-xl font-bold flex items-center justify-center disabled:opacity-40 cursor-pointer shadow-sm hover:bg-surface-tint transition-colors"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="ml-auto min-h-[44px] px-3 text-label-md font-label-md font-bold text-secondary hover:text-error transition-colors cursor-pointer flex items-center justify-center"
                        aria-label="Hapus barang"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Cara menerima barang */}
            <div>
              <h2 className="text-headline-md font-headline-md font-bold text-on-surface mb-4">
                Bagaimana Anda mau menerima barangnya?
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setDeliveryMethod("pickup")}
                  className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
                    deliveryMethod === "pickup"
                      ? "border-primary bg-primary-container/20 shadow-sm"
                      : "border-outline-variant bg-surface-container-lowest hover:border-outline shadow-sm"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="material-symbols-outlined text-4xl text-secondary" aria-hidden>directions_walk</span>
                    {deliveryMethod === "pickup" && (
                      <span className="material-symbols-outlined text-2xl text-primary" aria-hidden>check_circle</span>
                    )}
                  </div>
                  <p className="text-title-md font-title-md font-bold text-on-surface mt-3">Ambil Sendiri</p>
                  <p className="text-body-sm font-body-sm text-secondary mt-1">
                    Anda datang ke koperasi untuk mengambil barang.
                  </p>
                </button>
                <button
                  onClick={() => setDeliveryMethod("delivery")}
                  className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
                    deliveryMethod === "delivery"
                      ? "border-primary bg-primary-container/20 shadow-sm"
                      : "border-outline-variant bg-surface-container-lowest hover:border-outline shadow-sm"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="material-symbols-outlined text-4xl text-secondary" aria-hidden>local_shipping</span>
                    {deliveryMethod === "delivery" && (
                      <span className="material-symbols-outlined text-2xl text-primary" aria-hidden>check_circle</span>
                    )}
                  </div>
                  <p className="text-title-md font-title-md font-bold text-on-surface mt-3">Diantar ke Rumah</p>
                  <p className="text-body-sm font-body-sm text-secondary mt-1">
                    Sampai {MAX_DELIVERY_RADIUS_KM} km dari koperasi. Gratis di bawah{" "}
                    {DELIVERY_FREE_RADIUS_KM} km.
                  </p>
                </button>
              </div>

              {isDelivery && (
                <div className="mt-5">
                  <AddressPicker value={address} onChange={setAddress} />

                  {/* Status jarak antar, muncul begitu titik rumah ditandai */}
                  {deliveryDistanceKm !== null && (
                    isOutOfRange ? (
                      <div className="mt-4 p-5 bg-error-container border border-error/20 rounded-xl shadow-sm">
                        <p className="text-title-md font-title-md font-bold text-on-error-container flex items-center gap-2">
                          <span className="material-symbols-outlined" aria-hidden>warning</span> Terlalu jauh
                        </p>
                        <p className="text-body-md font-body-md text-on-error-container/80 mt-2">
                          Jaraknya {formatDistance(deliveryDistanceKm)}, sedangkan kurir{" "}
                          {koperasiName} hanya mengantar sampai {MAX_DELIVERY_RADIUS_KM} km.
                        </p>
                        <button
                          onClick={() => setDeliveryMethod("pickup")}
                          className="mt-4 w-full min-h-[48px] bg-surface-container-lowest hover:bg-surface-container-low text-on-surface border border-outline-variant rounded-full text-label-md font-label-md font-bold transition-colors cursor-pointer shadow-sm"
                        >
                          Ganti ke Ambil Sendiri
                        </button>
                      </div>
                    ) : (
                      <div className="mt-4 p-4 bg-tertiary-container/30 border border-tertiary/20 rounded-xl flex items-start gap-3 shadow-sm">
                        <span className="material-symbols-outlined text-tertiary mt-0.5" aria-hidden>check_circle</span>
                        <div>
                          <p className="text-label-md font-label-md font-bold text-on-surface">Bisa diantar</p>
                          <p className="text-body-sm font-body-sm text-secondary mt-1">
                            Jarak rumah Anda {formatDistance(deliveryDistanceKm)}.{" "}
                            {deliveryFee === 0
                              ? `Ongkir gratis (di bawah ${DELIVERY_FREE_RADIUS_KM} km).`
                              : `Ongkir Rp ${deliveryFee.toLocaleString("id-ID")}.`}
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            {/* Cara bayar */}
            <div>
              <h2 className="text-headline-md font-headline-md font-bold text-on-surface mb-4">Cara bayar</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setPaymentMethod("COD")}
                  className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
                    paymentMethod === "COD"
                      ? "border-primary bg-primary-container/20 shadow-sm"
                      : "border-outline-variant bg-surface-container-lowest hover:border-outline shadow-sm"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="material-symbols-outlined text-4xl text-secondary" aria-hidden>payments</span>
                    {paymentMethod === "COD" && (
                      <span className="material-symbols-outlined text-2xl text-primary" aria-hidden>check_circle</span>
                    )}
                  </div>
                  <p className="text-title-md font-title-md font-bold text-on-surface mt-3">Bayar Tunai (COD)</p>
                  <p className="text-body-sm font-body-sm text-secondary mt-1">
                    Bayar saat barang diterima.
                  </p>
                </button>

                <button
                  onClick={() => setPaymentMethod("TRANSFER")}
                  className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
                    paymentMethod === "TRANSFER"
                      ? "border-primary bg-primary-container/20 shadow-sm"
                      : "border-outline-variant bg-surface-container-lowest hover:border-outline shadow-sm"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="material-symbols-outlined text-4xl text-secondary" aria-hidden>account_balance</span>
                    {paymentMethod === "TRANSFER" && (
                      <span className="material-symbols-outlined text-2xl text-primary" aria-hidden>check_circle</span>
                    )}
                  </div>
                  <p className="text-title-md font-title-md font-bold text-on-surface mt-3">Transfer Bank</p>
                  <p className="text-body-sm font-body-sm text-secondary mt-1">
                    Transfer ke rekening koperasi.
                  </p>
                </button>
              </div>
            </div>

            {/* Total & tombol pesan */}
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-sm">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-label-md font-label-md text-secondary">
                    Harga barang ({totalItems} barang)
                  </span>
                  <span className="text-label-md font-label-md font-bold text-on-surface">
                    Rp {totalPrice.toLocaleString("id-ID")}
                  </span>
                </div>

                {isDelivery && (
                  <div className="flex items-center justify-between">
                    <span className="text-label-md font-label-md text-secondary">Ongkos kirim</span>
                    {deliveryDistanceKm === null ? (
                      <span className="text-label-sm font-label-sm text-secondary">
                        Tandai titik rumah dulu
                      </span>
                    ) : deliveryFee === 0 ? (
                      <span className="text-label-md font-label-md font-bold text-tertiary">Gratis</span>
                    ) : (
                      <span className="text-label-md font-label-md font-bold text-on-surface">
                        Rp {deliveryFee.toLocaleString("id-ID")}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-outline-variant/30">
                  <span className="text-label-lg font-label-lg font-bold text-on-surface">Total bayar</span>
                  <span className="text-headline-sm font-headline-sm font-black text-primary">
                    Rp {grandTotal.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              {submitError && (
                <div className="mt-5 p-4 bg-error-container border border-error/20 rounded-xl shadow-sm">
                  <p className="text-body-md font-body-md font-bold text-on-error-container">{submitError}</p>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={isSubmitting || (!!user && isOutOfRange) || items.length === 0}
                className="mt-6 w-full min-h-[56px] bg-primary hover:bg-surface-tint active:bg-primary text-on-primary rounded-full text-title-md font-title-md font-extrabold transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer shadow-sm flex items-center justify-center gap-2"
              >
                {isSubmitting
                  ? "Mengirim pesanan..."
                  : !user
                  ? "Masuk untuk Pesan"
                  : isOutOfRange
                  ? "Di Luar Jangkauan Antar"
                  : "Pesan Sekarang"}
                {!isSubmitting && (!user || !isOutOfRange) && (
                  <span className="material-symbols-outlined text-[20px]" aria-hidden>send</span>
                )}
              </button>
              <p className="text-body-sm font-body-sm text-secondary text-center mt-4">
                Setelah menekan tombol, pengurus koperasi menerima pesanan Anda
                {displayPhone(user, customer) ? " dan mengabari lewat WhatsApp" : ""}.
              </p>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
