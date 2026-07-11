"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, MapPin, ShoppingCart } from "lucide-react";
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
        className="flex gap-2 overflow-x-auto pb-2 mb-5 hide-scrollbar"
      >
        {tabs.map((t) => {
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => changeTab(t.key)}
              className={`shrink-0 min-h-[48px] px-5 rounded-full border-2 text-base font-bold transition-colors cursor-pointer ${
                isActive
                  ? "bg-[#CE1126] text-white border-[#CE1126]"
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
              }`}
            >
              {t.label}
              <span className={isActive ? "text-white/80" : "text-slate-500"}> ({t.count})</span>
            </button>
          );
        })}
      </div>

      {nothingFound ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-10 text-center flex flex-col items-center">
          <Search className="w-16 h-16 text-slate-300 mb-4" />
          <p className="text-xl font-bold text-slate-800 mb-2">
            Pencarian &quot;{query}&quot; tidak ditemukan
          </p>
          <p className="text-base text-slate-600 mt-1">
            Coba tulis kata lain, contoh: beras, minyak, atau gula.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center mt-5 min-h-[52px] px-8 bg-[#CE1126] hover:bg-[#A50E1E] text-white rounded-xl text-base font-bold transition-colors"
          >
            Kembali ke Beranda
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Hasil koperasi */}
          {showKoperasi && koperasiHits.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">
                Koperasi ({koperasiHits.length})
              </h2>
              <div className="space-y-3">
                {koperasiHits.map((k) => {
                  const distance = distanceTo(k);
                  return (
                    <Link
                      key={k.id}
                      href={`/koperasi/${k.id}`}
                      className="flex gap-4 bg-white rounded-2xl border border-slate-200 p-3 hover:border-[#CE1126]/40 transition-colors"
                    >
                      <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-slate-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={koperasiImage(k.id, 160, 160)}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-bold text-slate-900 line-clamp-1">
                          {k.nama}
                        </h3>
                        <p className="text-sm text-slate-500 mt-2 line-clamp-1 flex items-center gap-1">
                          <MapPin className="w-4 h-4" /> {k.alamat || "Alamat belum dicatat"}
                        </p>
                        <p className="text-base text-slate-700 font-semibold mt-1">
                          {distance !== null ? formatDistance(distance) : "Jarak tidak diketahui"}
                        </p>
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
              <h2 className="text-lg font-bold text-slate-900 mb-3">
                Barang ({produkHits.length})
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {produkHits.map((p) => {
                  const koperasi = koperasiById.get(p.koperasi_id);
                  const distance = distanceTo(koperasi);
                  return (
                    <Link
                      key={p.id_produk}
                      href={`/produk/${p.id_produk}`}
                      className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col hover:border-[#CE1126]/40 transition-colors"
                    >
                      <div className="aspect-square bg-slate-50 flex items-center justify-center overflow-hidden">
                        {p.foto_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.foto_url}
                            alt={p.nama_produk}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                          <ShoppingCart className="w-12 h-12 text-slate-300" />
                        </div>
                        )}
                      </div>
                      <div className="p-3 flex flex-col flex-1">
                        <h3 className="text-base font-bold text-slate-900 line-clamp-2 leading-snug">
                          {p.nama_produk}
                        </h3>
                        <p className="text-lg font-extrabold text-[#CE1126] mt-1">
                          Rp {parseFloat(p.harga_produk).toLocaleString("id-ID")}
                        </p>
                        <div className="mt-auto pt-2">
                          <p className="text-sm text-slate-600 line-clamp-1">
                            🏪 {koperasi?.nama ?? "Koperasi Desa"}
                          </p>
                          <p className="text-sm font-semibold text-slate-700">
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
