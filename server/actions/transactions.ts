"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { cookies } from "next/headers";
import {
  haversineDistance,
  parseWKBHex,
  formatDistance,
  calculateDeliveryFee,
  MAX_DELIVERY_RADIUS_KM,
} from "@/utils/helper/geo";
import { createNotification } from "@/server/actions/notifications";

export type TransactionItem = {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  notes?: string;
};

export type CreateTransactionParams = {
  customer_id: string;
  koperasi_id: string;
  total_amount: number;
  payment_method: "QRIS" | "COD" | "TRANSFER";
  delivery_address?: string;
  delivery_lat?: number;
  delivery_lng?: number;
  /** @deprecated Diabaikan — ongkir selalu dihitung ulang di server. */
  delivery_fee?: number;
  notes?: string;
  items: TransactionItem[];
  tipe_pembelian: string;
};

export type TransactionResponse = {
  success: boolean;
  transaction_id?: string;
  error?: string;
};

/**
 * Ensure customer record exists for the given user_id
 * Creates one if it doesn't exist yet
 */
async function ensureCustomerExists(userId: string): Promise<string | null> {
  const adminClient = createAdminClient();

  // Check if customer already exists
  const { data: existingCustomer, error: checkError } = await adminClient
    .from("kopasnow_customers")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (checkError) {
    console.error("Error checking customer:", checkError);
    return null;
  }

  if (existingCustomer) {
    return existingCustomer.id;
  }

  // Create new customer record
  const { data: newCustomer, error: createError } = await adminClient
    .from("kopasnow_customers")
    .insert({
      user_id: userId,
      nama: "User",
      email: null,
      phone: null,
    })
    .select("id")
    .single();

  if (createError) {
    console.error("Error creating customer:", createError);
    return null;
  }

  return newCustomer.id;
}

/**
 * Kurangi stok produk sesuai jumlah yang dibeli, dijepit minimal 0.
 *
 * Dilakukan di aplikasi karena tidak ada trigger di database. Pola baca-lalu-
 * tulis ini tidak sepenuhnya kebal balapan (dua pembeli bersamaan atas produk
 * yang sama bisa saling menimpa), tetapi memadai untuk skala pemakaian desa.
 * Bila nanti dibutuhkan yang atomik, ganti dengan RPC Postgres yang melakukan
 * `stok_tersedia = greatest(stok_tersedia - qty, 0)` dalam satu perintah.
 */
async function decrementStock(items: TransactionItem[]): Promise<void> {
  try {
    const adminClient = createAdminClient();

    // Gabungkan jumlah per produk, jaga-jaga bila satu produk muncul dua kali
    const qtyByProduct = new Map<string, number>();
    for (const item of items) {
      qtyByProduct.set(
        item.product_id,
        (qtyByProduct.get(item.product_id) ?? 0) + item.quantity
      );
    }
    const ids = [...qtyByProduct.keys()];
    if (ids.length === 0) return;

    const { data: rows, error } = await adminClient
      .from("kopasnow_products")
      .select("id_produk, stok_tersedia")
      .in("id_produk", ids);

    if (error || !rows) {
      console.error("Gagal membaca stok untuk pengurangan:", error?.message);
      return;
    }

    await Promise.all(
      rows.map((row) => {
        const qty = qtyByProduct.get(row.id_produk) ?? 0;
        const next = Math.max(0, (row.stok_tersedia ?? 0) - qty);
        return adminClient
          .from("kopasnow_products")
          .update({ stok_tersedia: next })
          .eq("id_produk", row.id_produk);
      })
    );
  } catch (err) {
    console.error("Gagal mengurangi stok produk:", err);
  }
}

/** Nomor WhatsApp pembeli untuk notifikasi; null bila belum tercatat. */
async function getCustomerPhone(customerId: string): Promise<string | null> {
  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from("kopasnow_customers")
    .select("phone")
    .eq("id", customerId)
    .maybeSingle();

  return data?.phone ?? null;
}

