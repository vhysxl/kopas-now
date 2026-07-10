"use client";

import Link from "next/link";
import type { KoperasiLocation } from "@/utils/helper/geo";
import { formatDistance } from "@/utils/helper/geo";
import type { KopasnowProduct } from "@/server/actions/getProducts";

interface KoperasiWithDistance extends KoperasiLocation {
  distance: number;
}

interface KoperasiListProps {
  koperasiList: KoperasiWithDistance[];
  productsByKoperasi: Record<string, KopasnowProduct[]>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function KoperasiList({
  koperasiList,
  productsByKoperasi,
  selectedId,
  onSelect,
}: KoperasiListProps) {
  if (koperasiList.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mx-auto mb-3 text-slate-300">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
        </svg>
        <p className="text-sm font-medium">Tidak ada koperasi ditemukan</p>
        <p className="text-xs mt-1">Coba aktifkan lokasi untuk menemukan koperasi terdekat</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {koperasiList.map((koperasi, idx) => {
        const isSelected = koperasi.id === selectedId;
        const isNearest = idx === 0;
        const products = productsByKoperasi[koperasi.id] || [];
        const displayProducts = products.slice(0, 3);
        const remainingCount = products.length - 3;

        return (
          <div
            key={koperasi.id}
            onClick={() => onSelect(koperasi.id)}
            className={`
              w-full text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer
              ${isSelected
                ? "bg-red-50 border-[#CE1126]/30 shadow-md shadow-red-500/5 ring-1 ring-[#CE1126]/20"
                : "bg-white border-slate-100 hover:border-slate-200 hover:shadow-md hover:shadow-slate-100"
              }
            `}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="flex items-center gap-2 mb-1">
                  {isNearest && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0">
                      ⭐ Terdekat
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    {koperasi.kode_koperasi}
                  </span>
                </div>

                {/* Name */}
                <h3 className={`font-bold text-sm leading-snug ${isSelected ? "text-[#CE1126]" : "text-slate-800"}`}>
                  {koperasi.nama}
                </h3>

                {/* Address */}
                {koperasi.alamat && (
                  <p className="text-xs text-slate-500 mt-1 flex items-start gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 mt-0.5 shrink-0 text-slate-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                    <span className="truncate">{koperasi.alamat}</span>
                  </p>
                )}

                {/* Products Preview */}
                {products.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Menjual:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {displayProducts.map((prod) => (
                        <div key={prod.id_produk} className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-md max-w-full">
                          <span className="text-[11px] font-medium text-slate-700 truncate max-w-[120px]">{prod.nama_produk}</span>
                          <span className="text-[10px] font-semibold text-[#CE1126] shrink-0">Rp {parseInt(prod.harga_produk).toLocaleString('id-ID')}</span>
                        </div>
                      ))}
                      {remainingCount > 0 && (
                        <div className="inline-flex items-center px-2 py-1 bg-slate-100 rounded-md border border-slate-200">
                          <span className="text-[10px] font-medium text-slate-500">+{remainingCount} lainnya</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Distance badge */}
              <div className="flex flex-col items-end shrink-0 gap-1">
                <span className={`
                  inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold
                  ${isNearest
                    ? "bg-blue-50 text-blue-700 border border-blue-100"
                    : "bg-slate-50 text-slate-600 border border-slate-100"
                  }
                `}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.115 5.19l.319 1.913A6 6 0 008.11 10.36L9.75 12l-.387.775c-.217.433-.132.956.21 1.298l1.348 1.348c.21.21.329.497.329.795v1.089c0 .426.24.815.622 1.006l.153.076c.433.217.956.132 1.298-.21l.723-.723a8.7 8.7 0 002.288-4.042 1.087 1.087 0 00-.358-1.099l-1.33-1.108c-.251-.21-.582-.299-.905-.245l-1.17.195a1.125 1.125 0 01-.98-.314l-.295-.295a1.125 1.125 0 010-1.591l.13-.132a1.125 1.125 0 011.3-.21l.603.302a.809.809 0 001.086-1.086L14.25 7.5l1.256-.837a4.5 4.5 0 001.528-1.732l.146-.292M6.115 5.19A9 9 0 1017.18 4.64M6.115 5.19A8.965 8.965 0 0112 3c1.929 0 3.716.607 5.18 1.64" />
                  </svg>
                  {formatDistance(koperasi.distance)}
                </span>

                {/* Status dot */}
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Aktif
                </span>
              </div>
            </div>

            {/* Action Button when Selected */}
            {isSelected && (
              <div className="mt-4 pt-3 border-t border-[#CE1126]/10 flex justify-end">
                <Link
                  href={`/koperasi/${koperasi.id}`}
                  className="inline-flex items-center gap-2 bg-[#CE1126] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#A50E1E] transition-colors shadow-sm"
                >
                  Kunjungi Toko
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
