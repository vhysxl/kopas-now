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

  // Compute rider coordinates along route (simplified for now)
  const riderCoords = useMemo(() => {
    // Simplified animation - can be enhanced with actual coordinates later
    return { x: 180 + (riderProgress * 0.5), y: 160 - (riderProgress * 0.3) };
  }, [riderProgress]);

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
    <div className="min-h-screen bg-[#F6F6F6] font-sans selection:bg-[#CE1126] selection:text-white flex flex-col relative overflow-x-hidden text-black">
      {/* Top Banner (Merah Putih Decor) */}
      <div className="w-full h-1 flex fixed top-0 left-0 z-50">
        <div className="w-1/2 bg-[#CE1126]" />
        <div className="w-1/2 bg-white" />
      </div>

      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-1 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* Logo & Delivery Toggle */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1 cursor-pointer" onClick={() => setSelectedCoopId("all")}>
              <span className="text-2xl font-black tracking-tight text-black">Kopas</span>
              <span className="text-2xl font-black tracking-tight text-[#CE1126]">Now</span>
              <span className="bg-[#CE1126] text-white px-1.5 py-0.5 rounded-sm font-bold text-[9px] uppercase tracking-wider ml-1">
                Mart
              </span>
            </div>

            {/* Delivery vs Pickup Toggle (Uber Eats Style) */}
            <div className="hidden sm:flex bg-[#F3F3F3] p-1 rounded-full border border-gray-100">
              <button
                onClick={() => setDeliveryMethod("delivery")}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
                  deliveryMethod === "delivery"
                    ? "bg-black text-white shadow-sm"
                    : "text-gray-500 hover:text-black"
                }`}
              >
                Kirim
              </button>
              <button
                onClick={() => setDeliveryMethod("pickup")}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
                  deliveryMethod === "pickup"
                    ? "bg-black text-white shadow-sm"
                    : "text-gray-500 hover:text-black"
                }`}
              >
                Ambil
              </button>
            </div>
          </div>

     {/* Hyperlocal Address Selector */}
        <div className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#F3F3F3] hover:bg-[#EAEAEA] transition-all cursor-pointer text-xs font-bold text-black">
            <span className="text-sm">📍</span>
            <span className="truncate max-w-[200px]">
              {locationName}
            </span>
          <svg
   className="w-3 h-3 text-gray-500 shrink-0"
     fill="none"
     stroke="currentColor"
        strokeWidth="2.5"
     viewBox="0 0 24 24"
   >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
 </div>

          {/* Right Header Navigation */}
          <div className="flex items-center gap-3">
            {/* Riwayat Pemesanan */}
            <Link
              href="/orders"
              className="relative px-4 py-2 bg-white hover:bg-slate-50 text-black border border-slate-200 rounded-full transition-all duration-200 cursor-pointer flex items-center gap-2 text-xs font-bold"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
                />
              </svg>
            </div>
            <span className="font-extrabold text-base text-slate-800 tracking-tight cursor-pointer" onClick={() => setIsProfileOpen(false)}>
              Kopas<span className="text-[#CE1126]">Now</span>
            </span>
          </div>

            {/* Cart Trigger */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative px-4 py-2 bg-black hover:bg-neutral-800 text-white rounded-full transition-all duration-200 cursor-pointer flex items-center gap-2 text-xs font-bold"
            >
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
                  d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
                />
              </svg>
              <span>Keranjang</span>
              {cartTotalItems > 0 && (
                <span className="w-5 h-5 bg-[#CE1126] text-white text-[10px] font-black rounded-full flex items-center justify-center border border-black animate-scale-in">
                  {cartTotalItems}
                </span>
              )}
            </button>

            {/* Profile Avatar Trigger */}
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

      {/* Checkout Success Screen with Real-time Scooter Animation map (Uber style tracking) */}
      {checkoutSuccess && lastOrderDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 text-center shadow-2xl border border-gray-100 animate-fade-in space-y-5 text-black">
            
            {/* Header info */}
            <div className="space-y-1">
              <div className="w-12 h-12 bg-red-50 text-[#CE1126] rounded-full flex items-center justify-center mx-auto border border-red-100 shadow-inner">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={3}
                  stroke="currentColor"
                  className="w-6 h-6 animate-pulse"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h3 className="text-base font-black text-black tracking-tight mt-2">Pesanan Sedang Diproses</h3>
              <p className="text-[10px] text-red-600 font-extrabold uppercase tracking-wider">
                Pengantaran Hyperlocal Real-Time
              </p>
            </div>

            {/* Interactive Live Tracking Map with Rider Scooter emoji animation */}
            <div className="bg-[#E5E9F0] h-44 rounded-2xl relative overflow-hidden shadow-inner border border-gray-200">
              <svg className="w-full h-full" viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Background Roads / Map outline */}
                <path d="M 0,150 Q 150,150 200,80 T 400,200" stroke="#CBD5E1" strokeWidth="8" fill="none" />
                <path d="M 200,0 Q 180,120 180,180 T 300,300" stroke="#CBD5E1" strokeWidth="6" fill="none" />
                
    {/* Store Pin (Origin) */}
<g transform="translate(140, 110)">
               <circle r="12" fill="#CE1126" fillOpacity="0.2" className="animate-pulse" />
  <circle r="7" fill="#CE1126" />
                  <text y="3" fontSize="8" fontWeight="bold" fill="white" textAnchor="middle">S</text>
                </g>

                {/* User Location (Destination) */}
                <g transform="translate(180, 160)">
                  <circle r="12" fill="#3B82F6" fillOpacity="0.2" />
                  <circle r="7" fill="#3B82F6" />
                  <text y="3" fontSize="8" fontWeight="bold" fill="white" textAnchor="middle">H</text>
                </g>

 {/* Path Dotted Rider track */}
             {lastOrderDetails && (
            <path
     d="M 140 110 L 180 160"
         stroke="#000000"
    strokeWidth="2.5"
          strokeDasharray="4 4"
     fill="none"
         />
       )}

                {/* Animated Rider Scooter Emoji */}
                <g transform={`translate(${riderCoords.x}, ${riderCoords.y})`} className="transition-all duration-150">
                  <circle r="11" fill="white" shadow-md="true" />
                  <text y="4" fontSize="11" textAnchor="middle" className="animate-bounce">🛵</text>
                </g>
              </svg>

              {/* Float Map Overlay Progress */}
              <div className="absolute top-2 left-2 bg-black/90 text-white px-2.5 py-1 rounded text-[8px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                <span className="w-1.5 h-1.5 bg-[#CE1126] rounded-full animate-ping" />
                <span>KURIR: {riderProgress}% TRANSIT</span>
              </div>
            </div>

            {/* Dynamic Status Progress Tracker based on riderProgress */}
            <div className="text-left bg-slate-50 border border-gray-100 p-4 rounded-2xl text-xs font-bold space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-400">Asal Toko</span>
                <span className="text-black font-extrabold">{lastOrderDetails.coopName}</span>
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

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden mt-2">
                <div
                  className="bg-[#CE1126] h-full transition-all duration-150"
                  style={{ width: `${riderProgress}%` }}
                />
              </div>

              {/* Bill Details */}
              <div className="flex justify-between border-t border-gray-150 pt-2.5 font-black text-black">
                <span>Total Bayar</span>
                <span className="text-[#CE1126]">Rp {lastOrderDetails.total.toLocaleString("id-ID")}</span>
              </div>
            </div>

            {/* WA Notification simulation details */}
            <div className="p-3 bg-red-50/50 border border-red-100 rounded-xl text-left text-[10px] text-red-800 leading-normal flex items-start gap-2.5 font-medium">
              <span className="text-base leading-none">💬</span>
              <p>
                <strong>[Simulasi Notifikasi]</strong> Struk pembelian digital telah dikirim ke nomor WhatsApp pengurus Koperasi dan Kurir via Fonnte Gateway API.
              </p>
            </div>

            <button
              onClick={() => setCheckoutSuccess(false)}
              className="w-full bg-black hover:bg-neutral-800 text-white py-3.5 font-bold text-xs rounded-full transition-all cursor-pointer"
            >
              Tutup & Belanja Lagi
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-6 border-t border-gray-100 text-center text-[10px] text-gray-400 bg-white shrink-0 mt-8 font-medium">
        &copy; 2026 KopasNow. Semua hak cipta dilindungi undang-undang.
      </footer>
    </div>
  );
}
