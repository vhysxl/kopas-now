import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import AuthProvider from "@/components/AuthProvider";
import ToastProvider from "@/components/kopasnow/ToastProvider";
import ChatBotWidget from "@/components/kopasnow/ChatBotWidget";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "KopasNow - Koperasi Merah Putih",
  description: "Layanan Digital Terpercaya Koperasi Merah Putih",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Get current session user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Query customer details if user exists.
  // Harus lewat admin client — kopasnow_customers punya RLS tanpa policy SELECT,
  // jadi query dengan sesi pengguna selalu mengembalikan null.
  let customer = null;
  if (user) {
    const adminClient = createAdminClient();
    const { data } = await adminClient
      .from("kopasnow_customers")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    customer = data;
  }

  return (
    <html
      lang="id"
      className={`${plusJakartaSans.variable} h-full antialiased`}
    >
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
      </head>
      <body className="min-h-full flex flex-col">
        <AuthProvider initialUser={user} initialCustomer={customer}>
          <ToastProvider>
            {children}
            <ChatBotWidget />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