/**
 * Ukur jarak alamat antar ke koperasi.
 *
 * Jaraknya dipakai dua kali — untuk menolak pesanan di luar radius layanan,
 * dan untuk menghitung ongkir — jadi dihitung sekali lalu dikembalikan.
 *
 * @returns null bila koperasi tidak terbaca (biar alur normal / foreign key
 *          yang menanganinya).
 */
async function measureDelivery(
  koperasiId: string,
  lat: number,
  lng: number
): Promise<{ distanceKm: number; koperasiName: string; outOfRange: boolean } | null> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("kopasnow_koperasi")
    .select("nama, lokasi")
    .eq("id", koperasiId)
    .maybeSingle();

  if (error || !data?.lokasi) return null;

  const [koperasiLat, koperasiLng] = parseWKBHex(data.lokasi as string);
  const distanceKm = haversineDistance(koperasiLat, koperasiLng, lat, lng);

  return {
    distanceKm,
    koperasiName: data.nama,
    outOfRange: distanceKm > MAX_DELIVERY_RADIUS_KM,
  };
}

/**
 * Create a new transaction in kopasnow_online_transactions_header and detail
 */
export async function createTransaction(
  params: CreateTransactionParams
): Promise<TransactionResponse> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Ensure customer record exists
    const customerId = await ensureCustomerExists(params.customer_id);
    if (!customerId) {
      return {
        success: false,
        error: "Gagal memvalidasi data pelanggan. Silakan coba lagi.",
      };
    }

    // Prepare geography point for delivery address if provided
    let alamatPengiriman = null;
    // Ongkir dihitung ulang di server dan mengabaikan kiriman client —
    // nilai inilah yang tersimpan dan ditagihkan.
    let deliveryFee = 0;

    if (params.delivery_lat != null && params.delivery_lng != null) {
      // Kurir koperasi hanya melayani dalam radius tertentu. Diperiksa di sini
      // juga, bukan hanya di UI, supaya pesanan di luar jangkauan tetap ditolak.
      const delivery = await measureDelivery(
        params.koperasi_id,
        params.delivery_lat,
        params.delivery_lng
      );

      if (delivery?.outOfRange) {
        return {
          success: false,
          error: `Alamat Anda ${formatDistance(delivery.distanceKm)} dari ${
            delivery.koperasiName
          }, melebihi batas antar ${MAX_DELIVERY_RADIUS_KM} km. Silakan pilih "Ambil Sendiri", atau belanja di koperasi yang lebih dekat.`,
        };
      }

      if (delivery) {
        deliveryFee = calculateDeliveryFee(delivery.distanceKm);
      }

      alamatPengiriman = `POINT(${params.delivery_lng} ${params.delivery_lat})`;
    }

    // Pembayaran tunai/COD tidak perlu menunggu pembayaran, jadi pesanan
    // langsung masuk tahap penyiapan ("Siap"). Metode lain menunggu dulu.
    const initialStatus = params.payment_method === "COD" ? "Siap" : "Menunggu";

    // Create the header transaction record
    const { data: transaction, error: transactionError } = await supabase
      .from("kopasnow_online_transactions_header")
      .insert({
        id_pelanggan: customerId,
        id_koperasi: params.koperasi_id,
        total_pembelian: params.total_amount,
        metode_pembayaran: params.payment_method,
        status_transaksi: initialStatus,
        alamat_pengiriman: alamatPengiriman,
        delivery_fee: deliveryFee,
        notes: params.notes,
        tipe_pembelian: params.tipe_pembelian,
      })
      .select("id_transaksi")
      .single();

    if (transactionError) {
      console.error("Failed to create transaction header:", transactionError);
      console.error("Error details:", {
        message: transactionError.message,
        details: transactionError.details,
        hint: transactionError.hint,
        code: transactionError.code,
      });
      console.error("Insert data:", {
        id_pelanggan: params.customer_id,
        id_koperasi: params.koperasi_id,
        total_pembelian: params.total_amount,
        metode_pembayaran: params.payment_method,
        tipe_pembelian: params.tipe_pembelian,
      });
      return {
        success: false,
        error: `Gagal mencatat transaksi: ${transactionError.message}`,
      };
    }

    // Create transaction detail items
    const itemsToInsert = params.items.map((item) => ({
      id_transaksi: transaction.id_transaksi,
      id_produk: item.product_id,
      nama_produk: item.product_name,
      jumlah: item.quantity,
      harga_satuan: item.unit_price,
 subtotal: item.subtotal,
      catatan_item: item.notes,
    }));

    const { error: itemsError } = await supabase
      .from("kopasnow_online_transactions_detail")
      .insert(itemsToInsert);

  if (itemsError) {
      console.error("Failed to create transaction details:", itemsError);
      // Rollback the transaction header if details fail
      await supabase
        .from("kopasnow_online_transactions_header")
     .delete()
        .eq("id_transaksi", transaction.id_transaksi);

  return {
        success: false,
        error: "Gagal mencatat detail transaksi. Silakan coba lagi.",
  };
  }

    // Kurangi stok tiap produk yang dibeli. Tidak ada trigger di database,
    // jadi dilakukan di sini. Kegagalannya tidak membatalkan pesanan yang
    // sudah tercatat (stok bisa direkonsiliasi pengurus bila perlu).
    await decrementStock(params.items);

    // Kabari pembeli. Notifikasi tidak pernah menggagalkan pesanan yang
    // sudah tercatat, jadi kegagalannya ditelan di dalam createNotification.
    const totalWithFee = params.total_amount + deliveryFee;
    await createNotification({
      customerId: customerId,
      transactionId: transaction.id_transaksi,
      tipe: "order_created",
      judul: "Pesanan Anda sudah diterima",
      isi:
        `Nomor pesanan: ${transaction.id_transaksi.split("-")[0].toUpperCase()}\n` +
        `Total bayar: Rp ${totalWithFee.toLocaleString("id-ID")}` +
        (deliveryFee > 0 ? ` (termasuk ongkir Rp ${deliveryFee.toLocaleString("id-ID")})` : "") +
        `\n\nPengurus koperasi akan menghubungi Anda.`,
      phone: await getCustomerPhone(customerId),
    });

    return {
      success: true,
      transaction_id: transaction.id_transaksi,
    };
  } catch (error) {
    console.error("Unexpected error creating transaction:", error);
    return {
      success: false,
      error: "Terjadi kesalahan sistem. Silakan coba lagi.",
    };
  }
}

