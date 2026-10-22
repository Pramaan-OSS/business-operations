import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_DIRECT_URL || process.env.DATABASE_PRIMARY_URL, ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : false });
const client = await pool.connect();
try {
  await client.query("SELECT pg_advisory_lock(7362910)");
  await client.query(await Bun.file("scripts/local/database.sql").text());
  const existing = await client.query("SELECT to_regclass('public.users') AS users");
  if (!existing.rows[0]?.users) {
    const exported = await Bun.file("scripts/local/schema.sql").text();
    const sql = exported.slice(exported.indexOf("CREATE TYPE"));
    if (!sql.startsWith("CREATE TYPE")) throw new Error("The local schema is missing.");
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
  }
  await client.query("ALTER TYPE platform_provider ADD VALUE IF NOT EXISTS 'sms'");
  await client.query("ALTER TYPE platform_provider ADD VALUE IF NOT EXISTS 'imessage'");
  await client.query(`
    DO $$ BEGIN
      IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'billingEmail') THEN
        ALTER TABLE public.customers RENAME COLUMN "billingEmail" TO billing_email;
      END IF;
      IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoice_products' AND column_name = 'isActive') THEN
        ALTER TABLE public.invoice_products RENAME COLUMN "isActive" TO is_active;
      END IF;
    END $$;
    ALTER TABLE teams ALTER COLUMN inbox_id SET DEFAULT replace(gen_random_uuid()::text, '-', '');
    ALTER TABLE document_tag_embeddings ADD COLUMN IF NOT EXISTS space text;
    ALTER TABLE transaction_category_embeddings ADD COLUMN IF NOT EXISTS space text;
    DO $$ DECLARE table_name text; current_size integer; BEGIN
      FOREACH table_name IN ARRAY ARRAY['document_tag_embeddings', 'transaction_category_embeddings'] LOOP
        SELECT a.atttypmod INTO current_size FROM pg_attribute a WHERE a.attrelid = ('public.' || table_name)::regclass AND a.attname = 'embedding';
        IF current_size <> 1024 THEN
          EXECUTE format('DELETE FROM public.%I', table_name);
          EXECUTE format('ALTER TABLE public.%I ALTER COLUMN embedding TYPE vector(1024)', table_name);
        END IF;
        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN model SET DEFAULT %L', table_name, 'unconfigured');
      END LOOP;
    END $$;
    CREATE OR REPLACE FUNCTION private.get_teams_for_authenticated_user() RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT team_id FROM public.users_on_team WHERE user_id = auth.uid() $$;
    CREATE OR REPLACE FUNCTION public.create_local_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN
      INSERT INTO public.users(id, email, full_name) VALUES(NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', '')) ON CONFLICT (id) DO NOTHING;
      RETURN NEW;
    END $$;
    DROP TRIGGER IF EXISTS local_auth_profile ON auth.users;
    CREATE TRIGGER local_auth_profile AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_local_profile();
    INSERT INTO public.users(id, email, full_name) SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', '') FROM auth.users ON CONFLICT (id) DO NOTHING;
    DO $$ DECLARE item record; BEGIN
      FOR item IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity LOOP
        IF NOT EXISTS (SELECT FROM pg_policies WHERE schemaname = 'public' AND tablename = item.tablename AND policyname = 'application_service_access') THEN
          EXECUTE format('CREATE POLICY application_service_access ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', item.tablename);
        END IF;
      END LOOP;
    END $$;
    GRANT USAGE ON SCHEMA public, auth, private TO authenticated, service_role;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
    NOTIFY pgrst, 'reload schema';
  `);
  console.log("Application database is ready.");
} catch { await client.query("ROLLBACK"); throw new Error("The application database could not be prepared."); }
finally { await client.query("SELECT pg_advisory_unlock(7362910)"); client.release(); await pool.end(); }
