SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict Gjm9J2pQxMKblc9EPSvEl3w5XkeyPmTllNcXpanjKExLsnQdAaP8RMaXkyAfqdp

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: kopasnow_customers; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."kopasnow_customers" ("id", "user_id", "nama", "email", "phone", "created_at") VALUES
	('422ee398-ac56-4c98-8fbc-705cfe366178', 'c0bd2404-da7e-4811-81b7-1d6bf78cd289', 'Budi Darsono', NULL, '08123456789227', '2026-07-08 14:21:58.344025+00'),
	('154bb2e5-a67c-49ad-9d06-00885ada963e', '4bd69892-fbfa-4b81-af6e-4ee5604ce533', 'Siti                            Rahma', NULL, '081234567', '2026-07-08 14:22:55.918186+00');


--
-- Data for Name: kopasnow_koperasi; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."kopasnow_koperasi" ("id", "nama", "kode_koperasi", "lokasi", "alamat", "admin_phone", "status", "created_at") VALUES
	('21aee9bd-fba4-49b0-bd5c-8e3bb8f28ae1', 'Koperasi Warga Makmur', 'KOP-001', '0101000020E6100000696FF085C9CC5A40F241CF66D52719C0', 'Jl. Industri Raya No. 45', '628123456001', 'active', '2026-07-08 13:29:38.3875+00'),
	('a57c839b-c163-4377-a14f-e9954f069a71', 'Koperasi Bersama Jaya', 'KOP-002', '0101000020E6100000A4703D0AD7CB5A401FF46C567D2E19C0', 'Jl. Lippo Cikarang No. 8', '628123456002', 'active', '2026-07-08 13:29:38.3875+00'),
	('ad28b3c9-8e09-4a0f-8e52-7fd96e1a316a', 'Koperasi Jababeka Utama', 'KOP-003', '0101000020E6100000AED85F764FCA5A400C022B87161919C0', 'Jl. Jababeka Raya', '628123456003', 'active', '2026-07-08 13:29:38.3875+00'),
	('5ecde99b-262b-4dcd-b1a0-4ab894123a9d', 'Koperasi Sejahtera Mandiri', 'KOP-004', '0101000020E610000051DA1B7C61CA5A4031992A18951419C0', 'Jl. Cikarang Baru No. 12', '628123456004', 'active', '2026-07-08 13:29:38.3875+00'),
	('76500b48-5ae7-4873-b256-c5f4f4bf6d7f', 'Koperasi Cikarang Baru', 'KOP-005', '0101000020E6100000AF25E4839EC95A405DDC4603780B19C0', 'Jl. Cikarang Baru No. 20', '628123456005', 'active', '2026-07-08 13:29:38.3875+00'),
	('22f0f164-cf15-474d-988e-8c7cd3859225', 'Koperasi Delta Silicon', 'KOP-006', '0101000020E6100000705F07CE19C95A408638D6C56D3419C0', 'Jl. Delta Silicon', '628123456006', 'active', '2026-07-08 13:29:38.3875+00');


