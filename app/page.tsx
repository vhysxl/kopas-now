"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useUserStore } from "@/store/useUserStore";
import { useCartStore, cartTotalItems } from "@/store/useCartStore";
import { getKoperasiList } from "@/server/actions/getKoperasi";
import { getAllActiveProducts, type KopasnowProduct } from "@/server/actions/getProducts";
import { sortByDistance, getLocationName } from "@/utils/helper/geo";
import type { KoperasiLocation } from "@/utils/helper/geo";
import KoperasiList from "@/components/kopasnow/KoperasiList";
import BottomNav from "@/components/kopasnow/BottomNav";

// Dynamic import — Leaflet requires `window`, cannot SSR.
// Peta hanya dimuat saat pengguna menekan "Lihat Peta" (hemat kuota & RAM HP low-end).
const KoperasiMap = dynamic(
  () => import("@/components/kopasnow/KoperasiMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full rounded-2xl bg-slate-100 animate-pulse flex items-center justify-center border border-slate-200">
        <p className="text-base text-slate-500 font-medium">Sedang membuka peta...</p>
      </div>
    ),
  }
);

// Status izin lokasi disimpan supaya kartu persetujuan tidak muncul berulang
const LOCATION_CONSENT_KEY = "kopasnow-izin-lokasi";
type LocationConsent = "unknown" | "granted" | "denied";