/** Enam status pesanan sesuai constraint di database. */
export type OrderStatus =
  | "Menunggu"
  | "Dibayar"
  | "Siap"
  | "Dikirim"
  | "Diterima"
  | "Selesai";

/** Kalimat yang dipahami pembeli untuk tiap status pesanan. */
const STATUS_MESSAGE: Record<OrderStatus, { judul: string; isi: string }> = {
  Menunggu: {
    judul: "Pesanan menunggu diproses",
    isi: "Pesanan Anda sudah masuk dan sedang menunggu diproses koperasi.",
  },
  Dibayar: {
    judul: "Pembayaran diterima",
    isi: "Pembayaran Anda sudah diterima koperasi. Terima kasih!",
  },
  Siap: {
    judul: "Pesanan sedang disiapkan",
    isi: "Pengurus koperasi sedang menyiapkan barang pesanan Anda.",
  },
  Dikirim: {
    judul: "Pesanan sedang diantar",
    isi: "Kurir koperasi sedang mengantar pesanan Anda. Mohon ditunggu.",
  },
  Diterima: {
    judul: "Pesanan sudah diterima",
    isi: "Pesanan Anda sudah sampai. Terima kasih!",
  },
  Selesai: {
    judul: "Pesanan selesai",
    isi: "Pesanan Anda sudah selesai. Terima kasih sudah belanja di koperasi desa!",
  },
};

