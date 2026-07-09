"use client";

import React, { useState } from "react";
import { signInAction, signUpAction } from "@/server/actions/auth";
import Link from "next/link";

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
        // Redirect after a brief delay
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
    <div className="min-h-screen flex items-center justify-center bg-[#F6F6F6] p-4 font-sans selection:bg-[#CE1126] selection:text-white relative">
      {/* Visual top branding bar */}
      <div className="w-full h-1 flex fixed top-0 left-0 z-50">
        <div className="w-1/3 bg-[#CE1126]" />
        <div className="w-1/3 bg-white" />
        <div className="w-1/3 bg-[#CE1126]" />
      </div>

      {/* Main Card Container */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden z-10 transition-all duration-300">
        <div className="p-8 sm:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-black text-[#CE1126] shadow-sm mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
                />
              </svg>
            </div>
            
            <h1 className="text-2xl font-black tracking-tight text-black flex items-center justify-center gap-0.5">
              <span>Kopas</span>
              <span className="text-[#CE1126]">Now</span>
              <span className="bg-[#CE1126] text-white px-1 py-0.5 rounded-sm font-extrabold text-[8px] uppercase tracking-wider ml-1">
                Mart
              </span>
            </h1>
            <p className="text-xs text-gray-400 mt-2 font-bold uppercase tracking-wider">
              Layanan Digital Koperasi Merah Putih
            </p>
          </div>

          {/* Switch Tab (Uber style pill selection) */}
          <div className="flex bg-[#F3F3F3] p-1.5 rounded-full mb-8 border border-gray-100/50">
            <button
              onClick={() => {
                setIsLogin(true);
                setError("");
                setSuccess("");
              }}
              className={`flex-1 py-2 text-xs font-black rounded-full transition-all duration-200 cursor-pointer ${
                isLogin
                  ? "bg-black text-white shadow-sm"
                  : "text-gray-500 hover:text-black"
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
              className={`flex-1 py-2 text-xs font-black rounded-full transition-all duration-200 cursor-pointer ${
                !isLogin
                  ? "bg-black text-white shadow-sm"
                  : "text-gray-500 hover:text-black"
              }`}
            >
              Daftar
            </button>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl flex items-start gap-3">
              <svg
                className="w-5 h-5 text-red-650 shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span className="text-xs font-bold text-red-900">{error}</span>
            </div>
          )}

          {success && (
        <div className="mb-6 p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-xl flex items-start gap-3">
        <svg
            className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
               <span className="text-xs font-bold text-emerald-900">{success}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name field (Only shown during Register) */}
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-4 h-4"
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
                    placeholder="Contoh: Yogi Ferdiansyah"
                    required={!isLogin}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F3F3F3] border border-transparent focus:border-black focus:bg-white rounded-xl text-black text-xs font-bold placeholder-gray-400 outline-none transition-all"
                  />
                </div>
              </div>
            )}

            {/* Email or Phone field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                Surel (Email) atau No. Handphone
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-4 h-4"
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
                      : "Surel atau No. HP aktif Anda"
                  }
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F3F3F3] border border-transparent focus:border-black focus:bg-white rounded-xl text-black text-xs font-bold placeholder-gray-400 outline-none transition-all"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Kata Sandi (Password)
                </label>
          {isLogin && (
            <Link
              href="/forgot-password"
              className="text-[10px] font-extrabold text-[#CE1126] hover:text-red-700 hover:underline"
            >
              Lupa Sandi?
            </Link>
    )}
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-4 h-4"
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
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F3F3F3] border border-transparent focus:border-black focus:bg-white rounded-xl text-black text-xs font-bold placeholder-gray-400 outline-none transition-all"
                />
              </div>
            </div>

            {/* Confirm Password field (Only shown during Register) */}
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Konfirmasi Kata Sandi
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-4 h-4"
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
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F3F3F3] border border-transparent focus:border-black focus:bg-white rounded-xl text-black text-xs font-bold placeholder-gray-400 outline-none transition-all"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-black hover:bg-neutral-800 text-white py-3.5 px-4 font-bold text-xs rounded-full shadow-sm active:scale-[0.98] disabled:opacity-75 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
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
                "Daftar Anggota Baru"
              )}
            </button>
          </form>

          {/* Footer Info */}
          <div className="mt-8 text-center border-t border-gray-100 pt-6">
            <p className="text-[10px] text-gray-400 leading-normal font-medium">
              Dengan masuk atau mendaftar, Anda menyetujui Ketentuan Layanan &amp; Kebijakan Privasi
              KopasNow Mart.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
