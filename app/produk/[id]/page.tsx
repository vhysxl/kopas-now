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
    <div className="min-h-screen bg-[#F6F6F6] font-sans text-slate-900 flex flex-col pb-8">
      {/* Garis bendera Merah Putih */}
      <div className="w-full h-1.5 flex fixed top-0 left-0 z-50">
        <div className="w-1/2 bg-[#CE1126]" />
        <div className="w-1/2 bg-white border-b border-slate-200" />
      </div>

      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-1.5 z-40">
        <div className="max-w-2xl lg:max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href={`/koperasi/${product.koperasi.id}`}
            className="shrink-0 inline-flex items-center gap-2 min-h-[48px] px-3 -ml-3 text-base font-bold text-slate-700 hover:text-[#CE1126] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Kembali
          </Link>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-500 leading-tight">Barang dari:</p>
            <h1 className="text-base font-bold text-slate-900 truncate leading-tight">
              {product.koperasi.nama}
            </h1>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 flex flex-col gap-5">
        {/* Foto besar */}
        <div className="aspect-square w-full bg-white rounded-2xl border border-slate-200 overflow-hidden flex items-center justify-center">
          {product.foto_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.foto_url}
              alt={product.nama_produk}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-8xl" aria-hidden>
              🛒
            </span>
          )}
        </div>

        {/* Nama, harga, stok */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-2xl font-extrabold text-slate-900 leading-snug">
            {product.nama_produk}
          </h2>

          <p className="text-3xl font-extrabold text-[#CE1126] mt-2">
            Rp {price.toLocaleString("id-ID")}
            <span className="text-lg font-semibold text-slate-500">
              {" "}
              / {product.satuan_produk}
            </span>
          </p>

          <p className="text-base mt-3">
            {outOfStock ? (
              <span className="font-bold text-slate-600">Stok habis untuk saat ini.</span>
            ) : (
              <span className="font-semibold text-emerald-700">
                Tersedia {product.stok_tersedia} {product.satuan_produk}
              </span>
            )}
          </p>

          {product.deskripsi_produk && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <h3 className="text-base font-bold text-slate-900 mb-1">Keterangan barang</h3>
              <p className="text-base text-slate-700 leading-relaxed">
                {product.deskripsi_produk}
              </p>
            </div>
          )}
        </div>

        {/* Koperasi penjual */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-base font-bold text-slate-900">Dijual oleh</h3>
          <p className="text-lg font-bold text-slate-900 mt-1">{product.koperasi.nama}</p>
          {product.koperasi.alamat && (
            <p className="text-base text-slate-600 mt-1">📍 {product.koperasi.alamat}</p>
          )}
          <div className="mt-2">
            <KoperasiDistance lat={product.koperasi.lat} lng={product.koperasi.lng} />
          </div>
          <Link
            href={`/koperasi/${product.koperasi.id}`}
            className="mt-4 w-full min-h-[48px] bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-300 rounded-xl text-base font-bold flex items-center justify-center transition-colors"
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
