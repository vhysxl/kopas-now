"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export type TransactionItem = {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
};

export type CreateTransactionParams = {
  customer_id: string;
  koperasi_id: string;
  total_amount: number;
  payment_method: "cash" | "transfer" | "ewallet" | "cod";
  delivery_address?: string;
  delivery_lat?: number;
  delivery_lng?: number;
  delivery_fee?: number;
  notes?: string;
  items: TransactionItem[];
};

export type TransactionResponse = {
  success: boolean;
  transaction_id?: string;
  error?: string;
};

/**
 * Create a new transaction record in kopasnow_online_transactions
 */
export async function createTransaction(
  params: CreateTransactionParams
): Promise<TransactionResponse> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Create the main transaction record
    const { data: transaction, error: transactionError } = await supabase
      .from("kopasnow_online_transactions")
      .insert({
        customer_id: params.customer_id,
        koperasi_id: params.koperasi_id,
        total_amount: params.total_amount,
    payment_method: params.payment_method,
        transaction_status: "pending",
  delivery_address: params.delivery_address,
        delivery_lat: params.delivery_lat,
      delivery_lng: params.delivery_lng,
        delivery_fee: params.delivery_fee || 0,
     notes: params.notes,
      })
    .select("id_transaksi")
      .single();

    if (transactionError) {
      console.error("Failed to create transaction:", transactionError);
      return {
        success: false,
        error: "Gagal mencatat transaksi. Silakan coba lagi.",
    };
    }

    // Create transaction items
    const itemsToInsert = params.items.map((item) => ({
 transaction_id: transaction.id_transaksi,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal,
    }));

    const { error: itemsError } = await supabase
    .from("kopasnow_online_transaction_items")
   .insert(itemsToInsert);

    if (itemsError) {
      console.error("Failed to create transaction items:", itemsError);
      // Rollback the transaction if items fail
      await supabase
        .from("kopasnow_online_transactions")
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
  status: "pending" | "processing" | "delivering" | "completed" | "cancelled"
): Promise<TransactionResponse> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const updateData: {
      transaction_status: string;
      completed_at?: string;
    } = {
      transaction_status: status,
    };

    // Set completed_at if status is completed
    if (status === "completed") {
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("kopasnow_online_transactions")
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
 * Get user's transaction history
 */
export async function getUserTransactions(customer_id: string) {
  try {
    const cookieStore = await cookies();
const supabase = createClient(cookieStore);

    const { data, error } = await supabase
      .from("kopasnow_online_transactions")
      .select(
        `
   *,
        kopasnow_online_transaction_items (
          *
        )
      `
    )
      .eq("customer_id", customer_id)
      .order("created_at", { ascending: false });

    if (error) {
 console.error("Failed to fetch user transactions:", error);
      return { success: false, data: null, error: "Gagal mengambil riwayat transaksi." };
    }

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
