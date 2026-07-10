SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict G4IV2DljyP6FBPJ2GsS6Tdy5ZfebM6BtxGbhXN1QiRBeiDXMlUycWRMQzSGR5ui

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
	('ca264cf7-aefc-452a-8906-2a3e7652be3f', 'd415fc27-a28e-493d-90b9-f8729ac4dbe6', 'Budi Santoso', 'budi@mail.com', NULL, '2026-07-08 14:31:11.860726+00'),
	('73d0e725-c528-45f8-a1e8-b54747214d66', 'bc2752d1-24a1-416d-bd2a-d961d949990e', 'Siti Rahma', NULL, '081222342313', '2026-07-08 14:44:05.883056+00'),
	('187fe800-b7bb-4074-8000-a10f627d1102', '73de690c-cd3a-4366-9a56-14a3471c54e3', 'Yogi Ferdiansyah', NULL, '08515607909', '2026-07-08 16:18:44.455724+00'),
	('154bb2e5-a67c-49ad-9d06-00885ada963e', '4bd69892-fbfa-4b81-af6e-4ee5604ce533', 'Siti                            Rahma', NULL, '081293285189', '2026-07-08 14:22:55.918186+00'),
	('0b38bbd2-4a8c-455d-a992-ae95edb06f0c', 'f161df97-25a2-48ff-a03b-0fe2d57068e4', 'Yogi Ferdiansyah', 'yogif346@gmail.com', '081234214123', '2026-07-08 14:28:39.53529+00'),
	('5daf5d22-b15e-4358-9ab4-a36ac8989431', '56c5a16e-9435-4e98-aa4d-8123a3727d74', 'Joko Subianto', 'joko.widodo@ugm.ac.id', '082125350744', '2026-07-08 14:41:35.893513+00');


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
-- Data for Name: kopasnow_online_transactions_header; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: kopasnow_products; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."kopasnow_products" ("id_produk", "koperasi_id", "nama_produk", "deskripsi_produk", "harga_produk", "satuan_produk", "stok_tersedia", "stok_reserved", "foto_url", "is_active", "updated_at", "created_at", "kategori_produk") VALUES
	('f02d5aaf-8ad3-4847-a739-4f43386c61e8', 'a57c839b-c163-4377-a14f-e9954f069a71', 'Teh Melati Wangi Desa', 'Teh melati produksi lokal', 6000.00, 'pak', 75, 0, 'https://picsum.photos/800/600', true, '2026-07-08 13:39:51.589918+00', '2026-07-08 13:39:51.589918+00', '{sembako,pertanian}'),
	('f178a561-fc62-441f-81ed-8b329fead375', '5ecde99b-262b-4dcd-b1a0-4ab894123a9d', 'Pakan Ternak Konsentrat', 'Pakan konsentrat untuk sapi dan kambing', 8000.00, 'kg', 300, 0, 'https://picsum.photos/800/600', true, '2026-07-08 13:39:51.589918+00', '2026-07-08 13:39:51.589918+00', '{sembako,pertanian}'),
	('133b2b89-ea47-49e3-b1a0-5afffd73cf2d', '22f0f164-cf15-474d-988e-8c7cd3859225', 'Kopi Robusta Lereng Lawu', 'Kopi bubuk robusta asli lereng Gunung Lawu @200g', 25000.00, 'pcs', 9, 0, 'https://picsum.photos/800/600', true, '2026-07-08 13:39:51.589918+00', '2026-07-08 13:39:51.589918+00', '{sembako,pertanian}'),
	('1be3298a-6f15-4ab6-9e21-786c40aa408b', '22f0f164-cf15-474d-988e-8c7cd3859225', 'Pupuk Urea Bersubsidi', 'Pupuk urea program subsidi pemerintah 5', 112500.00, 'sak', 120, 0, 'https://picsum.photos/800/600', true, '2026-07-09 09:04:12.005+00', '2026-07-08 13:39:51.589918+00', '{sembako,pertanian}'),
	('3afc6b40-23b8-4a4b-8a4e-96b50d189c90', '21aee9bd-fba4-49b0-bd5c-8e3bb8f28ae1', 'Beras Cianjur Pandan Wangi', 'Beras premium wangi pandan, kualitas super', 14500.00, 'kg', 15, 0, 'https://picsum.photos/800/600', true, '2026-07-08 13:39:51.589918+00', '2026-07-08 13:39:51.589918+00', '{sembako,pertanian}'),
	('7be8d879-f2c3-4037-a6bf-d98fd05fea7c', '5ecde99b-262b-4dcd-b1a0-4ab894123a9d', 'Gula Pasir Kristal Putih', 'Gula pasir kualitas ekspor', 15500.00, 'kg', 60, 0, 'https://picsum.photos/800/600', true, '2026-07-08 13:39:51.589918+00', '2026-07-08 13:39:51.589918+00', '{sembako,pertanian}'),
	('7d8bf8c4-3ea6-4771-a078-0108f3b95e7e', 'ad28b3c9-8e09-4a0f-8e52-7fd96e1a316a', 'Madu Hutan Asli', 'Madu hutan murni tanpa campuran botol @650ml', 85000.00, 'pcs', 20, 0, 'https://picsum.photos/800/600', true, '2026-07-08 13:39:51.589918+00', '2026-07-08 13:39:51.589918+00', '{sembako,pertanian}'),
	('b503758e-e4be-4fb9-ae70-b3064afd57c5', '21aee9bd-fba4-49b0-bd5c-8e3bb8f28ae1', 'Minyak Goreng Kita', 'Minyak goreng kemasan 1 liter', 16000.00, 'pcs', 48, 0, 'https://picsum.photos/800/600', true, '2026-07-08 13:39:51.589918+00', '2026-07-08 13:39:51.589918+00', '{sembako,pertanian}'),
	('c44ad53a-0e87-4938-80c2-d5ace1cbbcbf', '76500b48-5ae7-4873-b256-c5f4f4bf6d7f', 'Kerajinan Anyaman Bambu', 'Kerajinan tangan anyaman bambu khas desa', 35000.00, 'pcs', 128, 0, 'https://picsum.photos/800/600', true, '2026-07-08 13:39:51.589918+00', '2026-07-08 13:39:51.589918+00', '{sembako,pertanian}'),
	('c5b1ff09-3936-4b9c-9b5d-27d326567f40', 'a57c839b-c163-4377-a14f-e9954f069a71', 'Telur Ayam Kampung', 'Telur ayam kampung segar dari peternak lokal', 3000.00, 'butir', 200, 0, 'https://picsum.photos/800/600', true, '2026-07-08 13:39:51.589918+00', '2026-07-08 13:39:51.589918+00', '{sembako,pertanian}');


