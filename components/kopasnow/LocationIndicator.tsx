"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocationStore } from "@/store/useLocationStore";
import { searchAddress, getLocationName, type AddressSuggestion } from "@/utils/helper/geo";

const LOCATION_CONSENT_KEY = "kopasnow-izin-lokasi";

/**
 * Bendera lokasi di navbar — satu-satunya tempat mengatur titik acuan.
 *
 * Labelnya ikut berubah otomatis setiap titik acuan diperbarui (GPS, alamat
 * yang dipilih, atau penanda yang digeser di peta koperasi). Menekannya
 * membuka pencarian alamat dengan saran, pola yang sama seperti isian alamat
 * di halaman checkout supaya pengguna hanya perlu belajar satu cara.
 */
export default function LocationIndicator() {
  const lat = useLocationStore((s) => s.lat);
  const label = useLocationStore((s) => s.label);
  const hasHydrated = useLocationStore((s) => s._hasHydrated);
  const setLocation = useLocationStore((s) => s.setLocation);
  const setLabel = useLocationStore((s) => s.setLabel);

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasLocation = lat !== null;

  // Saran alamat, ditunda 600 ms sesuai batas pemakaian Nominatim
  useEffect(() => {
    const q = query.trim();
    let cancelled = false;

    const timer = setTimeout(async () => {
      if (q.length < 3) {
        setSuggestions([]);
        return;
      }
      setIsSearching(true);
      const results = await searchAddress(q);
      if (cancelled) return;
      setSuggestions(results);
      setIsSearching(false);
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openPanel = () => {
    setIsOpen(true);
    setError(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const pickSuggestion = (item: AddressSuggestion) => {
    // Ambil bagian pertama alamat sebagai label ringkas untuk navbar
    setLocation({
      lat: item.lat,
      lng: item.lng,
      label: item.address.split(",")[0],
      source: "city",
    });
    setIsOpen(false);
    setQuery("");
    setSuggestions([]);
  };

  const applyGpsPosition = useCallback(
    async (latitude: number, longitude: number) => {
      setLocation({ lat: latitude, lng: longitude, source: "gps" });
      const name = await getLocationName(latitude, longitude);
      if (name) setLabel(name);
    },
    [setLocation, setLabel]
  );

  const requestGps = useCallback(() => {
    if (!navigator.geolocation) {
      setError("HP Anda tidak mendukung fitur lokasi.");
      return;
    }
    setIsLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        localStorage.setItem(LOCATION_CONSENT_KEY, "granted");
        setIsLocating(false);
        setIsOpen(false);
        await applyGpsPosition(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        localStorage.setItem(LOCATION_CONSENT_KEY, "denied");
        setIsLocating(false);
        setError("Lokasi belum menyala. Tulis nama daerah Anda di kotak di atas.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [applyGpsPosition]);

  // Kalau pengguna pernah mengizinkan lokasi tapi titiknya belum ada
  // (mis. penyimpanan browser dibersihkan), ambil ulang diam-diam.
  useEffect(() => {
    if (!hasHydrated || hasLocation) return;
    if (localStorage.getItem(LOCATION_CONSENT_KEY) !== "granted") return;
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => applyGpsPosition(pos.coords.latitude, pos.coords.longitude),
      () => {
        /* diam saja: pengguna masih bisa mengatur lokasi lewat tombol ini */
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [hasHydrated, hasLocation, applyGpsPosition]);

  if (!hasHydrated) {
    return <div className="w-11 h-11 md:w-40 md:h-11" aria-hidden />;
  }

  const text = hasLocation ? label || "Titik ditandai" : "Atur lokasi";

  return (
    <div className="relative" ref={containerRef}>
      <div 
        onClick={openPanel}
        className="flex items-center gap-2 cursor-pointer group"
      >
        <span className="material-symbols-outlined text-primary" aria-hidden>
          location_on
        </span>
        <div className="flex flex-col">
          <span className="font-label-sm text-label-sm text-secondary">Lokasi Pengiriman</span>
          <div className="flex items-center gap-1">
            <span className="font-label-md text-label-md font-bold truncate max-w-[140px] md:max-w-[200px]">
              {text}
            </span>
            <span className="material-symbols-outlined text-sm transition-transform group-hover:translate-y-0.5" aria-hidden>
              expand_more
            </span>
          </div>
        </div>
      </div>

      {isOpen && (
        // Mobile: panel dipatok ke tepi layar (fixed, bermargin kiri-kanan) agar
        // tidak meluber keluar layar saat tombolnya ada di tengah barisan navbar.
        // sm ke atas: kembali menempel di bawah tombol (absolute, rata kanan).
        <div className="fixed left-3 right-3 top-[4.5rem] w-auto sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-[min(92vw,24rem)] bg-surface-container-lowest border-2 border-outline-variant rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="p-4 border-b border-surface-variant">
            <div className="sm:hidden flex items-center gap-2 mb-3 bg-surface-container-low px-3 py-2 rounded-lg border border-surface-variant">
              <span className="material-symbols-outlined text-primary text-[20px]">location_on</span>
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs text-secondary font-medium">Lokasi Anda</span>
                <span className="text-sm font-bold text-on-surface truncate">{text}</span>
              </div>
            </div>
            <h2 className="text-base font-bold text-on-surface mb-1">Di mana lokasi Anda?</h2>
            <p className="text-base text-secondary mb-3">
              Supaya kami bisa menunjukkan koperasi terdekat.
            </p>

            <label htmlFor="cari-lokasi" className="sr-only">
              Nama desa, kecamatan, atau kota
            </label>
            <div className="relative">
              <span
                className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px] pointer-events-none"
                aria-hidden
              >
                search
              </span>
              <input
                id="cari-lokasi"
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tulis nama desa atau kota, contoh: Cikarang"
                className="w-full min-h-[48px] bg-surface border-2 border-outline-variant focus:border-primary rounded-xl pl-10 pr-4 text-base text-on-surface outline-none"
              />
            </div>

            {isSearching && (
              <p className="text-base text-secondary mt-2">Mencari alamat...</p>
            )}
            {error && <p className="text-base text-error mt-2">{error}</p>}
          </div>

          {suggestions.length > 0 && (
            <ul className="max-h-64 overflow-y-auto divide-y divide-surface-variant">
              {suggestions.map((item, idx) => (
                <li key={`${item.lat}-${item.lng}-${idx}`}>
                  <button
                    onClick={() => pickSuggestion(item)}
                    className="w-full text-left px-4 py-3 min-h-[52px] flex items-center gap-3 text-base text-on-surface hover:bg-surface-container-low cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-primary shrink-0">
                      <span className="material-symbols-outlined text-[16px]" aria-hidden>location_on</span>
                    </div>
                    <span className="flex-1">{item.address}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button
            onClick={requestGps}
            disabled={isLocating}
            className="w-full min-h-[52px] px-4 border-t border-surface-variant text-base font-bold text-primary hover:bg-surface-container-low flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden>
              my_location
            </span>
            {isLocating ? "Mencari lokasi Anda..." : "Lokasi Saya Sekarang"}
          </button>

          <p className="px-4 py-3 text-sm text-secondary bg-surface-container-low border-t border-surface-variant">
            Bisa juga tekan &quot;Tandai titik sendiri&quot; pada peta Koperasi Terdekat.
          </p>
        </div>
      )}
    </div>
  );
}
