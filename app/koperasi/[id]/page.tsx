import { notFound } from "next/navigation";
import Link from "next/link";
import { getKoperasiById } from "@/server/actions/getKoperasi";
import { getProductsByKoperasiId } from "@/server/actions/getProducts";
import ProductCatalog from "@/components/kopasnow/ProductCatalog";
import KoperasiDistance from "@/components/kopasnow/KoperasiDistance";
import { koperasiImage } from "@/utils/helper/koperasiImage";
import { MapPin } from "lucide-react";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function KoperasiCatalogPage({ params }: PageProps) {
  const resolvedParams = await params;
  const koperasiId = resolvedParams.id;

  const [koperasiResult, productsResult] = await Promise.all([
    getKoperasiById(koperasiId),
    getProductsByKoperasiId(koperasiId),
  ]);

  if (koperasiResult.error || !koperasiResult.data) {
    return notFound();
  }

  const koperasi = koperasiResult.data;
  const products = productsResult.data || [];

  return (
    <div className="min-h-screen bg-[#F6F6F6] font-sans text-slate-900 flex flex-col pb-28">
      {/* Garis bendera Merah Putih */}
      <div className="w-full h-1.5 flex fixed top-0 left-0 z-50">
        <div className="w-1/2 bg-[#CE1126]" />
        <div className="w-1/2 bg-white border-b border-slate-200" />
      </div>

      {/* Header dengan tombol kembali yang jelas */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-1.5 z-40">
        <div className="max-w-2xl lg:max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/"
            className="shrink-0 inline-flex items-center gap-2 min-h-[48px] px-3 -ml-3 text-base font-bold text-slate-700 hover:text-[#CE1126] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Kembali
          </Link>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-500 leading-tight">Anda belanja di:</p>
            <h1 className="text-base font-bold text-slate-900 truncate leading-tight">
              {koperasi.nama}
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-2xl lg:max-w-4xl w-full mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Info koperasi */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {/* Foto stok — kopasnow_koperasi belum punya kolom gambar */}
          <div className="relative h-40 sm:h-56 bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={koperasiImage(koperasi.id)}
              alt=""
              className="w-full h-full object-cover"
            />
            {koperasi.status === "active" ? (
              <span className="absolute top-3 right-3 inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Buka
              </span>
            ) : (
              <span className="absolute top-3 right-3 inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold bg-slate-100 text-slate-600 border border-slate-300">
                Tutup
              </span>
            )}
          </div>

          <div className="p-5">
            <h2 className="text-xl font-extrabold text-slate-900 leading-tight">
              {koperasi.nama}
            </h2>

            {koperasi.alamat && (
              <p className="text-base text-slate-600 mt-2 flex items-center gap-1">
                <MapPin className="w-4 h-4 shrink-0" /> {koperasi.alamat}
              </p>
            )}

            <div className="mt-2">
              <KoperasiDistance lat={koperasi.lat} lng={koperasi.lng} />
            </div>

            <dl className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100">
              <div>
                <dt className="text-sm text-slate-500">Barang dijual</dt>
                <dd className="text-lg font-bold text-slate-900">{products.length} macam</dd>
              </div>
              <div>
                <dt className="text-sm text-slate-500">Cara bayar</dt>
                <dd className="text-lg font-bold text-slate-900">Transfer & COD</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Katalog */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3">
            Pilih barang yang Anda perlukan
          </h2>
          <ProductCatalog
            koperasi={{ id: koperasi.id, nama: koperasi.nama }}
            products={products}
          />
        </section>
      </main>
    </div>
  );
}
