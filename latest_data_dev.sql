SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict Mgoadh8k2QpsfFu3J2NfMKcZqjlBrjJLmaeQFF6eNu1txBIdFFKnlwkrJ123yIZ

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
-- Data for Name: kopasnow_coopinstances; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."kopasnow_coopinstances" ("id", "name", "address", "phone", "rating", "status", "coord_x", "coord_y", "color", "created_at", "updated_at") VALUES
	('coop-1', 'KUD Merah Putih Karanganyar', 'Jl. Raya Karanganyar No. 45, Karanganyar', '081234567890', 4.8, 'Buka', 140.0000, 110.0000, '#CE1126', '2026-07-08 03:40:40.162444+00', '2026-07-08 03:40:40.162444+00'),
	('coop-2', 'Koperasi Tani Rejo Makmur', 'Dusun Sukorejo, RT 02/RW 04, Karanganyar', '089876543210', 4.6, 'Buka', 260.0000, 220.0000, '#EAB308', '2026-07-08 03:40:40.162444+00', '2026-07-08 03:40:40.162444+00');


--
-- Data for Name: kopasnow_customers; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."kopasnow_customers" ("id", "user_id", "nama", "email", "phone", "created_at") VALUES
	('72bc3da0-9cbd-4586-83df-7e0a5f453418', '5a8f7992-b461-476d-b15f-778a4250a49f', 'Yogi Ferdiansyah', 'yogif346@gmail.com', '', '2026-07-07 09:17:24.835239+00');


--
-- Data for Name: kopasnow_products; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."kopasnow_products" ("id", "name", "price", "stock", "initial_stock", "category", "unit", "icon", "coop_id", "created_at", "updated_at") VALUES
	('prod-1', 'Beras Cianjur Pandan Wangi', 14500.00, 15, 15, 'Sembako', 'kg', '🌾', 'coop-1', '2026-07-08 03:39:07.705999+00', '2026-07-08 03:39:07.705999+00'),
	('prod-2', 'Minyak Goreng Kita', 16000.00, 48, 48, 'Sembako', 'Liter', '🧪', 'coop-1', '2026-07-08 03:39:07.705999+00', '2026-07-08 03:39:07.705999+00'),
	('prod-3', 'Pupuk Urea Bersubsidi', 112500.00, 120, 120, 'Pertanian', 'sak', '🌱', 'coop-1', '2026-07-08 03:39:07.705999+00', '2026-07-08 03:39:07.705999+00'),
	('prod-4', 'Kopi Robusta Lereng Lawu', 25000.00, 9, 9, 'Kopi & Teh', '200g', '☕', 'coop-1', '2026-07-08 03:39:07.705999+00', '2026-07-08 03:39:07.705999+00'),
	('prod-5', 'Gula Pasir Kristal Putih', 15500.00, 60, 60, 'Sembako', 'kg', '🍬', 'coop-2', '2026-07-08 03:39:07.705999+00', '2026-07-08 03:39:07.705999+00'),
	('prod-6', 'Pakan Ternak Konsentrat', 8000.00, 300, 300, 'Pertanian', 'kg', '🌾', 'coop-2', '2026-07-08 03:39:07.705999+00', '2026-07-08 03:39:07.705999+00'),
	('prod-7', 'Kerajinan Anyaman Bambu', 35000.00, 5, 5, 'Kerajinan', 'pcs', '🧺', 'coop-2', '2026-07-08 03:39:07.705999+00', '2026-07-08 03:39:07.705999+00'),
	('prod-8', 'Teh Melati Wangi Desa', 6000.00, 75, 75, 'Kopi & Teh', 'pak', '🍵', 'coop-2', '2026-07-08 03:39:07.705999+00', '2026-07-08 03:39:07.705999+00');


--
-- PostgreSQL database dump complete
--

-- \unrestrict Mgoadh8k2QpsfFu3J2NfMKcZqjlBrjJLmaeQFF6eNu1txBIdFFKnlwkrJ123yIZ

RESET ALL;
