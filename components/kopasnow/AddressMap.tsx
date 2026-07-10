"use client";

import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const pinIcon = new L.Icon({
  iconUrl: "https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  shadowSize: [41, 41],
});

/** Geser peta ketika koordinat berubah dari luar (mis. pilih saran alamat) */
function RecenterOnChange({ position }: { position: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo(position, Math.max(map.getZoom(), 16), { duration: 0.6 });
  }, [map, position]);

  return null;
}

/** Menekan peta memindahkan penanda ke titik itu */
function ClickToPlace({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface AddressMapProps {
  position: [number, number];
  onPick: (lat: number, lng: number) => void;
}

export default function AddressMap({ position, onPick }: AddressMapProps) {
  const markerRef = useRef<L.Marker>(null);

  const dragHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (!marker) return;
        const { lat, lng } = marker.getLatLng();
        onPick(lat, lng);
      },
    }),
    [onPick]
  );

  return (
    <MapContainer
      center={position}
      zoom={16}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%" }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <RecenterOnChange position={position} />
      <ClickToPlace onPick={onPick} />
      <Marker
        position={position}
        icon={pinIcon}
        draggable
        eventHandlers={dragHandlers}
        ref={markerRef}
      />
    </MapContainer>
  );
}
