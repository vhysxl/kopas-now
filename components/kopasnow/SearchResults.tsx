"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getKoperasiList } from "@/server/actions/getKoperasi";
import { getAllActiveProducts, type KopasnowProduct } from "@/server/actions/getProducts";
import { useLocationStore } from "@/store/useLocationStore";
import { haversineDistance, formatDistance } from "@/utils/helper/geo";
import type { KoperasiLocation } from "@/utils/helper/geo";
import { koperasiImage } from "@/utils/helper/koperasiImage";

type Tab = "semua" | "koperasi" | "produk";

interface SearchResultsProps {
  query: string;
  initialTab: Tab;
}

export default function SearchResults({ query, initialTab }: SearchResultsProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [koperasiList, setKoperasiList] = useState<KoperasiLocation[]>([]);
  const [products, setProducts] = useState<KopasnowProduct[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  const userLat = useLocationStore((s) => s.lat);
  const userLng = useLocationStore((s) => s.lng);
  const hasHydrated = useLocationStore((s) => s._hasHydrated);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [koperasiResult, productsResult] = await Promise.all([
        getKoperasiList(),
        getAllActiveProducts(),
      ]);
      if (cancelled) return;
      setKoperasiList(koperasiResult.data ?? []);
      setProducts(productsResult.data ?? []);
      setIsFetching(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const koperasiById = useMemo(
    () => new Map(koperasiList.map((k) => [k.id, k])),
    [koperasiList]
  );

  const needle = query.trim().toLowerCase();

  const distanceTo = useMemo(() => {
    return (k: KoperasiLocation | undefined): number | null => {
      if (!k || !hasHydrated || userLat === null || userLng === null) return null;
      return haversineDistance(userLat, userLng, k.lat, k.lng);
    };
  }, [hasHydrated, userLat, userLng]);

  // Koperasi cocok bila namanya atau alamatnya mengandung kata pencarian
  const koperasiHits = useMemo(() => {
    if (!needle) return [];
    const hits = koperasiList.filter(
      (k) =>
        k.nama.toLowerCase().includes(needle) ||
        (k.alamat ?? "").toLowerCase().includes(needle)
    );
    // Yang terdekat lebih dulu, bila lokasi diketahui
    return hits.sort((a, b) => {
      const da = distanceTo(a);
      const db = distanceTo(b);
      if (da === null || db === null) return 0;
      return da - db;
    });
  }, [koperasiList, needle, distanceTo]);

  const produkHits = useMemo(() => {
    if (!needle) return [];
    return products.filter((p) => p.nama_produk.toLowerCase().includes(needle));
  }, [products, needle]);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "semua", label: "Semua", count: koperasiHits.length + produkHits.length },
    { key: "koperasi", label: "Koperasi", count: koperasiHits.length },
    { key: "produk", label: "Barang", count: produkHits.length },
  ];

  const changeTab = (next: Tab) => {
    setTab(next);
    const params = new URLSearchParams({ q: query });
    if (next !== "semua") params.set("tab", next);
    router.replace(`/cari?${params.toString()}`, { scroll: false });
  };

  if (isFetching) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-slate-200/60 animate-pulse" />
        ))}
      </div>
    );
  }

  const showKoperasi = tab === "semua" || tab === "koperasi";
  const showProduk = tab === "semua" || tab === "produk";
  const nothingFound = koperasiHits.length === 0 && produkHits.length === 0;

  return (
    <div>
      {/* Chip pemilih jenis hasil */}
      <div
        role="tablist"
        aria-label="Jenis hasil pencarian"
        className="flex gap-3 overflow-x-auto pb-4 mb-6 hide-scrollbar"
      >
        {tabs.map((t) => {
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => changeTab(t.key)}
              className={`shrink-0 min-h-[40px] px-6 rounded-full border text-label-md font-label-md font-bold transition-colors cursor-pointer ${
                isActive
                  ? "bg-primary text-on-primary border-primary shadow-sm"
                  : "bg-surface-container-lowest text-secondary border-outline-variant hover:bg-surface-variant hover:text-on-surface"
              }`}
            >
              {t.label}
              <span className={isActive ? "text-primary-fixed ml-1 font-normal" : "text-secondary ml-1 font-normal"}> ({t.count})</span>
            </button>
          );
        })}
      </div>

      {nothingFound ? (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-10 text-center flex flex-col items-center shadow-sm">
          <span className="material-symbols-outlined text-5xl text-secondary mb-4" aria-hidden>search_off</span>
          <p className="text-headline-md font-headline-md font-bold text-on-surface mb-2">
            Pencarian &quot;{query}&quot; tidak ditemukan
          </p>
          <p className="text-body-md font-body-md text-secondary mt-1">
            Coba tulis kata lain, contoh: beras, minyak, atau gula.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center mt-6 min-h-[48px] px-8 bg-primary hover:bg-primary-container text-on-primary rounded-full text-label-md font-label-md font-bold transition-colors shadow-sm"
          >
            Kembali ke Beranda
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Hasil koperasi */}
          {showKoperasi && koperasiHits.length > 0 && (
            <section>
              <h2 className="font-headline-md text-headline-md font-bold text-on-surface mb-4">
                Koperasi ({koperasiHits.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {koperasiHits.map((k) => {
                  const distance = distanceTo(k);
                  return (
                    <Link
                      key={k.id}
                      href={`/koperasi/${k.id}`}
                      className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex gap-4 hover:shadow-[0_12px_40px_rgba(0,0,0,0.04)] transition-shadow group"
                    >
                      <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 border border-outline-variant bg-surface-container-low flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={koperasiImage(k.id, 160, 160)}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          loading="lazy"
                        />
                      </div>
                      <div className="flex flex-col justify-between flex-1">
                        <div>
                          <h3 className="font-label-md text-label-md font-bold text-on-surface line-clamp-2">
                            {k.nama}
                          </h3>
                          <p className="font-label-sm text-label-sm text-secondary flex items-center gap-1 mt-1 line-clamp-1">
                            <span className="material-symbols-outlined text-[14px]">location_on</span> {k.alamat || "Alamat belum dicatat"}
                          </p>
                        </div>
                        <div className="mt-2 text-primary font-label-sm text-label-sm font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">directions_walk</span>
                          {distance !== null ? formatDistance(distance) : "Jarak tidak diketahui"}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Hasil barang */}
          {showProduk && produkHits.length > 0 && (
            <section>
              <h2 className="font-headline-md text-headline-md font-bold text-on-surface mb-4">
                Barang ({produkHits.length})
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {produkHits.map((p) => {
                  const koperasi = koperasiById.get(p.koperasi_id);
                  const distance = distanceTo(koperasi);
                  return (
                    <Link
                      key={p.id_produk}
                      href={`/produk/${p.id_produk}`}
                      className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden flex flex-col hover:shadow-[0_12px_40px_rgba(0,0,0,0.04)] transition-shadow group"
                    >
                      {p.foto_url && (
                        <div className="h-32 bg-surface-container-low flex items-center justify-center overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={p.foto_url}
                            alt={p.nama_produk}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <div className="p-3 flex flex-col justify-between flex-1">
                        <div>
                          <h3 className="font-label-sm text-label-sm font-bold text-on-surface line-clamp-2 leading-snug">
                            {p.nama_produk}
                          </h3>
                          <p className="font-body-md text-body-md font-bold text-primary mt-1">
                            Rp {parseFloat(p.harga_produk).toLocaleString("id-ID")}
                          </p>
                        </div>
                        <div className="mt-auto pt-3 border-t border-outline-variant/30">
                          <p className="font-label-sm text-label-sm text-secondary line-clamp-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">storefront</span> {koperasi?.nama ?? "Koperasi Desa"}
                          </p>
                          <p className="font-label-sm text-[10px] text-secondary mt-0.5 ml-4">
                            {distance !== null
                              ? formatDistance(distance)
                              : "Jarak tidak diketahui"}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
