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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#CE1126]"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Middleware handles redirect
  }

  return (
    <div className="min-h-screen bg-[#F6F6F6] font-sans text-slate-900 pb-24 md:pb-8">
      {/* Garis bendera Merah Putih */}
      <div className="w-full h-1.5 flex fixed top-0 left-0 z-50">
        <div className="w-1/2 bg-[#CE1126]" />
        <div className="w-1/2 bg-white border-b border-slate-200" />
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 min-h-[48px] px-4 -ml-4 text-base font-bold text-slate-700 hover:text-[#CE1126] transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Kembali ke Beranda
        </Link>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-3">
          <div className="p-6 sm:p-8">
            {/* Avatar & sapaan */}
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-red-50 text-[#CE1126] flex items-center justify-center mx-auto border border-red-100">
                <span className="text-3xl font-bold uppercase">{nama.charAt(0)}</span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 mt-4">
                Halo, <span className="text-[#CE1126]">{nama}</span>!
              </h1>
              <p className="text-base text-slate-600 mt-1">
                Anda terdaftar sebagai anggota Koperasi Merah Putih.
              </p>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 mt-3 rounded-full text-base font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Anggota Aktif
              </span>
            </div>

            {/* Data keanggotaan */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 mt-8 space-y-4">
              <div>
                <span className="text-sm font-semibold text-slate-500 block">Nama</span>
                <span className="text-base font-bold text-slate-900">{nama}</span>
              </div>
              <div>
                <span className="text-sm font-semibold text-slate-500 block">No. HP / WhatsApp</span>
                <span className="text-base font-bold text-slate-900">{phone}</span>
              </div>
              <div>
                <span className="text-sm font-semibold text-slate-500 block">Bergabung sejak</span>
                <span className="text-base font-bold text-slate-900">{joinedDate}</span>
              </div>
            </div>

            {/* Pintasan */}
            <Link
              href="/orders"
              className="mt-6 w-full min-h-[52px] bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-300 rounded-xl text-base font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Lihat Pesanan Saya
            </Link>

            {/* Keluar */}
            <form action={signOutAction} className="mt-3">
              <button
                type="submit"
                className="w-full min-h-[52px] bg-[#CE1126] hover:bg-[#A50E1E] text-white rounded-xl text-base font-bold transition-colors cursor-pointer"
              >
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
