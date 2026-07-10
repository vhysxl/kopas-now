-- Migration: Create kopasnow_online_transactions_detail table
-- Description: Tabel detail transaksi untuk menyimpan item-item dalam setiap transaksi

-- Create transactions detail table
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
    CONSTRAINT "kopasnow_online_transactions_detail_pkey" PRIMARY KEY ("id_detail"),
    CONSTRAINT "kopasnow_online_transactions_detail_harga_satuan_check" CHECK (("harga_satuan" >= (0)::numeric)),
    CONSTRAINT "kopasnow_online_transactions_detail_jumlah_check" CHECK (("jumlah" > 0)),
    CONSTRAINT "kopasnow_online_transactions_detail_subtotal_check" CHECK (("subtotal" >= (0)::numeric))
);

-- Add foreign key constraints
ALTER TABLE ONLY "public"."kopasnow_online_transactions_detail"
    ADD CONSTRAINT "kopasnow_online_transactions_detail_id_transaksi_fkey" 
    FOREIGN KEY ("id_transaksi") 
    REFERENCES "public"."kopasnow_online_transactions_header"("id_transaksi") 
    ON DELETE CASCADE;

ALTER TABLE ONLY "public"."kopasnow_online_transactions_detail"
    ADD CONSTRAINT "kopasnow_online_transactions_detail_id_produk_fkey" 
    FOREIGN KEY ("id_produk") 
    REFERENCES "public"."kopasnow_products"("id_produk");

-- Create indexes for performance
CREATE INDEX "idx_transactions_detail_transaksi" 
    ON "public"."kopasnow_online_transactions_detail" 
    USING "btree" ("id_transaksi");

CREATE INDEX "idx_transactions_detail_produk" 
    ON "public"."kopasnow_online_transactions_detail" 
    USING "btree" ("id_produk");

-- Enable RLS
ALTER TABLE "public"."kopasnow_online_transactions_detail" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "kopasnow_online_transactions_detail_select" 
    ON "public"."kopasnow_online_transactions_detail" 
    FOR SELECT 
    USING (true);

CREATE POLICY "kopasnow_online_transactions_detail_insert" 
    ON "public"."kopasnow_online_transactions_detail" 
    FOR INSERT 
    TO "authenticated" 
    WITH CHECK (true);

-- Grant permissions
GRANT ALL ON TABLE "public"."kopasnow_online_transactions_detail" TO "anon";
GRANT ALL ON TABLE "public"."kopasnow_online_transactions_detail" TO "authenticated";
GRANT ALL ON TABLE "public"."kopasnow_online_transactions_detail" TO "service_role";

-- Set table owner
ALTER TABLE "public"."kopasnow_online_transactions_detail" OWNER TO "postgres";
