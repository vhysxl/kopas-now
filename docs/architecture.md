# KopasNow — Dokumen Arsitektur Teknis

**Versi:** 1.0 (Hackathon MVP)
**Terakhir diperbarui:** Juli 2026

---

## 1. Ringkasan Sistem

KopasNow terdiri dari **satu Next.js project** yang melayani dua audiens berbeda lewat routing terpisah, di atas **satu backend/database bersama (Core Gudang)** yang bersifat multi-tenant.

```
┌───────────────────────────────────────────────────────────┐
│                     1 NEXT.JS PROJECT                       │
│                                                               │
│   /app/(kopasnow)/*        →  Client konsumen (publik)       │
│   /app/(staff)/*           →  Staff koperasi (kasir + admin) │
│   /app/api/*               →  API routes / server actions     │
│                                                               │
└──────────────────────────┬────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────────┐
              │      CORE GUDANG (Backend)    │
              │  Supabase Postgres + PostGIS   │
              │  + Row Level Security (RLS)    │
              │  + Realtime Subscriptions       │
              └─────────────┬───────────────┘
                            │
              ┌─────────────┴───────────────┐
              │                               │
     ┌────────▼────────┐          ┌──────────▼──────────┐
     │  WhatsApp Gateway │          │   Redis (cache stok) │
     │  (Fonnte)          │          │   TTL + timestamp    │
     └────────────────────┘          └──────────────────────┘
```

**Prinsip inti:** Core Gudang adalah satu-satunya *source of truth*. Kedua "wajah" aplikasi (client & staff) adalah **view berbeda di atas data yang sama**, bukan dua sistem terpisah yang saling sinkron manual.

---

## 2. Kenapa 1 Project, Bukan 2 Repo Terpisah

| Pertimbangan | Alasan |
|---|---|
| Kecepatan development | Hackathon, waktu terbatas — 1 deploy, 1 pipeline |
| Shared types & Supabase client | Skema tabel, tipe data, dan util function bisa dipakai bersama tanpa duplikasi |
| Auth terpadu | Supabase Auth bisa membedakan role (`admin`/`kasir`) dan tipe user (`staff` vs `konsumen`) dari satu sistem login |
| Realtime channel | Satu koneksi Supabase Realtime bisa di-broadcast ke kedua "sisi" routing sekaligus |

Route groups Next.js (`(kopasnow)` dan `(staff)`) dipakai untuk memisahkan layout, tanpa memisahkan project.

---

## 3. Struktur Folder Next.js

```
kopasnow/
├── app/
│   ├── (kopasnow)/                  # Client-facing, publik
│   │   ├── layout.tsx               # Layout PWA konsumen
│   │   ├── page.tsx                 # Landing / discovery map
│   │   ├── koperasi/[id]/page.tsx   # Detail koperasi + katalog
│   │   ├── cart/page.tsx
│   │   └── checkout/page.tsx
│   │
│   ├── (staff)/                     # Staff koperasi, protected
│   │   ├── layout.tsx               # Layout dashboard + role check
│   │   ├── login/page.tsx
│   │   ├── kasir/
│   │   │   └── page.tsx             # POS — semua role staff bisa akses
│   │   ├── admin/
│   │   │   ├── orders/page.tsx      # Konfirmasi order KopasNow
│   │   │   ├── produk/page.tsx      # CRUD katalog produk
│   │   │   └── laporan/page.tsx     # Ringkasan penjualan
│   │   └── middleware.ts            # Redirect berdasarkan role
│   │
│   └── api/
│       ├── orders/
│       │   ├── route.ts             # POST — buat order baru (checkout)
│       │   ├── [id]/confirm/route.ts
│       │   └── [id]/reject/route.ts
│       ├── webhook/
│       │   └── wa-callback/route.ts # Terima balasan WA dari Fonnte
│       └── stock/
│           └── [produk_id]/route.ts # Cache-aware stock read (Redis)
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                # Supabase client (browser)
│   │   ├── server.ts                # Supabase client (server component)
│   │   └── admin.ts                 # Service role client (bypass RLS, backend-only)
│   ├── redis.ts                     # Redis client + helper get/set stok
│   ├── whatsapp.ts                  # Wrapper kirim pesan via Fonnte
│   └── geo.ts                       # Helper query radius (ST_DWithin wrapper)
│
├── components/
│   ├── kopasnow/                    # Komponen khusus client app
│   └── staff/                       # Komponen khusus staff app
│
├── database/
│   └── kopasnow_schema.sql          # Schema + RLS + functions (lihat dokumen terpisah)
│
└── middleware.ts                    # Global: proteksi route (staff), redirect auth
```

