-- 8 basit site kategorisi ekle (varsa atla)
INSERT INTO categories (name, code_prefix, start_code, current_code, status, created_at, updated_at)
VALUES
  ('Yapay Ağaç',    'AG', 10000, 9999,  'ACTIVE', NOW(), NOW()),
  ('Bambu',         'BM', 20000, 19999, 'ACTIVE', NOW(), NOW()),
  ('Yapay Bitki',   'YB', 30000, 29999, 'ACTIVE', NOW(), NOW()),
  ('Yapay Sarmaşık','YS', 40000, 39999, 'ACTIVE', NOW(), NOW()),
  ('Dikey Bahçe',   'DB', 50000, 49999, 'ACTIVE', NOW(), NOW()),
  ('Demet Çiçek',   'DC', 60000, 59999, 'ACTIVE', NOW(), NOW()),
  ('Saksı & Vazo',  'SV', 70000, 69999, 'ACTIVE', NOW(), NOW()),
  ('Aranjman',      'AR', 80000, 79999, 'ACTIVE', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;
