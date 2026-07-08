-- ============================================================
-- KOPASNOW — DATABASE SCHEMA (Multi-tenant)
-- Arsitektur: [Client Kasir] <- [Core Gudang] -> [Client KopasNow]
-- Engine: Postgres (Supabase) + PostGIS
-- ============================================================

create extension if not exists postgis;
create extension if not exists pg_trgm;   -- untuk search produk (fuzzy match)
create extension if not exists pgcrypto;  -- untuk gen_random_uuid()

-- ============================================================
-- 1. TENANT CORE — setiap koperasi adalah satu "tenant"
-- ============================================================
create table koperasi (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  kode_koperasi text unique not null,        -- kode registrasi resmi KDMP
  lokasi geography(Point, 4326) not null,    -- untuk query radius discovery
  alamat text,
  admin_phone text,                          -- nomor WA utama penerima notif order
  status text not null default 'active'
    check (status in ('active','inactive','suspended')),
  created_at timestamptz not null default now()
);

create index idx_koperasi_lokasi on koperasi using gist (lokasi);

-- ============================================================
-- 2. STAFF — user kasir & admin, terikat ke satu koperasi (tenant)
-- ============================================================
create table staff_koperasi (
  id uuid primary key default gen_random_uuid(),
  koperasi_id uuid not null references koperasi(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  nama text not null,
  role text not null check (role in ('admin','kasir')),
  phone text,
  created_at timestamptz not null default now(),
  unique (koperasi_id, user_id)
);

create index idx_staff_koperasi_user on staff_koperasi(user_id);

-- ============================================================
-- 3. KATALOG PRODUK — data produk & stok, milik satu koperasi
-- ============================================================
create table kategori_produk (
  id uuid primary key default gen_random_uuid(),
  nama text not null
);

create table produk (
  id uuid primary key default gen_random_uuid(),
  koperasi_id uuid not null references koperasi(id) on delete cascade,
  kategori_id uuid references kategori_produk(id),
  nama text not null,
  deskripsi text,
  harga numeric(12,2) not null check (harga >= 0),
  satuan text default 'pcs',
  stok_tersedia int not null default 0 check (stok_tersedia >= 0),
  stok_reserved int not null default 0 check (stok_reserved >= 0),
  foto_url text,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index idx_produk_koperasi on produk(koperasi_id);
create index idx_produk_nama_trgm on produk using gin (nama gin_trgm_ops);

-- ============================================================
-- 4. STOCK LEDGER — audit trail wajib, semua perubahan stok tercatat di sini
--    Ini yang bikin kamu bisa jawab "kenapa stok berubah?" kapan saja
--    walau perubahan datang dari 3 sumber berbeda (kasir/kopasnow/manual)
-- ============================================================
create table stock_ledger (
  id uuid primary key default gen_random_uuid(),
  produk_id uuid not null references produk(id) on delete cascade,
  koperasi_id uuid not null references koperasi(id) on delete cascade,
  perubahan int not null,        -- delta, bisa negatif/positif
  stok_sebelum int not null,
  stok_sesudah int not null,
  sumber text not null
    check (sumber in ('kasir','kopasnow_reserve','kopasnow_confirm','kopasnow_release','gudang_manual')),
  referensi_id uuid,             -- id transaksi_kasir atau order_kopasnow terkait
  keterangan text,
  created_at timestamptz not null default now()
);

create index idx_stock_ledger_produk on stock_ledger(produk_id, created_at desc);

-- ============================================================
-- 5. TRANSAKSI KASIR — penjualan fisik/offline (langsung potong stok)
-- ============================================================
create table transaksi_kasir (
  id uuid primary key default gen_random_uuid(),
  koperasi_id uuid not null references koperasi(id) on delete cascade,
  staff_id uuid not null references staff_koperasi(id),
  total numeric(12,2) not null default 0,
  metode_bayar text default 'tunai' check (metode_bayar in ('tunai','qris','transfer')),
  created_at timestamptz not null default now()
);

create table transaksi_kasir_item (
  id uuid primary key default gen_random_uuid(),
  transaksi_id uuid not null references transaksi_kasir(id) on delete cascade,
  produk_id uuid not null references produk(id),
  qty int not null check (qty > 0),
  harga_satuan numeric(12,2) not null,
  subtotal numeric(12,2) generated always as (qty * harga_satuan) stored
);

create index idx_transaksi_kasir_koperasi on transaksi_kasir(koperasi_id, created_at desc);

-- ============================================================
-- 6. KONSUMEN KOPASNOW — end user publik, LINTAS tenant (bukan staff)
-- ============================================================
create table kopasnow_customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  nama text,
  email text,
  phone text not null,
  created_at timestamptz not null default now()
);

create unique index idx_customers_email on kopasnow_customers(email) where email is not null;
create unique index idx_customers_phone on kopasnow_customers(phone);

-- ============================================================
-- 7. ORDER KOPASNOW — order online, tetap terikat ke satu koperasi (tenant)
--    walau konsumennya bisa order dari koperasi manapun (discovery lintas tenant)
-- ============================================================
create table order_kopasnow (
  id uuid primary key default gen_random_uuid(),
  koperasi_id uuid not null references koperasi(id),
  konsumen_id uuid not null references konsumen_kopasnow(id),
  status text not null default 'pending_confirmation'
    check (status in ('pending_confirmation','confirmed','rejected','expired','completed')),
  metode_ambil text not null default 'pickup' check (metode_ambil in ('pickup','delivery')),
  total numeric(12,2) not null default 0,
  confirmed_via text check (confirmed_via in ('app','whatsapp')),
  confirmed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table order_kopasnow_item (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references order_kopasnow(id) on delete cascade,
  produk_id uuid not null references produk(id),
  qty int not null check (qty > 0),
  harga_satuan numeric(12,2) not null,
  subtotal numeric(12,2) generated always as (qty * harga_satuan) stored
);

create index idx_order_kopasnow_koperasi on order_kopasnow(koperasi_id, status);
create index idx_order_kopasnow_konsumen on order_kopasnow(konsumen_id);

-- ============================================================
-- 8. NOTIFIKASI LOG — jejak notifikasi WA/app ke admin koperasi
-- ============================================================
create table notifikasi_log (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references order_kopasnow(id),
  koperasi_id uuid references koperasi(id),
  channel text not null check (channel in ('whatsapp','app_push')),
  tujuan text,
  isi_pesan text,
  status_kirim text default 'sent' check (status_kirim in ('sent','failed','delivered','replied')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- 9. ROW LEVEL SECURITY — inti isolasi antar tenant
-- ============================================================
alter table produk enable row level security;
alter table staff_koperasi enable row level security;
alter table transaksi_kasir enable row level security;
alter table transaksi_kasir_item enable row level security;
alter table order_kopasnow enable row level security;
alter table order_kopasnow_item enable row level security;
alter table stock_ledger enable row level security;
alter table notifikasi_log enable row level security;

-- Helper: daftar koperasi_id milik user yang sedang login
create or replace function my_koperasi_ids()
returns setof uuid
language sql
security definer
as $$
  select koperasi_id from staff_koperasi where user_id = auth.uid();
$$;

-- Produk: publik boleh SELECT (dipakai KopasNow discovery, lintas tenant)
create policy produk_public_select on produk
  for select using (true);

-- Produk: hanya staff koperasi terkait yang boleh insert/update/delete
create policy produk_staff_write on produk
  for all using (koperasi_id in (select my_koperasi_ids()))
  with check (koperasi_id in (select my_koperasi_ids()));

create policy staff_scoped on staff_koperasi
  for select using (koperasi_id in (select my_koperasi_ids()));

create policy transaksi_kasir_scoped on transaksi_kasir
  for all using (koperasi_id in (select my_koperasi_ids()))
  with check (koperasi_id in (select my_koperasi_ids()));

create policy transaksi_kasir_item_scoped on transaksi_kasir_item
  for all using (
    transaksi_id in (select id from transaksi_kasir where koperasi_id in (select my_koperasi_ids()))
  );

create policy order_koperasi_select on order_kopasnow
  for select using (koperasi_id in (select my_koperasi_ids()));

create policy order_koperasi_update on order_kopasnow
  for update using (koperasi_id in (select my_koperasi_ids()));

create policy order_konsumen_insert on order_kopasnow
  for insert with check (
    konsumen_id = (select id from konsumen_kopasnow where user_id = auth.uid())
  );

create policy order_item_scoped on order_kopasnow_item
  for select using (
    order_id in (select id from order_kopasnow where koperasi_id in (select my_koperasi_ids()))
  );

create policy stock_ledger_scoped on stock_ledger
  for select using (koperasi_id in (select my_koperasi_ids()));

create policy notifikasi_scoped on notifikasi_log
  for select using (koperasi_id in (select my_koperasi_ids()));

-- ============================================================
-- 10. CORE FUNCTIONS — logic kritikal (atomic, anti race-condition)
-- ============================================================

-- Reserve stok saat konsumen checkout di KopasNow
create or replace function reserve_stock(p_produk_id uuid, p_qty int)
returns boolean
language plpgsql
security definer
as $$
declare
  v_stok int;
  v_koperasi uuid;
begin
  select stok_tersedia, koperasi_id into v_stok, v_koperasi
  from produk where id = p_produk_id for update;

  if v_stok < p_qty then
    return false;
  end if;

  update produk
  set stok_tersedia = stok_tersedia - p_qty,
      stok_reserved = stok_reserved + p_qty,
      updated_at = now()
  where id = p_produk_id;

  insert into stock_ledger (produk_id, koperasi_id, perubahan, stok_sebelum, stok_sesudah, sumber)
  values (p_produk_id, v_koperasi, -p_qty, v_stok, v_stok - p_qty, 'kopasnow_reserve');

  return true;
end;
$$;

-- Konfirmasi order — dipanggil dari APP atau WEBHOOK WA, idempotent (anti double-confirm)
create or replace function confirm_order(p_order_id uuid, p_via text)
returns table(success boolean, message text)
language plpgsql
security definer
as $$
declare
  v_order record;
begin
  update order_kopasnow
  set status = 'confirmed', confirmed_via = p_via, confirmed_at = now()
  where id = p_order_id and status = 'pending_confirmation'
  returning * into v_order;

  if v_order is null then
    return query select false, 'Order sudah diproses sebelumnya';
    return;
  end if;

  update produk p
  set stok_reserved = stok_reserved - oi.qty,
      updated_at = now()
  from order_kopasnow_item oi
  where oi.order_id = p_order_id and p.id = oi.produk_id;

  insert into stock_ledger (produk_id, koperasi_id, perubahan, stok_sebelum, stok_sesudah, sumber, referensi_id)
  select oi.produk_id, v_order.koperasi_id, 0,
         p.stok_reserved + oi.qty, p.stok_reserved, 'kopasnow_confirm', p_order_id
  from order_kopasnow_item oi
  join produk p on p.id = oi.produk_id
  where oi.order_id = p_order_id;

  return query select true, 'Order berhasil dikonfirmasi';
end;
$$;

-- Tolak order — kembalikan reserved stock ke stok_tersedia, idempotent
create or replace function reject_order(p_order_id uuid, p_via text)
returns table(success boolean, message text)
language plpgsql
security definer
as $$
declare
  v_order record;
begin
  update order_kopasnow
  set status = 'rejected', confirmed_via = p_via, confirmed_at = now()
  where id = p_order_id and status = 'pending_confirmation'
  returning * into v_order;

  if v_order is null then
    return query select false, 'Order sudah diproses sebelumnya';
    return;
  end if;

  update produk p
  set stok_tersedia = stok_tersedia + oi.qty,
      stok_reserved = stok_reserved - oi.qty,
      updated_at = now()
  from order_kopasnow_item oi
  where oi.order_id = p_order_id and p.id = oi.produk_id;

  insert into stock_ledger (produk_id, koperasi_id, perubahan, stok_sebelum, stok_sesudah, sumber, referensi_id)
  select oi.produk_id, v_order.koperasi_id, oi.qty, 0, 0, 'kopasnow_release', p_order_id
  from order_kopasnow_item oi where oi.order_id = p_order_id;

  return query select true, 'Order ditolak, stok dikembalikan';
end;
$$;