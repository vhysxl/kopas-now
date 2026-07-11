


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."kopasnow_customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "nama" "text",
    "email" "text",
    "phone" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "check_email_or_phone_present" CHECK (((("email" IS NOT NULL) AND ("email" <> ''::"text")) OR (("phone" IS NOT NULL) AND ("phone" <> ''::"text"))))
);


ALTER TABLE "public"."kopasnow_customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."kopasnow_koperasi" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nama" "text" NOT NULL,
    "kode_koperasi" "text" NOT NULL,
    "lokasi" "extensions"."geography"(Point,4326) NOT NULL,
    "alamat" "text",
    "admin_phone" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "kopasnow_koperasi_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'suspended'::"text"])))
);


ALTER TABLE "public"."kopasnow_koperasi" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."kopasnow_online_transactions_detail" (
    "id_detail" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "id_transaksi" "uuid" NOT NULL,
    "id_produk" "uuid" NOT NULL,
    "nama_produk" "text" NOT NULL,
    "harga_satuan" numeric(12,2) NOT NULL,
    "jumlah" integer NOT NULL,
    "subtotal" numeric(12,2) NOT NULL,
    "catatan_item" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "kopasnow_online_transactions_detail_harga_satuan_check" CHECK (("harga_satuan" >= (0)::numeric)),
    CONSTRAINT "kopasnow_online_transactions_detail_jumlah_check" CHECK (("jumlah" > 0)),
    CONSTRAINT "kopasnow_online_transactions_detail_subtotal_check" CHECK (("subtotal" >= (0)::numeric))
);


