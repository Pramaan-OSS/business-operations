CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS private;
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
END $$;
CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(auth.jwt()->>'sub', '')::uuid $$;
CREATE OR REPLACE FUNCTION private.get_teams_for_authenticated_user() RETURNS SETOF uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid WHERE false $$;
CREATE OR REPLACE FUNCTION extract_product_names(data json) RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT COALESCE(string_agg(item->>'name', ' '), '') FROM json_array_elements(CASE WHEN json_typeof(data) = 'array' THEN data ELSE '[]'::json END) item $$;
CREATE OR REPLACE FUNCTION generate_inbox_fts(name text, products text) RETURNS tsvector LANGUAGE sql IMMUTABLE AS $$ SELECT to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(products, '')) $$;
