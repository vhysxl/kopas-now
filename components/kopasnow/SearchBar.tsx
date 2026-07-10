"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

interface SearchBarProps {
  placeholder?: string;
  /** Nilai awal, dipakai halaman hasil pencarian agar kotaknya tidak kosong */
  initialQuery?: string;
  className?: string;
}

/**
 * Kotak pencarian.
 *
 * Mengetik memunculkan dua pilihan tegas — cari koperasi, atau cari barang —
 * supaya pengguna tahu apa yang akan terjadi sebelum menekan apa pun.
 * Menekan Enter mencari keduanya sekaligus.
 */
export default function SearchBar({
  placeholder = "Cari barang atau koperasi...",
  initialQuery = "",
  className = "",
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const trimmed = query.trim();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const go = (tab?: "koperasi" | "produk") => {
    if (!trimmed) return;
    const params = new URLSearchParams({ q: trimmed });
    if (tab) params.set("tab", tab);
    setIsOpen(false);
    router.push(`/cari?${params.toString()}`);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    go(); // Enter tanpa memilih = cari keduanya
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <form onSubmit={handleSubmit} role="search">
        <label htmlFor="pencarian" className="sr-only">
          Cari barang atau koperasi
        </label>
        <span
          className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
          aria-hidden
        >
          search
        </span>
        <input
          id="pencarian"
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(e.target.value.trim().length > 0);
          }}
          onFocus={() => setIsOpen(trimmed.length > 0)}
          placeholder={placeholder}
          className="w-full min-h-[48px] bg-surface-container-lowest border border-outline-variant rounded-full py-2 pl-11 pr-4 focus:outline-none focus:border-primary text-on-surface text-base"
        />
      </form>

      {isOpen && trimmed.length > 0 && (
        <ul className="absolute z-30 left-0 right-0 mt-1 bg-surface-container-lowest border-2 border-outline-variant rounded-xl shadow-lg overflow-hidden">
          <li>
            <button
              type="button"
              onClick={() => go("koperasi")}
              className="w-full text-left px-4 py-3 min-h-[52px] flex items-center gap-3 text-base text-on-surface hover:bg-surface-container-low border-b border-surface-variant cursor-pointer"
            >
              <span className="material-symbols-outlined text-primary" aria-hidden>
                storefront
              </span>
              <span>
                Cari koperasi: <strong>{trimmed}</strong>
              </span>
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => go("produk")}
              className="w-full text-left px-4 py-3 min-h-[52px] flex items-center gap-3 text-base text-on-surface hover:bg-surface-container-low cursor-pointer"
            >
              <span className="material-symbols-outlined text-primary" aria-hidden>
                shopping_basket
              </span>
              <span>
                Cari barang: <strong>{trimmed}</strong>
              </span>
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
