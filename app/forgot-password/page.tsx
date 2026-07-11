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
    <div className="min-h-screen flex items-center justify-center bg-background p-4 font-body-md selection:bg-primary selection:text-on-primary relative">

      {/* Main Card Container */}
      <div className="relative w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant overflow-hidden z-10 transition-all duration-300">
        <div className="p-8 sm:p-10">
       {/* Header */}
          <div className="text-center mb-8">
         <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-container text-on-primary-container shadow-sm mb-4">
          <span className="material-symbols-outlined text-[32px]" aria-hidden>lock_reset</span>
          </div>

       <h1 className="text-headline-sm font-headline-sm font-extrabold tracking-tight text-on-surface flex items-center justify-center gap-0.5">
    <span>Lupa Password</span>
            </h1>
    <p className="text-label-sm font-label-sm text-secondary mt-2 uppercase tracking-wider">
     Reset Password via WhatsApp OTP
         </p>
          </div>

     {/* Messages */}
  {error && (
  <div className="mb-6 p-4 bg-error-container border border-error/20 rounded-xl flex items-start gap-3">
     <span className="material-symbols-outlined text-[20px] text-error shrink-0 mt-0.5" aria-hidden>error</span>
          <span className="text-body-sm font-body-sm font-bold text-on-error-container">{error}</span>
       </div>
    )}

          {success && (
 <div className="mb-6 p-4 bg-tertiary-container/30 border border-tertiary/20 rounded-xl flex items-start gap-3">
          <span className="material-symbols-outlined text-[20px] text-tertiary shrink-0 mt-0.5" aria-hidden>check_circle</span>
   <span className="text-body-sm font-body-sm font-bold text-on-surface">
         {success}
 </span>
       </div>
          )}

          {/* Step 1: Request OTP */}
     {step === "request" && (
        <form onSubmit={handleRequestOTP} className="space-y-5">
              <div className="space-y-1.5">
       <label className="text-label-sm font-label-sm uppercase tracking-wider text-secondary block mb-1">
        Nomor Handphone
  </label>
                <div className="relative">
       <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-secondary pointer-events-none">
          <span className="material-symbols-outlined text-[18px]" aria-hidden>call</span>
  </span>
       <input
          type="text"
             name="identifier"
            placeholder="Contoh: 082125350744"
       required
        className="w-full pl-10 pr-4 py-3 bg-surface border border-outline-variant focus:border-primary focus:bg-surface-container-lowest rounded-xl text-on-surface text-body-md font-body-md placeholder-secondary outline-none transition-all"
          />
   </div>
  <p className="text-body-sm font-body-sm text-secondary mt-2">
   OTP akan dikirim via WhatsApp ke nomor ini
          </p>
            </div>

         <button
       type="submit"
     disabled={loading}
           className="w-full py-3 bg-primary hover:bg-surface-tint text-on-primary font-label-md text-label-md font-bold rounded-full transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
  {loading ? "Mengirim..." : "Kirim Kode OTP"}
    </button>

   <div className="text-center">
    <Link
        href="/auth"
  className="text-label-sm font-label-sm font-bold text-secondary hover:text-primary transition-colors"
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
   <label className="text-label-sm font-label-sm uppercase tracking-wider text-secondary block mb-1">
    Kode OTP
                </label>
   <div className="relative">
  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-secondary pointer-events-none">
          <span className="material-symbols-outlined text-[18px]" aria-hidden>vpn_key</span>
        </span>
 <input
      type="text"
   name="otp"
     placeholder="Masukkan 6 digit kode OTP"
        required
            maxLength={6}
        pattern="[0-9]{6}"
       className="w-full pl-10 pr-4 py-3 bg-surface border border-outline-variant focus:border-primary focus:bg-surface-container-lowest rounded-xl text-on-surface text-body-md font-body-md placeholder-secondary outline-none transition-all tracking-widest"
      />
       </div>
  <p className="text-body-sm font-body-sm text-secondary mt-2">
          Periksa WhatsApp Anda untuk kode OTP
      </p>
              </div>

    <button
        type="submit"
     disabled={loading}
       className="w-full py-3 bg-primary hover:bg-surface-tint text-on-primary font-label-md text-label-md font-bold rounded-full transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
     >
       {loading ? "Memverifikasi..." : "Verifikasi Kode OTP"}
            </button>

      <div className="text-center">
    <button
         type="button"
    onClick={() => setStep("request")}
    className="text-label-sm font-label-sm font-bold text-secondary hover:text-primary transition-colors cursor-pointer bg-transparent border-none"
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
         <label className="text-label-sm font-label-sm uppercase tracking-wider text-secondary block mb-1">
   Password Baru
       </label>
    <div className="relative">
         <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-secondary pointer-events-none">
          <span className="material-symbols-outlined text-[18px]" aria-hidden>lock</span>
   </span>
      <input
            type="password"
          name="newPassword"
                placeholder="Minimal 6 karakter"
  required
    minLength={6}
             className="w-full pl-10 pr-4 py-3 bg-surface border border-outline-variant focus:border-primary focus:bg-surface-container-lowest rounded-xl text-on-surface text-body-md font-body-md placeholder-secondary outline-none transition-all"
       />
                </div>
         </div>

         <div className="space-y-1.5">
    <label className="text-label-sm font-label-sm uppercase tracking-wider text-secondary block mb-1">
       Konfirmasi Password Baru
      </label>
         <div className="relative">
        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-secondary pointer-events-none">
           <span className="material-symbols-outlined text-[18px]" aria-hidden>lock</span>
        </span>
          <input
     type="password"
        name="confirmPassword"
          placeholder="Ulangi password baru"
    required
              minLength={6}
    className="w-full pl-10 pr-4 py-3 bg-surface border border-outline-variant focus:border-primary focus:bg-surface-container-lowest rounded-xl text-on-surface text-body-md font-body-md placeholder-secondary outline-none transition-all"
          />
       </div>
     </div>

  <button
        type="submit"
       disabled={loading}
     className="w-full py-3 bg-primary hover:bg-surface-tint text-on-primary font-label-md text-label-md font-bold rounded-full transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
      {loading ? "Mengubah Password..." : "Ubah Password"}
         </button>
       </form>
  )}

  {/* Step 4: Success */}
          {step === "success" && (
            <div className="text-center space-y-6">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-tertiary-container text-on-tertiary-container shadow-sm border border-tertiary/20 mb-4">
      <span className="material-symbols-outlined text-[40px]" aria-hidden>check_circle</span>
   </div>

     <div>
          <h2 className="text-title-lg font-title-lg font-extrabold text-on-surface mb-2">
                  Password Berhasil Diubah!
              </h2>
   <p className="text-body-md font-body-md text-secondary">
         Anda dapat login dengan password baru Anda sekarang.
   </p>
              </div>

     <Link
      href="/auth"
                className="inline-flex items-center justify-center w-full py-3 bg-primary hover:bg-surface-tint text-on-primary font-label-md text-label-md font-bold rounded-full transition-all shadow-sm"
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
