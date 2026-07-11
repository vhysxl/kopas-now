"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

// Enam status sesuai constraint di database (kopasnow_online_transactions_header)
type TransactionStatus = "Menunggu" | "Dibayar" | "Siap" | "Dikirim" | "Diterima" | "Selesai";

/** Urut sesuai perjalanan pesanan, dari kiri ke kanan. */
const STATUS_FLOW: TransactionStatus[] = [
  "Menunggu",
  "Dibayar",
  "Siap",
  "Dikirim",
  "Diterima",
  "Selesai",
];

type StatusFilter = TransactionStatus | "all";

type Transaction = {
  [x: string]: any;
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
  Menunggu: { label: "Menunggu", tab: "Menunggu", color: "text-amber-700", bgColor: "bg-amber-50", borderColor: "border-amber-100" },
  Dibayar: { label: "Dibayar", tab: "Dibayar", color: "text-blue-700", bgColor: "bg-blue-50", borderColor: "border-blue-100" },
  Siap: { label: "Siap Diambil", tab: "Siap", color: "text-purple-700", bgColor: "bg-purple-50", borderColor: "border-purple-100" },
  Dikirim: { label: "Dikirim", tab: "Dikirim", color: "text-cyan-700", bgColor: "bg-cyan-50", borderColor: "border-cyan-100" },
  Diterima: { label: "Diterima", tab: "Diterima", color: "text-teal-700", bgColor: "bg-teal-50", borderColor: "border-teal-100" },
  Selesai: { label: "Selesai", tab: "Selesai", color: "text-emerald-700", bgColor: "bg-emerald-50", borderColor: "border-emerald-100" },
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
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 text-center flex flex-col items-center shadow-sm">
        <span className="material-symbols-outlined text-5xl text-secondary mb-4" aria-hidden>package</span>
        <p className="text-on-surface text-headline-sm font-headline-sm font-bold mb-2">Belum Ada Pesanan</p>
        <p className="text-secondary text-body-md font-body-md">Riwayat pemesanan Anda akan muncul di sini</p>
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
        className="flex gap-3 overflow-x-auto pb-4 mb-6 hide-scrollbar"
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
              className={`shrink-0 min-h-[40px] px-6 rounded-full border text-label-md font-label-md font-bold transition-colors cursor-pointer ${isActive
                ? "bg-primary text-on-primary border-primary shadow-sm"
                : "bg-surface-container-lowest text-secondary border-outline-variant hover:bg-surface-variant hover:text-on-surface"
                }`}
            >
              {tab.label}
              <span className={isActive ? "text-primary-fixed ml-1 font-normal" : "text-secondary ml-1 font-normal"}> ({count})</span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 text-center flex flex-col items-center shadow-sm">
          <span className="material-symbols-outlined text-5xl text-secondary mb-4" aria-hidden>search</span>
          <p className="text-on-surface text-headline-sm font-headline-sm font-bold mb-2">
            Tidak ada pesanan berstatus &quot;
            {activeStatus === "all" ? "Semua" : statusConfig[activeStatus].tab}&quot;
          </p>
          <button
            onClick={() => setActiveStatus("all")}
            className="mt-4 min-h-[48px] px-6 text-label-md font-label-md font-bold text-primary hover:underline cursor-pointer"
          >
            Lihat Semua Pesanan
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((transaction) => {
            const statusInfo = statusConfig[transaction.status_transaksi] || statusConfig.Menunggu;
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

            const isPickup = transaction.notes?.includes("Diambil");
            const deliveryType = isPickup ? "Ambil Sendiri" : "Diantar";

            return (
              <Link
                key={transaction.id_transaksi}
                href={`/orders/${transaction.id_transaksi}`}
                className="block bg-surface-container-lowest border border-outline-variant rounded-xl p-5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.04)] transition-shadow duration-200 group"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4 pb-4 border-b border-outline-variant/30">
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
                    <p className="text-label-md font-label-md font-bold text-primary font-mono group-hover:underline">
                      {transaction.id_transaksi.split("-")[0].toUpperCase()}
                    </p>
                  </div>
                  <div className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ${statusInfo.bgColor} ${statusInfo.color} ${statusInfo.borderColor}`}>
                    {statusInfo.label}
                  </div>
                </div>

                {/* Koperasi Info */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-[16px] text-secondary">storefront</span>
                    <p className="text-label-md font-label-md font-bold text-on-surface">
                      {transaction.kopasnow_koperasi.nama}
                    </p>
                  </div>
                  <p className="text-[10px] font-medium text-secondary pl-6">
                    {transaction.kopasnow_koperasi.kode_koperasi}
                  </p>
                </div>

                {/* Items Preview */}
                <div className="mb-4">
                  <div className="space-y-2">
                    {transaction.kopasnow_online_transactions_detail.slice(0, 2).map((item) => (
                      <div key={item.id_detail} className="flex justify-between items-center gap-4">
                        <p className="text-label-sm font-label-sm text-secondary truncate flex-1">
                          {item.nama_produk} <span className="text-secondary/70">x{item.jumlah}</span>
                        </p>
                        <p className="text-label-sm font-label-sm font-medium text-on-surface shrink-0">
                          Rp {item.subtotal.toLocaleString("id-ID")}
                        </p>
                      </div>
                    ))}
                    {transaction.kopasnow_online_transactions_detail.length > 2 && (
                      <p className="text-[10px] text-secondary italic mt-2">
                        +{transaction.kopasnow_online_transactions_detail.length - 2} produk lainnya
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-end justify-between pt-4 border-t border-outline-variant/30">
                  <div>
                    <p className="text-label-sm font-label-sm text-secondary mb-1">
                      Total Pembayaran
                      {transaction.delivery_fee > 0 && (
                        <span className="text-secondary/70">
                          {" "}
                          (termasuk ongkir Rp {transaction.delivery_fee.toLocaleString("id-ID")})
                        </span>
                      )}
                    </p>
                    <p className="text-body-lg font-body-lg font-bold text-on-surface">
                      Rp {(transaction.total_pembelian + transaction.delivery_fee).toLocaleString("id-ID")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-secondary mb-1">
                      {formattedDate} • {formattedTime}
                    </p>
                    <p className="text-label-sm font-label-sm font-bold text-secondary">
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
