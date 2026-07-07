"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { useUserStore, Customer } from "@/store/useUserStore";
import { User } from "@supabase/supabase-js";

interface AuthProviderProps {
  children: React.ReactNode;
  initialUser: User | null;
  initialCustomer: Customer | null;
}

export default function AuthProvider({
  children,
  initialUser,
  initialCustomer,
}: AuthProviderProps) {
  const initialized = useRef<boolean | null>(null);
  const setUser = useUserStore((state) => state.setUser);
  const setCustomer = useUserStore((state) => state.setCustomer);
  const setLoading = useUserStore((state) => state.setLoading);

  // Initialize store with server-side fetched values
  if (initialized.current == null) {
    useUserStore.setState({
      user: initialUser,
      customer: initialCustomer,
      isLoading: false,
    });
    initialized.current = true;
  }

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        setCustomer(null);
        setLoading(false);
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        if (session?.user) {
          setUser(session.user);
          const { data: customer } = await supabase
            .from("kopasnow_customers")
            .select("*")
            .eq("user_id", session.user.id)
            .maybeSingle();
          setCustomer(customer);
          setLoading(false);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, setCustomer, setLoading]);

  return <>{children}</>;
}
