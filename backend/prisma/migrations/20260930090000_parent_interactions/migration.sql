-- Parent Interaction register - ADDITIVE ONLY.
-- Creates one new table. No existing table, column, index or enum is altered,
-- dropped or renamed, so this migration is safe to apply to a database already
-- carrying live programme data.
--
-- The table is intentionally denormalised: `student_name` and `class` are text
-- snapshots of the register sheet, and `student_id` holds the human-facing
-- student CODE rather than a foreign key, so an unmatched code can still be
-- recorded instead of rejecting the row.

-- CreateTable
CREATE TABLE `parent_interactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `student_id` VARCHAR(100) NOT NULL,
    `student_name` VARCHAR(200) NOT NULL,
    `class` VARCHAR(100) NOT NULL,
    `parent_name` VARCHAR(150) NOT NULL,
    `relation` VARCHAR(50) NULL,
    `date` DATE NOT NULL,
    `mode` VARCHAR(50) NULL,
    `visit_no` INTEGER NULL,
    `purpose` TEXT NULL,
    `parent_shared` TEXT NULL,
    `key_notes` TEXT NULL,
    `observation` TEXT NULL,
    `commitment` TEXT NULL,
    `next_date` DATE NULL,
    `next_interaction` VARCHAR(255) NULL,
    `objective` TEXT NULL,
    `status` VARCHAR(50) NULL DEFAULT 'PLANNED',
    `photo_url` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_parent_interactions_student_id`(`student_id`),
    INDEX `idx_parent_interactions_class`(`class`),
    INDEX `idx_parent_interactions_date`(`date`),
    INDEX `idx_parent_interactions_next_date`(`next_date`),
    INDEX `idx_parent_interactions_status`(`status`),
    INDEX `idx_parent_interactions_mode`(`mode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;