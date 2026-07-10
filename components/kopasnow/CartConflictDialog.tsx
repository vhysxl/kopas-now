"use client";

import { useEffect, useRef } from "react";

interface CartConflictDialogProps {
  /** Nama koperasi yang barangnya sudah ada di keranjang */
  currentKoperasiName: string;
  /** Nama koperasi asal barang yang baru saja ditekan */
  nextKoperasiName: string;
  productName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Dialog saat pengguna menambah barang dari koperasi lain.
 *
 * Menggantikan window.confirm() yang tampilannya di luar kendali dan
 * kalimatnya sulit dibaca pengguna gaptek. Fokus keyboard langsung jatuh ke
 * tombol "Batal" — pilihan yang tidak merusak apa pun.
 */
export default function CartConflictDialog({
  currentKoperasiName,
  nextKoperasiName,
  productName,
  onConfirm,
  onCancel,
}: CartConflictDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="judul-ganti-keranjang"
        aria-describedby="isi-ganti-keranjang"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl"
      >
        <div className="text-center">
          <div className="text-5xl mb-3" aria-hidden>
            🧺
          </div>
          <h2 id="judul-ganti-keranjang" className="text-xl font-extrabold text-slate-900">
            Keranjang Anda sudah berisi barang dari koperasi lain
          </h2>
          <p id="isi-ganti-keranjang" className="text-base text-slate-700 mt-3 leading-relaxed">
            Sekarang keranjang Anda berisi barang dari{" "}
            <strong className="text-slate-900">{currentKoperasiName}</strong>.
            <br />
            Satu pesanan hanya bisa diambil dari satu koperasi.
          </p>
        </div>

        {/* Perlihatkan akibatnya sebelum pengguna memilih */}
        <div className="mt-5 bg-slate-50 border border-slate-200 rounded-xl p-4 text-left">
          <p className="text-base text-slate-700">
            Kalau Anda lanjut, keranjang lama <strong>dikosongkan</strong>, lalu{" "}
            <strong className="text-slate-900">{productName}</strong> dari{" "}
            <strong className="text-slate-900">{nextKoperasiName}</strong> dimasukkan.
          </p>
        </div>

        <div className="flex flex-col gap-3 mt-6">
          <button
            onClick={onConfirm}
            className="w-full min-h-[56px] bg-[#CE1126] hover:bg-[#A50E1E] active:bg-[#8E0C1A] text-white rounded-xl text-base font-bold transition-colors cursor-pointer"
          >
            Kosongkan &amp; Belanja di {nextKoperasiName}
          </button>
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="w-full min-h-[56px] bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-300 rounded-xl text-base font-bold transition-colors cursor-pointer"
          >
            Batal, Simpan Keranjang Saya
          </button>
        </div>
      </div>
    </div>
  );
}
