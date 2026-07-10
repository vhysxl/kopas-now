import { create } from "zustand";
import { User } from "@supabase/supabase-js";

export interface Customer {
  id: string;
  user_id: string;
  nama: string;
  email: string | null;
  phone: string | null;
  created_at?: string;
}

interface UserState {
  user: User | null;
  customer: Customer | null;
  isLoading: boolean;
}

interface UserActions {
  setUser: (user: User | null) => void;
  setCustomer: (customer: Customer | null) => void;
  setLoading: (isLoading: boolean) => void;
  fetchUser: () => Promise<void>;
  reset: () => void;
}

export const useUserStore = create<UserState & UserActions>()((set) => ({
  user: null,
  customer: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setCustomer: (customer) => set({ customer }),
  setLoading: (isLoading) => set({ isLoading }),
  fetchUser: async () => {
    set({ isLoading: true });
    try {
      const { createClient } = await import("@/utils/supabase/client");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        set({ user });
        // Lewat server action: RLS kopasnow_customers tidak mengizinkan SELECT
        // dari client, jadi query langsung akan selalu mengembalikan null.
        const { getCurrentCustomer } = await import("@/server/actions/customer");
        set({ customer: await getCurrentCustomer() });
      } else {
        set({ user: null, customer: null });
      }
    } catch (error) {
      console.error("Error fetching user in store:", error);
    } finally {
      set({ isLoading: false });
    }
  },
  reset: () => set({ user: null, customer: null, isLoading: false }),
}));
