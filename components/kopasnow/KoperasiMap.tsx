"use client";

import { useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { KoperasiLocation } from "@/utils/helper/geo";
import { haversineDistance, formatWalkTime } from "@/utils/helper/geo";

// ── Custom marker icons ──────────────────────────────────────

const koperasiIcon = new L.Icon({
  iconUrl: "https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const userIcon = new L.Icon({
  iconUrl: "https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// ── Locate Me control ────────────────────────────────────────

function LocateControl({
  onLocate,
}: {
  onLocate: (lat: number, lng: number) => void;
}) {
  const map = useMap();

  const handleLocate = useCallback(() => {
    map.locate({ setView: true, maxZoom: 14 });
    map.once("locationfound", (e) => {
      onLocate(e.latlng.lat, e.latlng.lng);
    });
  }, [map, onLocate]);

  return (
    <button
      onClick={handleLocate}
      className="absolute bottom-4 right-4 z-[1000] min-h-[48px] bg-white hover:bg-slate-50 text-slate-800 px-4 py-3 rounded-xl shadow-lg border-2 border-slate-300 flex items-center gap-2 text-base font-bold transition-all cursor-pointer"
      title="Tunjukkan posisi saya di peta"
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-[#CE1126]">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
      Posisi Saya
    </button>
  );
}

// ── Fit bounds helper ────────────────────────────────────────

function FitBounds({
  koperasiList,
  userPosition,
}: {
  koperasiList: KoperasiLocation[];
  userPosition: [number, number] | null;
}) {
  const map = useMap();

  useEffect(() => {
    const points: [number, number][] = koperasiList.map((k) => [k.lat, k.lng]);
    if (userPosition) {
      points.push(userPosition);
    }

    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map((p) => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [map, koperasiList, userPosition]);

  return null;
}

// ── Main Map Component ───────────────────────────────────────

interface KoperasiMapProps {
  koperasiList: KoperasiLocation[];
  userPosition: [number, number] | null;
  onUserLocationChange?: (lat: number, lng: number) => void;
}

// Peta tidak lagi meminta izin lokasi sendiri saat dibuka.
// Izin lokasi dikelola halaman induk lewat kartu persetujuan (priming),
// lalu posisinya dikirim ke sini sebagai prop.
export default function KoperasiMap({
  koperasiList,
  userPosition,
  onUserLocationChange,
}: KoperasiMapProps) {
  const handleLocate = useCallback(
    (lat: number, lng: number) => {
      onUserLocationChange?.(lat, lng);
    },
    [onUserLocationChange]
  );

  // Default center: first koperasi or Cikarang area
  const defaultCenter: [number, number] =
    koperasiList.length > 0
      ? [koperasiList[0].lat, koperasiList[0].lng]
      : [-6.3, 107.15]; // Cikarang fallback

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-lg border border-slate-200">
      <MapContainer
        center={defaultCenter}
        zoom={13}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds koperasiList={koperasiList} userPosition={userPosition} />

        {/* User location marker */}
        {userPosition && (
          <>
            <Circle
              center={userPosition}
              radius={200}
              pathOptions={{
                color: "#3b82f6",
                fillColor: "#3b82f6",
                fillOpacity: 0.1,
                weight: 2,
              }}
            />
            <Marker position={userPosition} icon={userIcon}>
              <Popup>
                <p className="font-bold text-base text-slate-800 text-center">
                  📍 Anda di sini
                </p>
              </Popup>
            </Marker>
          </>
        )}

        {/* Koperasi markers */}
        {koperasiList.map((koperasi) => {
          const distance = userPosition
            ? haversineDistance(userPosition[0], userPosition[1], koperasi.lat, koperasi.lng)
            : null;

          return (
            <Marker
              key={koperasi.id}
              position={[koperasi.lat, koperasi.lng]}
              icon={koperasiIcon}
            >
              <Popup>
                <div className="min-w-[220px] space-y-1.5">
                  <p className="font-bold text-base text-slate-800 leading-tight">
                    {koperasi.nama}
                  </p>
                  {koperasi.alamat && (
                    <p className="text-sm text-slate-600">📍 {koperasi.alamat}</p>
                  )}
                  {distance !== null && (
                    <p className="text-sm font-semibold text-slate-700">
                      🚶 {formatWalkTime(distance)}
                    </p>
                  )}
                  <a
                    href={`/koperasi/${koperasi.id}`}
                    className="!text-white block w-full text-center bg-[#CE1126] font-bold text-sm rounded-lg px-3 py-2.5 mt-1"
                  >
                    Lihat Barang di Sini
                  </a>
                </div>
              </Popup>
            </Marker>
          );
        })}

        <LocateControl onLocate={handleLocate} />
      </MapContainer>
    </div>
  );
}
