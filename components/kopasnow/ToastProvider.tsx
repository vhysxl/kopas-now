"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

interface ToastContextValue {
  showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** Tampilkan pesan singkat setelah aksi berhasil, mis. "Beras masuk keranjang". */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast harus dipakai di dalam <ToastProvider>");
  }
  return ctx;
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setMessage(msg);
    timerRef.current = setTimeout(() => setMessage(null), 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {message && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 md:bottom-6 right-4 z-50 bg-[#1b1c1c] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-fade-in border border-surface-variant"
        >
          <span className="material-symbols-outlined text-tertiary text-[20px]" data-weight="fill">
            check_circle
          </span>
          <span className="text-base font-semibold">{message}</span>
        </div>
      )}
    </ToastContext.Provider>
  );
}
