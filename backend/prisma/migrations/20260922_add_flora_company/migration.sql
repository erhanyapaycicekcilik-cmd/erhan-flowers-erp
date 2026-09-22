-- Florayapaycicek şirketi ekle
INSERT INTO companies (code, name, legal_name, domain, is_active, created_at, updated_at)
VALUES ('FLORA', 'Flora Yapay Çiçek', 'Flora Yapay Çiçek', 'florayapaycicek.com', true, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;
