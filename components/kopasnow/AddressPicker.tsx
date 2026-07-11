"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { searchAddress, getFullAddress, type AddressSuggestion } from "@/utils/helper/geo";

const AddressMap = dynamic(() => import("@/components/kopasnow/AddressMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-surface-container-low animate-pulse flex items-center justify-center">
      <p className="text-body-sm font-body-sm text-secondary font-medium">Sedang membuka peta...</p>
    </div>
  ),
});

export interface AddressValue {
  address: string;
  lat: number | null;
  lng: number | null;
}

interface AddressPickerProps {
  value: AddressValue;
  onChange: (value: AddressValue) => void;
}

// Cikarang — dipakai hanya saat pengguna belum menentukan titik apa pun
const FALLBACK_POSITION: [number, number] = [-6.3, 107.15];

export default function AddressPicker({ value, onChange }: AddressPickerProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  // Menekan saran / lokasi terkini mengubah teks alamat; jangan sampai
  // perubahan itu memicu pencarian saran lagi.
  const skipNextSearch = useRef(false);

  const hasPin = value.lat !== null && value.lng !== null;
  const position: [number, number] = hasPin
    ? [value.lat as number, value.lng as number]
    : FALLBACK_POSITION;

  // Cari saran alamat, ditunda 600 ms sesuai batas pemakaian Nominatim
  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }

    const query = value.address.trim();
    let cancelled = false;

    const timer = setTimeout(async () => {
      if (query.length < 3) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setIsSearching(true);
      const results = await searchAddress(query);
      if (cancelled) return;

      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setIsSearching(false);
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value.address]);

  // Tutup dropdown saat menekan di luar
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const pickSuggestion = useCallback(
    (item: AddressSuggestion) => {
      skipNextSearch.current = true;
      onChange({ address: item.address, lat: item.lat, lng: item.lng });
      setShowSuggestions(false);
      setSuggestions([]);
    },
    [onChange]
  );

  // Penanda digeser / peta ditekan → alamat teks diperbarui dari koordinat
  const handleMapPick = useCallback(
    async (lat: number, lng: number) => {
      skipNextSearch.current = true;
      onChange({ address: value.address, lat, lng });

      const address = await getFullAddress(lat, lng);
      if (address) {
        skipNextSearch.current = true;
        onChange({ address, lat, lng });
      }
    },
    [onChange, value.address]
  );

  const useCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocateError("HP Anda tidak mendukung fitur lokasi.");
      return;
    }

    setIsLocating(true);
    setLocateError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        await handleMapPick(latitude, longitude);
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
        setLocateError(
          "Lokasi belum menyala. Tulis alamat Anda, atau tekan titik rumah Anda di peta."
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [handleMapPick]);

  return (
    <div className="space-y-4">
      {/* Input alamat + dropdown rekomendasi */}
      <div className="relative" ref={containerRef}>
        <label htmlFor="alamat" className="text-label-md font-label-md font-bold text-on-surface block mb-2">
          Alamat rumah Anda
        </label>
        <input
          id="alamat"
          type="text"
          autoComplete="street-address"
          value={value.address}
          onChange={(e) => onChange({ ...value, address: e.target.value })}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder="Ketik nama jalan atau desa, contoh: Jl. Mawar Cikarang"
          className="w-full min-h-[56px] px-4 bg-surface-container-lowest border border-outline focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-body-md font-body-md text-on-surface placeholder:text-secondary outline-none transition-all"
        />

        {isSearching && (
          <p className="text-body-sm font-body-sm text-secondary mt-2">Mencari alamat...</p>
        )}

        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute z-20 left-0 right-0 mt-2 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-md overflow-hidden max-h-64 overflow-y-auto">
            {suggestions.map((item, idx) => (
              <li key={`${item.lat}-${item.lng}-${idx}`}>
                <button
                  type="button"
                  onClick={() => pickSuggestion(item)}
                  className="w-full text-left px-4 py-3 min-h-[56px] text-body-md font-body-md text-on-surface hover:bg-surface-container-low border-b border-outline-variant last:border-b-0 flex items-start gap-3 cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-secondary mt-0.5 shrink-0" aria-hidden>location_on</span>
                  <span className="flex-1">{item.address}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Tombol pakai lokasi terkini */}
      <button
        type="button"
        onClick={useCurrentLocation}
        disabled={isLocating}
        className="w-full min-h-[56px] bg-surface-container-lowest hover:bg-surface-container-low text-on-surface border border-outline-variant rounded-full text-label-md font-label-md font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-60 cursor-pointer shadow-sm"
      >
        <span className="material-symbols-outlined text-secondary shrink-0" aria-hidden>my_location</span>
        {isLocating ? "Mencari lokasi Anda..." : "Gunakan Lokasi Saya Sekarang"}
      </button>

      {locateError && (
        <p className="text-body-sm font-body-sm font-semibold text-error-container-on bg-error-container border border-error/20 rounded-xl p-3 shadow-sm">
          {locateError}
        </p>
      )}

      {/* Peta: geser penanda atau tekan titik rumah */}
      <div>
        <p className="text-body-sm font-body-sm text-secondary mb-2">
          Geser penanda merah tepat ke rumah Anda supaya kurir tidak tersesat.
        </p>
        <div className="w-full h-[280px] rounded-xl overflow-hidden border border-outline-variant shadow-sm">
          <AddressMap position={position} onPick={handleMapPick} />
        </div>
        {hasPin ? (
          <p className="text-label-sm font-label-sm text-tertiary font-bold mt-2 flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]" aria-hidden>check_circle</span> Titik rumah sudah ditandai di peta.
          </p>
        ) : (
          <p className="text-label-sm font-label-sm text-secondary mt-2">
            Titik rumah belum ditandai. Tekan peta atau gunakan lokasi Anda.
          </p>
        )}
      </div>
    </div>
  );
}
