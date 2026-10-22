-- Replace a literal inherited default; preserve all existing workspace identifiers.
ALTER TABLE teams ALTER COLUMN inbox_id SET DEFAULT replace(gen_random_uuid()::text, '-', '');
