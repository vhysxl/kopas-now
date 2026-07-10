"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { getCurrentCustomer } from "@/server/actions/customer";
import { sendWhatsAppMessage } from "@/utils/fonnte/whatsapp";

export type NotifType = "order_created" | "status_changed";

export interface Notification {
  id: string;
  id_transaksi: string | null;
  tipe: NotifType;
  judul: string;
  isi: string;
  is_read: boolean;
  created_at: string;
}

interface CreateNotificationParams {
  customerId: string;
  transactionId?: string | null;
  tipe: NotifType;
  judul: string;
  isi: string;
  /** Nomor HP tujuan; bila kosong, WhatsApp dilewati. */
  phone?: string | null;
}

/**
 * Simpan notifikasi dan kabari pembeli lewat WhatsApp.
 *
 * Insert memakai service-role karena tabel `kopasnow_notif` sengaja tidak
 * punya policy INSERT — hanya aplikasi yang boleh membuat notifikasi.
 *
 * Kegagalan apa pun di sini tidak boleh menggagalkan pesanan yang sudah
 * tercatat, jadi fungsi ini tidak pernah melempar.
 */
export async function createNotification(params: CreateNotificationParams): Promise<void> {
  try {
    const adminClient = createAdminClient();
    const { error } = await adminClient.from("kopasnow_notif").insert({
      id_pelanggan: params.customerId,
      id_transaksi: params.transactionId ?? null,
      tipe: params.tipe,
      judul: params.judul,
      isi: params.isi,
    });

    if (error) {
      console.error("Failed to insert notification:", error);
    }
  } catch (err) {
    console.error("Unexpected error inserting notification:", err);
  }

  // WhatsApp terpisah: kalau Fonnte mati atau kuncinya belum diisi,
  // notifikasi tetap tersimpan dan pesanan tetap sah.
  if (!params.phone || !process.env.FONNTE_API_KEY) return;

  try {
    await sendWhatsAppMessage({
      target: params.phone,
      message: `*${params.judul}*\n\n${params.isi}\n\n_Pesan otomatis dari KopasNow._`,
      countryCode: "62",
    });
  } catch (err) {
    console.error("Failed to send notification via WhatsApp:", err);
  }
}

/** Daftar notifikasi milik pengguna yang sedang masuk, terbaru dulu. */
export async function getNotifications(limit = 20): Promise<Notification[]> {
  const customer = await getCurrentCustomer();
  if (!customer) return [];

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("kopasnow_notif")
    .select("id, id_transaksi, tipe, judul, isi, is_read, created_at")
    .eq("id_pelanggan", customer.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch notifications:", error);
    return [];
  }

  return data ?? [];
}

export async function getUnreadCount(): Promise<number> {
  const customer = await getCurrentCustomer();
  if (!customer) return 0;

  const adminClient = createAdminClient();
  const { count, error } = await adminClient
    .from("kopasnow_notif")
    .select("id", { count: "exact", head: true })
    .eq("id_pelanggan", customer.id)
    .eq("is_read", false);

  if (error) {
    console.error("Failed to count unread notifications:", error);
    return 0;
  }

  return count ?? 0;
}

/** Tandai semua notifikasi milik pengguna sebagai sudah dibaca. */
export async function markAllRead(): Promise<void> {
  const customer = await getCurrentCustomer();
  if (!customer) return;

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("kopasnow_notif")
    .update({ is_read: true })
    .eq("id_pelanggan", customer.id)
    .eq("is_read", false);

  if (error) {
    console.error("Failed to mark notifications read:", error);
  }
}
