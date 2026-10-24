INSERT INTO categories (name, code_prefix, start_code, current_code, created_at, updated_at)
VALUES
  ('Bonsai',              'BN', 1, 1, NOW(), NOW()),
  ('Zeytin Ağacı',        'ZA', 1, 1, NOW(), NOW()),
  ('Mini Saksılı Bitki',  'MS', 1, 1, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;
