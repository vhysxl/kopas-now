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
  const isLoading = useUserStore((state) => state.isLoading);

  const [koperasiList, setKoperasiList] = useState<KoperasiLocation[]>([]);
  const [sortedList, setSortedList] = useState<(KoperasiLocation & { distance: number })[]>([]);
  const [productsByKoperasi, setProductsByKoperasi] = useState<Record<string, KopasnowProduct[]>>({});
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-red-500 selection:text-white flex flex-col">
      {/* Navbar / Header */}
      <header className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-50">
        <div className="w-full h-1 flex">
          <div className="flex-1 bg-[#CE1126]" />
          <div className="flex-1 bg-white" />
        </div>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#CE1126] to-[#A50E1E] flex items-center justify-center text-white shadow-md shadow-red-500/10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
                />
              </svg>
            </div>
            <span className="font-bold text-lg text-slate-800 tracking-tight">
              Kopas<span className="text-[#CE1126]">Now</span>
            </span>
          </div>

          <form action={signOutAction}>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-red-600 hover:text-white border border-red-200 hover:bg-[#CE1126] hover:border-[#CE1126] rounded-xl transition-all duration-200 cursor-pointer"
            >
              Keluar
            </button>
          </form>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 flex flex-col gap-6">
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
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-100 text-center text-xs text-slate-400 bg-white">
        &copy; 2026 KopasNow. Hak Cipta Dilindungi Undang-Undang.
      </footer>
    </div>
  );
}