/**
 * Update transaction status
 *
 * Catatan: notifikasi hanya terkirim bila status diubah lewat fungsi ini.
 * Perubahan status langsung dari dashboard Supabase tidak akan memicu apa pun.
 */
export async function updateTransactionStatus(
  transaction_id: string,
  status: OrderStatus
): Promise<TransactionResponse> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const updateData: {
      status_transaksi: string;
      completed_at?: string;
      updated_at: string;
    } = {
status_transaksi: status,
      updated_at: new Date().toISOString(),
    };

    // Set completed_at saat pesanan dinyatakan selesai
    if (status === "Selesai") {
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("kopasnow_online_transactions_header")
      .update(updateData)
      .eq("id_transaksi", transaction_id);

    if (error) {
      console.error("Failed to update transaction status:", error);
      return {
        success: false,
  error: "Gagal memperbarui status transaksi.",
};
    }

    // Kabari pembeli tentang status barunya
    const adminClient = createAdminClient();
    const { data: header } = await adminClient
      .from("kopasnow_online_transactions_header")
      .select("id_pelanggan")
      .eq("id_transaksi", transaction_id)
      .maybeSingle();

    const message = STATUS_MESSAGE[status];
    if (header?.id_pelanggan && message) {
      await createNotification({
        customerId: header.id_pelanggan,
        transactionId: transaction_id,
        tipe: "status_changed",
        judul: message.judul,
        isi: `${message.isi}\n\nNomor pesanan: ${transaction_id
          .split("-")[0]
          .toUpperCase()}`,
        phone: await getCustomerPhone(header.id_pelanggan),
      });
    }

    return {
      success: true,
      transaction_id,
    };
  } catch (error) {
    console.error("Unexpected error updating transaction:", error);
    return {
  success: false,
      error: "Terjadi kesalahan sistem. Silakan coba lagi.",
    };
  }
}

/**
 * Get user's transaction history with details
 */
export async function getUserTransactions(customer_id: string) {
  try {
    const adminClient = createAdminClient();

    console.log("getUserTransactions - fetching for customer_id:", customer_id);

    const { data, error } = await adminClient
      .from("kopasnow_online_transactions_header")
      .select(
        `
        *,
        kopasnow_online_transactions_detail (
          id_detail,
          id_produk,
          nama_produk,
          harga_satuan,
          jumlah,
          subtotal,
          catatan_item,
          created_at
        ),
        kopasnow_koperasi (
          id,
          nama,
          kode_koperasi,
          alamat
        )
      `
      )
      .eq("id_pelanggan", customer_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch user transactions:", error);
      return { success: false, data: null, error: "Gagal mengambil riwayat transaksi." };
    }

    console.log("getUserTransactions - found", data?.length ?? 0, "transactions");
    return { success: true, data, error: null };
  } catch (error) {
    console.error("Unexpected error fetching transactions:", error);
    return {
      success: false,
      data: null,
      error: "Terjadi kesalahan sistem. Silakan coba lagi.",
    };
  }
}

/**
 * Get transaction detail by ID
 */
export async function getTransactionDetail(transaction_id: string) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase
      .from("kopasnow_online_transactions_header")
   .select(
    `
        *,
        kopasnow_online_transactions_detail (
          id_detail,
     id_produk,
 nama_produk,
 harga_satuan,
          jumlah,
          subtotal,
  catatan_item,
     created_at
     ),
        kopasnow_koperasi (
          id,
     nama,
          kode_koperasi,
          alamat,
       admin_phone
      ),
        kopasnow_customers (
        id,
          nama,
      email,
          phone
        )
      `
      )
      .eq("id_transaksi", transaction_id)
   .single();

  if (error) {
  console.error("Failed to fetch transaction detail:", error);
      return { success: false, data: null, error: "Gagal mengambil detail transaksi." };
    }

    return { success: true, data, error: null };
  } catch (error) {
    console.error("Unexpected error fetching transaction detail:", error);
    return {
      success: false,
      data: null,
      error: "Terjadi kesalahan sistem. Silakan coba lagi.",
    };
  }
}
