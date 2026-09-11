CREATE TABLE "customer_questions" (
  "id" SERIAL PRIMARY KEY,
  "platform" TEXT NOT NULL,
  "external_id" TEXT NOT NULL,
  "product_name" TEXT,
  "product_sku" TEXT,
  "customer_name" TEXT,
  "question" TEXT NOT NULL,
  "answer" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "asked_at" TIMESTAMPTZ,
  "answered_at" TIMESTAMPTZ,
  "raw_payload" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("platform", "external_id")
);

CREATE INDEX "customer_questions_status_idx" ON "customer_questions"("status");
CREATE INDEX "customer_questions_platform_idx" ON "customer_questions"("platform");
CREATE INDEX "customer_questions_created_at_idx" ON "customer_questions"("created_at" DESC);

CREATE TABLE "push_subscriptions" (
  "id" SERIAL PRIMARY KEY,
  "endpoint" TEXT NOT NULL UNIQUE,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
