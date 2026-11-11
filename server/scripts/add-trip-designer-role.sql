-- Adds the TRIP_DESIGNER value to the role enum (release 6dd8706).
-- Additive only: every existing row keeps its role. Safe to run more than once.
-- Run with:
--   npx prisma db execute --schema prisma/schema.prisma --file scripts/add-trip-designer-role.sql
ALTER TABLE `RolePermission` MODIFY `role` ENUM('ADMIN','MANAGER','ACCOUNTANT','AGENT','TRIP_DESIGNER','VIEWER') NOT NULL;
ALTER TABLE `User` MODIFY `role` ENUM('ADMIN','MANAGER','ACCOUNTANT','AGENT','TRIP_DESIGNER','VIEWER') NOT NULL DEFAULT 'AGENT';
