"use client";

import { useUserStore } from "@/store/useUserStore";
import { signOutAction } from "@/server/actions/auth";

export default function Home() {
  const user = useUserStore((state) => state.user);
  const customer = useUserStore((state) => state.customer);
  const isLoading = useUserStore((state) => state.isLoading);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#CE1126]"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Middleware will handle redirecting to /auth
  }

  const nama = customer?.nama || user.user_metadata?.nama || "Anggota Koperasi";
  const email = customer?.email || user.email || "-";
  const phone = customer?.phone || user.user_metadata?.phone || "-";
  const joinedDate = customer?.created_at
    ? new Date(customer.created_at).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Baru saja bergabung";

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-red-500 selection:text-white flex flex-col">
      {/* Navbar / Header */}
      <header className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-50">
        <div className="w-full h-1 flex">
          <div className="flex-1 bg-[#CE1126]" />
          <div className="flex-1 bg-white" />
        </div>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#CE1126] to-[#A50E1E] flex items-center justify-center text-white shadow-md shadow-red-500/10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
                />
              </svg>
            </div>
            <span className="font-bold text-lg text-slate-800 tracking-tight">
              Kopas<span className="text-[#CE1126]">Now</span>
            </span>
          </div>

          <form action={signOutAction}>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-red-600 hover:text-white border border-red-200 hover:bg-[#CE1126] hover:border-[#CE1126] rounded-xl transition-all duration-200 cursor-pointer"
            >
              Keluar
            </button>
          </form>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-12 flex flex-col justify-center">
        {/* Welcome Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-100 border border-slate-100 overflow-hidden">
          <div className="p-8 sm:p-12 text-center max-w-2xl mx-auto">
            {/* User Avatar Circle */}
            <div className="w-20 h-20 rounded-full bg-red-50 text-[#CE1126] flex items-center justify-center mx-auto mb-6 border border-red-100 shadow-inner">
              <span className="text-2xl font-bold uppercase tracking-wider">
                {nama.charAt(0)}
              </span>
            </div>

            <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">
              Selamat Datang, <span className="text-[#CE1126]">{nama}</span>!
            </h2>
            <p className="text-slate-500 mt-2 text-sm sm:text-base">
              Terima kasih telah menjadi bagian dari Koperasi Merah Putih KopasNow. Akun Anda telah
              terverifikasi secara digital di platform kami.
            </p>

            <div className="w-16 h-1 bg-[#CE1126] rounded-full mx-auto my-8" />

            {/* Profile Info Details Grid */}
            <div className="bg-slate-50 rounded-2xl p-6 text-left border border-slate-100 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200/60 pb-2">
                Informasi Keanggotaan
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-0.5">
                  <span className="text-xs text-slate-400 block font-medium">Nama Anggota</span>
                  <span className="text-sm font-semibold text-slate-800">{nama}</span>
                </div>
                
                <div className="space-y-0.5">
                  <span className="text-xs text-slate-400 block font-medium">Status</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Aktif
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-xs text-slate-400 block font-medium">Email</span>
                  <span className="text-sm font-semibold text-slate-800 break-all">{email}</span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-xs text-slate-400 block font-medium">No. Telepon / HP</span>
                  <span className="text-sm font-semibold text-slate-800">{phone}</span>
                </div>

                <div className="space-y-0.5 sm:col-span-2">
                  <span className="text-xs text-slate-400 block font-medium">Tanggal Bergabung</span>
                  <span className="text-sm font-semibold text-slate-800">{joinedDate}</span>
                </div>
              </div>
            </div>

            {/* Platform Shortcuts Info */}
            <div className="mt-8 text-xs text-slate-400 font-medium">
              Sistem Core Koperasi ID: <span className="font-mono text-slate-500">{user.id}</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-100 text-center text-xs text-slate-400 bg-white">
        &copy; 2026 KopasNow. Hak Cipta Dilindungi Undang-Undang.
      </footer>
    </div>
  );
}