export default function Home() {
  const user = useUserStore((state) => state.user);
  const customer = useUserStore((state) => state.customer);
  const isLoading = useUserStore((state) => state.isLoading);
  const cartItems = useCartStore((state) => state.items);
  const cartHydrated = useCartStore((state) => state._hasHydrated);

  const [koperasiList, setKoperasiList] = useState<KoperasiLocation[]>([]);
  const [productsByKoperasi, setProductsByKoperasi] = useState<Record<string, KopasnowProduct[]>>({});
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [locationConsent, setLocationConsent] = useState<LocationConsent>("unknown");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const nama = customer?.nama || user?.email?.split("@")[0] || "Anggota";
  const totalCartItems = cartHydrated ? cartTotalItems(cartItems) : 0;

  // Fetch koperasi and products data on mount
  useEffect(() => {
    async function fetchData() {
      setIsFetching(true);
      const [koperasiResult, productsResult] = await Promise.all([
        getKoperasiList(),
        getAllActiveProducts(),
      ]);

      if (koperasiResult.error) {
        setError(koperasiResult.error);
      } else if (koperasiResult.data) {
        setKoperasiList(koperasiResult.data);
      }

      if (productsResult.data) {
        const grouped = productsResult.data.reduce((acc, product) => {
          if (!acc[product.koperasi_id]) {
            acc[product.koperasi_id] = [];
          }
          acc[product.koperasi_id].push(product);
          return acc;
        }, {} as Record<string, KopasnowProduct[]>);
        setProductsByKoperasi(grouped);
      }

      setIsFetching(false);
    }
    fetchData();
  }, []);

  // Urutkan dari yang terdekat begitu lokasi pengguna diketahui
  const sortedList = useMemo(() => {
    if (userLocation && koperasiList.length > 0) {
      return sortByDistance(koperasiList, userLocation[0], userLocation[1]);
    }
    return koperasiList.map((k) => ({ ...k, distance: 0 }));
  }, [koperasiList, userLocation]);

  const handleUserLocationChange = useCallback(async (lat: number, lng: number) => {
    setUserLocation([lat, lng]);
    const locName = await getLocationName(lat, lng);
    if (locName) {
      setLocationName(locName);
    }
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("HP Anda tidak mendukung fitur lokasi.");
      return;
    }
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        localStorage.setItem(LOCATION_CONSENT_KEY, "granted");
        setLocationConsent("granted");
        handleUserLocationChange(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        localStorage.setItem(LOCATION_CONSENT_KEY, "denied");
        setLocationConsent("denied");
        setLocationError(
          "Lokasi belum menyala. Koperasi tetap bisa dilihat, tapi tidak urut dari yang terdekat."
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [handleUserLocationChange]);

  const handleDeclineLocation = useCallback(() => {
    localStorage.setItem(LOCATION_CONSENT_KEY, "denied");
    setLocationConsent("denied");
  }, []);

  // Pulihkan keputusan izin lokasi; jika sudah pernah setuju,
  // langsung minta posisi tanpa menampilkan kartu persetujuan lagi
  useEffect(() => {
    async function restoreConsent() {
      const saved = (await Promise.resolve(
        localStorage.getItem(LOCATION_CONSENT_KEY)
      )) as LocationConsent | null;
      if (saved === "granted") {
        setLocationConsent("granted");
        requestLocation();
      } else if (saved === "denied") {
        setLocationConsent("denied");
      }
    }
    restoreConsent();
  }, [requestLocation]);

  // Saring daftar koperasi berdasarkan kata pencarian (nama koperasi / nama barang)
  const filteredList = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return sortedList;
    return sortedList.filter((k) => {
      if (k.nama.toLowerCase().includes(query)) return true;
      const products = productsByKoperasi[k.id] || [];
      return products.some((p) => p.nama_produk.toLowerCase().includes(query));
    });
  }, [sortedList, productsByKoperasi, searchQuery]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#CE1126]"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Middleware handles redirect
  }

  return (
    <div className="min-h-screen bg-[#F6F6F6] font-sans flex flex-col text-slate-900 pb-24 md:pb-0">
      {/* Garis bendera Merah Putih */}
      <div className="w-full h-1.5 flex fixed top-0 left-0 z-50">
        <div className="w-1/2 bg-[#CE1126]" />
        <div className="w-1/2 bg-white border-b border-slate-200" />
      </div>

      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-1.5 z-40">
        <div className="max-w-2xl lg:max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/" className="flex flex-col">
            <span className="text-2xl font-black tracking-tight leading-none">
              <span className="text-slate-900">Kopas</span>
              <span className="text-[#CE1126]">Now</span>
            </span>
            <span className="text-sm font-semibold text-slate-500">Koperasi Desa</span>
          </Link>

          {/* Navigasi desktop: selalu ikon + label */}
          <nav className="hidden md:flex items-center gap-2">
            <Link
              href="/orders"
              className="min-h-[48px] px-4 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200 rounded-xl flex items-center gap-2 text-base font-bold transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Pesanan Saya
            </Link>
            <Link
              href="/keranjang"
              className="relative min-h-[48px] px-4 bg-[#CE1126] hover:bg-[#A50E1E] text-white rounded-xl flex items-center gap-2 text-base font-bold transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
              Keranjang
              {totalCartItems > 0 && (
                <span className="min-w-[24px] h-6 px-1.5 bg-white text-[#CE1126] text-sm font-black rounded-full flex items-center justify-center">
                  {totalCartItems}
                </span>
              )}
            </Link>
            <Link
              href="/akun"
              className="min-h-[48px] px-4 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200 rounded-xl flex items-center gap-2 text-base font-bold transition-colors"
            >
              <span className="w-7 h-7 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-sm font-bold text-[#CE1126]">
                {nama.charAt(0).toUpperCase()}
              </span>
              Akun
            </Link>
          </nav>

          {/* Di HP, keranjang cepat di header; menu lain lewat navigasi bawah */}
          <Link
            href="/keranjang"
            className="md:hidden relative w-12 h-12 bg-[#CE1126] text-white rounded-xl flex items-center justify-center"
            aria-label={`Keranjang, ${totalCartItems} barang`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            {totalCartItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] px-1 bg-white text-[#CE1126] text-sm font-black rounded-full flex items-center justify-center border-2 border-[#CE1126]">
                {totalCartItems}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-2xl lg:max-w-4xl w-full mx-auto px-4 py-6 flex flex-col gap-5">
        {/* Sapaan & judul tugas */}
        <div>
          <p className="text-base text-slate-600">Halo, <strong>{nama}</strong>!</p>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Mau belanja apa hari ini?
          </h1>
        </div>

        {/* Pencarian barang */}
        <div className="relative">
          <span className="absolute inset-y-0 left-4 flex items-center text-slate-400 pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari barang, contoh: beras, minyak"
            className="w-full h-14 pl-13 pr-4 bg-white border-2 border-slate-200 focus:border-[#CE1126] rounded-xl text-base text-slate-900 placeholder-slate-400 outline-none"
          />
        </div>

        {/* Kartu persetujuan lokasi (priming sebelum dialog izin browser) */}
        {locationConsent === "unknown" && (
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-5">
            <div className="flex items-start gap-3">
              <span className="text-3xl">📍</span>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-slate-900">
                  Boleh kami tahu lokasi Anda?
                </h2>
                <p className="text-base text-slate-600 mt-1">
                  Supaya kami bisa menunjukkan koperasi yang paling dekat dari
                  rumah Anda. HP Anda akan bertanya — pilih <strong>Izinkan</strong>.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={requestLocation}
                className="flex-1 min-h-[52px] bg-[#CE1126] hover:bg-[#A50E1E] text-white rounded-xl text-base font-bold transition-colors cursor-pointer"
              >
                Ya, Boleh
              </button>
              <button
                onClick={handleDeclineLocation}
                className="flex-1 min-h-[52px] bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-300 rounded-xl text-base font-bold transition-colors cursor-pointer"
              >
                Nanti Saja
              </button>
            </div>
          </div>
        )}

        {/* Status lokasi */}
        {locationConsent === "granted" && userLocation && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <span className="text-xl">📍</span>
            <p className="text-base text-emerald-900">
              {locationName ? (
                <>Lokasi Anda: <strong>{locationName}</strong>. Koperasi diurutkan dari yang paling dekat.</>
              ) : (
                <>Lokasi ditemukan. Koperasi diurutkan dari yang paling dekat.</>
              )}
            </p>
          </div>
        )}

        {locationConsent === "denied" && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <p className="text-base text-amber-900">
              {locationError || "Lokasi belum menyala, jadi koperasi tidak urut dari yang terdekat."}
            </p>
            <button
              onClick={requestLocation}
              className="mt-2 min-h-[48px] px-5 bg-white hover:bg-amber-100 text-amber-900 border-2 border-amber-300 rounded-xl text-base font-bold transition-colors cursor-pointer"
            >
              Nyalakan Lokasi
            </button>
          </div>
        )}

        {/* Daftar koperasi (konten utama) */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-900">
              {searchQuery.trim()
                ? `Koperasi yang menjual "${searchQuery.trim()}"`
                : userLocation
                ? "Koperasi Paling Dekat"
                : "Daftar Koperasi"}
            </h2>
          </div>

          {isFetching ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-40 rounded-2xl bg-slate-200/60 animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="bg-white rounded-2xl border-2 border-red-200 p-6 text-center">
              <div className="text-4xl mb-2">😕</div>
              <p className="text-lg font-bold text-slate-900">Daftar koperasi belum bisa dimuat</p>
              <p className="text-base text-slate-600 mt-1">
                Periksa sambungan internet Anda, lalu tekan tombol di bawah.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 min-h-[52px] px-8 bg-[#CE1126] hover:bg-[#A50E1E] text-white rounded-xl text-base font-bold transition-colors cursor-pointer"
              >
                Coba Lagi
              </button>
            </div>
          ) : (
            <KoperasiList
              koperasiList={filteredList}
              productsByKoperasi={productsByKoperasi}
              hasLocation={!!userLocation}
              searchQuery={searchQuery}
            />
          )}
        </section>

        {/* Peta: pilihan, bukan keharusan */}
        {!isFetching && !error && koperasiList.length > 0 && (
          <section>
            <button
              onClick={() => setShowMap((v) => !v)}
              className="w-full min-h-[52px] bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-300 rounded-xl text-base font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span className="text-xl">🗺️</span>
              {showMap ? "Tutup Peta" : "Lihat Letak Koperasi di Peta"}
            </button>
            {showMap && (
              <div className="w-full h-[45vh] min-h-[300px] max-h-[460px] mt-3">
                <KoperasiMap
                  koperasiList={koperasiList}
                  userPosition={userLocation}
                  onUserLocationChange={handleUserLocationChange}
                />
              </div>
            )}
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-200 text-center text-sm text-slate-500 bg-white shrink-0 mt-8">
        &copy; 2026 KopasNow — Koperasi Desa Merah Putih
      </footer>

      <BottomNav />
    </div>
  );
}
