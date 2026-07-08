"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useUserStore } from "@/store/useUserStore";
import { signOutAction } from "@/server/actions/auth";
import { getKoperasiList } from "@/server/actions/getKoperasi";
import { getAllActiveProducts, type KopasnowProduct } from "@/server/actions/getProducts";
import { sortByDistance, getLocationName } from "@/utils/helper/geo";
import type { KoperasiLocation } from "@/utils/helper/geo";
import KoperasiList from "@/components/kopasnow/KoperasiList";

// Dynamic import — Leaflet requires `window`, cannot SSR
const KoperasiMap = dynamic(
  () => import("@/components/kopasnow/KoperasiMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full rounded-2xl bg-slate-100 animate-pulse flex items-center justify-center border border-slate-200">
        <div className="text-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mx-auto text-slate-300 mb-2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
          </svg>
          <p className="text-xs text-slate-400 font-medium">Memuat peta...</p>
        </div>
      </div>
    ),
  }
);

export default function Home() {
  const user = useUserStore((state) => state.user);
  const customer = useUserStore((state) => state.customer);
  const isLoading = useUserStore((state) => state.isLoading);

  // States from original page
  const [koperasiList, setKoperasiList] = useState<KoperasiLocation[]>([]);
  const [sortedList, setSortedList] = useState<(KoperasiLocation & { distance: number })[]>([]);
  const [productsByKoperasi, setProductsByKoperasi] = useState<Record<string, KopasnowProduct[]>>({});
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI States from new layout
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [lastOrderDetails, setLastOrderDetails] = useState<any>(null);

  // Derived user data
  const nama = customer?.nama || user?.email?.split('@')[0] || "Anggota";
  const email = user?.email || "-";
  const phone = customer?.phone || "-";
  const joinedDate = customer?.created_at ? new Date(customer.created_at).toLocaleDateString("id-ID") : "-";
  const cartTotalItems = 0; // Mockup

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
        // Group products by koperasi_id
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

  // Re-sort when user location changes
  useEffect(() => {
    if (userLocation && koperasiList.length > 0) {
      const sorted = sortByDistance(koperasiList, userLocation[0], userLocation[1]);
      setSortedList(sorted);
    } else {
      // No user location — show all with 0 distance
      setSortedList(koperasiList.map((k) => ({ ...k, distance: 0 })));
    }
  }, [koperasiList, userLocation]);

  const handleUserLocationChange = useCallback(async (lat: number, lng: number) => {
    setUserLocation([lat, lng]);
    // Reverse geocode in background
    const locName = await getLocationName(lat, lng);
    if (locName) {
      setLocationName(locName);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#CE1126]"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Middleware will handle redirecting to /auth
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-red-500 selection:text-white flex flex-col relative overflow-x-hidden">
      {/* Top Banner (Merah Putih Decor) */}
      <div className="w-full h-1.5 flex fixed top-0 left-0 z-50">
        <div className="flex-1 bg-[#CE1126]" />
        <div className="flex-1 bg-white border-b border-slate-100" />
      </div>

      {/* Header */}
      <header className="bg-white border-b border-slate-100 shadow-sm sticky top-1.5 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#CE1126] to-[#A50E1E] flex items-center justify-center text-white shadow-md shadow-red-500/10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
                />
              </svg>
            </div>
            <span className="font-extrabold text-base text-slate-800 tracking-tight cursor-pointer" onClick={() => setIsProfileOpen(false)}>
              Kopas<span className="text-[#CE1126]">Now</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Cart Trigger */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-slate-600 hover:text-[#CE1126] hover:bg-red-50 rounded-xl transition-all duration-200 cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5.5 h-5.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
                />
              </svg>
              {cartTotalItems > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#CE1126] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                  {cartTotalItems}
                </span>
              )}
            </button>

            {/* Profile Toggle Card */}
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="w-8 h-8 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-sm font-bold text-[#CE1126] hover:bg-[#CE1126] hover:text-white transition-all cursor-pointer shadow-sm"
            >
              {nama.charAt(0).toUpperCase()}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 flex flex-col justify-start">
        {isProfileOpen ? (
          /* Profile / Welcome Card */
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-100 border border-slate-100 overflow-hidden my-6">
            <div className="p-8 sm:p-12 text-center max-w-2xl mx-auto">
              {/* User Avatar Circle */}
              <div className="w-20 h-20 rounded-full bg-red-50 text-[#CE1126] flex items-center justify-center mx-auto mb-6 border border-red-100 shadow-inner">
                <span className="text-2xl font-bold uppercase tracking-wider">
                  {nama.charAt(0)}
                </span>
              </div>

              <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                Selamat Datang, <span className="text-[#CE1126]">{nama}</span>!
              </h2>
              <p className="text-slate-500 mt-2 text-sm sm:text-base">
                Terima kasih telah menjadi bagian dari Koperasi Merah Putih KopasNow. Akun Anda telah
                terverifikasi secara digital di platform kami.
              </p>

              <div className="w-16 h-1 bg-[#CE1126] rounded-full mx-auto my-8" />

              {/* Profile Info Details Grid */}
              <div className="bg-slate-50 rounded-2xl p-6 text-left border border-slate-100 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200/60 pb-2">
                  Informasi Keanggotaan
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-0.5">
                    <span className="text-xs text-slate-400 block font-medium">Nama Anggota</span>
                    <span className="text-sm font-semibold text-slate-800">{nama}</span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-xs text-slate-400 block font-medium">Status</span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Aktif
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-xs text-slate-400 block font-medium">Email</span>
                    <span className="text-sm font-semibold text-slate-800 break-all">{email}</span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-xs text-slate-400 block font-medium">No. Telepon / HP</span>
                    <span className="text-sm font-semibold text-slate-800">{phone}</span>
                  </div>

                  <div className="space-y-0.5 sm:col-span-2">
                    <span className="text-xs text-slate-400 block font-medium">Tanggal Bergabung</span>
                    <span className="text-sm font-semibold text-slate-800">{joinedDate}</span>
                  </div>
                </div>
              </div>

              {/* Platform Shortcuts Info */}
              <div className="mt-8 text-xs text-slate-400 font-medium">
                Sistem Core Koperasi ID: <span className="font-mono text-slate-500">{user.id}</span>
              </div>
              
              {/* Logout Button */}
              <form action={signOutAction} className="mt-8">
                <button
                  type="submit"
                  className="w-full bg-[#CE1126] hover:bg-[#A50E1E] text-white py-3 px-4 font-bold text-sm rounded-xl transition-all cursor-pointer text-center shadow-xs"
                >
                  Keluar Akun
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Section Title */}
            <div>
              <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
                Temukan <span className="text-[#CE1126]">Koperasi</span> Terdekat
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {locationName ? (
                  <span>Anda di <strong>{locationName}</strong>, ada {sortedList.length} koperasi disini</span>
                ) : userLocation ? (
                  <span>{sortedList.length} koperasi ditemukan di sekitar Anda</span>
                ) : (
                  <span>Aktifkan lokasi untuk melihat jarak ke koperasi</span>
                )}
              </p>
            </div>

            {/* Map */}
            <div className="w-full h-[50vh] min-h-[320px] max-h-[500px]">
              {isFetching ? (
                <div className="w-full h-full rounded-2xl bg-slate-100 animate-pulse flex items-center justify-center border border-slate-200">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#CE1126] mx-auto mb-2"></div>
                    <p className="text-xs text-slate-400 font-medium">Memuat data koperasi...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="w-full h-full rounded-2xl bg-red-50 flex items-center justify-center border border-red-200">
                  <div className="text-center px-6">
                    <p className="text-sm font-semibold text-red-700">Gagal memuat peta</p>
                    <p className="text-xs text-red-500 mt-1">{error}</p>
                  </div>
                </div>
              ) : (
                <KoperasiMap
                  koperasiList={koperasiList}
                  onUserLocationChange={handleUserLocationChange}
                  selectedId={selectedId}
                />
              )}
            </div>

            {/* Koperasi List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-[#CE1126]">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                  Daftar Koperasi
                </h2>
                {userLocation && (
                  <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-2 py-1 rounded-lg">
                    Urut berdasarkan jarak terdekat
                  </span>
                )}
              </div>

              {isFetching ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 rounded-2xl bg-slate-100 animate-pulse border border-slate-200" />
                  ))}
                </div>
              ) : (
                <KoperasiList
                  koperasiList={sortedList}
                  productsByKoperasi={productsByKoperasi}
                  selectedId={selectedId}
                  onSelect={(id) => setSelectedId(id === selectedId ? null : id)}
                />
              )}
            </div>
          </div>
        )}
      </main>

      {/* Checkout Success Alert Overlay Modal */}
      {checkoutSuccess && lastOrderDetails && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 text-center shadow-2xl border border-slate-100 animate-fade-in space-y-5">
            {/* Green animated checkmark badge */}
            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-100 animate-pulse-dot shadow-inner">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={3}
                stroke="currentColor"
                className="w-8 h-8"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-slate-800 tracking-tight">Checkout Berhasil!</h3>
              <p className="text-xs text-emerald-600 font-semibold">
                Simulasi Terkirim ke Pengurus via WhatsApp
              </p>
            </div>

            {/* Order details display */}
            <div className="bg-slate-50 rounded-2xl p-4 text-left border border-slate-100 text-xs space-y-2.5">
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-400 font-medium">Asal Koperasi</span>
                <span className="font-bold text-slate-700 truncate max-w-[180px]">{lastOrderDetails.coopName}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Ringkasan Barang</span>
                <div className="max-h-24 overflow-y-auto space-y-1 font-medium text-slate-600">
                  {lastOrderDetails.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between">
                      <span>• {item.name}</span>
                      <span className="font-bold text-slate-700">x{item.qty}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between border-t border-slate-200/60 pt-2 font-bold text-slate-800">
                <span>Total Bayar</span>
                <span className="text-[#CE1126]">Rp {lastOrderDetails.total.toLocaleString("id-ID")}</span>
              </div>
            </div>

            {/* WA Notification message mockup details */}
            <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl text-left text-[10px] text-emerald-700 leading-normal flex items-start gap-2.5">
              <span className="text-lg leading-none shrink-0 mt-0.5">💬</span>
              <p className="font-medium">
                <strong>[Simulasi WA]</strong> Pesan notifikasi pemesanan otomatis berhasil di-push ke nomor pengurus koperasi (Fonnte Gateway). Pengurus akan segera memverifikasi dan menyiapkan pesanan Anda.
              </p>
            </div>

            <button
              onClick={() => setCheckoutSuccess(false)}
              className="w-full bg-[#CE1126] text-white py-3 px-4 font-bold text-xs rounded-xl hover:bg-[#A50E1E] transition-colors shadow-sm cursor-pointer"
            >
              Kembali Belanja
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-5 border-t border-slate-100 text-center text-[10px] text-slate-400 bg-white shrink-0 mt-6">
        &copy; 2026 KopasNow. Hak Cipta Dilindungi Undang-Undang.
      </footer>
    </div>
  );
}
