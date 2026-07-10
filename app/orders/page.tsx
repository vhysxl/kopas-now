import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { cookies } from "next/headers";
import Link from "next/link";
import { getUserTransactions } from "@/server/actions/transactions";
import OrdersList from "@/components/kopasnow/OrdersList";
import BottomNav from "@/components/kopasnow/BottomNav";
import NotificationBell from "@/components/kopasnow/NotificationBell";

export default async function OrdersPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  // Use admin client to bypass RLS for customer lookup
  const adminClient = createAdminClient();
  const { data: customer, error: customerError } = await adminClient
    .from("kopasnow_customers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  console.log("Orders page - user.id:", user.id);
  console.log("Orders page - customer:", customer);
  console.log("Orders page - customerError:", customerError);

  if (!customer) {
    return (
      <div className="min-h-screen bg-[#F6F6F6] py-8 px-4 pb-24 md:pb-8">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/"
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
            Kembali ke Beranda
          </Link>
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
            <div className="text-4xl mb-3">📦</div>
            <h1 className="text-xl font-bold mb-2">Belum Ada Pesanan</h1>
            <p className="text-slate-500 text-sm mb-4">
              Anda belum memiliki riwayat pemesanan. Mulai belanja sekarang!
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center min-h-[52px] px-8 bg-[#CE1126] text-white text-base font-bold rounded-xl hover:bg-[#A00E1C] transition-colors"
            >
              Mulai Belanja
            </Link>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  // Fetch user transactions
  const { success, data: transactions, error } = await getUserTransactions(customer.id);

  console.log("Orders page - transactions:", transactions?.length ?? 0);
  console.log("Orders page - error:", error);

  if (!success || error) {
    return (
      <div className="min-h-screen bg-[#F6F6F6] py-8 px-4 pb-24 md:pb-8">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/"
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
            Kembali ke Beranda
          </Link>
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
            <div className="text-4xl mb-3">❌</div>
            <h1 className="text-xl font-bold mb-2">Riwayat Pemesanan</h1>
            <p className="text-red-600 text-sm">{error || "Gagal memuat riwayat pemesanan."}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F6F6] py-8 px-4 pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 min-h-[48px] text-base font-bold text-slate-600 hover:text-[#CE1126] transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Kembali ke Beranda
          </Link>
          <NotificationBell />
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h1 className="text-2xl font-bold mb-6">Pesanan Saya</h1>
          <OrdersList transactions={transactions || []} />
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
