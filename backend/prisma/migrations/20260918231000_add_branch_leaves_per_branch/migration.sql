ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "branch_count" INTEGER;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "leaves_per_branch" INTEGER;
