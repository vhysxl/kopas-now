"use client";

import React, { useEffect, useState } from "react";
import {
  requestLoginOTP,
  verifyLoginOTP,
  signInAction,
} from "@/server/actions/auth";

type Step = "phone" | "otp";

export default function AuthPage() {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [nama, setNama] = useState("");
  const [otp, setOtp] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);

  // Fallback masuk pakai kata sandi (untuk akun lama berbasis email)
  const [showPasswordLogin, setShowPasswordLogin] = useState(false);

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
        setOtp("");
        setResendCountdown(60);
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
    await sendCode();
  };

  const handleVerifyOTP = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.set("phone", phone);
    formData.set("otp", otp);
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6F6F6] p-4 font-sans text-slate-900">
      {/* Garis bendera Merah Putih */}
      <div className="w-full h-1.5 flex fixed top-0 left-0 z-50">
        <div className="w-1/2 bg-[#CE1126]" />
        <div className="w-1/2 bg-white border-b border-slate-200" />
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 sm:p-8">
          {/* Logo */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-black tracking-tight">
              <span className="text-slate-900">Kopas</span>
              <span className="text-[#CE1126]">Now</span>
            </h1>
            <p className="text-base text-slate-600 mt-1">
              Belanja di Koperasi Desa Merah Putih
            </p>
          </div>

          {/* Pesan error / info */}
          {error && (
            <div className="mb-5 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
              <p className="text-base font-semibold text-red-800">{error}</p>
            </div>
          )}
          {info && !error && (
            <div className="mb-5 p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl">
              <p className="text-base font-semibold text-emerald-800">{info}</p>
            </div>
          )}

          {step === "phone" && !showPasswordLogin && (
            <form onSubmit={handleRequestOTP} className="space-y-5">
              <div className="text-center">
                <h2 className="text-xl font-extrabold text-slate-900">
                  Masuk dengan Nomor HP
                </h2>
                <p className="text-base text-slate-600 mt-1.5">
                  Tidak perlu kata sandi. Kode masuk dikirim lewat{" "}
                  <strong className="text-emerald-700">WhatsApp</strong>.
                </p>
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="text-base font-bold text-slate-900 block mb-1.5"
                >
                  Nomor HP (yang ada WhatsApp-nya)
                </label>
                <input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Contoh: 0812 3456 7890"
                  required
                  className="w-full h-14 px-4 bg-white border-2 border-slate-300 focus:border-[#CE1126] rounded-xl text-lg font-bold text-slate-900 placeholder-slate-400 placeholder:font-normal outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[56px] bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-lg font-extrabold flex items-center justify-center gap-2.5 transition-colors disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  "Mengirim kode..."
                ) : (
                  <>
                    {/* Logo WhatsApp */}
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    Kirim Kode ke WhatsApp
                  </>
                )}
              </button>

              <p className="text-sm text-slate-500 text-center leading-relaxed">
                Nomor baru akan langsung didaftarkan sebagai anggota.
                Dengan masuk, Anda menyetujui Ketentuan Layanan KopasNow.
              </p>
            </form>
          )}

          {step === "otp" && !showPasswordLogin && (
            <form onSubmit={handleVerifyOTP} className="space-y-5">
              <div className="text-center">
                <div className="text-4xl mb-2">💬</div>
                <h2 className="text-xl font-extrabold text-slate-900">
                  Buka WhatsApp Anda
                </h2>
                <p className="text-base text-slate-600 mt-1.5">
                  Kami sudah kirim <strong>6 angka</strong> ke WhatsApp nomor{" "}
                  <strong className="whitespace-nowrap">{phone}</strong>.
                  Tulis angkanya di bawah ini.
                </p>
              </div>

              {isNewUser && (
                <div>
                  <label
                    htmlFor="nama"
                    className="text-base font-bold text-slate-900 block mb-1.5"
                  >
                    Nama lengkap Anda
                  </label>
                  <input
                    id="nama"
                    type="text"
                    autoComplete="name"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    placeholder="Contoh: Siti Aminah"
                    required
                    className="w-full h-14 px-4 bg-white border-2 border-slate-300 focus:border-[#CE1126] rounded-xl text-lg font-bold text-slate-900 placeholder-slate-400 placeholder:font-normal outline-none"
                  />
                  <p className="text-sm text-slate-500 mt-1">
                    Nomor Anda belum terdaftar, jadi kami perlu nama Anda.
                  </p>
                </div>
              )}

              <div>
                <label
                  htmlFor="otp"
                  className="text-base font-bold text-slate-900 block mb-1.5"
                >
                  Kode dari WhatsApp (6 angka)
                </label>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="______"
                  required
                  className="w-full h-16 px-4 bg-white border-2 border-slate-300 focus:border-[#CE1126] rounded-xl text-3xl font-black text-slate-900 text-center tracking-[0.4em] placeholder-slate-300 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading || otp.length < 6}
                className="w-full min-h-[56px] bg-[#CE1126] hover:bg-[#A50E1E] active:bg-[#8E0C1A] text-white rounded-xl text-lg font-extrabold transition-colors disabled:opacity-60 cursor-pointer"
              >
                {loading ? "Memeriksa kode..." : "Masuk"}
              </button>

              <div className="flex flex-col gap-1 text-center">
                <button
                  type="button"
                  onClick={sendCode}
                  disabled={resendCountdown > 0 || loading}
                  className="min-h-[48px] text-base font-bold text-emerald-700 hover:text-emerald-800 disabled:text-slate-400 cursor-pointer disabled:cursor-not-allowed"
                >
                  {resendCountdown > 0
                    ? `Kirim ulang kode (tunggu ${resendCountdown} detik)`
                    : "Kode tidak datang? Kirim Ulang"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep("phone");
                    setOtp("");
                    setError("");
                    setInfo("");
                  }}
                  className="min-h-[48px] text-base font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  ← Ganti Nomor HP
                </button>
              </div>
            </form>
          )}

          {/* Fallback: masuk pakai kata sandi (akun lama berbasis email) */}
          {showPasswordLogin && (
            <form onSubmit={handlePasswordLogin} className="space-y-5">
              <div className="text-center">
                <h2 className="text-xl font-extrabold text-slate-900">
                  Masuk dengan Kata Sandi
                </h2>
                <p className="text-base text-slate-600 mt-1.5">
                  Untuk anggota yang mendaftar dengan email.
                </p>
              </div>

              <div>
                <label
                  htmlFor="identifier"
                  className="text-base font-bold text-slate-900 block mb-1.5"
                >
                  Email atau No. HP
                </label>
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  required
                  className="w-full h-14 px-4 bg-white border-2 border-slate-300 focus:border-[#CE1126] rounded-xl text-base font-bold text-slate-900 outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="text-base font-bold text-slate-900 block mb-1.5"
                >
                  Kata Sandi
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="w-full h-14 px-4 bg-white border-2 border-slate-300 focus:border-[#CE1126] rounded-xl text-base font-bold text-slate-900 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[56px] bg-[#CE1126] hover:bg-[#A50E1E] text-white rounded-xl text-lg font-extrabold transition-colors disabled:opacity-60 cursor-pointer"
              >
                {loading ? "Memeriksa..." : "Masuk"}
              </button>
            </form>
          )}

          {/* Tukar mode */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => {
                setShowPasswordLogin((v) => !v);
                setError("");
                setInfo("");
                setStep("phone");
              }}
              className="min-h-[48px] text-base font-bold text-slate-600 hover:text-[#CE1126] cursor-pointer"
            >
              {showPasswordLogin
                ? "← Masuk pakai kode WhatsApp saja"
                : "Punya kata sandi? Masuk dengan kata sandi"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
