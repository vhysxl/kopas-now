import { notFound } from "next/navigation";
import Link from "next/link";
import { getKoperasiById } from "@/server/actions/getKoperasi";
import { getProductsByKoperasiId } from "@/server/actions/getProducts";

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
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-red-500 selection:text-white flex flex-col">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-50">
        <div className="w-full h-1 flex">
          <div className="flex-1 bg-[#CE1126]" />
          <div className="flex-1 bg-white" />
        </div>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span className="text-sm font-semibold">Kembali ke Peta</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#CE1126] to-[#A50E1E] flex items-center justify-center text-white shadow-md shadow-red-500/10">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
              </svg>
            </div>
            <span className="font-bold text-slate-800 tracking-tight">Katalog Toko</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 flex flex-col gap-8">
        
        {/* Store Header Info */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                {koperasi.kode_koperasi}
              </span>
              {koperasi.status === "active" && (
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Buka
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight leading-tight">
              {koperasi.nama}
            </h1>
            {koperasi.alamat && (
              <p className="text-sm text-slate-500 mt-2 flex items-start gap-1.5 max-w-lg">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 mt-0.5 shrink-0 text-slate-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                {koperasi.alamat}
              </p>
            )}
          </div>

          <div className="shrink-0 bg-slate-50 p-4 rounded-2xl border border-slate-100 min-w-[200px] text-center md:text-right">
            <p className="text-xs text-slate-500 mb-1 font-semibold uppercase tracking-wider">Total Produk</p>
            <p className="text-4xl font-extrabold text-[#CE1126]">{products.length}</p>
          </div>
        </div>

        {/* Product Catalog */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 text-[#CE1126]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              Katalog Produk
            </h2>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
              <div className="w-20 h-20 mx-auto bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-slate-300">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                </svg>
              </div>
              <p className="text-slate-500 font-medium">Belum ada produk yang dijual.</p>
              <p className="text-sm text-slate-400 mt-1">Koperasi ini mungkin sedang mengatur katalognya.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {products.map((prod) => (
                <div key={prod.id_produk} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all group flex flex-col">
                  <div className="aspect-square bg-slate-50 rounded-xl mb-4 overflow-hidden border border-slate-100 flex items-center justify-center relative">
                    {prod.foto_url ? (
                      <img src={prod.foto_url} alt={prod.nama_produk} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="text-slate-300 flex flex-col items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 mb-2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                        </svg>
                        <span className="text-[10px] font-medium">No Image</span>
                      </div>
                    )}
                    
                    {/* Stock badge overlay */}
                    {prod.stok_tersedia > 0 ? (
                      <span className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-[10px] font-bold text-slate-700 px-2 py-1 rounded-md shadow-sm border border-slate-200/50">
                        Stok: {prod.stok_tersedia} {prod.satuan_produk}
                      </span>
                    ) : (
                      <span className="absolute top-2 left-2 bg-red-500/90 backdrop-blur-sm text-[10px] font-bold text-white px-2 py-1 rounded-md shadow-sm border border-red-500/50">
                        Habis
                      </span>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col">
                    <h3 className="font-bold text-sm text-slate-800 leading-snug mb-1 line-clamp-2" title={prod.nama_produk}>
                      {prod.nama_produk}
                    </h3>
                    
                    {prod.deskripsi_produk && (
                      <p className="text-[11px] text-slate-500 line-clamp-2 mb-3">
                        {prod.deskripsi_produk}
                      </p>
                    )}

                    <div className="mt-auto pt-3 flex items-end justify-between border-t border-slate-50">
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold mb-0.5">Harga</p>
                        <p className="font-extrabold text-[#CE1126]">
                          Rp {parseInt(prod.harga_produk).toLocaleString('id-ID')}
                        </p>
                      </div>
                      
                      <button 
                        disabled={prod.stok_tersedia === 0}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                          prod.stok_tersedia > 0 
                            ? "bg-slate-800 text-white hover:bg-slate-700 shadow-sm" 
                            : "bg-slate-100 text-slate-300 cursor-not-allowed"
                        }`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="mt-12 py-6 border-t border-slate-100 text-center text-xs text-slate-400 bg-white">
        &copy; 2026 KopasNow. Hak Cipta Dilindungi Undang-Undang.
      </footer>
    </div>
  );
}
