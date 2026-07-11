import { notFound } from "next/navigation";
import Link from "next/link";
import { getProductById } from "@/server/actions/getProducts";
import KoperasiDistance from "@/components/kopasnow/KoperasiDistance";
import ProductDetailActions from "@/components/kopasnow/ProductDetailActions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { data: product, error } = await getProductById(id);

  if (error || !product) {
    return notFound();
  }

  const price = parseFloat(product.harga_produk);
  const outOfStock = product.stok_tersedia === 0;

  return (
    <div className="min-h-screen bg-background font-body-md text-on-background flex flex-col pb-8">

      <header className="bg-surface border-b border-outline-variant shadow-sm sticky top-0 z-40 transition-all duration-200">
        <div className="max-w-screen-md lg:max-w-screen-lg mx-auto px-5 py-3 flex items-center gap-3">
          <Link
            href={`/koperasi/${product.koperasi.id}`}
            className="shrink-0 inline-flex items-center justify-center min-h-[44px] min-w-[44px] -ml-2 text-secondary hover:bg-surface-variant rounded-full transition-colors"
          >
            <span className="material-symbols-outlined" aria-hidden>arrow_back</span>
          </Link>
          <div className="min-w-0">
            <p className="text-label-sm font-label-sm text-secondary leading-tight">Barang dari:</p>
            <h1 className="text-label-md font-label-md font-bold text-on-surface truncate leading-tight mt-0.5">
              {product.koperasi.nama}
            </h1>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-screen-md w-full mx-auto px-5 py-6 flex flex-col gap-6">
        {/* Foto besar */}
        <div className="aspect-square w-full bg-surface-container-lowest rounded-2xl border border-outline-variant overflow-hidden flex items-center justify-center shadow-sm">
          {product.foto_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.foto_url}
              alt={product.nama_produk}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-surface-container-low flex items-center justify-center text-surface-variant">
              <span className="material-symbols-outlined text-6xl">shopping_bag</span>
            </div>
          )}
        </div>

        {/* Nama, harga, stok */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-sm">
          <h2 className="text-headline-md font-headline-md font-extrabold text-on-surface leading-snug">
            {product.nama_produk}
          </h2>

          <p className="text-headline-lg font-headline-lg font-extrabold text-primary mt-2">
            Rp {price.toLocaleString("id-ID")}
            <span className="text-label-lg font-label-lg font-semibold text-secondary">
              {" "}
              / {product.satuan_produk}
            </span>
          </p>

          <p className="text-body-md font-body-md mt-4">
            {outOfStock ? (
              <span className="font-bold text-error">Stok habis untuk saat ini.</span>
            ) : (
              <span className="font-semibold text-tertiary">
                Tersedia {product.stok_tersedia} {product.satuan_produk}
              </span>
            )}
          </p>

          {product.deskripsi_produk && (
            <div className="mt-5 pt-5 border-t border-outline-variant/30">
              <h3 className="text-label-lg font-label-lg font-bold text-on-surface mb-2">Keterangan barang</h3>
              <p className="text-body-md font-body-md text-secondary leading-relaxed">
                {product.deskripsi_produk}
              </p>
            </div>
          )}
        </div>

        {/* Koperasi penjual */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-sm">
          <h3 className="text-label-md font-label-md font-bold text-secondary">Dijual oleh</h3>
          <p className="text-title-lg font-title-lg font-bold text-on-surface mt-1">{product.koperasi.nama}</p>
          {product.koperasi.alamat && (
            <p className="text-body-md font-body-md text-secondary mt-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">location_on</span> {product.koperasi.alamat}
            </p>
          )}
          <div className="mt-3">
            <KoperasiDistance lat={product.koperasi.lat} lng={product.koperasi.lng} />
          </div>
          <Link
            href={`/koperasi/${product.koperasi.id}`}
            className="mt-5 w-full min-h-[48px] bg-surface-container-lowest hover:bg-surface-container-low text-on-surface border border-outline-variant rounded-full text-label-md font-label-md font-bold flex items-center justify-center transition-colors shadow-sm"
          >
            Lihat Semua Barang di Koperasi Ini
          </Link>
        </div>

        {/* Aksi keranjang */}
        <ProductDetailActions
          product={product}
          koperasi={{ id: product.koperasi.id, nama: product.koperasi.nama }}
        />
      </main>
    </div>
  );
}
