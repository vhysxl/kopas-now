"use client";

import { useEffect, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { KoperasiLocation } from "@/utils/helper/geo";
import { haversineDistance, formatWalkTime } from "@/utils/helper/geo";

// ── Custom marker icons ──────────────────────────────────────

function buildIcon(color: "red" | "gold" | "blue") {
  return new L.Icon({
    iconUrl: `https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-${color}.png`,
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
}

const koperasiIcon = buildIcon("red");
const koperasiSelectedIcon = buildIcon("gold");
const userIcon = buildIcon("blue");

// ── Locate Me control ────────────────────────────────────────

function LocateControl({
  onLocate,
  radiusKm,
}: {
  onLocate: (lat: number, lng: number) => void;
  radiusKm?: number;
}) {
  const map = useMap();

  const handleLocate = useCallback(() => {
    map.locate();
    map.once("locationfound", (e) => {
      // Zoom disesuaikan dengan lingkaran radius koperasi terdekat,
      // bukan zoom tetap, supaya semua koperasi dalam zona ikut terlihat.
      if (radiusKm) {
        map.flyToBounds(e.latlng.toBounds(radiusKm * 2 * 1000), {
          padding: [30, 30],
          duration: 0.8,
        });
      } else {
        map.flyTo(e.latlng, 14, { duration: 0.8 });
      }
      onLocate(e.latlng.lat, e.latlng.lng);
    });
  }, [map, onLocate, radiusKm]);

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

// ── Pan & zoom ke titik acuan / semua koperasi ───────────────

function FitBounds({
  koperasiList,
  focusPosition,
  radiusKm,
}: {
  koperasiList: KoperasiLocation[];
  focusPosition: [number, number] | null;
  radiusKm?: number;
}) {
  const map = useMap();

  // Digeser & di-zoom ulang setiap titik acuan berubah (mis. pengguna
  // mengetik kota lain) atau daftar koperasi yang tampil berubah.
  useEffect(() => {
    // Ada zona radius: paskan tampilan ke lingkarannya supaya titik acuan
    // tetap di tengah dan seluruh koperasi dalam zona terlihat.
    if (focusPosition && radiusKm) {
      const center = L.latLng(focusPosition[0], focusPosition[1]);
      map.flyToBounds(center.toBounds(radiusKm * 2 * 1000), {
        padding: [30, 30],
        duration: 0.8,
      });
      return;
    }

    const points: [number, number][] = koperasiList.map((k) => [k.lat, k.lng]);
    if (focusPosition) {
      points.push(focusPosition);
    }

    if (points.length === 0) return;

    if (points.length === 1) {
      map.flyTo(points[0], 14, { duration: 0.8 });
      return;
    }

    const bounds = L.latLngBounds(points.map((p) => L.latLng(p[0], p[1])));
    map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 14, duration: 0.8 });
  }, [map, koperasiList, focusPosition, radiusKm]);

  return null;
}

// ── Terbang ke koperasi yang dipilih dari kartu ──────────────

function FlyToSelected({
  koperasiList,
  selectedId,
}: {
  koperasiList: KoperasiLocation[];
  selectedId: string | null;
}) {
  const map = useMap();
  const lastFlownId = useRef<string | null>(null);

  useEffect(() => {
    // Hanya terbang saat pilihan benar-benar berubah. Tanpa penjaga ini,
    // perubahan `koperasiList` (mis. setelah menekan "Posisi Saya")
    // ikut memicu terbang balik ke koperasi yang tersorot.
    if (selectedId === lastFlownId.current) return;
    lastFlownId.current = selectedId;

    if (!selectedId) return;
    const target = koperasiList.find((k) => k.id === selectedId);
    if (!target) return;

    map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 15), { duration: 0.6 });
  }, [map, koperasiList, selectedId]);

  return null;
}

// ── Mode tandai titik: menekan peta memindahkan titik acuan ──

function ClickToPickPoint({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  const map = useMap();

  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });

  // Petunjuk visual bahwa peta sedang menunggu ditekan
  useEffect(() => {
    const container = map.getContainer();
    const previous = container.style.cursor;
    container.style.cursor = "crosshair";
    return () => {
      container.style.cursor = previous;
    };
  }, [map]);

  return null;
}

