"use client";

import Link from "next/link";

type TransactionStatus = "pending" | "paid" | "processing" | "shipped" | "completed" | "cancelled";

type Transaction = {
  id_transaksi: string;
  total_pembelian: number;
  metode_pembayaran: string;
  status_transaksi: TransactionStatus;
  delivery_fee: number;
  created_at: string;
  kopasnow_koperasi: {
    nama: string;
    kode_koperasi: string;
  };
  kopasnow_online_transactions_detail: Array<{
    id_detail: string;
    nama_produk: string;
    jumlah: number;
    harga_satuan: number;
    subtotal: number;
  }>;
};

type OrdersListProps = {
  transactions: Transaction[];
};

const statusConfig: Record<TransactionStatus, { label: string; color: string; bgColor: string; borderColor: string }> = {
  pending: { label: "Menunggu Pembayaran", color: "text-amber-700", bgColor: "bg-amber-50", borderColor: "border-amber-100" },
  paid: { label: "Dibayar", color: "text-blue-700", bgColor: "bg-blue-50", borderColor: "border-blue-100" },
  processing: { label: "Diproses", color: "text-purple-700", bgColor: "bg-purple-50", borderColor: "border-purple-100" },
  shipped: { label: "Dikirim", color: "text-cyan-700", bgColor: "bg-cyan-50", borderColor: "border-cyan-100" },
  completed: { label: "Selesai", color: "text-emerald-700", bgColor: "bg-emerald-50", borderColor: "border-emerald-100" },
  cancelled: { label: "Dibatalkan", color: "text-red-700", bgColor: "bg-red-50", borderColor: "border-red-100" },
};

export default function OrdersList({ transactions }: OrdersListProps) {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center">
    <div className="text-slate-400 text-sm mb-2">📦</div>
        <p className="text-slate-600 text-sm font-medium mb-1">Belum Ada Pesanan</p>
        <p className="text-slate-400 text-xs">Riwayat pemesanan Anda akan muncul di sini</p>
   </div>
  );
  }

  return (
    <div className="space-y-3">
      {transactions.map((transaction) => {
        const statusInfo = statusConfig[transaction.status_transaksi] || statusConfig.pending;
        const totalItems = transaction.kopasnow_online_transactions_detail.reduce(
       (sum, item) => sum + item.jumlah,
          0
  );
        const orderDate = new Date(transaction.created_at);
        const formattedDate = orderDate.toLocaleDateString("id-ID", {
          day: "numeric",
        month: "short",
          year: "numeric",
});
     const formattedTime = orderDate.toLocaleTimeString("id-ID", {
          hour: "2-digit",
      minute: "2-digit",
        });

    return (
<Link
            key={transaction.id_transaksi}
      href={`/orders/${transaction.id_transaksi}`}
     className="block bg-white border border-slate-100 rounded-2xl p-4 hover:border-slate-200 hover:shadow-md hover:shadow-slate-100 transition-all duration-200"
    >
            {/* Header */}
       <div className="flex items-start justify-between mb-3 pb-3 border-b border-slate-100">
          <div>
    <div className="flex items-center gap-2 mb-1">
          <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
     Kode Resi
   </p>
        </div>
       <p className="text-xs font-bold text-[#CE1126] font-mono">
        {transaction.id_transaksi.split("-")[0].toUpperCase()}
  </p>
     </div>
         <div className={`px-2 py-1 rounded-md text-[10px] font-bold border ${statusInfo.bgColor} ${statusInfo.color} ${statusInfo.borderColor}`}>
   {statusInfo.label}
         </div>
            </div>

            {/* Koperasi Info */}
            <div className="mb-3">
           <div className="flex items-center gap-1.5 mb-1">
          <span className="text-xs">🏪</span>
                <p className="text-sm font-bold text-slate-800">
      {transaction.kopasnow_koperasi.nama}
  </p>
           </div>
              <p className="text-[10px] font-medium text-slate-400">
       {transaction.kopasnow_koperasi.kode_koperasi}
      </p>
        </div>

        {/* Items Preview */}
    <div className="mb-3">
     <div className="space-y-1">
        {transaction.kopasnow_online_transactions_detail.slice(0, 2).map((item) => (
          <div key={item.id_detail} className="flex justify-between items-center">
    <p className="text-xs text-slate-600 truncate max-w-[200px]">
           {item.nama_produk} <span className="text-slate-400">x{item.jumlah}</span>
           </p>
     <p className="text-xs font-medium text-slate-700">
            Rp {item.subtotal.toLocaleString("id-ID")}
              </p>
              </div>
      ))}
       {transaction.kopasnow_online_transactions_detail.length > 2 && (
  <p className="text-[10px] text-slate-400 italic">
     +{transaction.kopasnow_online_transactions_detail.length - 2} produk lainnya
       </p>
         )}
              </div>
      </div>

 {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
     <div>
                <p className="text-[10px] text-slate-400 mb-0.5">Total Pembayaran</p>
  <p className="text-sm font-black text-slate-800">
       Rp {(transaction.total_pembelian + transaction.delivery_fee).toLocaleString("id-ID")}
     </p>
         </div>
      <div className="text-right">
     <p className="text-[10px] text-slate-400">
               {formattedDate} • {formattedTime}
       </p>
                <p className="text-[10px] font-medium text-slate-500">
       {totalItems} item • {transaction.metode_pembayaran}
           </p>
   </div>
   </div>
          </Link>
        );
      })}
    </div>
  );
}
