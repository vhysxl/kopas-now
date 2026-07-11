import { notFound } from "next/navigation";
import Link from "next/link";
import { getKoperasiById } from "@/server/actions/getKoperasi";
import { getProductsByKoperasiId } from "@/server/actions/getProducts";
import ProductCatalog from "@/components/kopasnow/ProductCatalog";
import KoperasiDistance from "@/components/kopasnow/KoperasiDistance";
import { koperasiImage } from "@/utils/helper/koperasiImage";

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
    <div className="min-h-screen bg-background font-body-md text-on-background flex flex-col pb-28">

      {/* Header dengan tombol kembali yang jelas */}
      <header className="bg-surface border-b border-outline-variant shadow-sm sticky top-0 z-40 transition-all duration-200">
        <div className="max-w-screen-md lg:max-w-screen-lg mx-auto px-5 py-3 flex items-center gap-3">
          <Link
            href="/"
            className="shrink-0 inline-flex items-center justify-center min-h-[44px] min-w-[44px] -ml-2 text-secondary hover:bg-surface-variant rounded-full transition-colors"
          >
            <span className="material-symbols-outlined" aria-hidden>arrow_back</span>
          </Link>
          <div className="min-w-0">
            <p className="text-label-sm font-label-sm text-secondary leading-tight">Anda belanja di:</p>
            <h1 className="text-label-md font-label-md font-bold text-on-surface truncate leading-tight mt-0.5">
              {koperasi.nama}
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-screen-md lg:max-w-screen-lg w-full mx-auto px-5 py-6 flex flex-col gap-6">
        {/* Info koperasi */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden shadow-sm">
          {/* Foto stok — kopasnow_koperasi belum punya kolom gambar */}
          <div className="relative h-40 sm:h-56 bg-surface-container-low">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={koperasiImage(koperasi.id)}
              alt=""
              className="w-full h-full object-cover"
            />
            {koperasi.status === "active" ? (
              <span className="absolute top-4 right-4 inline-flex items-center px-4 py-1.5 rounded-full text-label-sm font-label-sm font-bold bg-tertiary-container text-on-tertiary-container border border-tertiary/20 shadow-sm">
                Buka
              </span>
            ) : (
              <span className="absolute top-4 right-4 inline-flex items-center px-4 py-1.5 rounded-full text-label-sm font-label-sm font-bold bg-surface-variant text-secondary border border-outline-variant shadow-sm">
                Tutup
              </span>
            )}
          </div>

          <div className="p-6">
            <h2 className="text-headline-sm font-headline-sm font-extrabold text-on-surface leading-tight">
              {koperasi.nama}
            </h2>

            {koperasi.alamat && (
              <p className="text-body-md font-body-md text-secondary mt-3 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">location_on</span> {koperasi.alamat}
              </p>
            )}

            <div className="mt-3">
              <KoperasiDistance lat={koperasi.lat} lng={koperasi.lng} />
            </div>

            <dl className="grid grid-cols-2 gap-4 mt-6 pt-5 border-t border-outline-variant/30">
              <div>
                <dt className="text-label-sm font-label-sm text-secondary">Barang dijual</dt>
                <dd className="text-label-lg font-label-lg font-bold text-on-surface mt-1">{products.length} macam</dd>
              </div>
              <div>
                <dt className="text-label-sm font-label-sm text-secondary">Cara bayar</dt>
                <dd className="text-label-lg font-label-lg font-bold text-on-surface mt-1">Transfer & COD</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Katalog */}
        <section>
          <h2 className="text-headline-md font-headline-md font-bold text-on-surface mb-4">
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