--
-- Data for Name: kopasnow_online_transactions_detail; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: kopasnow_staff; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."kopasnow_staff" ("id_staff", "koperasi_id", "nama_staff", "role", "nomor_telepon") VALUES
	('3c020b56-5554-44c2-b725-d80c79424ac1', '21aee9bd-fba4-49b0-bd5c-8e3bb8f28ae1', 'Budi Santoso', 'manajer', '081234567801'),
	('130216ff-2a77-4422-aa07-1a639eaa04c5', '22f0f164-cf15-474d-988e-8c7cd3859225', 'Siti Rahayu', 'operasional', '081234567802'),
	('7385e160-cfaa-4e90-b2ad-059a5e77a2a4', '5ecde99b-262b-4dcd-b1a0-4ab894123a9d', 'Agus Wijaya', 'pendukung operasional', '081234567803'),
	('69110bc6-892f-4264-baf2-3c3c198bfc83', '76500b48-5ae7-4873-b256-c5f4f4bf6d7f', 'Dewi Lestari', 'manajer', '081234567804'),
	('69863b89-222a-42da-b5e9-1e7a03eea114', 'a57c839b-c163-4377-a14f-e9954f069a71', 'Joko Prasetyo', 'operasional', '081234567805'),
	('b66b0890-0da1-451c-b2d9-270955fcab49', 'ad28b3c9-8e09-4a0f-8e52-7fd96e1a316a', 'Rina Marlina', 'pendukung operasional', '081234567806');


--
-- Data for Name: kopasnow_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."kopasnow_transactions" ("id_transaksi", "koperasi_id", "id_produk", "jenis_transaksi", "jumlah", "harga_satuan", "total_harga", "catatan", "staff_id", "created_at", "registered_buyer") VALUES
	('55a511af-ded2-4521-a428-cd322baf59b3', '76500b48-5ae7-4873-b256-c5f4f4bf6d7f', 'c44ad53a-0e87-4938-80c2-d5ace1cbbcbf', 'masuk', 123, 35000.00, 4305000.00, 'meow', '69110bc6-892f-4264-baf2-3c3c198bfc83', '2026-07-09 02:13:11.554814+00', NULL);


--
-- PostgreSQL database dump complete
--

-- \unrestrict G4IV2DljyP6FBPJ2GsS6Tdy5ZfebM6BtxGbhXN1QiRBeiDXMlUycWRMQzSGR5ui

RESET ALL;
