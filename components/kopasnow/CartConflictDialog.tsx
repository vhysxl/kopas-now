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
        className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-6 shadow-xl border border-outline-variant"
      >
        <div className="text-center">
          <div className="w-16 h-16 bg-error-container text-on-error-container rounded-full mx-auto flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl" aria-hidden>warning</span>
          </div>
          <h2 id="judul-ganti-keranjang" className="text-title-lg font-title-lg font-extrabold text-on-surface">
            Keranjang sudah berisi barang dari koperasi lain
          </h2>
          <p id="isi-ganti-keranjang" className="text-body-md font-body-md text-secondary mt-3 leading-relaxed">
            Sekarang keranjang Anda berisi barang dari{" "}
            <strong className="text-on-surface font-bold">{currentKoperasiName}</strong>.
            <br />
            Satu pesanan hanya bisa diambil dari satu koperasi.
          </p>
        </div>

        {/* Perlihatkan akibatnya sebelum pengguna memilih */}
        {/* Perlihatkan akibatnya sebelum pengguna memilih */}
        <div className="mt-5 bg-surface-container-low border border-outline-variant rounded-xl p-4 text-left">
          <p className="text-body-sm font-body-sm text-secondary">
            Kalau lanjut, keranjang lama <strong>dikosongkan</strong>, lalu{" "}
            <strong className="text-on-surface">{productName}</strong> dari{" "}
            <strong className="text-on-surface">{nextKoperasiName}</strong> dimasukkan.
          </p>
        </div>

        <div className="flex flex-col gap-3 mt-6">
          <button
            onClick={onConfirm}
            className="w-full min-h-[48px] bg-error hover:bg-error/90 active:bg-error/80 text-on-error rounded-full text-label-md font-label-md font-bold transition-colors cursor-pointer shadow-sm"
          >
            Kosongkan &amp; Belanja di {nextKoperasiName}
          </button>
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="w-full min-h-[48px] bg-surface-container-lowest hover:bg-surface-container-low text-secondary border border-outline-variant rounded-full text-label-md font-label-md font-bold transition-colors cursor-pointer shadow-sm"
          >
            Batal, Simpan Keranjang Saya
          </button>
        </div>
      </div>
    </div>
  );
}
