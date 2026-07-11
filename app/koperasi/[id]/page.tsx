import { notFound } from "next/navigation";
import Link from "next/link";
import { getKoperasiById } from "@/server/actions/getKoperasi";
import { getProductsByKoperasiId } from "@/server/actions/getProducts";
import { getStaffByKoperasiId } from "@/server/actions/getStaff";
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

  const [koperasiResult, productsResult, staffResult] = await Promise.all([
    getKoperasiById(koperasiId),
    getProductsByKoperasiId(koperasiId),
    getStaffByKoperasiId(koperasiId),
  ]);

  if (koperasiResult.error || !koperasiResult.data) {
    return notFound();
  }

  const koperasi = koperasiResult.data;
  const products = productsResult.data || [];
  const staff = staffResult.data;

  // Format nomor telepon untuk wa.me (08xxx → 628xxx)
  const waNumber = staff?.nomor_telepon
    ? staff.nomor_telepon.replace(/\D/g, "").replace(/^0/, "62")
    : null;
  const waUrl = waNumber
    ? `https://wa.me/${waNumber}?text=${encodeURIComponent(`Halo Kak ${staff?.nama_staff ?? ""}, saya ingin bertanya tentang produk di ${koperasi.nama}. Terima kasih 🙏`)}`
    : null;

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

            {/* WhatsApp Chat Button */}
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 w-full min-h-[48px] bg-[#25D366] hover:bg-[#1ebe57] text-white rounded-full text-label-md font-label-md font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Chat WhatsApp — {staff?.nama_staff}
              </a>
            )}
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
