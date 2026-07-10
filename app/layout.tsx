import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import AuthProvider from "@/components/AuthProvider";

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
      className={`${plusJakartaSans.variable} h-full antialiased`}
    >
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
      </head>
      <body className="min-h-full flex flex-col">
        <AuthProvider initialUser={user} initialCustomer={customer}>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
