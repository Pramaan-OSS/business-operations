ALTER TABLE accounting_sync_records ALTER COLUMN provider TYPE text USING provider::text;
