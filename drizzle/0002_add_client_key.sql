ALTER TABLE "mcq_generation_requests"
ADD COLUMN IF NOT EXISTS "client_key" varchar(128);
--> statement-breakpoint
UPDATE "mcq_generation_requests"
SET "client_key" = 'legacy-' || "id"
WHERE "client_key" IS NULL;
--> statement-breakpoint
ALTER TABLE "mcq_generation_requests"
ALTER COLUMN "client_key" SET NOT NULL;
