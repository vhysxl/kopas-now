import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import AuthProvider from "@/components/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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

  // Query customer details if user exists
  let customer = null;
  if (user) {
    const { data } = await supabase
      .from("kopasnow_customers")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    customer = data;
  }

  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider initialUser={user} initialCustomer={customer}>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
