-- Metrics module (Akshara dashboard KPIs) - ADDITIVE ONLY.
-- Creates nine new tables and their enums. No existing table, column, index
-- or enum is altered, dropped or renamed, so this migration is safe to apply
-- to a database already carrying live programme data.

-- CreateTable
CREATE TABLE `program_budgets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `school_id` INTEGER NULL,
    `academic_year` VARCHAR(20) NOT NULL,
    `total_amount` DECIMAL(14,2) NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'INR',
    `approved_on` DATE NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NOT NULL,

    INDEX `idx_program_budgets_school_id`(`school_id`),
    INDEX `idx_program_budgets_academic_year`(`academic_year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `budget_allocations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `program_budget_id` INTEGER NOT NULL,
    `category` ENUM('HUMAN_RESOURCES', 'TRAVEL', 'TEACHING_MATERIALS', 'TECHNOLOGY', 'EVENTS', 'OTHERS') NOT NULL,
    `allocated_amount` DECIMAL(14,2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_budget_allocations_category`(`category`),
    UNIQUE INDEX `uq_budget_allocation_category`(`program_budget_id`, `category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `finance_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `school_id` INTEGER NULL,
    `academic_year` VARCHAR(20) NOT NULL,
    `entry_type` ENUM('BUDGET', 'EXPENSE') NOT NULL DEFAULT 'EXPENSE',
    `category` ENUM('HUMAN_RESOURCES', 'TRAVEL', 'TEACHING_MATERIALS', 'TECHNOLOGY', 'EVENTS', 'OTHERS') NOT NULL,
    `amount` DECIMAL(14,2) NOT NULL,
    `description` VARCHAR(255) NULL,
    `reference_no` VARCHAR(100) NULL,
    `vendor` VARCHAR(150) NULL,
    `spent_on` DATE NOT NULL,
    `remarks` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NOT NULL,

    INDEX `idx_finance_records_school_id`(`school_id`),
    INDEX `idx_finance_records_academic_year`(`academic_year`),
    INDEX `idx_finance_records_entry_type`(`entry_type`),
    INDEX `idx_finance_records_category`(`category`),
    INDEX `idx_finance_records_spent_on`(`spent_on`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teaching_modules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(10) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `sequence_number` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `teaching_modules_code_key`(`code`),
    INDEX `idx_teaching_modules_sequence_number`(`sequence_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `program_objectives` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `module_id` INTEGER NOT NULL,
    `school_id` INTEGER NULL,
    `class_section_id` INTEGER NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'UPCOMING') NOT NULL DEFAULT 'PLANNED',
    `academic_year` VARCHAR(20) NOT NULL,
    `target_month` INTEGER NULL,
    `completed_at` DATE NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NOT NULL,

    INDEX `idx_program_objectives_module_id`(`module_id`),
    INDEX `idx_program_objectives_school_id`(`school_id`),
    INDEX `idx_program_objectives_class_section_id`(`class_section_id`),
    INDEX `idx_program_objectives_status`(`status`),
    INDEX `idx_program_objectives_academic_year`(`academic_year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `objective_coverages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `class_section_id` INTEGER NOT NULL,
    `module_id` INTEGER NOT NULL,
    `school_id` INTEGER NULL,
    `status` ENUM('NOT_STARTED', 'IN_PROGRESS', 'COVERED') NOT NULL DEFAULT 'NOT_STARTED',
    `completion_percent` DECIMAL(5,2) NULL,
    `planned_month` INTEGER NULL,
    `delivered_on` DATE NULL,
    `academic_year` VARCHAR(20) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `updated_by` INTEGER NULL,

    INDEX `idx_objective_coverages_school_id`(`school_id`),
    INDEX `idx_objective_coverages_module_id`(`module_id`),
    INDEX `idx_objective_coverages_status`(`status`),
    UNIQUE INDEX `uq_objective_coverage_class_module`(`class_section_id`, `module_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_engagement_activities` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `student_id` INTEGER NOT NULL,
    `class_section_id` INTEGER NULL,
    `school_id` INTEGER NULL,
    `activity_type` ENUM('CLASS_PARTICIPATION', 'AI_IVRS', 'PRACTICE') NOT NULL,
    `activity_date` DATE NOT NULL,
    `duration_minutes` INTEGER NULL,
    `completed` BOOLEAN NOT NULL DEFAULT true,
    `remarks` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_engagement_activities_student_id`(`student_id`),
    INDEX `idx_engagement_activities_class_section_id`(`class_section_id`),
    INDEX `idx_engagement_activities_school_id`(`school_id`),
    INDEX `idx_engagement_activities_activity_date`(`activity_date`),
    INDEX `idx_engagement_activities_activity_type`(`activity_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `parent_engagements` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `school_id` INTEGER NULL,
    `class_section_id` INTEGER NULL,
    `student_id` INTEGER NULL,
    `guardian_name` VARCHAR(150) NULL,
    `channel` ENUM('SCHOOL_MEETING', 'PHONE_CALL', 'HOME_VISIT', 'MESSAGE', 'OTHER') NOT NULL DEFAULT 'SCHOOL_MEETING',
    `engaged_on` DATE NOT NULL,
    `remarks` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_parent_engagements_school_id`(`school_id`),
    INDEX `idx_parent_engagements_class_section_id`(`class_section_id`),
    INDEX `idx_parent_engagements_student_id`(`student_id`),
    INDEX `idx_parent_engagements_engaged_on`(`engaged_on`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `home_visits` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `school_id` INTEGER NULL,
    `class_section_id` INTEGER NULL,
    `student_id` INTEGER NULL,
    `visit_date` DATE NOT NULL,
    `status` ENUM('SCHEDULED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
    `students_reached` INTEGER NOT NULL DEFAULT 0,
    `parents_present` INTEGER NULL,
    `outcome` VARCHAR(255) NULL,
    `remarks` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NOT NULL,

    INDEX `idx_home_visits_school_id`(`school_id`),
    INDEX `idx_home_visits_class_section_id`(`class_section_id`),
    INDEX `idx_home_visits_student_id`(`student_id`),
    INDEX `idx_home_visits_visit_date`(`visit_date`),
    INDEX `idx_home_visits_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `program_budgets` ADD CONSTRAINT `program_budgets_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `program_budgets` ADD CONSTRAINT `program_budgets_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `budget_allocations` ADD CONSTRAINT `budget_allocations_program_budget_id_fkey` FOREIGN KEY (`program_budget_id`) REFERENCES `program_budgets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `finance_records` ADD CONSTRAINT `finance_records_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `finance_records` ADD CONSTRAINT `finance_records_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `program_objectives` ADD CONSTRAINT `program_objectives_module_id_fkey` FOREIGN KEY (`module_id`) REFERENCES `teaching_modules`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `program_objectives` ADD CONSTRAINT `program_objectives_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `program_objectives` ADD CONSTRAINT `program_objectives_class_section_id_fkey` FOREIGN KEY (`class_section_id`) REFERENCES `class_sections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `program_objectives` ADD CONSTRAINT `program_objectives_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `objective_coverages` ADD CONSTRAINT `objective_coverages_class_section_id_fkey` FOREIGN KEY (`class_section_id`) REFERENCES `class_sections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `objective_coverages` ADD CONSTRAINT `objective_coverages_module_id_fkey` FOREIGN KEY (`module_id`) REFERENCES `teaching_modules`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `objective_coverages` ADD CONSTRAINT `objective_coverages_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `objective_coverages` ADD CONSTRAINT `objective_coverages_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_engagement_activities` ADD CONSTRAINT `student_engagement_activities_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_engagement_activities` ADD CONSTRAINT `student_engagement_activities_class_section_id_fkey` FOREIGN KEY (`class_section_id`) REFERENCES `class_sections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_engagement_activities` ADD CONSTRAINT `student_engagement_activities_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `parent_engagements` ADD CONSTRAINT `parent_engagements_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `parent_engagements` ADD CONSTRAINT `parent_engagements_class_section_id_fkey` FOREIGN KEY (`class_section_id`) REFERENCES `class_sections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `parent_engagements` ADD CONSTRAINT `parent_engagements_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `home_visits` ADD CONSTRAINT `home_visits_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `home_visits` ADD CONSTRAINT `home_visits_class_section_id_fkey` FOREIGN KEY (`class_section_id`) REFERENCES `class_sections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `home_visits` ADD CONSTRAINT `home_visits_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `home_visits` ADD CONSTRAINT `home_visits_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;