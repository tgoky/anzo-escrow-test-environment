-- Migration for admin tables
CREATE TABLE IF NOT EXISTS "admins" (
  "id" serial PRIMARY KEY NOT NULL,
  "wallet_address" text NOT NULL,
  "role" text NOT NULL DEFAULT 'read_only',
  "permissions" jsonb,
  "name" text,
  "email" text,
  "notes" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "admins_wallet_address_unique" UNIQUE("wallet_address")
);

-- Insert the default super admin
INSERT INTO "admins" ("wallet_address", "role", "name", "is_active", "created_at", "updated_at")
VALUES ('6aDamejpzi67CEvfYbe2q5s6xYRhLBSMfpXaTVdYT3AJ', 'super_admin', 'Default Admin', true, now(), now());