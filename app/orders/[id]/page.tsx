import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getTransactionDetail } from "@/server/actions/transactions";

type Props = {
  params: Promise<{ id: string }>;
};

const statusConfig: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
  pending: { label: "Menunggu Pembayaran", color: "text-amber-700", bgColor: "bg-amber-50", borderColor: "border-amber-200" },
  paid: { label: "Dibayar", color: "text-blue-700", bgColor: "bg-blue-50", borderColor: "border-blue-200" },
  processing: { label: "Diproses", color: "text-purple-700", bgColor: "bg-purple-50", borderColor: "border-purple-200" },
  shipped: { label: "Dikirim", color: "text-cyan-700", bgColor: "bg-cyan-50", borderColor: "border-cyan-200" },
  completed: { label: "Selesai", color: "text-emerald-700", bgColor: "bg-emerald-50", borderColor: "border-emerald-200" },
  cancelled: { label: "Dibatalkan", color: "text-red-700", bgColor: "bg-red-50", borderColor: "border-red-200" },
};

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await import("next/headers").then((m) => m.cookies());
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: transaction, error } = await getTransactionDetail(id);

  if (error || !transaction) {
    return (
      <div className="min-h-screen bg-[#F6F6F6] flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center max-w-md">
          <div className="text-slate-400 text-sm mb-2">❌</div>
          <p className="text-slate-600 text-sm font-medium mb-1">Pesanan Tidak Ditemukan</p>
          <p className="text-slate-400 text-xs mb-4">
            Pesanan yang Anda cari tidak ada atau sudah dihapus.
          </p>
          <Link
            href="/orders"
            className="inline-block px-4 py-2 bg-[#CE1126] text-white text-xs font-bold rounded-full hover:bg-[#A00E1C] transition-colors"
          >
            Kembali ke Riwayat
          </Link>
        </div>
      </div>
    );
  }

  const statusInfo = statusConfig[transaction.status_transaksi] || statusConfig.pending;
  const orderDate = new Date(transaction.created_at);
  const formattedDate = orderDate.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const formattedTime = orderDate.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen bg-[#F6F6F6] py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Back Button */}
        <Link
          href="/orders"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-[#CE1126] transition-colors mb-6"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Kembali ke Riwayat
        </Link>

        {/* Header Card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 mb-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                Kode Resi
              </p>
              <p className="text-lg font-black text-[#CE1126] font-mono">
                {transaction.id_transaksi.split("-")[0].toUpperCase()}
              </p>
            </div>
            <div
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${statusInfo.bgColor} ${statusInfo.color} ${statusInfo.borderColor}`}
            >
              {statusInfo.label}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                Tanggal Pesanan
              </p>
              <p className="text-sm font-bold text-slate-800">{formattedDate}</p>
              <p className="text-xs text-slate-500">{formattedTime} WIB</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                Metode Pembayaran
              </p>
              <p className="text-sm font-bold text-slate-800">{transaction.metode_pembayaran}</p>
            </div>
          </div>
        </div>

        {/* Koperasi Info */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 mb-4">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">
            Toko
          </p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-lg">
              🏪
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">
                {transaction.kopasnow_koperasi.nama}
              </p>
              <p className="text-xs text-slate-500">
                {transaction.kopasnow_koperasi.kode_koperasi}
              </p>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 mb-4">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-4">
            Detail Pesanan
          </p>
          <div className="space-y-4">
            {transaction.kopasnow_online_transactions_detail.map((item: any) => (
              <div key={item.id_detail} className="flex items-start gap-3">
                <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-2xl flex-shrink-0">
                  📦
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-800 mb-1">{item.nama_produk}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                      {item.jumlah} x Rp {item.harga_satuan.toLocaleString("id-ID")}
                    </p>
                    <p className="text-sm font-bold text-slate-800">
                      Rp {item.subtotal.toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-4">
            Ringkasan Pembayaran
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">Subtotal Produk</p>
              <p className="text-sm font-bold text-slate-800">
                Rp {transaction.total_pembelian.toLocaleString("id-ID")}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">Ongkos Kirim</p>
              <p className="text-sm font-bold text-slate-800">
                Rp {transaction.delivery_fee.toLocaleString("id-ID")}
              </p>
            </div>
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-800">Total Pembayaran</p>
              <p className="text-lg font-black text-[#CE1126]">
                Rp {(transaction.total_pembelian + transaction.delivery_fee).toLocaleString("id-ID")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