// ── Main Map Component ───────────────────────────────────────

interface KoperasiMapProps {
  koperasiList: KoperasiLocation[];
  userPosition: [number, number] | null;
  /** Label untuk marker posisi: "📍 Anda di sini" (GPS) atau "📍 Pusat pencarian: <kota>" (kota diketik manual) */
  positionLabel?: string;
  /** Radius pencarian dalam km — digambar sebagai lingkaran di sekitar titik acuan */
  radiusKm?: number;
  selectedId?: string | null;
  onSelectKoperasi?: (id: string) => void;
  onUserLocationChange?: (lat: number, lng: number) => void;
  /** Saat aktif, menekan peta memindahkan titik acuan pengguna */
  pickMode?: boolean;
  onPickPoint?: (lat: number, lng: number) => void;
}

// Peta tidak meminta izin lokasi sendiri. Titik acuan dikelola store lokasi
// (diatur lewat bendera lokasi di navbar) lalu dikirim ke sini sebagai prop.
// Peta ini juga merangkap tempat menandai titik sendiri, supaya pengguna tidak
// perlu berhadapan dengan dua peta yang berbeda.
export default function KoperasiMap({
  koperasiList,
  userPosition,
  positionLabel = "📍 Anda di sini",
  radiusKm,
  selectedId = null,
  onSelectKoperasi,
  onUserLocationChange,
  pickMode = false,
  onPickPoint,
}: KoperasiMapProps) {
  const handleLocate = useCallback(
    (lat: number, lng: number) => {
      onUserLocationChange?.(lat, lng);
    },
    [onUserLocationChange]
  );

  // Default center: first koperasi or Cikarang area
  const defaultCenter: [number, number] =
    userPosition ??
    (koperasiList.length > 0
      ? [koperasiList[0].lat, koperasiList[0].lng]
      : [-6.3, 107.15]); // Cikarang fallback

  return (
    <div
      className={`relative w-full h-full rounded-2xl overflow-hidden shadow-lg border-2 ${
        pickMode ? "border-[#CE1126]" : "border-slate-200"
      }`}
    >
      {/* Petunjuk saat mode tandai titik menyala */}
      {pickMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-[#CE1126] text-white px-4 py-2.5 rounded-full shadow-lg max-w-[90%]">
          <p className="text-base font-bold text-center">
            Tekan peta di tempat Anda berada
          </p>
        </div>
      )}

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

        {/* Saat menandai titik, peta jangan ikut melompat setiap kali ditekan */}
        {!pickMode && (
          <FitBounds koperasiList={koperasiList} focusPosition={userPosition} radiusKm={radiusKm} />
        )}
        <FlyToSelected koperasiList={koperasiList} selectedId={selectedId} />
        {pickMode && onPickPoint && <ClickToPickPoint onPick={onPickPoint} />}

        {/* Titik acuan + lingkaran radius pencarian */}
        {userPosition && (
          <>
            {radiusKm && (
              <Circle
                center={userPosition}
                radius={radiusKm * 1000}
                pathOptions={{
                  color: "#3b82f6",
                  fillColor: "#3b82f6",
                  fillOpacity: 0.06,
                  weight: 1.5,
                }}
              />
            )}
            <Circle
              center={userPosition}
              radius={200}
              pathOptions={{
                color: "#3b82f6",
                fillColor: "#3b82f6",
                fillOpacity: 0.2,
                weight: 2,
              }}
            />
            <Marker position={userPosition} icon={userIcon}>
              <Popup>
                <p className="font-bold text-base text-slate-800 text-center">
                  {positionLabel}
                </p>
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
              zIndexOffset={isSelected ? 1000 : 0}
              eventHandlers={{
                click: () => onSelectKoperasi?.(koperasi.id),
              }}
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
                    Belanja di Sini
                  </a>
                </div>
              </Popup>
            </Marker>
          );
        })}

        <LocateControl onLocate={handleLocate} radiusKm={radiusKm} />
      </MapContainer>
    </div>
  );
}
