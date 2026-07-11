"use client";

import Link from "next/link";
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
      <div className="text-center py-12 px-6 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm flex flex-col items-center">
        <span className="material-symbols-outlined text-6xl text-surface-variant mb-4" aria-hidden>storefront</span>
        <p className="text-title-lg font-title-lg font-bold text-on-surface">
          {searchQuery
            ? `Barang "${searchQuery}" tidak ditemukan`
            : "Belum ada koperasi yang ditemukan"}
        </p>
        <p className="text-body-md font-body-md text-secondary mt-2">
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
            className={`w-full p-5 rounded-xl border bg-surface-container-lowest ${
              isNearest ? "border-primary shadow-sm" : "border-outline-variant shadow-sm"
            }`}
          >
            {isNearest && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-label-sm font-label-sm font-bold bg-primary-container/30 text-primary border border-primary/20 mb-3">
                <span className="material-symbols-outlined text-[16px]" aria-hidden>star</span> Paling dekat dari Anda
              </span>
            )}

            <div className="flex items-start justify-between gap-3">
              <h3 className="text-title-lg font-title-lg font-bold text-on-surface leading-snug">
                {koperasi.nama}
              </h3>
              {koperasi.status === "active" && (
                <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-label-sm font-label-sm font-bold bg-tertiary-container/30 text-tertiary border border-tertiary/20">
                  Buka
                </span>
              )}
            </div>

            {hasLocation && koperasi.distance > 0 && (
              <p className="text-body-md font-body-md font-semibold text-secondary mt-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]" aria-hidden>directions_walk</span> {formatWalkTime(koperasi.distance)}{" "}
                <span className="font-normal text-outline">
                  ({formatDistance(koperasi.distance)})
                </span>
              </p>
            )}

            {koperasi.alamat && (
              <p className="text-body-md font-body-md text-secondary mt-2 flex items-start gap-1.5">
                <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5" aria-hidden>location_on</span> {koperasi.alamat}
              </p>
            )}

            {displayProducts.length > 0 && (
              <div className="mt-5">
                <p className="text-label-sm font-label-sm font-semibold text-secondary mb-3">
                  {query ? "Barang yang Anda cari:" : "Contoh barang yang dijual:"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {displayProducts.map((prod) => (
                    <div
                      key={prod.id_produk}
                      className="inline-flex items-center gap-2 bg-surface-container-low border border-outline-variant px-3 py-1.5 rounded-lg max-w-full"
                    >
                      <span className="text-body-sm font-body-sm font-medium text-on-surface truncate max-w-[140px]">
                        {prod.nama_produk}
                      </span>
                      <span className="text-label-sm font-label-sm font-bold text-primary shrink-0">
                        Rp {parseInt(prod.harga_produk).toLocaleString("id-ID")}
                      </span>
                    </div>
                  ))}
                  {remainingCount > 0 && (
                    <div className="inline-flex items-center px-3 py-1.5 bg-surface-container-lowest rounded-lg border border-outline-variant">
                      <span className="text-body-sm font-body-sm font-medium text-secondary">
                        +{remainingCount} barang lainnya
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <Link
              href={`/koperasi/${koperasi.id}`}
              className="mt-5 w-full min-h-[48px] bg-primary hover:bg-surface-tint active:bg-primary text-on-primary rounded-full text-label-md font-label-md font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              Lihat Barang di Koperasi Ini
              <span className="material-symbols-outlined text-[20px]" aria-hidden>arrow_forward</span>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
