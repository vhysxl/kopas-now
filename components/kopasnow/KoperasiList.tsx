"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import type { KoperasiLocation } from "@/utils/helper/geo";
import { formatDistance, formatWalkTime } from "@/utils/helper/geo";
import type { KopasnowProduct } from "@/server/actions/getProducts";

interface KoperasiWithDistance extends KoperasiLocation {
  distance: number;
}

interface KoperasiListProps {
  koperasiList: KoperasiWithDistance[];
  productsByKoperasi: Record<string, KopasnowProduct[]>;
  hasLocation: boolean;
  searchQuery?: string;
}

export default function KoperasiList({
  koperasiList,
  productsByKoperasi,
  hasLocation,
  searchQuery = "",
}: KoperasiListProps) {
  if (koperasiList.length === 0) {
    return (
      <div className="text-center py-12 px-6 bg-white rounded-2xl border border-slate-200">
        <div className="text-5xl mb-3">🏪</div>
        <p className="text-lg font-bold text-slate-800">
          {searchQuery
            ? `Barang "${searchQuery}" tidak ditemukan`
            : "Belum ada koperasi yang ditemukan"}
        </p>
        <p className="text-base text-slate-600 mt-2">
          {searchQuery
            ? "Coba tulis nama barang yang lain, contoh: beras atau minyak."
            : "Coba nyalakan lokasi, atau tarik layar ke bawah untuk memuat ulang."}
        </p>
      </div>
    );
  }

  const query = searchQuery.trim().toLowerCase();

  return (
    <div className="space-y-4">
      {koperasiList.map((koperasi, idx) => {
        const isNearest = hasLocation && idx === 0;
        const products = productsByKoperasi[koperasi.id] || [];
        // Saat mencari, tampilkan dulu barang yang cocok dengan pencarian
        const matched = query
          ? products.filter((p) => p.nama_produk.toLowerCase().includes(query))
          : products;
        const displayProducts = matched.slice(0, 3);
        const remainingCount = products.length - displayProducts.length;

        return (
          <div
            key={koperasi.id}
            className={`w-full p-5 rounded-2xl border-2 bg-white ${
              isNearest ? "border-[#CE1126]/40 shadow-md" : "border-slate-200"
            }`}
          >
            {isNearest && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold bg-red-50 text-[#CE1126] border border-red-100 mb-2">
                ⭐ Paling dekat dari Anda
              </span>
            )}

            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-bold text-slate-900 leading-snug">
                {koperasi.nama}
              </h3>
              {koperasi.status === "active" && (
                <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Buka
                </span>
              )}
            </div>

            {hasLocation && koperasi.distance > 0 && (
              <p className="text-base font-semibold text-slate-700 mt-1.5">
                🚶 {formatWalkTime(koperasi.distance)}{" "}
                <span className="font-normal text-slate-500">
                  ({formatDistance(koperasi.distance)})
                </span>
              </p>
            )}

            {koperasi.alamat && (
              <p className="text-base text-slate-600 mt-1.5 flex items-center gap-1">
                <MapPin className="w-4 h-4 shrink-0" /> {koperasi.alamat}
              </p>
            )}

            {displayProducts.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-semibold text-slate-500 mb-2">
                  {query ? "Barang yang Anda cari:" : "Contoh barang yang dijual:"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {displayProducts.map((prod) => (
                    <div
                      key={prod.id_produk}
                      className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg max-w-full"
                    >
                      <span className="text-sm font-medium text-slate-800 truncate max-w-[140px]">
                        {prod.nama_produk}
                      </span>
                      <span className="text-sm font-bold text-[#CE1126] shrink-0">
                        Rp {parseInt(prod.harga_produk).toLocaleString("id-ID")}
                      </span>
                    </div>
                  ))}
                  {remainingCount > 0 && (
                    <div className="inline-flex items-center px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-200">
                      <span className="text-sm font-medium text-slate-600">
                        +{remainingCount} barang lainnya
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <Link
              href={`/koperasi/${koperasi.id}`}
              className="mt-4 w-full min-h-[52px] bg-[#CE1126] hover:bg-[#A50E1E] active:bg-[#8E0C1A] text-white rounded-xl text-base font-bold flex items-center justify-center gap-2 transition-colors"
            >
              Lihat Barang di Koperasi Ini
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
