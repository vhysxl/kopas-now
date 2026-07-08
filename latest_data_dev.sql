SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict nm9AegBFcBBQkKgfZQxjLkeQXGbqA387OHRVn7owBGQEUhj1ga8mflhsocfbs75

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
	('72bc3da0-9cbd-4586-83df-7e0a5f453418', '5a8f7992-b461-476d-b15f-778a4250a49f', 'Yogi Ferdiansyah', 'yogif346@gmail.com', '', '2026-07-07 09:17:24.835239+00');


--
-- PostgreSQL database dump complete
--

-- \unrestrict nm9AegBFcBBQkKgfZQxjLkeQXGbqA387OHRVn7owBGQEUhj1ga8mflhsocfbs75

RESET ALL;
