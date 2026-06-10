ALTER TABLE "users" DROP CONSTRAINT "users_corsairTenantId_unique";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "corsairTenantId";
