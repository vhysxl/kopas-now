"use client";

import { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { KoperasiLocation } from "@/utils/helper/geo";
import { haversineDistance, formatDistance } from "@/utils/helper/geo";

// ── Custom marker icons ──────────────────────────────────────

const koperasiIcon = new L.Icon({
  iconUrl: "https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const koperasiSelectedIcon = new L.Icon({
  iconUrl: "https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-gold.png",
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
      className="absolute bottom-4 right-4 z-[1000] bg-white hover:bg-slate-50 text-slate-700 px-3 py-2.5 rounded-xl shadow-lg border border-slate-200 flex items-center gap-2 text-sm font-semibold transition-all duration-200 hover:shadow-xl cursor-pointer"
      title="Temukan lokasi saya"
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
      Lokasi Saya
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
  onUserLocationChange?: (lat: number, lng: number) => void;
  selectedId?: string | null;
}

export default function KoperasiMap({
  koperasiList,
  onUserLocationChange,
  selectedId,
}: KoperasiMapProps) {
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);

  // Auto-detect user location on mount
  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserPosition([latitude, longitude]);
        onUserLocationChange?.(latitude, longitude);
      },
      (err) => {
        console.warn("Geolocation error:", err.message);
        // Fallback: don't set user position, map will center on koperasi
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [onUserLocationChange]);

  const handleLocate = useCallback(
    (lat: number, lng: number) => {
      setUserPosition([lat, lng]);
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
                <div className="text-center">
                  <p className="font-bold text-sm text-slate-800">📍 Lokasi Anda</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {userPosition[0].toFixed(5)}, {userPosition[1].toFixed(5)}
                  </p>
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {/* Koperasi markers */}
        {koperasiList.map((koperasi) => {
          const isSelected = koperasi.id === selectedId;
          const distance = userPosition
            ? haversineDistance(userPosition[0], userPosition[1], koperasi.lat, koperasi.lng)
            : null;

          return (
            <Marker
              key={koperasi.id}
              position={[koperasi.lat, koperasi.lng]}
              icon={isSelected ? koperasiSelectedIcon : koperasiIcon}
              opacity={isSelected ? 1 : 0.85}
              zIndexOffset={isSelected ? 1000 : 0}
            >
              <Popup>
                <div className="min-w-[200px]">
                  <div className="flex items-start gap-2 mb-1.5">
                    <div>
                      <p className="font-bold text-sm text-slate-800 leading-tight">
                        {koperasi.nama}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {koperasi.kode_koperasi}
                      </p>
                    </div>
                  </div>
                  {koperasi.alamat && (
                    <p className="text-xs text-slate-600 mb-1">📍 {koperasi.alamat}</p>
                  )}
                  {distance !== null && (
                    <p className="text-xs font-semibold text-blue-600">
                      🚶 {formatDistance(distance)} dari lokasi Anda
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        <LocateControl onLocate={handleLocate} />
      </MapContainer>

      {/* Map overlay gradient at bottom for visual polish */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white/20 to-transparent pointer-events-none z-[400]" />
    </div>
  );
}
