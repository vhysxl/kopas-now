import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getTransactionDetail } from "@/server/actions/transactions";

type Props = {
  params: Promise<{ id: string }>;
};

const statusConfig: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
  Menunggu: { label: "Menunggu", color: "text-amber-700", bgColor: "bg-amber-50", borderColor: "border-amber-200" },
  Dibayar: { label: "Dibayar", color: "text-blue-700", bgColor: "bg-blue-50", borderColor: "border-blue-200" },
  Siap: { label: "Siap Diambil", color: "text-purple-700", bgColor: "bg-purple-50", borderColor: "border-purple-200" },
  Dikirim: { label: "Dikirim", color: "text-cyan-700", bgColor: "bg-cyan-50", borderColor: "border-cyan-200" },
  Diterima: { label: "Diterima", color: "text-teal-700", bgColor: "bg-teal-50", borderColor: "border-teal-200" },
  Selesai: { label: "Selesai", color: "text-emerald-700", bgColor: "bg-emerald-50", borderColor: "border-emerald-200" },
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-error-container rounded-xl border border-error/20 p-8 text-center flex flex-col items-center mt-12 shadow-sm">
          <span className="material-symbols-outlined text-5xl text-error mb-4" aria-hidden>error</span>
          <h1 className="text-headline-sm font-headline-sm font-bold text-on-error-container mb-2">Pesanan Tidak Ditemukan</h1>
          <p className="text-on-error-container/70 text-body-md font-body-md mb-6">
            Pesanan yang Anda cari tidak ada atau sudah dihapus.
          </p>
          <Link
            href="/orders"
            className="inline-block px-6 py-3 bg-primary text-on-primary text-label-md font-label-md font-bold rounded-full hover:bg-surface-tint transition-colors shadow-sm"
          >
            Kembali ke Riwayat
          </Link>
        </div>
      </div>
    );
  }

  const statusInfo = statusConfig[transaction.status_transaksi] || statusConfig.Menunggu;
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

  const isPickup = transaction.notes?.includes("Diambil");
  const deliveryType = isPickup ? "Ambil Sendiri" : "Diantar";

  return (
    <div className="min-h-screen bg-background py-8 px-5 font-body-md text-on-background">
      <div className="max-w-screen-md mx-auto">
        {/* Back Button */}
        <Link
          href="/orders"
          className="inline-flex items-center gap-2 text-label-md font-label-md font-bold text-secondary hover:text-primary transition-colors mb-6"
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden>arrow_back</span>
          Kembali ke Riwayat
        </Link>

        {/* Header Card */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 mb-4 shadow-sm">
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <p className="text-[10px] font-mono text-secondary uppercase tracking-wider">
                  Kode Pesanan
                </p>
                <div className="flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
                  <p className="text-[10px] font-bold text-secondary uppercase tracking-wider">
                    {deliveryType}
                  </p>
                </div>
              </div>
              <p className="text-headline-sm font-headline-sm font-black text-primary font-mono">
                {transaction.id_transaksi.split("-")[0].toUpperCase()}
              </p>
            </div>
            <div
              className={`px-3 py-1.5 rounded-lg text-label-sm font-label-sm font-bold border ${statusInfo.bgColor} ${statusInfo.color} ${statusInfo.borderColor}`}
            >
              {statusInfo.label}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-5 border-t border-outline-variant/30">
            <div>
              <p className="text-[10px] text-secondary uppercase tracking-wider mb-1">
                Tanggal Pesanan
              </p>
              <p className="text-label-md font-label-md font-bold text-on-surface">{formattedDate}</p>
              <p className="text-label-sm font-label-sm text-secondary">{formattedTime} WIB</p>
            </div>
            <div>
              <p className="text-[10px] text-secondary uppercase tracking-wider mb-1">
                Metode Pembayaran
              </p>
              <p className="text-label-md font-label-md font-bold text-on-surface">{transaction.metode_pembayaran}</p>
            </div>
          </div>
        </div>

        {/* Koperasi Info */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 mb-4 shadow-sm">
          <p className="text-[10px] text-secondary uppercase tracking-wider mb-3">
            Toko
          </p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined">storefront</span>
            </div>
            <div>
              <p className="text-label-md font-label-md font-bold text-on-surface">
                {transaction.kopasnow_koperasi.nama}
              </p>
              <p className="text-label-sm font-label-sm text-secondary">
                {transaction.kopasnow_koperasi.kode_koperasi}
              </p>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 mb-4 shadow-sm">
          <p className="text-[10px] text-secondary uppercase tracking-wider mb-4">
            Detail Pesanan
          </p>
          <div className="space-y-4">
            {transaction.kopasnow_online_transactions_detail.map((item: any) => (
              <div key={item.id_detail} className="flex items-start gap-3">
                <div className="flex-1">
                  <p className="text-label-md font-label-md font-bold text-on-surface mb-1">{item.nama_produk}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-label-sm font-label-sm text-secondary">
                      {item.jumlah} x Rp {item.harga_satuan.toLocaleString("id-ID")}
                    </p>
                    <p className="text-label-md font-label-md font-bold text-on-surface">
                      Rp {item.subtotal.toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-sm">
          <p className="text-[10px] text-secondary uppercase tracking-wider mb-4">
            Ringkasan Pembayaran
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-label-md font-label-md text-secondary">Subtotal Produk</p>
              <p className="text-label-md font-label-md font-bold text-on-surface">
                Rp {transaction.total_pembelian.toLocaleString("id-ID")}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-label-md font-label-md text-secondary">Ongkos Kirim</p>
              <p className="text-label-md font-label-md font-bold text-on-surface">
                Rp {transaction.delivery_fee.toLocaleString("id-ID")}
              </p>
            </div>
            <div className="pt-4 border-t border-outline-variant/30 flex items-center justify-between">
              <p className="text-label-lg font-label-lg font-bold text-on-surface">Total Pembayaran</p>
              <p className="text-headline-sm font-headline-sm font-black text-primary">
                Rp {(transaction.total_pembelian + transaction.delivery_fee).toLocaleString("id-ID")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
