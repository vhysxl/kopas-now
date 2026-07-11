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
      <div className="min-h-screen bg-background font-body-md text-on-background py-8 px-5 pb-24 md:pb-8">
        <div className="max-w-screen-md mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-label-md font-label-md font-bold text-secondary hover:text-primary transition-colors mb-6"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden>arrow_back</span>
            Kembali ke Beranda
          </Link>
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-8 text-center flex flex-col items-center shadow-sm">
            <span className="material-symbols-outlined text-5xl text-secondary mb-4" aria-hidden>package</span>
            <h1 className="text-headline-sm font-headline-sm font-bold mb-2 text-on-surface">Belum Ada Pesanan</h1>
            <p className="text-secondary text-body-md font-body-md mb-6">
              Anda belum memiliki riwayat pemesanan. Mulai belanja sekarang!
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center min-h-[48px] px-8 bg-primary text-on-primary text-label-md font-label-md font-bold rounded-full hover:bg-surface-tint transition-colors shadow-sm"
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
      <div className="min-h-screen bg-background font-body-md text-on-background py-8 px-5 pb-24 md:pb-8">
        <div className="max-w-screen-md mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-label-md font-label-md font-bold text-secondary hover:text-primary transition-colors mb-6"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden>arrow_back</span>
            Kembali ke Beranda
          </Link>
          <div className="bg-error-container border border-error/20 rounded-xl p-8 text-center flex flex-col items-center shadow-sm">
            <span className="material-symbols-outlined text-5xl text-error mb-4" aria-hidden>error</span>
            <h1 className="text-headline-sm font-headline-sm font-bold text-on-error-container mb-2">Gagal Memuat Pesanan</h1>
            <p className="text-on-error-container text-body-md font-body-md">{error || "Gagal memuat riwayat pemesanan."}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-body-md text-on-background py-8 px-5 pb-24 md:pb-8">
      <div className="max-w-screen-md mx-auto">
        <div className="flex items-center justify-between gap-3 mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 min-h-[48px] text-label-lg font-label-lg font-bold text-secondary hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden>arrow_back</span>
            Kembali ke Beranda
          </Link>
          <NotificationBell />
        </div>
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-sm">
          <h1 className="text-headline-md font-headline-md font-bold mb-6 text-on-surface">Pesanan Saya</h1>
          
          <OrdersList transactions={transactions || []} />
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
