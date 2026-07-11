import Link from "next/link";
import SearchBar from "@/components/kopasnow/SearchBar";
import SearchResults from "@/components/kopasnow/SearchResults";
import BottomNav from "@/components/kopasnow/BottomNav";
import LocationIndicator from "@/components/kopasnow/LocationIndicator";
import NotificationBell from "@/components/kopasnow/NotificationBell";
import { Search } from "lucide-react";

type Tab = "semua" | "koperasi" | "produk";

interface PageProps {
  searchParams: Promise<{ q?: string; tab?: string }>;
}

function normalizeTab(value: string | undefined): Tab {
  return value === "koperasi" || value === "produk" ? value : "semua";
}

export default async function SearchPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const tab = normalizeTab(params.tab);

  return (
    <div className="min-h-screen bg-[#F6F6F6] font-sans text-slate-900 flex flex-col pb-24 md:pb-8">
      {/* Garis bendera Merah Putih */}
      <div className="w-full h-1.5 flex fixed top-0 left-0 z-50">
        <div className="w-1/2 bg-[#CE1126]" />
        <div className="w-1/2 bg-white border-b border-slate-200" />
      </div>

      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-1.5 z-40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2">
          <Link
            href="/"
            aria-label="Kembali ke beranda"
            className="shrink-0 inline-flex items-center justify-center min-h-[48px] min-w-[48px] -ml-2 text-slate-700 hover:text-[#CE1126] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </Link>
          <SearchBar className="flex-1" initialQuery={query} />
          <LocationIndicator />
          <NotificationBell />
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6">
        {query ? (
          <>
            <h1 className="text-xl font-bold text-slate-900 mb-4">
              Hasil pencarian &quot;{query}&quot;
            </h1>
            <SearchResults query={query} initialTab={tab} />
          </>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center flex flex-col items-center">
            <Search className="w-16 h-16 text-slate-300 mb-4" />
            <p className="text-lg font-bold text-slate-900">Mau cari apa?</p>
            <p className="text-base text-slate-600 mt-1">
              Tulis nama barang atau nama koperasi di kotak pencarian di atas.
            </p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
