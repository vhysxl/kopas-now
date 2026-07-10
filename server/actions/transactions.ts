"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { cookies } from "next/headers";

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
    if (params.delivery_lat && params.delivery_lng) {
      alamatPengiriman = `POINT(${params.delivery_lng} ${params.delivery_lat})`;
    }

    // Create the header transaction record
    const { data: transaction, error: transactionError } = await supabase
      .from("kopasnow_online_transactions_header")
      .insert({
        id_pelanggan: customerId,
        id_koperasi: params.koperasi_id,
        total_pembelian: params.total_amount,
        metode_pembayaran: params.payment_method,
        status_transaksi: "pending",
        alamat_pengiriman: alamatPengiriman,
        delivery_fee: params.delivery_fee || 0,
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

/**
 * Update transaction status
 */
export async function updateTransactionStatus(
  transaction_id: string,
  status: "pending" | "paid" | "processing" | "shipped" | "completed" | "cancelled"
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

    // Set completed_at if status is completed
    if (status === "completed") {
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