--
-- Data for Name: kopasnow_products; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."kopasnow_products" ("id_produk", "koperasi_id", "nama_produk", "deskripsi_produk", "harga_produk", "satuan_produk", "stok_tersedia", "stok_reserved", "foto_url", "is_active", "updated_at", "created_at") VALUES
	('133b2b89-ea47-49e3-b1a0-5afffd73cf2d', '22f0f164-cf15-474d-988e-8c7cd3859225', 'Kopi Robusta Lereng Lawu', 'Kopi bubuk robusta asli lereng Gunung Lawu @200g', 25000.00, 'pcs', 9, 0, 'https://picsum.photos/800/600', true, '2026-07-08 13:39:51.589918+00', '2026-07-08 13:39:51.589918+00'),
	('1be3298a-6f15-4ab6-9e21-786c40aa408b', '22f0f164-cf15-474d-988e-8c7cd3859225', 'Pupuk Urea Bersubsidi', 'Pupuk urea program subsidi pemerintah', 112500.00, 'sak', 120, 0, 'https://picsum.photos/800/600', true, '2026-07-08 13:39:51.589918+00', '2026-07-08 13:39:51.589918+00'),
	('3afc6b40-23b8-4a4b-8a4e-96b50d189c90', '21aee9bd-fba4-49b0-bd5c-8e3bb8f28ae1', 'Beras Cianjur Pandan Wangi', 'Beras premium wangi pandan, kualitas super', 14500.00, 'kg', 15, 0, 'https://picsum.photos/800/600', true, '2026-07-08 13:39:51.589918+00', '2026-07-08 13:39:51.589918+00'),
	('7be8d879-f2c3-4037-a6bf-d98fd05fea7c', '5ecde99b-262b-4dcd-b1a0-4ab894123a9d', 'Gula Pasir Kristal Putih', 'Gula pasir kualitas ekspor', 15500.00, 'kg', 60, 0, 'https://picsum.photos/800/600', true, '2026-07-08 13:39:51.589918+00', '2026-07-08 13:39:51.589918+00'),
	('7d8bf8c4-3ea6-4771-a078-0108f3b95e7e', 'ad28b3c9-8e09-4a0f-8e52-7fd96e1a316a', 'Madu Hutan Asli', 'Madu hutan murni tanpa campuran botol @650ml', 85000.00, 'pcs', 20, 0, 'https://picsum.photos/800/600', true, '2026-07-08 13:39:51.589918+00', '2026-07-08 13:39:51.589918+00'),
	('b503758e-e4be-4fb9-ae70-b3064afd57c5', '21aee9bd-fba4-49b0-bd5c-8e3bb8f28ae1', 'Minyak Goreng Kita', 'Minyak goreng kemasan 1 liter', 16000.00, 'pcs', 48, 0, 'https://picsum.photos/800/600', true, '2026-07-08 13:39:51.589918+00', '2026-07-08 13:39:51.589918+00'),
	('c44ad53a-0e87-4938-80c2-d5ace1cbbcbf', '76500b48-5ae7-4873-b256-c5f4f4bf6d7f', 'Kerajinan Anyaman Bambu', 'Kerajinan tangan anyaman bambu khas desa', 35000.00, 'pcs', 5, 0, 'https://picsum.photos/800/600', true, '2026-07-08 13:39:51.589918+00', '2026-07-08 13:39:51.589918+00'),
	('c5b1ff09-3936-4b9c-9b5d-27d326567f40', 'a57c839b-c163-4377-a14f-e9954f069a71', 'Telur Ayam Kampung', 'Telur ayam kampung segar dari peternak lokal', 3000.00, 'butir', 200, 0, 'https://picsum.photos/800/600', true, '2026-07-08 13:39:51.589918+00', '2026-07-08 13:39:51.589918+00'),
	('f02d5aaf-8ad3-4847-a739-4f43386c61e8', 'a57c839b-c163-4377-a14f-e9954f069a71', 'Teh Melati Wangi Desa', 'Teh melati produksi lokal', 6000.00, 'pak', 75, 0, 'https://picsum.photos/800/600', true, '2026-07-08 13:39:51.589918+00', '2026-07-08 13:39:51.589918+00'),
	('f178a561-fc62-441f-81ed-8b329fead375', '5ecde99b-262b-4dcd-b1a0-4ab894123a9d', 'Pakan Ternak Konsentrat', 'Pakan konsentrat untuk sapi dan kambing', 8000.00, 'kg', 300, 0, 'https://picsum.photos/800/600', true, '2026-07-08 13:39:51.589918+00', '2026-07-08 13:39:51.589918+00');


--
-- Data for Name: kopasnow_staff; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- PostgreSQL database dump complete
--

-- \unrestrict Gjm9J2pQxMKblc9EPSvEl3w5XkeyPmTllNcXpanjKExLsnQdAaP8RMaXkyAfqdp

RESET ALL;
