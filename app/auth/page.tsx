"use client";

import React, { useState } from "react";
import { signInAction, signUpAction } from "@/server/actions/auth";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const formData = new FormData(e.currentTarget);
    if (!isLogin) {
      const password = formData.get("password") as string;
      const confirmPassword = formData.get("confirmPassword") as string;
      if (password !== confirmPassword) {
        setError("Password dan Konfirmasi Password tidak cocok.");
        setLoading(false);
        return;
      }
    }

    try {
      const res = isLogin
        ? await signInAction(null, formData)
        : await signUpAction(null, formData);

      if (res?.error) {
        setError(res.error);
      } else {
        setSuccess(
          isLogin
            ? "Login berhasil! Sedang mengalihkan..."
            : "Registrasi berhasil! Profil Anda telah dibuat. Sedang mengalihkan..."
        );
        // Page redirect will be initiated by the Server Action,
        // but we add a fallback redirect just in case
        setTimeout(() => {
          window.location.href = "/";
        }, 1200);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.toLowerCase().includes("failed to fetch") || msg.toLowerCase().includes("network error") || msg.toLowerCase().includes("fetch failed")) {
        setError("Gagal terhubung ke server. Periksa koneksi internet Anda atau coba lagi nanti.");
      } else {
        setError("Terjadi kesalahan sistem. Silakan coba lagi nanti.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-radial from-red-50/40 via-slate-50 to-slate-100 p-4 font-sans selection:bg-red-500 selection:text-white">
      {/* Background Decorative Circles */}
      <div className="absolute top-12 left-12 w-64 h-64 bg-red-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-12 right-12 w-96 h-96 bg-red-300/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-[0_20px_50px_rgba(206,17,38,0.06)] border border-slate-100/80 overflow-hidden backdrop-blur-sm z-10 transition-all duration-300">
        
        {/* Flag Stripe (Merah Putih Decor) */}
        <div className="w-full h-1.5 flex">
          <div className="flex-1 bg-[#CE1126]" />
          <div className="flex-1 bg-white border-b border-slate-100" />
        </div>

        <div className="p-8 sm:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#CE1126] to-[#A50E1E] text-white shadow-lg shadow-red-500/20 mb-4 transform hover:rotate-6 transition-transform duration-300">
              {/* Cooperative Shield Icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-8 h-8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
                />
              </svg>
            </div>
            
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">
              Kopas<span className="text-[#CE1126]">Now</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Koperasi Merah Putih — Layanan Digital Terpercaya
            </p>
          </div>

          {/* Tab Selection */}
          <div className="flex bg-slate-100/80 p-1.5 rounded-2xl mb-8">
            <button
              onClick={() => {
                setIsLogin(true);
                setError("");
                setSuccess("");
              }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 ${
                isLogin
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Masuk
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                setError("");
                setSuccess("");
              }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 ${
                !isLogin
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Daftar
            </button>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-[#CE1126] rounded-r-xl flex items-start gap-3 animate-fade-in">
              <svg
                className="w-5 h-5 text-[#CE1126] shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span className="text-sm font-medium text-red-800">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-xl flex items-start gap-3 animate-fade-in">
              <svg
                className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm font-medium text-emerald-800">{success}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name field (Only shown during Register) */}
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                      />
                    </svg>
                  </span>
                  <input
                    type="text"
                    name="nama"
                    placeholder="Nama Lengkap sesuai KTP"
                    required={!isLogin}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#CE1126] focus:ring-2 focus:ring-red-100 rounded-2xl text-slate-800 text-sm placeholder-slate-400 outline-none transition-all"
                  />
                </div>
              </div>
            )}

            {/* Email or Phone field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Email atau Nomor HP
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                    />
                  </svg>
                </span>
                <input
                  type="text"
                  name="identifier"
                  placeholder={
                    isLogin
                      ? "contoh@email.com atau 0812xxxxxxxx"
                      : "Masukkan email atau nomor HP aktif"
                  }
                  required
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#CE1126] focus:ring-2 focus:ring-red-100 rounded-2xl text-slate-800 text-sm placeholder-slate-400 outline-none transition-all"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Password
                </label>
                {isLogin && (
                  <a
                    href="#"
                    className="text-xs font-medium text-[#CE1126] hover:text-[#A50E1E] hover:underline"
                    onClick={(e) => {
                      e.preventDefault();
                      alert("Silakan hubungi admin koperasi untuk mereset password Anda.");
                    }}
                  >
                    Lupa Password?
                  </a>
                )}
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                    />
                  </svg>
                </span>
                <input
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#CE1126] focus:ring-2 focus:ring-red-100 rounded-2xl text-slate-800 text-sm placeholder-slate-400 outline-none transition-all"
                />
              </div>
            </div>

            {/* Confirm Password field (Only shown during Register) */}
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Konfirmasi Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                      />
                    </svg>
                  </span>
                  <input
                    type="password"
                    name="confirmPassword"
                    placeholder="••••••••"
                    required={!isLogin}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#CE1126] focus:ring-2 focus:ring-red-100 rounded-2xl text-slate-800 text-sm placeholder-slate-400 outline-none transition-all"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-gradient-to-r from-[#CE1126] to-[#A50E1E] text-white py-3.5 px-4 font-semibold text-sm rounded-2xl hover:shadow-lg hover:shadow-red-500/20 active:scale-[0.98] disabled:opacity-75 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Memproses...
                </>
              ) : isLogin ? (
                "Masuk ke Akun Koperasi"
              ) : (
                "Daftar Anggota Koperasi"
              )}
            </button>
          </form>

          {/* Footer Info */}
          <div className="mt-8 text-center border-t border-slate-100 pt-6">
            <p className="text-xs text-slate-400">
              Dengan masuk atau mendaftar, Anda menyetujui Ketentuan Layanan dan Kebijakan Privasi
              KopasNow Indonesia.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
