-- Notifikasi pesanan untuk pembeli.
--
-- Baris notif ditulis oleh server action (service_role) saat pesanan dibuat
-- dan saat statusnya berubah. Pesan yang sama juga dikirim ke WhatsApp lewat
-- Fonnte; pengiriman WA sengaja tidak dilakukan dari trigger database karena
-- Postgres tidak bisa memanggil HTTP tanpa pg_net / Edge Function.

CREATE TABLE IF NOT EXISTS "public"."kopasnow_notif" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "id_pelanggan" "uuid" NOT NULL,
    "id_transaksi" "uuid",
    "tipe" "text" NOT NULL,
    "judul" "text" NOT NULL,
    "isi" "text" NOT NULL,
    "is_read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "kopasnow_notif_tipe_check" CHECK (("tipe" = ANY (ARRAY['order_created'::"text", 'status_changed'::"text"])))
);

ALTER TABLE "public"."kopasnow_notif" OWNER TO "postgres";

ALTER TABLE ONLY "public"."kopasnow_notif"
    ADD CONSTRAINT "kopasnow_notif_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."kopasnow_notif"
    ADD CONSTRAINT "kopasnow_notif_id_pelanggan_fkey" FOREIGN KEY ("id_pelanggan")
    REFERENCES "public"."kopasnow_customers"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."kopasnow_notif"
    ADD CONSTRAINT "kopasnow_notif_id_transaksi_fkey" FOREIGN KEY ("id_transaksi")
    REFERENCES "public"."kopasnow_online_transactions_header"("id_transaksi") ON DELETE CASCADE;

-- Daftar notif selalu dibaca per pelanggan dan diurutkan terbaru dulu
CREATE INDEX IF NOT EXISTS "idx_notif_pelanggan_created"
    ON "public"."kopasnow_notif" USING "btree" ("id_pelanggan", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_notif_unread"
    ON "public"."kopasnow_notif" USING "btree" ("id_pelanggan") WHERE ("is_read" = false);

-- Pemetaan auth.uid() -> kopasnow_customers.id.
-- SECURITY DEFINER supaya policy tidak ikut terhalang RLS milik
-- kopasnow_customers (tabel itu punya RLS tanpa policy SELECT).
CREATE OR REPLACE FUNCTION "public"."current_customer_id"()
RETURNS "uuid"
LANGUAGE "sql"
STABLE
SECURITY DEFINER
SET "search_path" = "public"
AS $$
    SELECT "id" FROM "public"."kopasnow_customers" WHERE "user_id" = "auth"."uid"() LIMIT 1;
$$;

ALTER FUNCTION "public"."current_customer_id"() OWNER TO "postgres";
GRANT EXECUTE ON FUNCTION "public"."current_customer_id"() TO "authenticated";

ALTER TABLE "public"."kopasnow_notif" ENABLE ROW LEVEL SECURITY;

-- Pembeli hanya melihat notifikasinya sendiri
CREATE POLICY "Users can read their own notifications"
    ON "public"."kopasnow_notif"
    FOR SELECT
    TO "authenticated"
    USING ("id_pelanggan" = "public"."current_customer_id"());

-- Pembeli boleh menandai notifikasinya sudah dibaca
CREATE POLICY "Users can mark their own notifications read"
    ON "public"."kopasnow_notif"
    FOR UPDATE
    TO "authenticated"
    USING ("id_pelanggan" = "public"."current_customer_id"())
    WITH CHECK ("id_pelanggan" = "public"."current_customer_id"());

-- Tidak ada policy INSERT: hanya service_role (yang melewati RLS) boleh
-- membuat notifikasi, yaitu server action createNotification.

GRANT ALL ON TABLE "public"."kopasnow_notif" TO "anon";
GRANT ALL ON TABLE "public"."kopasnow_notif" TO "authenticated";
GRANT ALL ON TABLE "public"."kopasnow_notif" TO "service_role";
