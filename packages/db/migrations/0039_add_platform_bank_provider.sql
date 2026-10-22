ALTER TYPE bank_providers ADD VALUE IF NOT EXISTS 'pramaan';
ALTER TABLE transactions ALTER COLUMN amount TYPE numeric(24,6);
ALTER TABLE transactions ALTER COLUMN balance TYPE numeric(24,6);
ALTER TABLE bank_accounts ALTER COLUMN balance TYPE numeric(24,6);
ALTER TABLE bank_accounts ALTER COLUMN available_balance TYPE numeric(24,6);
ALTER TABLE transactions ALTER COLUMN base_amount TYPE numeric(24,6);
ALTER TABLE bank_accounts ALTER COLUMN base_balance TYPE numeric(24,6);
ALTER TABLE bank_accounts ALTER COLUMN credit_limit TYPE numeric(24,6);
