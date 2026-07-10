"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  requestPasswordResetOTP,
  verifyOTP,
  resetPassword,
} from "@/server/actions/auth";

type Step = "request" | "verify" | "reset" | "success";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("request");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleRequestOTP = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const formData = new FormData(e.currentTarget);

    try {
const res = await requestPasswordResetOTP(null, formData);

      if (res?.error) {
        setError(res.error);
      } else if (res?.success) {
     setSuccess(res.message || "OTP berhasil dikirim");
        setPhone(formData.get("identifier") as string);
        setTimeout(() => {
  setStep("verify");
          setSuccess("");
        }, 1500);
      }
    } catch (err) {
      setError("Terjadi kesalahan sistem. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const formData = new FormData(e.currentTarget);
    formData.append("identifier", phone);

    try {
      const res = await verifyOTP(null, formData);

      if (res?.error) {
        setError(res.error);
      } else if (res?.success) {
        setSuccess(res.message || "OTP berhasil diverifikasi");
        setOtp(formData.get("otp") as string);
        setTimeout(() => {
          setStep("reset");
          setSuccess("");
        }, 1500);
      }
    } catch (err) {
      setError("Terjadi kesalahan sistem. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const formData = new FormData(e.currentTarget);
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (newPassword !== confirmPassword) {
  setError("Password dan konfirmasi password tidak cocok");
  setLoading(false);
      return;
    }

    formData.append("identifier", phone);
  formData.append("otp", otp);

    try {
      const res = await resetPassword(null, formData);

      if (res?.error) {
     setError(res.error);
      } else if (res?.success) {
  setSuccess(res.message || "Password berhasil diubah");
      setTimeout(() => {
          setStep("success");
        }, 1500);
      }
    } catch (err) {
      setError("Terjadi kesalahan sistem. Silakan coba lagi.");
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
           d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
         />
          </svg>
          </div>

       <h1 className="text-2xl font-black tracking-tight text-black flex items-center justify-center gap-0.5">
   <span>Lupa Password</span>
            </h1>
    <p className="text-xs text-gray-400 mt-2 font-bold uppercase tracking-wider">
     Reset Password via WhatsApp OTP
         </p>
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
   <span className="text-xs font-bold text-emerald-900">
         {success}
 </span>
       </div>
          )}

          {/* Step 1: Request OTP */}
     {step === "request" && (
        <form onSubmit={handleRequestOTP} className="space-y-5">
              <div className="space-y-1.5">
       <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
        Nomor Handphone
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
          d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
   />
        </svg>
  </span>
       <input
          type="text"
             name="identifier"
            placeholder="Contoh: 082125350744"
       required
        className="w-full pl-10 pr-4 py-2.5 bg-[#F3F3F3] border border-transparent focus:border-black focus:bg-white rounded-xl text-black text-xs font-bold placeholder-gray-400 outline-none transition-all"
          />
   </div>
  <p className="text-[10px] text-gray-400 mt-1">
   OTP akan dikirim via WhatsApp ke nomor ini
          </p>
            </div>

         <button
       type="submit"
     disabled={loading}
           className="w-full py-3 bg-black hover:bg-gray-800 text-white font-black text-sm rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
 {loading ? "Mengirim..." : "Kirim Kode OTP"}
    </button>

   <div className="text-center">
    <Link
        href="/auth"
  className="text-xs font-bold text-gray-500 hover:text-black transition-colors"
     >
      Kembali ke Halaman Login
   </Link>
      </div>
       </form>
          )}

          {/* Step 2: Verify OTP */}
      {step === "verify" && (
       <form onSubmit={handleVerifyOTP} className="space-y-5">
     <div className="space-y-1.5">
   <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
    Kode OTP
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
        d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
/>
       </svg>
        </span>
 <input
      type="text"
   name="otp"
     placeholder="Masukkan 6 digit kode OTP"
        required
            maxLength={6}
        pattern="[0-9]{6}"
       className="w-full pl-10 pr-4 py-2.5 bg-[#F3F3F3] border border-transparent focus:border-black focus:bg-white rounded-xl text-black text-xs font-bold placeholder-gray-400 outline-none transition-all tracking-widest"
      />
       </div>
 <p className="text-[10px] text-gray-400 mt-1">
          Periksa WhatsApp Anda untuk kode OTP
      </p>
              </div>

    <button
        type="submit"
     disabled={loading}
       className="w-full py-3 bg-black hover:bg-gray-800 text-white font-black text-sm rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
     >
       {loading ? "Memverifikasi..." : "Verifikasi Kode OTP"}
            </button>

      <div className="text-center">
    <button
         type="button"
    onClick={() => setStep("request")}
    className="text-xs font-bold text-gray-500 hover:text-black transition-colors"
     >
        Kirim Ulang Kode OTP
</button>
</div>
        </form>
  )}

      {/* Step 3: Reset Password */}
   {step === "reset" && (
       <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="space-y-1.5">
        <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
   Password Baru
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
          name="newPassword"
                placeholder="Minimal 6 karakter"
 required
    minLength={6}
             className="w-full pl-10 pr-4 py-2.5 bg-[#F3F3F3] border border-transparent focus:border-black focus:bg-white rounded-xl text-black text-xs font-bold placeholder-gray-400 outline-none transition-all"
       />
                </div>
         </div>

         <div className="space-y-1.5">
    <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
       Konfirmasi Password Baru
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
          placeholder="Ulangi password baru"
    required
              minLength={6}
    className="w-full pl-10 pr-4 py-2.5 bg-[#F3F3F3] border border-transparent focus:border-black focus:bg-white rounded-xl text-black text-xs font-bold placeholder-gray-400 outline-none transition-all"
          />
       </div>
     </div>

  <button
        type="submit"
       disabled={loading}
     className="w-full py-3 bg-black hover:bg-gray-800 text-white font-black text-sm rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
      {loading ? "Mengubah Password..." : "Ubah Password"}
         </button>
       </form>
  )}

  {/* Step 4: Success */}
          {step === "success" && (
            <div className="text-center space-y-6">
     <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-[#CE1126] mb-4">
     <svg
              xmlns="http://www.w3.org/2000/svg"
       fill="none"
   viewBox="0 0 24 24"
   strokeWidth={2.5}
             stroke="currentColor"
           className="w-8 h-8"
   >
        <path
        strokeLinecap="round"
      strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
   />
        </svg>
  </div>

     <div>
          <h2 className="text-xl font-black text-black mb-2">
                  Password Berhasil Diubah!
              </h2>
   <p className="text-sm text-gray-500">
         Anda dapat login dengan password baru Anda sekarang.
   </p>
              </div>

     <Link
      href="/auth"
                className="inline-block w-full py-3 bg-black hover:bg-gray-800 text-white font-black text-sm rounded-xl transition-all shadow-sm"
    >
Kembali ke Halaman Login
     </Link>
            </div>
   )}
        </div>
      </div>
    </div>
  );
}
