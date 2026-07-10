"use client";

import { useLocationStore } from "@/store/useLocationStore";
import { haversineDistance, formatDistance, formatWalkTime } from "@/utils/helper/geo";

interface KoperasiDistanceProps {
  lat: number;
  lng: number;
}

/**
 * Jarak dari titik acuan pengguna ke sebuah koperasi.
 *
 * Halaman koperasi dan produk adalah server component, sedangkan lokasi
 * pengguna hanya diketahui di browser — komponen kecil ini yang menjembatani.
 */
export default function KoperasiDistance({ lat, lng }: KoperasiDistanceProps) {
  const userLat = useLocationStore((s) => s.lat);
  const userLng = useLocationStore((s) => s.lng);
  const hasHydrated = useLocationStore((s) => s._hasHydrated);

  // Sebelum store dipulihkan dari localStorage, server dan client harus
  // menghasilkan markup yang sama — jangan tampilkan apa pun dulu.
  if (!hasHydrated) {
    return <div className="h-6" aria-hidden />;
  }

  if (userLat === null || userLng === null) {
    return (
      <p className="text-base text-secondary">
        Nyalakan lokasi di beranda untuk melihat jaraknya.
      </p>
    );
  }

  const distance = haversineDistance(userLat, userLng, lat, lng);

  return (
    <p className="text-base font-semibold text-on-surface">
      🚶 {formatWalkTime(distance)}{" "}
      <span className="font-normal text-secondary">({formatDistance(distance)})</span>
    </p>
  );
}
