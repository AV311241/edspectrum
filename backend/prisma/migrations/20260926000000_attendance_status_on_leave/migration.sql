-- AlterTable
--
-- The Prisma schema declared ON_LEAVE on the AttendanceStatus enum, but the
-- initial migration created the column with only five values. Any insert using
-- ON_LEAVE therefore failed with MySQL error 1265 ("Data truncated for column
-- 'status'"). This migration brings the physical column in line with
-- schema.prisma.
--
-- Re-declaring an ENUM with the existing values first keeps this statement
-- safe/idempotent: MySQL preserves the stored ordinal for values that appear
-- in both the old and new definition.
ALTER TABLE `attendance`
    MODIFY COLUMN `status` ENUM('P', 'A', 'HALF_DAY', 'ACTIVITY', 'CANCELLED', 'ON_LEAVE') NOT NULL;