---

## 4. Pemisahan Akses (Role & Auth Flow)

```
                    [ Request masuk ]
                            │
                            ▼
              Route dimulai dengan /staff/* ?
                     ┌──────┴──────┐
                    Ya            Tidak
                     │              │
                     ▼              ▼
        Cek session Supabase   Public route
        Auth (staff_koperasi)  (KopasNow client,
                     │          tidak perlu login
             ┌───────┴───────┐  untuk browse)
          Valid           Invalid
             │                │
             ▼                ▼
    Cek role di DB      Redirect ke
    (admin/kasir)        /staff/login
             │
    ┌────────┴────────┐
  admin              kasir
    │                  │
    ▼                  ▼
Akses semua      Akses terbatas:
halaman staff    hanya /staff/kasir/*
```

Implementasi teknis: middleware Next.js (`middleware.ts`) mengecek sesi dan role sebelum request sampai ke halaman, redirect kalau tidak sesuai.

---

## 5. Alur Data Utama

### 5.1 Discovery (KopasNow → Core Gudang)

```
[User buka app, GPS aktif]
        │
        ▼
[Server action: getKoperasiTerdekat(lat, lng)]
        │
        ▼
[Query PostGIS: ST_DWithin + ST_Distance, radius 5km]
        │
        ▼
[Return list koperasi + produk unggulan, urut jarak]
```

### 5.2 Checkout & Reservasi Stok

```
[User checkout di KopasNow]
        │
        ▼
[POST /api/orders]
        │
        ▼
[Cek Redis cache stok dulu — cepat, hindari beban DB langsung]
        │
   stok cukup?
   ┌────┴────┐
  Ya        Tidak
   │          │
   ▼          ▼
[Panggil    [Tolak,
 reserve_    tampilkan
 stock()     "stok tidak
 di DB]      cukup"]
   │
   ▼
[Insert order_kopasnow, status: pending_confirmation]
   │
   ▼
[Trigger notifikasi ke admin — DUA jalur paralel:]
   ├── Supabase Realtime → update dashboard staff (kalau app terbuka)
   └── Webhook ke Fonnte → kirim WA ke admin_phone koperasi
```

### 5.3 Konfirmasi Order (Anti Double-Confirm)

```
[Admin respon via APP]         [Admin respon via WHATSAPP]
        │                               │
        ▼                               ▼
[POST /api/orders/:id/confirm]  [POST /api/webhook/wa-callback]
        │                               │
        └───────────┬───────────────────┘
                     ▼
        [confirm_order(order_id, via) — SQL function]
                     │
        WHERE status = 'pending_confirmation'
                     │
        ┌────────────┴────────────┐
    Berhasil update           0 rows terupdate
    (yang pertama sampai)     (sudah diproses duluan)
        │                            │
        ▼                            ▼
  Stok reserved → dikurangi   Return "sudah diproses
  permanen                    sebelumnya", tidak ada
  Broadcast realtime ke       efek ganda
  semua client yang subscribe
        │
        ▼
  [App auto-update UI]  +  [Balasan WA ke admin: "✅ dikonfirmasi"]
```

Detail lengkap query & function ada di `kopasnow_schema.sql` (dokumen terpisah) — function `confirm_order()` dan `reject_order()`.

### 5.4 Stock Cache (Redis) & Timestamp "Terakhir Diperbarui"

```
[Setiap kali stok berubah di DB — dari kasir, confirm, atau reject]
        │
        ▼
[Write-through ke Redis]
   key: stok:{produk_id}
   value: { stok_tersedia, updated_at }
   TTL: menyesuaikan (misal 1 jam)
        │
        ▼
[Client KopasNow baca stok]
   → cek Redis dulu (cepat)
   → kalau cache miss/expired → fallback query DB, isi ulang Redis
        │
        ▼
[Frontend tampilkan: "Stok terakhir diperbarui X menit lalu"]
   dihitung dari selisih waktu sekarang vs updated_at
```

---

## 6. Multi-Tenancy

Core Gudang menggunakan model **shared database, shared schema, isolasi lewat `koperasi_id` + Row Level Security**. Detail kebijakan RLS ada di `kopasnow_schema.sql`.

Ringkasan pembagian akses:

