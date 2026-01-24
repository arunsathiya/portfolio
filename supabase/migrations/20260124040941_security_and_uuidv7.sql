-- Migration: Security hardening and UUIDv7 support
-- 1. Add UUIDv7 generation function (pure SQL, no extension needed)
-- 2. Update comments table to use UUIDv7 for new rows
-- 3. Restrict anon role to SELECT only

-- UUIDv7 generator function (RFC 9562 compliant)
-- Based on: https://gist.github.com/kjmph/5bd772b2c2df145aa645b837da7eca74
CREATE OR REPLACE FUNCTION uuid_generate_v7()
RETURNS uuid
AS $$
DECLARE
  unix_ts_ms bytea;
  uuid_bytes bytea;
BEGIN
  unix_ts_ms = substring(int8send(floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint) FROM 3);
  
  -- 6 bytes timestamp + 10 bytes random
  uuid_bytes = unix_ts_ms || gen_random_bytes(10);
  
  -- Set version (7) and variant (2) bits
  uuid_bytes = set_byte(uuid_bytes, 6, (get_byte(uuid_bytes, 6) & 15) | 112); -- version 7
  uuid_bytes = set_byte(uuid_bytes, 8, (get_byte(uuid_bytes, 8) & 63) | 128); -- variant 2
  
  RETURN encode(uuid_bytes, 'hex')::uuid;
END
$$
LANGUAGE plpgsql
VOLATILE;

-- Update default for new comments to use UUIDv7
ALTER TABLE public.comments 
  ALTER COLUMN id SET DEFAULT uuid_generate_v7();

-- Revoke unnecessary permissions from anon role
-- anon should only be able to SELECT (read comments)
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER 
  ON TABLE public.comments FROM anon;

-- Verify anon only has SELECT
-- (authenticated keeps INSERT for posting comments after GitHub login)
