ALTER TABLE "transactions" ALTER COLUMN "amount" SET DATA TYPE numeric(20, 8);--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "usd_amount" SET DATA TYPE numeric(20, 2);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "currency" text DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "payment_method" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "country_code" text;