| Actor | Scope data | Mekanisme |
|---|---|---|
| Kasir | 1 koperasi (miliknya) | RLS by `koperasi_id` via `staff_koperasi` |
| Admin | 1 koperasi (miliknya), + akses konfirmasi order | RLS sama seperti kasir, role tambahan di UI |
| Konsumen KopasNow | Baca lintas semua koperasi (discovery), tulis hanya order miliknya | Policy `select using (true)` untuk baca produk publik |

---

## 7. Real-Time Layer

Menggunakan **Supabase Realtime** (built-in Postgres logical replication), bukan WebSocket server custom:

- **Channel `order-updates`** — di-subscribe oleh dashboard staff, memberi tahu perubahan status order (termasuk yang dikonfirmasi via WA).
- **Channel `stock-updates`** — opsional, untuk update live tampilan stok di client KopasNow saat sedang membuka halaman produk.

Ini menghindari kebutuhan membangun infrastruktur WebSocket sendiri, cukup subscribe ke perubahan tabel Postgres.

---

## 8. Integrasi WhatsApp (Fonnte)

```
[Order baru masuk] → [Backend format pesan] → [POST ke api.fonnte.com/send]
                                                        │
                                                        ▼
                                          [Admin terima WA, balas teks "YA"/"TIDAK"]
                                                        │
                                                        ▼
                                    [Fonnte kirim webhook → /api/webhook/wa-callback]
                                                        │
                                                        ▼
                                    [Parse isi pesan → panggil confirm_order/reject_order]
```

**Catatan desain:** balasan menggunakan teks biasa (`YA`/`TIDAK`), bukan tombol interaktif, karena tombol template Fonnte belum konsisten lintas OS (khususnya iOS). Ini dijelaskan lebih detail di diskusi implementasi WA.

---

## 9. Tech Stack Ringkas

| Layer | Teknologi | Alasan |
|---|---|---|
| Frontend | Next.js (App Router) + Tailwind | 1 project, PWA-ready, cepat deploy |
| Peta & Geolokasi | Leaflet.js | Gratis, ringan, tanpa API key berbayar |
| Database | Supabase Postgres + PostGIS | RLS bawaan, realtime bawaan, query spasial siap pakai |
| Cache | Redis | Baca stok cepat + TTL untuk timestamp "terakhir diperbarui" |
| Notifikasi | Fonnte (WhatsApp Gateway) | Setup cepat, tanpa approval Meta, cocok untuk hackathon |
| Hosting | Vercel | Deploy langsung dari Next.js project, gratis untuk demo |

---

## 10. Batasan & Simplifikasi untuk MVP Hackathon

Hal-hal berikut **sengaja disederhanakan** untuk demo, dan perlu disebutkan eksplisit ke juri sebagai "next iteration":

- Auto-expire reservasi stok (kalau admin tidak merespon dalam waktu tertentu) — untuk MVP, cukup dikonfirmasi/tolak manual.
- Integrasi resmi ke Simkopdes/KDMP.ID digantikan dengan **adapter/mock layer**, karena API resminya kemungkinan belum accessible untuk hackathon.
- WhatsApp Business API resmi (Meta) belum dipakai; versi demo menggunakan Fonnte (unofficial gateway) yang cukup untuk pembuktian konsep, dengan catatan risiko yang sudah didiskusikan.
- Skala penuh 83.000+ koperasi tidak diuji langsung; MVP fokus pada 1 kabupaten dengan beberapa koperasi berstok nyata, sesuai cakupan yang sudah ditentukan di proposal.

---

## 11. Ringkasan Diagram Komponen (High-Level)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  KopasNow      │     │  Core Gudang   │     │ Koperasi Staff │
│  Client (PWA)  │────▶│  (Supabase)    │◀────│  App (PWA)     │
│                │◀────│  + PostGIS     │────▶│                │
│  - Discovery   │     │  + RLS         │     │  - POS (kasir) │
│  - Katalog     │     │  + Realtime    │     │  - Order mgmt  │
│  - Checkout    │     │  + Functions   │     │    (admin)     │
└──────────────┘     └───────┬──────┘     └──────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                     │
              ┌─────▼─────┐       ┌──────▼──────┐
              │   Redis     │       │   Fonnte     │
              │  (cache)    │       │  (WA gateway)│
              └─────────────┘       └──────────────┘
```

---

**Dokumen terkait:**
- `kopasnow_schema.sql` — schema tabel, RLS policy, dan SQL functions
