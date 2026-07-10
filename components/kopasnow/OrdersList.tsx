"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type TransactionStatus = "pending" | "paid" | "processing" | "shipped" | "completed" | "cancelled";

/** Urut sesuai perjalanan pesanan, dari kiri ke kanan. */
const STATUS_FLOW: TransactionStatus[] = [
  "pending",
  "paid",
  "processing",
  "shipped",
  "completed",
  "cancelled",
];

type StatusFilter = TransactionStatus | "all";

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

const statusConfig: Record<TransactionStatus, { label: string; tab: string; color: string; bgColor: string; borderColor: string }> = {
  pending: { label: "Menunggu Pembayaran", tab: "Menunggu", color: "text-amber-700", bgColor: "bg-amber-50", borderColor: "border-amber-100" },
  paid: { label: "Dibayar", tab: "Dibayar", color: "text-blue-700", bgColor: "bg-blue-50", borderColor: "border-blue-100" },
  processing: { label: "Diproses", tab: "Diproses", color: "text-purple-700", bgColor: "bg-purple-50", borderColor: "border-purple-100" },
  shipped: { label: "Dikirim", tab: "Dikirim", color: "text-cyan-700", bgColor: "bg-cyan-50", borderColor: "border-cyan-100" },
  completed: { label: "Selesai", tab: "Selesai", color: "text-emerald-700", bgColor: "bg-emerald-50", borderColor: "border-emerald-100" },
  cancelled: { label: "Dibatalkan", tab: "Dibatalkan", color: "text-red-700", bgColor: "bg-red-50", borderColor: "border-red-100" },
};

export default function OrdersList({ transactions }: OrdersListProps) {
  const [activeStatus, setActiveStatus] = useState<StatusFilter>("all");

  // Hitung isi tiap tab supaya pengguna tahu mana yang kosong sebelum menekan
  const counts = useMemo(() => {
    const result: Record<string, number> = { all: transactions?.length ?? 0 };
    for (const status of STATUS_FLOW) {
      result[status] = (transactions ?? []).filter(
        (t) => t.status_transaksi === status
      ).length;
    }
    return result;
  }, [transactions]);

  const visible = useMemo(() => {
    if (!transactions) return [];
    if (activeStatus === "all") return transactions;
    return transactions.filter((t) => t.status_transaksi === activeStatus);
  }, [transactions, activeStatus]);

  if (!transactions || transactions.length === 0) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-2">📦</div>
        <p className="text-slate-800 text-lg font-bold mb-1">Belum Ada Pesanan</p>
        <p className="text-slate-600 text-base">Riwayat pemesanan Anda akan muncul di sini</p>
      </div>
    );
  }

  const tabs: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "Semua" },
    ...STATUS_FLOW.map((s) => ({ key: s as StatusFilter, label: statusConfig[s].tab })),
  ];

  return (
    <div>
      {/* Tab status, urut mengikuti perjalanan pesanan */}
      <div
        role="tablist"
        aria-label="Saring pesanan menurut status"
        className="flex gap-2 overflow-x-auto pb-2 mb-4 hide-scrollbar"
      >
        {tabs.map((tab) => {
          const isActive = activeStatus === tab.key;
          const count = counts[tab.key] ?? 0;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveStatus(tab.key)}
              className={`shrink-0 min-h-[48px] px-4 rounded-full border-2 text-base font-bold transition-colors cursor-pointer ${
                isActive
                  ? "bg-[#CE1126] text-white border-[#CE1126]"
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
              }`}
            >
              {tab.label}
              <span className={isActive ? "text-white/80" : "text-slate-500"}> ({count})</span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center">
          <div className="text-4xl mb-2">🔍</div>
          <p className="text-slate-800 text-lg font-bold mb-1">
            Tidak ada pesanan berstatus &quot;
            {activeStatus === "all" ? "Semua" : statusConfig[activeStatus].tab}&quot;
          </p>
          <button
            onClick={() => setActiveStatus("all")}
            className="mt-3 min-h-[48px] px-6 text-base font-bold text-[#CE1126] hover:underline cursor-pointer"
          >
            Lihat Semua Pesanan
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((transaction) => {
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
                <p className="text-sm text-slate-500 mb-0.5">
                  Total Pembayaran
                  {transaction.delivery_fee > 0 && (
                    <span className="text-slate-400">
                      {" "}
                      (termasuk ongkir Rp {transaction.delivery_fee.toLocaleString("id-ID")})
                    </span>
                  )}
                </p>
                <p className="text-base font-black text-slate-800">
                  Rp {(transaction.total_pembelian + transaction.delivery_fee).toLocaleString("id-ID")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">
                  {formattedDate} • {formattedTime}
                </p>
                <p className="text-sm font-medium text-slate-600">
                  {totalItems} barang • {transaction.metode_pembayaran}
                </p>
              </div>
            </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
