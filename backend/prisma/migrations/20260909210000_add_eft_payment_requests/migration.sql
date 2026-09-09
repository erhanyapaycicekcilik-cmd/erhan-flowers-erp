-- EFT ödeme talepleri - müşteri dekont yükleyerek ödeme yapabilir, %3 indirim uygulanır
CREATE TABLE eft_payment_requests (
  id                  SERIAL PRIMARY KEY,
  sale_id             INTEGER NOT NULL REFERENCES retail_sales(id) ON DELETE CASCADE,
  token               VARCHAR(64) NOT NULL UNIQUE,
  status              VARCHAR(32) NOT NULL DEFAULT 'PENDING',  -- PENDING / CONFIRMED / REJECTED / EXPIRED
  original_amount     DECIMAL(14,2) NOT NULL,
  discount_rate       DECIMAL(5,4) NOT NULL DEFAULT 0.03,
  discount_amount     DECIMAL(14,2) NOT NULL,
  final_amount        DECIMAL(14,2) NOT NULL,
  bank_name           VARCHAR(100),
  iban                VARCHAR(50),
  account_holder      VARCHAR(200),
  dekont_path         VARCHAR(500),
  dekont_uploaded_at  TIMESTAMP,
  customer_note       TEXT,
  staff_note          TEXT,
  confirmed_by_id     INTEGER REFERENCES users(id),
  confirmed_at        TIMESTAMP,
  expires_at          TIMESTAMP NOT NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX eft_payment_requests_sale_id_idx ON eft_payment_requests(sale_id);
CREATE INDEX eft_payment_requests_status_idx ON eft_payment_requests(status);
CREATE INDEX eft_payment_requests_token_idx ON eft_payment_requests(token);
