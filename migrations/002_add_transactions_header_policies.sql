-- Migration: Add INSERT policy for kopasnow_online_transactions_header
-- Description: Allow authenticated users to insert transactions

-- Add INSERT policy for authenticated users
CREATE POLICY "kopasnow_online_transactions_header_authenticated_insert"
ON "public"."kopasnow_online_transactions_header"
FOR INSERT
TO "authenticated"
WITH CHECK (true);

-- Add UPDATE policy for authenticated users (to update status, completed_at, etc.)
CREATE POLICY "kopasnow_online_transactions_header_authenticated_update"
ON "public"."kopasnow_online_transactions_header"
FOR UPDATE
TO "authenticated"
USING (true)
WITH CHECK (true);

-- Add DELETE policy for authenticated users
CREATE POLICY "kopasnow_online_transactions_header_authenticated_delete"
ON "public"."kopasnow_online_transactions_header"
FOR DELETE
TO "authenticated"
USING (true);
