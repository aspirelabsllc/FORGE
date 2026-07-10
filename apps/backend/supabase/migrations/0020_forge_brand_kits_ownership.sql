-- Adds the brand_kits + ownership_records tables and the projects.brand_kit_id
-- column that exist in the Drizzle schema (packages/db/src/schema) but were never
-- generated as a migration, so the Cloud DB was missing them — project.list was
-- failing with "column projects.brand_kit_id does not exist" (Postgres 42703).
--
-- Applied to Cloud manually on 2026-07-11 (S0lm0n). Written idempotently so a
-- later `drizzle-kit migrate` re-runs it harmlessly. NOTE: the drizzle snapshot
-- (meta/) is NOT updated here — the maintainer should run `db:gen` to reconcile
-- the snapshot so a future generate doesn't re-emit these objects.
CREATE TABLE IF NOT EXISTS "brand_kits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"display_name" varchar,
	"color_tokens" jsonb DEFAULT '{}'::jsonb,
	"typography_tokens" jsonb DEFAULT '{}'::jsonb,
	"spacing_tokens" jsonb,
	"shadow_tokens" jsonb,
	"assets" jsonb DEFAULT '{"logos":[],"images":[]}'::jsonb,
	"strategy" jsonb DEFAULT '{"objections":[]}'::jsonb,
	"source_docs" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "brand_kits" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "brand_kits" ADD CONSTRAINT "brand_kits_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "editor" AS ENUM ('forge', 'user'); EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ownership_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oid" varchar NOT NULL,
	"branch_id" uuid NOT NULL,
	"last_editor" "editor" NOT NULL,
	"last_edited_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_commit_oid" varchar,
	"locked" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ownership_records" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ownership_records_oid_branch_ux" ON "ownership_records" ("oid","branch_id");
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "ownership_records" ADD CONSTRAINT "ownership_records_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "brand_kit_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "projects" ADD CONSTRAINT "projects_brand_kit_id_brand_kits_id_fk" FOREIGN KEY ("brand_kit_id") REFERENCES "brand_kits"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
-- Further drift caught by a full schema-vs-DB diff (only these two columns remained):
DO $$ BEGIN CREATE TYPE "agent_type" AS ENUM ('root', 'user'); EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "agent_type" "agent_type" DEFAULT 'root';
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "usage" jsonb;
