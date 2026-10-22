-- Preserve legacy records while allowing neutral channel keys for new links.
ALTER TYPE platform_provider ADD VALUE IF NOT EXISTS 'sms';
ALTER TYPE platform_provider ADD VALUE IF NOT EXISTS 'imessage';
