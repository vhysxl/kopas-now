import Link from "next/link";
import SearchBar from "@/components/kopasnow/SearchBar";
import SearchResults from "@/components/kopasnow/SearchResults";
import BottomNav from "@/components/kopasnow/BottomNav";
import LocationIndicator from "@/components/kopasnow/LocationIndicator";
import NotificationBell from "@/components/kopasnow/NotificationBell";

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
    <div className="min-h-screen bg-background font-body-md text-on-background flex flex-col pb-24 md:pb-8">

      <header className="bg-surface border-b border-outline-variant shadow-sm sticky top-0 z-40 transition-all duration-200">
        <div className="max-w-screen-xl mx-auto px-5 py-3 flex items-center gap-2">
          <Link
            href="/"
            aria-label="Kembali ke beranda"
            className="shrink-0 inline-flex items-center justify-center min-h-[44px] min-w-[44px] -ml-2 text-secondary hover:bg-surface-variant rounded-full transition-colors"
          >
            <span className="material-symbols-outlined" aria-hidden>arrow_back</span>
          </Link>
          <SearchBar className="flex-1" initialQuery={query} />
          <LocationIndicator />
          <NotificationBell />
        </div>
      </header>

      <main className="flex-1 max-w-screen-xl w-full mx-auto px-5 py-6">
        {query ? (
          <>
            <h1 className="font-headline-md text-headline-md font-bold text-on-surface mb-4">
              Hasil pencarian &quot;{query}&quot;
            </h1>
            <SearchResults query={query} initialTab={tab} />
          </>
        ) : (
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-8 text-center flex flex-col items-center">
            <span className="material-symbols-outlined text-4xl text-secondary mb-4" aria-hidden>search</span>
            <p className="font-headline-sm text-headline-sm font-bold text-on-surface">Mau cari apa?</p>
            <p className="text-body-md font-body-md text-secondary mt-1">
              Tulis nama barang atau nama koperasi di kotak pencarian di atas.
            </p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
