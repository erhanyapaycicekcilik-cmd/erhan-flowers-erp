-- Mevcut marketplace_order_items gorsellerini guncelle
-- Calistirma: docker exec erhan-flowers-postgres-prod psql -U erhanflowers -d erhan_flowers_panel -f /tmp/fix-order-item-images.sql

BEGIN;

-- 1. rawPayload lines[].images[0].url (Trendyol)
UPDATE marketplace_order_items moi
SET product_image_url = (
  SELECT img->>'url'
  FROM marketplace_orders mo,
       jsonb_array_elements(
         CASE WHEN jsonb_typeof(mo.raw_payload->'lines') = 'array'
              THEN mo.raw_payload->'lines'
              ELSE '[]'::jsonb END
       ) AS line_item,
       jsonb_array_elements(
         CASE WHEN jsonb_typeof(line_item->'images') = 'array'
              THEN line_item->'images'
              ELSE '[]'::jsonb END
       ) AS img
  WHERE mo.id = moi.order_id
    AND (
      (moi.barcode IS NOT NULL AND line_item->>'barcode' = moi.barcode) OR
      (moi.sku    IS NOT NULL AND line_item->>'merchantSku' = moi.sku)
    )
    AND img->>'url' IS NOT NULL AND img->>'url' <> ''
  LIMIT 1
)
WHERE moi.product_image_url IS NULL OR moi.product_image_url = '';

-- 2. rawPayload lines[].productImage / imageUrl / thumbnailUrl
UPDATE marketplace_order_items moi
SET product_image_url = (
  SELECT COALESCE(
    line_item->>'productImage',
    line_item->>'imageUrl',
    line_item->>'productImageUrl',
    line_item->>'thumbnailUrl'
  )
  FROM marketplace_orders mo,
       jsonb_array_elements(
         CASE WHEN jsonb_typeof(mo.raw_payload->'lines') = 'array'
              THEN mo.raw_payload->'lines'
         ELSE CASE WHEN jsonb_typeof(mo.raw_payload->'orderItems') = 'array'
              THEN mo.raw_payload->'orderItems'
              ELSE '[]'::jsonb END
         END
       ) AS line_item
  WHERE mo.id = moi.order_id
    AND (
      (moi.barcode IS NOT NULL AND (line_item->>'barcode' = moi.barcode OR line_item->>'productCode' = moi.barcode)) OR
      (moi.sku    IS NOT NULL AND (line_item->>'merchantSku' = moi.sku OR line_item->>'stockCode' = moi.sku OR line_item->>'productSellerCode' = moi.sku))
    )
    AND COALESCE(line_item->>'productImage', line_item->>'imageUrl', line_item->>'productImageUrl', line_item->>'thumbnailUrl') IS NOT NULL
    AND COALESCE(line_item->>'productImage', line_item->>'imageUrl', line_item->>'productImageUrl', line_item->>'thumbnailUrl') <> ''
  LIMIT 1
)
WHERE moi.product_image_url IS NULL OR moi.product_image_url = '';

-- 3. stock_cards.image_path (barcode veya sku eslesmesi)
UPDATE marketplace_order_items moi
SET product_image_url = (
  SELECT sc.image_path
  FROM stock_cards sc
  WHERE (
    (moi.barcode IS NOT NULL AND sc.barcode = moi.barcode) OR
    (moi.sku     IS NOT NULL AND sc.sku = moi.sku) OR
    (moi.sku     IS NOT NULL AND sc.sku = REGEXP_REPLACE(moi.sku, '^FL-', ''))
  )
  AND sc.image_path IS NOT NULL AND sc.image_path <> ''
  LIMIT 1
)
WHERE moi.product_image_url IS NULL OR moi.product_image_url = '';

-- 4. stock_card_images (en yeni ana gorsel)
UPDATE marketplace_order_items moi
SET product_image_url = (
  SELECT sci.file_path
  FROM stock_cards sc
  JOIN stock_card_images sci ON sci.stock_card_id = sc.id
  WHERE (
    (moi.barcode IS NOT NULL AND sc.barcode = moi.barcode) OR
    (moi.sku     IS NOT NULL AND sc.sku = moi.sku) OR
    (moi.sku     IS NOT NULL AND sc.sku = REGEXP_REPLACE(moi.sku, '^FL-', ''))
  )
  AND sci.file_path IS NOT NULL AND sci.file_path <> ''
  ORDER BY sci.is_main DESC, sci.id ASC
  LIMIT 1
)
WHERE moi.product_image_url IS NULL OR moi.product_image_url = '';

-- 5. products.image_url (barcode veya model_code eslesmesi)
UPDATE marketplace_order_items moi
SET product_image_url = (
  SELECT p.image_url
  FROM products p
  WHERE (
    (moi.barcode IS NOT NULL AND p.barcode = moi.barcode) OR
    (moi.sku     IS NOT NULL AND p.model_code = moi.sku) OR
    (moi.sku     IS NOT NULL AND p.model_code = REGEXP_REPLACE(moi.sku, '^FL-', ''))
  )
  AND p.image_url IS NOT NULL AND p.image_url <> ''
  LIMIT 1
)
WHERE moi.product_image_url IS NULL OR moi.product_image_url = '';

-- 6. products.image_urls JSON array (ilk gorsel)
UPDATE marketplace_order_items moi
SET product_image_url = (
  SELECT url
  FROM products p,
       jsonb_array_elements_text(
         CASE WHEN jsonb_typeof(p.image_urls) = 'array'
              THEN p.image_urls
              ELSE '[]'::jsonb END
       ) AS url
  WHERE (
    (moi.barcode IS NOT NULL AND p.barcode = moi.barcode) OR
    (moi.sku     IS NOT NULL AND p.model_code = moi.sku) OR
    (moi.sku     IS NOT NULL AND p.model_code = REGEXP_REPLACE(moi.sku, '^FL-', ''))
  )
  AND url IS NOT NULL AND url <> ''
  LIMIT 1
)
WHERE moi.product_image_url IS NULL OR moi.product_image_url = '';

-- Sonuc ozeti
SELECT
  COUNT(*) FILTER (WHERE product_image_url IS NOT NULL AND product_image_url <> '') AS "Gorsel var",
  COUNT(*) FILTER (WHERE product_image_url IS NULL OR product_image_url = '')        AS "Gorsel yok",
  COUNT(*) AS "Toplam"
FROM marketplace_order_items;

COMMIT;
