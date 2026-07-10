"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  getNotifications,
  getUnreadCount,
  markAllRead,
  type Notification,
} from "@/server/actions/notifications";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Ambil jumlah belum dibaca saat halaman dibuka, dan segarkan lagi setiap
  // tab kembali aktif. Tanpa penyegaran ini, badge tidak pernah berubah kalau
  // beranda sudah terbuka sebelum pesanan dibuat di tab/halaman lain.
  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      const count = await getUnreadCount();
      if (!cancelled) setUnread(count);
    };

    refresh();

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", refresh);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openPanel = useCallback(async () => {
    setIsOpen(true);
    setIsLoading(true);
    const list = await getNotifications();
    setItems(list);
    setIsLoading(false);

    if (list.some((n) => !n.is_read)) {
      await markAllRead();
      setUnread(0);
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => (isOpen ? setIsOpen(false) : openPanel())}
        aria-label={unread > 0 ? `Notifikasi, ${unread} belum dibaca` : "Notifikasi"}
        aria-expanded={isOpen}
        className="p-2 min-h-[48px] min-w-[48px] flex items-center justify-center text-secondary hover:text-primary transition-colors hover:bg-surface-container-low rounded-full relative cursor-pointer"
      >
        <span className="material-symbols-outlined" aria-hidden>
          notifications
        </span>
        {unread > 0 && (
          <span className="absolute top-0 right-0 min-w-[20px] h-[20px] px-1 bg-primary text-on-primary text-xs font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-[min(92vw,22rem)] bg-surface-container-lowest border-2 border-outline-variant rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-variant">
            <h2 className="text-base font-bold text-on-surface">Notifikasi</h2>
          </div>

          {isLoading ? (
            <div className="p-6 text-center text-base text-secondary">Sedang memuat...</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-center">
              <div className="text-4xl mb-2">🔔</div>
              <p className="text-base font-bold text-on-surface">Belum ada notifikasi</p>
              <p className="text-base text-secondary mt-1">
                Kabar pesanan Anda akan muncul di sini.
              </p>
            </div>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto divide-y divide-surface-variant">
              {items.map((notif) => {
                const body = (
                  <div className="px-4 py-3 hover:bg-surface-container-low transition-colors">
                    <p className="text-base font-bold text-on-surface">{notif.judul}</p>
                    <p className="text-base text-secondary mt-0.5 whitespace-pre-line line-clamp-3">
                      {notif.isi}
                    </p>
                    <p className="text-sm text-on-surface-variant mt-1">
                      {timeAgo(notif.created_at)}
                    </p>
                  </div>
                );

                return (
                  <li key={notif.id}>
                    {notif.id_transaksi ? (
                      <Link
                        href={`/orders/${notif.id_transaksi}`}
                        onClick={() => setIsOpen(false)}
                        className="block"
                      >
                        {body}
                      </Link>
                    ) : (
                      body
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <Link
            href="/orders"
            onClick={() => setIsOpen(false)}
            className="block text-center px-4 py-3 min-h-[48px] border-t border-surface-variant text-base font-bold text-primary hover:bg-surface-container-low"
          >
            Lihat Semua Pesanan
          </Link>
        </div>
      )}
    </div>
  );
}
