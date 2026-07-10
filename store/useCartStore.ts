import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  unit: string;
  photoUrl: string | null;
  stock: number;
  qty: number;
}

interface CartState {
  koperasiId: string | null;
  koperasiName: string;
  items: CartItem[];
  _hasHydrated: boolean;
}

interface CartActions {
  setHasHydrated: (hydrated: boolean) => void;
  addItem: (
    koperasiId: string,
    koperasiName: string,
    item: Omit<CartItem, "qty">
  ) => void;
  increment: (productId: string) => void;
  decrement: (productId: string) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
}

// Satu keranjang hanya boleh berisi barang dari satu koperasi.
// Pemanggil wajib clear() dulu (dengan konfirmasi pengguna) jika koperasi berbeda.
export const useCartStore = create<CartState & CartActions>()(
  persist(
    (set) => ({
      koperasiId: null,
      koperasiName: "",
      items: [],
      _hasHydrated: false,
      setHasHydrated: (hydrated) => set({ _hasHydrated: hydrated }),
      addItem: (koperasiId, koperasiName, item) =>
        set((state) => {
          if (state.koperasiId && state.koperasiId !== koperasiId) {
            return state;
          }
          const existing = state.items.find((i) => i.productId === item.productId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId
                  ? { ...i, qty: Math.min(i.qty + 1, i.stock) }
                  : i
              ),
            };
          }
          return {
            koperasiId,
            koperasiName,
            items: [...state.items, { ...item, qty: 1 }],
          };
        }),
      increment: (productId) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, qty: Math.min(i.qty + 1, i.stock) } : i
          ),
        })),
      decrement: (productId) =>
        set((state) => {
          const items = state.items
            .map((i) => (i.productId === productId ? { ...i, qty: i.qty - 1 } : i))
            .filter((i) => i.qty > 0);
          return items.length === 0
            ? { items, koperasiId: null, koperasiName: "" }
            : { items };
        }),
      removeItem: (productId) =>
        set((state) => {
          const items = state.items.filter((i) => i.productId !== productId);
          return items.length === 0
            ? { items, koperasiId: null, koperasiName: "" }
            : { items };
        }),
      clear: () => set({ items: [], koperasiId: null, koperasiName: "" }),
    }),
    {
      name: "kopasnow-keranjang",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        koperasiId: state.koperasiId,
        koperasiName: state.koperasiName,
        items: state.items,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

export function cartTotalItems(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.qty, 0);
}

export function cartTotalPrice(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.qty * i.price, 0);
}
