"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  requestLoginOTP,
  verifyLoginOTP,
  signInAction,
} from "@/server/actions/auth";

type Step = "phone" | "otp" | "password";

export default function AuthPage() {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [nama, setNama] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isNewUser, setIsNewUser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Hitung mundur tombol "Kirim Ulang Kode"
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  const sendCode = async () => {
    setLoading(true);
    setError("");
    setInfo("");

    const formData = new FormData();
    formData.set("phone", phone);

    try {
      const res = await requestLoginOTP(null, formData);
      if (res?.error) {
        setError(res.error);
      } else {
        setIsNewUser(!!res.isNewUser);
        setStep("otp");
        setOtp(["", "", "", "", "", ""]);
        setResendCountdown(120);
        setInfo(res.message || "Kode sudah dikirim. Silakan buka WhatsApp Anda.");
      }
    } catch {
      setError("Tidak bisa terhubung. Periksa sambungan internet Anda, lalu coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOTP = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!phone.startsWith("08") || phone.length < 10 || phone.length > 14) {
      setError("Nomor WhatsApp tidak valid. Pastikan diawali '08' dan terdiri dari 10-14 angka.");
      return;
    }
    await sendCode();
  };

  const handleVerifyOTP = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    const otpValue = otp.join("");
    if (otpValue.length < 6) return;

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.set("phone", phone);
    formData.set("otp", otpValue);
    formData.set("nama", nama);

    try {
      const res = await verifyLoginOTP(null, formData);
      if (res?.error) {
        setError(res.error);
      } else {
        setInfo("Berhasil masuk! Tunggu sebentar...");
        window.location.href = "/";
      }
    } catch {
      setError("Tidak bisa terhubung. Periksa sambungan internet Anda, lalu coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    try {
      const res = await signInAction(null, formData);
      if (res?.error) {
        setError(res.error);
      } else {
        setInfo("Berhasil masuk! Tunggu sebentar...");
        window.location.href = "/";
      }
    } catch {
      setError("Tidak bisa terhubung. Periksa sambungan internet Anda, lalu coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const formatPhone = (val: string) => {
    let value = val.replace(/\D/g, "");
    if (value.length > 14) value = value.slice(0, 14);
    return value;
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (e.key === "Enter" && otp.join("").length === 6) {
      handleVerifyOTP();
    }
  };

  const formatTimer = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col min-h-screen text-on-surface bg-background font-sans">
      
      {/* TopAppBar for OTP/Password step */}
      {step !== "phone" && (
        <nav className="fixed top-0 left-0 right-0 w-full flex justify-between items-center px-5 py-4 bg-background z-50">
          <button 
            onClick={() => setStep("phone")}
            aria-label="Kembali" 
            className="flex items-center justify-center w-10 h-10 hover:opacity-80 active:scale-95 transition-transform text-primary"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <span className="text-xl font-bold text-primary tracking-tight">KopasNow</span>
          <div className="w-10"></div>
        </nav>
      )}

      {/* Main Canvas */}
      <main className={`flex-grow flex flex-col items-center justify-center px-5 max-w-[480px] mx-auto w-full ${step !== "phone" ? "pt-24 pb-12" : "py-12"}`}>
        
        {error && (
          <div className="w-full mb-6 p-4 bg-error-container border border-error rounded-xl text-center">
            <p className="text-sm font-medium text-on-error-container">{error}</p>
          </div>
        )}
        {info && !error && (
          <div className="w-full mb-6 p-4 bg-tertiary-container border border-tertiary rounded-xl text-center">
            <p className="text-sm font-medium text-on-tertiary-container">{info}</p>
          </div>
        )}

        {step === "phone" && (
          <>
            <div className="mb-12 text-center">
              <div className="mb-4">
                <h1 className="text-3xl font-bold text-primary tracking-tight font-sans">KopasNow</h1>
              </div>
            </div>

            <div className="w-full text-center mb-6">
              <h2 className="text-2xl font-bold text-on-surface mb-2">Selamat Datang</h2>
              <p className="text-base font-normal text-secondary">Silakan masuk dengan nomor WhatsApp Anda untuk memulai.</p>
            </div>

            <div className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm mb-6">
              <form onSubmit={handleRequestOTP} className="space-y-6">
                <div className="relative group">
                  <label className="text-sm font-medium text-secondary block mb-2 transition-colors group-focus-within:text-primary" htmlFor="phone_number">
                    Nomor WhatsApp
                  </label>
                  <div className="flex items-center border-b border-outline py-2 focus-within:border-primary transition-colors">
                    <input 
                      autoComplete="tel" 
                      className="w-full bg-transparent border-none focus:ring-0 p-0 text-lg font-normal placeholder:text-outline-variant outline-none" 
                      id="phone_number" 
                      name="phone_number" 
                      placeholder="081234567890" 
                      required 
                      type="tel"
                      value={formatPhone(phone)}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

                <button 
                  className="w-full bg-primary hover:bg-primary-container text-on-primary py-4 px-6 rounded-lg text-sm font-medium flex justify-between items-center active:scale-95 transition-all disabled:opacity-50" 
                  type="submit"
                  disabled={loading}
                >
                  <span>{loading ? "Memproses..." : "Lanjutkan"}</span>
                  {!loading && <span className="material-symbols-outlined">arrow_forward</span>}
                </button>
              </form>
              
              <div className="mt-8 opacity-40">
                <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-outline-variant to-transparent"></div>
              </div>
            </div>

            <div className="mt-4 w-full text-center">
              <button 
                onClick={() => {
                  setError("");
                  setInfo("");
                  setStep("password");
                }}
                className="text-sm font-medium text-secondary hover:text-primary transition-colors"
              >
                Punya kata sandi? Masuk di sini
              </button>
            </div>

            <div className="mt-8 flex items-center gap-3 text-secondary">
              <span className="material-symbols-outlined text-[20px]">verified_user</span>
              <p className="text-xs font-semibold">Data Anda aman bersama kami.</p>
            </div>
          </>
        )}

        {step === "otp" && (
          <>
            <section className="mb-12 w-full">
              <h1 className="text-2xl font-bold text-on-surface mb-2">Verifikasi Nomor Anda</h1>
              <p className="text-base font-normal text-secondary">
                Kami telah mengirimkan kode 6 digit ke nomor <span className="font-semibold text-on-surface">{formatPhone(phone)}</span>
              </p>
            </section>

            {isNewUser && (
              <section className="mb-8 w-full">
                <div className="relative group">
                  <label className="text-sm font-medium text-secondary block mb-2 transition-colors group-focus-within:text-primary" htmlFor="nama_lengkap">
                    Nama Lengkap
                  </label>
                  <div className="flex items-center border-b border-outline py-2 focus-within:border-primary transition-colors">
                    <input 
                      autoComplete="name" 
                      className="w-full bg-transparent border-none focus:ring-0 p-0 text-lg font-normal placeholder:text-outline-variant outline-none" 
                      id="nama_lengkap" 
                      name="nama_lengkap" 
                      placeholder="Sesuai KTP" 
                      required 
                      type="text"
                      value={nama}
                      onChange={(e) => setNama(e.target.value)}
                    />
                  </div>
                  <p className="mt-2 text-[11px] font-semibold text-secondary uppercase tracking-wider opacity-60">
                    Pastikan nama sesuai dengan kartu identitas Anda
                  </p>
                </div>
              </section>
            )}

            <section className="mb-6 w-full">
              <div className="flex justify-between gap-2 sm:gap-3">
                {otp.map((digit, i) => (
                  <input 
                    key={i}
                    ref={(el) => {
                      otpRefs.current[i] = el;
                    }}
                    className="w-full aspect-square text-center text-xl font-bold border border-outline-variant bg-surface-container-low rounded-lg outline-none focus:border-primary focus:bg-surface-container-lowest focus:shadow-[0_4px_12px_rgba(175,16,26,0.05)] transition-all"
                    inputMode="numeric" 
                    maxLength={1} 
                    type="text"
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  />
                ))}
              </div>
            </section>

            <section className="flex flex-col items-center gap-2 mb-12 w-full">
              <div className={`flex items-center gap-2 text-sm font-medium text-secondary transition-opacity ${resendCountdown <= 0 ? "opacity-0" : "opacity-100"}`}>
                <span className="material-symbols-outlined text-[18px]">schedule</span>
                <span>{formatTimer(resendCountdown)}</span>
              </div>
              <button 
                onClick={sendCode}
                disabled={resendCountdown > 0 || loading}
                className={`text-sm font-medium transition-colors ${resendCountdown > 0 ? 'text-outline cursor-not-allowed' : 'text-primary hover:text-primary-container cursor-pointer'}`}
              >
                Kirim Ulang Kode
              </button>
            </section>

            <div className="mt-auto w-full">
              <button 
                onClick={() => handleVerifyOTP()}
                disabled={loading || otp.join("").length < 6 || (isNewUser && !nama.trim())}
                className="w-full py-4 bg-primary hover:bg-primary-container text-on-primary font-medium text-sm rounded-lg active:scale-95 transition-all shadow-sm disabled:opacity-50"
              >
                {loading ? "Memverifikasi..." : (isNewUser ? "Mulai Belanja" : "Verifikasi")}
              </button>
            </div>
          </>
        )}

        {step === "password" && (
          <>
            <div className="w-full text-center mb-6">
              <h2 className="text-2xl font-bold text-on-surface mb-2">Masuk dengan Kata Sandi</h2>
              <p className="text-base font-normal text-secondary">Untuk anggota yang mendaftar dengan email atau memiliki kata sandi.</p>
            </div>

            <div className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm mb-6">
              <form onSubmit={handlePasswordLogin} className="space-y-6">
                <div className="relative group">
                  <label className="text-sm font-medium text-secondary block mb-2 transition-colors group-focus-within:text-primary" htmlFor="identifier">
                    Email atau Nomor HP
                  </label>
                  <div className="flex items-center border-b border-outline py-2 focus-within:border-primary transition-colors">
                    <input 
                      className="w-full bg-transparent border-none focus:ring-0 p-0 text-lg font-normal placeholder:text-outline-variant outline-none" 
                      id="identifier" 
                      name="identifier" 
                      placeholder="Masukkan email / no. HP" 
                      required 
                      type="text"
                    />
                  </div>
                </div>

                <div className="relative group">
                  <label className="text-sm font-medium text-secondary block mb-2 transition-colors group-focus-within:text-primary" htmlFor="password">
                    Kata Sandi
                  </label>
                  <div className="flex items-center border-b border-outline py-2 focus-within:border-primary transition-colors">
                    <input 
                      className="w-full bg-transparent border-none focus:ring-0 p-0 text-lg font-normal placeholder:text-outline-variant outline-none" 
                      id="password" 
                      name="password" 
                      placeholder="Masukkan kata sandi" 
                      required 
                      type="password"
                    />
                  </div>
                </div>

                <button 
                  className="w-full bg-primary hover:bg-primary-container text-on-primary py-4 px-6 rounded-lg text-sm font-medium flex justify-center items-center active:scale-95 transition-all disabled:opacity-50" 
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Memeriksa..." : "Masuk"}
                </button>
              </form>
            </div>
          </>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-on-surface text-primary-fixed font-label-sm text-label-sm w-full mt-auto">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8 px-margin-page py-section-gap text-surface-bright max-w-screen-xl mx-auto">
          {/* Brand Info */}
          <div className="flex flex-col gap-4 text-center md:text-left">
            <span className="font-headline-sm text-headline-sm text-surface-bright flex items-center justify-center md:justify-start gap-2">
              <span className="material-symbols-outlined" data-weight="fill">storefront</span>
              KopasNow
            </span>
            <p className="text-surface-variant text-xs leading-relaxed max-w-sm">
              Platform digital untuk Koperasi Indonesia. Memberdayakan ekonomi lokal dengan teknologi modern.
            </p>
            <div className="flex justify-center md:justify-start gap-4 mt-2">
              <div className="w-8 h-8 rounded-full bg-surface-variant/20 flex items-center justify-center hover:bg-surface-variant/40 cursor-pointer transition-colors">
                <span className="material-symbols-outlined text-[18px]">public</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-surface-variant/20 flex items-center justify-center hover:bg-surface-variant/40 cursor-pointer transition-colors">
                <span className="material-symbols-outlined text-[18px]">share</span>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-surface-variant/20 px-margin-page py-6 max-w-screen-xl mx-auto flex flex-col md:flex-row items-center justify-between text-xs">
          <p className="text-surface-variant">© 2026 KopasNow. Memberdayakan Ekonomi Desa Merah Putih.</p>
        </div>
      </footer>
    </div>
  );
}

