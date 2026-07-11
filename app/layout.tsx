import type { Metadata } from "next";
import { Inter, Hanken_Grotesk, Geist } from "next/font/google";
import "./globals.css";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import AuthProvider from "@/components/AuthProvider";
import ToastProvider from "@/components/kopasnow/ToastProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
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
      className={`${inter.variable} ${hankenGrotesk.variable} ${geist.variable} font-body-md bg-background text-on-background h-full antialiased`}
    >
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
      </head>
      <body className="min-h-full flex flex-col">
        <AuthProvider initialUser={user} initialCustomer={customer}>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