ALTER TABLE "public"."kopasnow_online_transactions_detail" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."kopasnow_online_transactions_header" (
    "id_transaksi" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "id_pelanggan" "uuid" NOT NULL,
    "id_koperasi" "uuid" NOT NULL,
    "total_pembelian" numeric(12,2) NOT NULL,
    "metode_pembayaran" "text" DEFAULT 'COD'::"text" NOT NULL,
    "status_transaksi" "text" DEFAULT 'pending'::"text" NOT NULL,
    "alamat_pengiriman" "extensions"."geography"(Point,4326),
    "delivery_fee" numeric(12,2) DEFAULT 0 NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "tipe_pembelian" "text" NOT NULL,
    CONSTRAINT "kopasnow_online_transactions_delivery_fee_check" CHECK (("delivery_fee" >= (0)::numeric)),
    CONSTRAINT "kopasnow_online_transactions_metode_pembayaran_check" CHECK (("metode_pembayaran" = ANY (ARRAY['COD'::"text", 'TRANSFER'::"text"]))),
    CONSTRAINT "kopasnow_online_transactions_status_transaksi_check" CHECK (("status_transaksi" = ANY (ARRAY['pending'::"text", 'paid'::"text", 'processing'::"text", 'shipped'::"text", 'completed'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "kopasnow_online_transactions_total_pembelian_check" CHECK (("total_pembelian" >= (0)::numeric))
);


ALTER TABLE "public"."kopasnow_online_transactions_header" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."kopasnow_products" (
    "id_produk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "koperasi_id" "uuid" NOT NULL,
    "nama_produk" "text" NOT NULL,
    "deskripsi_produk" "text",
    "harga_produk" numeric(12,2) NOT NULL,
    "satuan_produk" "text" DEFAULT 'pcs'::"text",
    "stok_tersedia" integer DEFAULT 0 NOT NULL,
    "stok_reserved" integer DEFAULT 0 NOT NULL,
    "foto_url" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "kategori_produk" "text"[],
    CONSTRAINT "kopasnow_products_harga_produk_check" CHECK (("harga_produk" >= (0)::numeric)),
    CONSTRAINT "kopasnow_products_stok_reserved_check" CHECK (("stok_reserved" >= 0)),
    CONSTRAINT "kopasnow_products_stok_tersedia_check" CHECK (("stok_tersedia" >= 0))
);


ALTER TABLE "public"."kopasnow_products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."kopasnow_staff" (
    "id_staff" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "koperasi_id" "uuid" NOT NULL,
    "nama_staff" character varying NOT NULL,
    "role" character varying,
    "nomor_telepon" "text" NOT NULL
);


ALTER TABLE "public"."kopasnow_staff" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."kopasnow_transactions" (
    "id_transaksi" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "koperasi_id" "uuid" NOT NULL,
    "id_produk" "uuid" NOT NULL,
    "jenis_transaksi" "text" NOT NULL,
    "jumlah" integer NOT NULL,
    "harga_satuan" numeric(12,2),
    "total_harga" numeric(12,2),
    "catatan" "text",
    "staff_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "registered_buyer" "uuid",
    CONSTRAINT "kopasnow_transactions_jenis_check" CHECK (("jenis_transaksi" = ANY (ARRAY['masuk'::"text", 'keluar'::"text", 'penjualan'::"text", 'retur'::"text"]))),
    CONSTRAINT "kopasnow_transactions_jumlah_check" CHECK (("jumlah" > 0))
);


ALTER TABLE "public"."kopasnow_transactions" OWNER TO "postgres";


ALTER TABLE ONLY "public"."kopasnow_customers"
    ADD CONSTRAINT "kopasnow_customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kopasnow_customers"
    ADD CONSTRAINT "kopasnow_customers_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."kopasnow_koperasi"
    ADD CONSTRAINT "kopasnow_koperasi_kode_koperasi_key" UNIQUE ("kode_koperasi");



ALTER TABLE ONLY "public"."kopasnow_koperasi"
    ADD CONSTRAINT "kopasnow_koperasi_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kopasnow_online_transactions_detail"
    ADD CONSTRAINT "kopasnow_online_transactions_detail_pkey" PRIMARY KEY ("id_detail");



ALTER TABLE ONLY "public"."kopasnow_online_transactions_header"
    ADD CONSTRAINT "kopasnow_online_transactions_pkey" PRIMARY KEY ("id_transaksi");



ALTER TABLE ONLY "public"."kopasnow_products"
    ADD CONSTRAINT "kopasnow_products_pkey" PRIMARY KEY ("id_produk");



ALTER TABLE ONLY "public"."kopasnow_staff"
    ADD CONSTRAINT "kopasnow_staff_pkey" PRIMARY KEY ("id_staff");



ALTER TABLE ONLY "public"."kopasnow_transactions"
    ADD CONSTRAINT "kopasnow_transactions_pkey" PRIMARY KEY ("id_transaksi");



CREATE UNIQUE INDEX "idx_customers_email" ON "public"."kopasnow_customers" USING "btree" ("email") WHERE ("email" IS NOT NULL);



CREATE UNIQUE INDEX "idx_customers_phone" ON "public"."kopasnow_customers" USING "btree" ("phone");



CREATE INDEX "idx_kopasnow_products_koperasi" ON "public"."kopasnow_products" USING "btree" ("koperasi_id");



CREATE INDEX "idx_koperasi_lokasi" ON "public"."kopasnow_koperasi" USING "gist" ("lokasi");



CREATE INDEX "idx_transactions_created" ON "public"."kopasnow_transactions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_transactions_detail_produk" ON "public"."kopasnow_online_transactions_detail" USING "btree" ("id_produk");



CREATE INDEX "idx_transactions_detail_transaksi" ON "public"."kopasnow_online_transactions_detail" USING "btree" ("id_transaksi");



CREATE INDEX "idx_transactions_koperasi" ON "public"."kopasnow_transactions" USING "btree" ("koperasi_id");



CREATE INDEX "idx_transactions_produk" ON "public"."kopasnow_transactions" USING "btree" ("id_produk");



ALTER TABLE ONLY "public"."kopasnow_customers"
    ADD CONSTRAINT "kopasnow_customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."kopasnow_online_transactions_detail"
    ADD CONSTRAINT "kopasnow_online_transactions_detail_id_produk_fkey" FOREIGN KEY ("id_produk") REFERENCES "public"."kopasnow_products"("id_produk");



ALTER TABLE ONLY "public"."kopasnow_online_transactions_detail"
    ADD CONSTRAINT "kopasnow_online_transactions_detail_id_transaksi_fkey" FOREIGN KEY ("id_transaksi") REFERENCES "public"."kopasnow_online_transactions_header"("id_transaksi") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."kopasnow_online_transactions_header"
    ADD CONSTRAINT "kopasnow_online_transactions_id_koperasi_fkey" FOREIGN KEY ("id_koperasi") REFERENCES "public"."kopasnow_koperasi"("id");



ALTER TABLE ONLY "public"."kopasnow_online_transactions_header"
    ADD CONSTRAINT "kopasnow_online_transactions_id_pelanggan_fkey" FOREIGN KEY ("id_pelanggan") REFERENCES "public"."kopasnow_customers"("id");



ALTER TABLE ONLY "public"."kopasnow_products"
    ADD CONSTRAINT "kopasnow_products_koperasi_id_fkey" FOREIGN KEY ("koperasi_id") REFERENCES "public"."kopasnow_koperasi"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."kopasnow_staff"
    ADD CONSTRAINT "kopasnow_staff_koperasi_id_fkey" FOREIGN KEY ("koperasi_id") REFERENCES "public"."kopasnow_koperasi"("id");



ALTER TABLE ONLY "public"."kopasnow_transactions"
    ADD CONSTRAINT "kopasnow_transactions_koperasi_fkey" FOREIGN KEY ("koperasi_id") REFERENCES "public"."kopasnow_koperasi"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."kopasnow_transactions"
    ADD CONSTRAINT "kopasnow_transactions_produk_fkey" FOREIGN KEY ("id_produk") REFERENCES "public"."kopasnow_products"("id_produk") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."kopasnow_transactions"
    ADD CONSTRAINT "kopasnow_transactions_registered_buyer_fkey" FOREIGN KEY ("registered_buyer") REFERENCES "public"."kopasnow_customers"("id");



ALTER TABLE ONLY "public"."kopasnow_transactions"
    ADD CONSTRAINT "kopasnow_transactions_staff_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."kopasnow_staff"("id_staff");



CREATE POLICY "Allow users to insert their own profile" ON "public"."kopasnow_customers" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Authenticated users can insert transactions" ON "public"."kopasnow_transactions" FOR INSERT TO "authenticated" WITH CHECK (true);



ALTER TABLE "public"."kopasnow_customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."kopasnow_koperasi" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "kopasnow_koperasi_public_select" ON "public"."kopasnow_koperasi" FOR SELECT USING (true);



ALTER TABLE "public"."kopasnow_online_transactions_detail" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "kopasnow_online_transactions_detail_insert" ON "public"."kopasnow_online_transactions_detail" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "kopasnow_online_transactions_detail_select" ON "public"."kopasnow_online_transactions_detail" FOR SELECT USING (true);



ALTER TABLE "public"."kopasnow_online_transactions_header" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "kopasnow_online_transactions_public_select" ON "public"."kopasnow_online_transactions_header" FOR SELECT USING (true);



ALTER TABLE "public"."kopasnow_products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "kopasnow_products_anon_delete" ON "public"."kopasnow_products" FOR DELETE TO "anon" USING (true);



CREATE POLICY "kopasnow_products_anon_insert" ON "public"."kopasnow_products" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "kopasnow_products_anon_update" ON "public"."kopasnow_products" FOR UPDATE TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "kopasnow_products_authenticated_delete" ON "public"."kopasnow_products" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "kopasnow_products_authenticated_insert" ON "public"."kopasnow_products" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "kopasnow_products_authenticated_update" ON "public"."kopasnow_products" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "kopasnow_products_public_select" ON "public"."kopasnow_products" FOR SELECT USING (true);



ALTER TABLE "public"."kopasnow_staff" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "kopasnow_staff_public_select" ON "public"."kopasnow_staff" FOR SELECT USING (true);



ALTER TABLE "public"."kopasnow_transactions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "kopasnow_transactions_anon_delete" ON "public"."kopasnow_transactions" FOR DELETE TO "anon" USING (true);



CREATE POLICY "kopasnow_transactions_anon_insert" ON "public"."kopasnow_transactions" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "kopasnow_transactions_anon_update" ON "public"."kopasnow_transactions" FOR UPDATE TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "kopasnow_transactions_public_select" ON "public"."kopasnow_transactions" FOR SELECT USING (true);



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON TABLE "public"."kopasnow_customers" TO "anon";
GRANT ALL ON TABLE "public"."kopasnow_customers" TO "authenticated";
GRANT ALL ON TABLE "public"."kopasnow_customers" TO "service_role";



GRANT ALL ON TABLE "public"."kopasnow_koperasi" TO "anon";
GRANT ALL ON TABLE "public"."kopasnow_koperasi" TO "authenticated";
GRANT ALL ON TABLE "public"."kopasnow_koperasi" TO "service_role";



GRANT ALL ON TABLE "public"."kopasnow_online_transactions_detail" TO "anon";
GRANT ALL ON TABLE "public"."kopasnow_online_transactions_detail" TO "authenticated";
GRANT ALL ON TABLE "public"."kopasnow_online_transactions_detail" TO "service_role";



GRANT ALL ON TABLE "public"."kopasnow_online_transactions_header" TO "anon";
GRANT ALL ON TABLE "public"."kopasnow_online_transactions_header" TO "authenticated";
GRANT ALL ON TABLE "public"."kopasnow_online_transactions_header" TO "service_role";



GRANT ALL ON TABLE "public"."kopasnow_products" TO "anon";
GRANT ALL ON TABLE "public"."kopasnow_products" TO "authenticated";
GRANT ALL ON TABLE "public"."kopasnow_products" TO "service_role";



GRANT ALL ON TABLE "public"."kopasnow_staff" TO "anon";
GRANT ALL ON TABLE "public"."kopasnow_staff" TO "authenticated";
GRANT ALL ON TABLE "public"."kopasnow_staff" TO "service_role";



GRANT ALL ON TABLE "public"."kopasnow_transactions" TO "anon";
GRANT ALL ON TABLE "public"."kopasnow_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."kopasnow_transactions" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







