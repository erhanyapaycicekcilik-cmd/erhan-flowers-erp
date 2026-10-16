CREATE TABLE IF NOT EXISTS "site_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("key")
);

INSERT INTO "site_settings" ("key", "value") VALUES
  ('whatsapp', '905321234567'),
  ('phone', '05321234567'),
  ('address', 'Antalya, Türkiye'),
  ('working_hours', 'Pazartesi-Cumartesi 09:00-18:00'),
  ('banner_enabled', 'false'),
  ('banner_text', ''),
  ('banner_color', 'blue'),
  ('payment_method', 'none'),
  ('site_name', 'Erhan Flowers'),
  ('instagram', ''),
  ('facebook', '')
ON CONFLICT ("key") DO NOTHING;
