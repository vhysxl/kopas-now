


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


CREATE TABLE IF NOT EXISTS "public"."kopasnow_coopinstances" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "address" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "rating" numeric(2,1) DEFAULT 0,
    "status" "text" DEFAULT 'Buka'::"text" NOT NULL,
    "coord_x" numeric(10,4),
    "coord_y" numeric(10,4),
    "color" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "kopasnow_coopinstances_rating_check" CHECK ((("rating" >= (0)::numeric) AND ("rating" <= (5)::numeric))),
    CONSTRAINT "kopasnow_coopinstances_status_check" CHECK (("status" = ANY (ARRAY['Buka'::"text", 'Tutup'::"text"])))
);


ALTER TABLE "public"."kopasnow_coopinstances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."kopasnow_customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "nama" "text",
    "email" "text",
    "phone" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."kopasnow_customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."kopasnow_products" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "price" numeric(12,2) NOT NULL,
    "stock" integer DEFAULT 0 NOT NULL,
    "initial_stock" integer DEFAULT 0 NOT NULL,
    "category" "text" NOT NULL,
    "unit" "text" NOT NULL,
    "icon" "text",
    "coop_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."kopasnow_products" OWNER TO "postgres";


ALTER TABLE ONLY "public"."kopasnow_coopinstances"
    ADD CONSTRAINT "kopasnow_coopinstances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kopasnow_customers"
    ADD CONSTRAINT "kopasnow_customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kopasnow_customers"
    ADD CONSTRAINT "kopasnow_customers_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."kopasnow_products"
    ADD CONSTRAINT "kopasnow_products_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "idx_customers_email" ON "public"."kopasnow_customers" USING "btree" ("email") WHERE ("email" IS NOT NULL);



CREATE UNIQUE INDEX "idx_customers_phone" ON "public"."kopasnow_customers" USING "btree" ("phone");



CREATE INDEX "idx_kopasnow_coopinstances_status" ON "public"."kopasnow_coopinstances" USING "btree" ("status");



CREATE INDEX "idx_kopasnow_products_category" ON "public"."kopasnow_products" USING "btree" ("category");



CREATE INDEX "idx_kopasnow_products_coop_id" ON "public"."kopasnow_products" USING "btree" ("coop_id");



ALTER TABLE ONLY "public"."kopasnow_customers"
    ADD CONSTRAINT "kopasnow_customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."kopasnow_products"
    ADD CONSTRAINT "kopasnow_products_coop_id_fkey" FOREIGN KEY ("coop_id") REFERENCES "public"."kopasnow_coopinstances"("id") ON DELETE RESTRICT;



CREATE POLICY "Allow users to insert their own profile" ON "public"."kopasnow_customers" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."kopasnow_coopinstances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."kopasnow_customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."kopasnow_products" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON TABLE "public"."kopasnow_coopinstances" TO "anon";
GRANT ALL ON TABLE "public"."kopasnow_coopinstances" TO "authenticated";
GRANT ALL ON TABLE "public"."kopasnow_coopinstances" TO "service_role";



GRANT ALL ON TABLE "public"."kopasnow_customers" TO "anon";
GRANT ALL ON TABLE "public"."kopasnow_customers" TO "authenticated";
GRANT ALL ON TABLE "public"."kopasnow_customers" TO "service_role";



GRANT ALL ON TABLE "public"."kopasnow_products" TO "anon";
GRANT ALL ON TABLE "public"."kopasnow_products" TO "authenticated";
GRANT ALL ON TABLE "public"."kopasnow_products" TO "service_role";



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







