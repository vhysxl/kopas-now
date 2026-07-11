"use client";

import Link from "next/link";
import { useUserStore } from "@/store/useUserStore";
import { signOutAction } from "@/server/actions/auth";
import BottomNav from "@/components/kopasnow/BottomNav";
import { displayName, displayPhone } from "@/utils/helper/account";

export default function AkunPage() {
  const user = useUserStore((state) => state.user);
  const customer = useUserStore((state) => state.customer);
  const isLoading = useUserStore((state) => state.isLoading);

  const nama = displayName(user, customer);
  // alamat sintetis <nomor>@phone.kopasnow.com ke pengguna.
  const phone = displayPhone(user, customer) || "-";
  const joinedDate = customer?.created_at
    ? new Date(customer.created_at).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    : "-";

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Middleware handles redirect
  }

  return (
    <div className="min-h-screen bg-background font-body-md text-on-background pb-24 md:pb-8">

      <div className="max-w-screen-sm mx-auto px-5 pt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 min-h-[48px] px-2 -ml-2 text-label-md font-label-md font-bold text-secondary hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden>arrow_back</span>
          Kembali ke Beranda
        </Link>

        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden mt-3">
          <div className="p-6 sm:p-8">
            {/* Avatar & sapaan */}
            <div className="text-center">
              <div className="w-24 h-24 rounded-full bg-primary-container text-primary flex items-center justify-center mx-auto border border-primary/20">
                <span className="text-headline-md font-headline-md font-bold uppercase">{nama.charAt(0)}</span>
              </div>
              <h1 className="text-headline-sm font-headline-sm font-extrabold text-on-surface mt-5">
                Halo, <span className="text-primary">{nama}</span>!
              </h1>
              <p className="text-body-md font-body-md text-secondary mt-1">
                Anda terdaftar sebagai anggota Koperasi Merah Putih.
              </p>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 mt-4 rounded-full text-label-sm font-label-sm font-bold bg-tertiary-container text-on-tertiary-container border border-tertiary/20">
                <span className="w-2 h-2 rounded-full bg-tertiary" />
                Anggota Aktif
              </span>
            </div>

            {/* Data keanggotaan */}
            <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant mt-8 space-y-4">
              <div>
                <span className="text-label-sm font-label-sm text-secondary block mb-1">Nama Lengkap</span>
                <span className="text-body-lg font-body-lg font-bold text-on-surface">{nama}</span>
              </div>
              <div>
                <span className="text-label-sm font-label-sm text-secondary block mb-1">No. HP / WhatsApp</span>
                <span className="text-body-lg font-body-lg font-bold text-on-surface">{phone}</span>
              </div>
              <div>
                <span className="text-label-sm font-label-sm text-secondary block mb-1">Bergabung Sejak</span>
                <span className="text-body-lg font-body-lg font-bold text-on-surface">{joinedDate}</span>
              </div>
            </div>

            {/* Pintasan */}
            <Link
              href="/orders"
              className="mt-6 w-full min-h-[48px] bg-surface-container-lowest hover:bg-surface-container-low text-on-surface border border-outline-variant rounded-full text-label-md font-label-md font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined" aria-hidden>package</span>
              Lihat Pesanan Saya
            </Link>

            {/* Keluar */}
            <form action={signOutAction} className="mt-4">
              <button
                type="submit"
                className="w-full min-h-[48px] bg-primary hover:bg-surface-tint text-on-primary rounded-full text-label-md font-label-md font-bold flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
              >
                <span className="material-symbols-outlined" aria-hidden>logout</span>
                Keluar dari Akun
              </button>
            </form>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
