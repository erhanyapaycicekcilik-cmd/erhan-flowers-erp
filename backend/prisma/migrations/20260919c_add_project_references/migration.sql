CREATE TABLE "project_references" (
  "id"          SERIAL PRIMARY KEY,
  "title"       TEXT NOT NULL,
  "description" TEXT,
  "location"    TEXT,
  "image_urls"  TEXT[] NOT NULL DEFAULT '{}',
  "sort_order"  INTEGER NOT NULL DEFAULT 0,
  "status"      "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
