-- Tabel kopasnow_customers mengaktifkan RLS tetapi hanya punya policy INSERT.
-- Akibatnya SELECT dari client (anon maupun authenticated) selalu mengembalikan
-- nol baris tanpa error, sehingga:
--   - setiap login OTP menganggap nomor yang sudah terdaftar sebagai pengguna baru
--   - nama pengguna jatuh ke fallback email, yang untuk akun berbasis HP berisi
--     alamat sintetis <nomor>@phone.kopasnow.com
--
-- Sementara ini kode aplikasi memakai service-role client di server action.
-- Setelah policy di bawah diterapkan, pembacaan profil bisa dikembalikan ke
-- client biasa (lihat server/actions/customer.ts).

CREATE POLICY "Users can read their own profile"
  ON "public"."kopasnow_customers"
  FOR SELECT
  TO "authenticated"
  USING ("auth"."uid"() = "user_id");

CREATE POLICY "Users can update their own profile"
  ON "public"."kopasnow_customers"
  FOR UPDATE
  TO "authenticated"
  USING ("auth"."uid"() = "user_id")
  WITH CHECK ("auth"."uid"() = "user_id");
