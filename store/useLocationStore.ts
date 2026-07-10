import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/** Dari mana titik acuan ini berasal — dipakai untuk menyusun kalimat di UI. */
export type LocationSource = "gps" | "city" | "manual";

interface LocationState {
  lat: number | null;
  lng: number | null;
  /** Nama kota / daerah untuk ditampilkan, mis. "Cikarang" */
  label: string | null;
  source: LocationSource | null;
  _hasHydrated: boolean;
}

interface LocationActions {
  setHasHydrated: (hydrated: boolean) => void;
  setLocation: (input: {
    lat: number;
    lng: number;
    label?: string | null;
    source: LocationSource;
  }) => void;
  setLabel: (label: string) => void;
  clear: () => void;
}

/**
 * Satu-satunya sumber titik acuan pengguna, dipakai lintas halaman:
 * beranda (urut jarak), detail koperasi, detail produk, hasil pencarian,
 * dan indikator lokasi di navbar.
 *
 * Aturannya last-write-wins: aksi terakhir pengguna selalu menang, baik itu
 * GPS, pencarian kota, maupun penanda yang digeser di peta. Tidak ada
 * prioritas tersembunyi yang membuat lokasi "nyangkut".
 */
export const useLocationStore = create<LocationState & LocationActions>()(
  persist(
    (set) => ({
      lat: null,
      lng: null,
      label: null,
      source: null,
      _hasHydrated: false,
      setHasHydrated: (hydrated) => set({ _hasHydrated: hydrated }),
      setLocation: ({ lat, lng, label = null, source }) =>
        set({ lat, lng, label, source }),
      // Nama daerah sering baru datang belakangan (reverse geocoding async)
      setLabel: (label) => set({ label }),
      clear: () => set({ lat: null, lng: null, label: null, source: null }),
    }),
    {
      name: "kopasnow-lokasi",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        lat: state.lat,
        lng: state.lng,
        label: state.label,
        source: state.source,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

/** Koordinat sebagai tuple, atau null bila pengguna belum menentukan titik. */
export function locationPosition(state: LocationState): [number, number] | null {
  return state.lat !== null && state.lng !== null ? [state.lat, state.lng] : null;
}
