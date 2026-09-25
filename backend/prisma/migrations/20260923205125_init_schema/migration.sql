-- CreateTable
CREATE TABLE `roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `roles_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `first_name` VARCHAR(100) NOT NULL,
    `last_name` VARCHAR(100) NOT NULL,
    `role_id` INTEGER NOT NULL,
    `school_id` INTEGER NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `password_reset_required` BOOLEAN NOT NULL DEFAULT false,
    `last_login_at` DATETIME(0) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `idx_users_email`(`email`),
    INDEX `idx_users_school_id`(`school_id`),
    INDEX `idx_users_role_id`(`role_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `schools` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `address` VARCHAR(255) NULL,
    `city` VARCHAR(100) NULL,
    `state` VARCHAR(100) NULL,
    `country` VARCHAR(100) NULL,
    `contact_email` VARCHAR(255) NULL,
    `contact_phone` VARCHAR(20) NULL,
    `ngo_id` INTEGER NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NOT NULL,

    UNIQUE INDEX `schools_code_key`(`code`),
    INDEX `idx_schools_code`(`code`),
    INDEX `idx_schools_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `grades` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `school_id` INTEGER NOT NULL,
    `number` INTEGER NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_grades_school_id`(`school_id`),
    UNIQUE INDEX `uq_grade_school_number`(`school_id`, `number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `class_sections` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `school_id` INTEGER NOT NULL,
    `grade_id` INTEGER NULL,
    `class_name` VARCHAR(50) NOT NULL,
    `section` VARCHAR(10) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `academic_year` VARCHAR(20) NULL,
    `status` ENUM('ACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    `assessment_cycle` VARCHAR(50) NULL DEFAULT 'DEFAULT',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NOT NULL,

    INDEX `idx_class_sections_school_id`(`school_id`),
    INDEX `idx_class_sections_grade_id`(`grade_id`),
    UNIQUE INDEX `uq_class_section`(`school_id`, `grade_id`, `section`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `students` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `school_id` INTEGER NOT NULL,
    `class_id` INTEGER NULL,
    `student_id` VARCHAR(100) NOT NULL,
    `first_name` VARCHAR(100) NOT NULL,
    `last_name` VARCHAR(100) NOT NULL,
    `date_of_birth` DATE NULL,
    `gender` ENUM('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY') NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'TRANSFERRED') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NOT NULL,

    INDEX `idx_students_school_id`(`school_id`),
    INDEX `idx_students_student_id`(`school_id`, `student_id`),
    UNIQUE INDEX `uq_school_student_id`(`school_id`, `student_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_class_enrollments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `student_id` INTEGER NOT NULL,
    `class_section_id` INTEGER NOT NULL,
    `school_id` INTEGER NULL,
    `withdrawn_date` DATETIME(3) NULL,
    `status` ENUM('PRESENT', 'ABSENT', 'TRANSFERRED', 'EXCLUDED') NOT NULL DEFAULT 'PRESENT',
    `is_current` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_enrollments_student_id`(`student_id`),
    INDEX `idx_enrollments_class_section_id`(`class_section_id`),
    INDEX `idx_enrollments_is_current`(`is_current`),
    INDEX `idx_enrollments_status`(`status`),
    UNIQUE INDEX `uq_student_enrollment`(`student_id`, `class_section_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assessment_domains` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(10) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `order_number` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `assessment_domains_code_key`(`code`),
    UNIQUE INDEX `assessment_domains_order_number_key`(`order_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assessment_versions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `version_number` VARCHAR(20) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `is_current` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by` INTEGER NOT NULL,

    UNIQUE INDEX `assessment_versions_version_number_key`(`version_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assessment_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `assessment_version_id` INTEGER NOT NULL,
    `domain_id` INTEGER NOT NULL,
    `item_number` INTEGER NOT NULL,
    `description` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_assessment_items_version_id`(`assessment_version_id`),
    INDEX `idx_assessment_items_domain_id`(`domain_id`),
    UNIQUE INDEX `uq_version_domain_item`(`assessment_version_id`, `domain_id`, `item_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `stage_number` INTEGER NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `stages_stage_number_key`(`stage_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assessment_domain_stages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `domain_id` INTEGER NOT NULL,
    `stage_id` INTEGER NOT NULL,
    `performance_description` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `uq_domain_stage`(`domain_id`, `stage_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `support_codes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(10) NOT NULL,
    `meaning` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `support_codes_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `oral_flags` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `flag_code` VARCHAR(10) NOT NULL,
    `meaning` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `oral_flags_flag_code_key`(`flag_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `framework_families` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(30) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,

    UNIQUE INDEX `framework_families_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `domain_framework_suggestions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `domain_id` INTEGER NOT NULL,
    `framework_family_id` INTEGER NOT NULL,

    UNIQUE INDEX `uq_domain_framework`(`domain_id`, `framework_family_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `baseline_assessments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `student_id` INTEGER NOT NULL,
    `student_class_enrollment_id` INTEGER NULL,
    `school_id` INTEGER NOT NULL,
    `class_section_id` INTEGER NOT NULL,
    `assessment_version_id` INTEGER NOT NULL,
    `assessment_date` DATE NOT NULL,
    `assessor_id` INTEGER NOT NULL,
    `status` ENUM('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'REVIEWED', 'REVIEWED_OVERRIDE', 'LOCKED', 'PRESENT', 'ABSENT', 'PARTIAL') NOT NULL DEFAULT 'DRAFT',
    `submission_date` DATETIME(0) NULL,
    `review_date` DATETIME(0) NULL,
    `reviewed_by` INTEGER NULL,
    `locked_at` DATETIME(0) NULL,
    `qc_notes` TEXT NULL,
    `key_support_flag` VARCHAR(100) NULL,
    `oral_flag` VARCHAR(10) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NOT NULL,

    INDEX `idx_assessments_student_id`(`student_id`),
    INDEX `idx_assessments_class_section_id`(`class_section_id`),
    INDEX `idx_assessments_status`(`status`),
    INDEX `idx_assessments_assessor_id`(`assessor_id`),
    UNIQUE INDEX `uq_student_class_version`(`student_id`, `class_section_id`, `assessment_version_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `domain_results` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `assessment_id` INTEGER NOT NULL,
    `domain_id` INTEGER NOT NULL,
    `item_1` TINYINT NULL,
    `item_2` TINYINT NULL,
    `item_3` TINYINT NULL,
    `item_4` TINYINT NULL,
    `item_5` TINYINT NULL,
    `total_score` INTEGER NULL,
    `suggested_stage` VARCHAR(15) NULL,
    `review_needed` BOOLEAN NOT NULL DEFAULT false,
    `final_stage` VARCHAR(15) NULL,
    `final_stage_override` BOOLEAN NOT NULL DEFAULT false,
    `override_reason` TEXT NULL,
    `reviewed_by` INTEGER NULL,
    `reviewed_at` DATETIME(0) NULL,
    `support_code_id` INTEGER NULL,
    `oral_flag_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_domain_results_assessment_id`(`assessment_id`),
    INDEX `idx_domain_results_domain_id`(`domain_id`),
    INDEX `idx_domain_results_suggested_stage`(`suggested_stage`),
    INDEX `idx_domain_results_final_stage`(`final_stage`),
    UNIQUE INDEX `uq_assessment_domain`(`assessment_id`, `domain_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assessment_item_responses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `domain_result_id` INTEGER NOT NULL,
    `assessment_item_id` INTEGER NOT NULL,
    `rating` TINYINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_item_responses_domain_result_id`(`domain_result_id`),
    UNIQUE INDEX `uq_domain_result_item`(`domain_result_id`, `assessment_item_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `class_summaries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `school_id` INTEGER NOT NULL,
    `class_section_id` INTEGER NOT NULL,
    `assessment_cycle` VARCHAR(50) NULL DEFAULT 'DEFAULT',
    `total_assessed` INTEGER NOT NULL DEFAULT 0,
    `generated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `generated_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_class_summaries_school_id`(`school_id`),
    INDEX `idx_class_summaries_class_section_id`(`class_section_id`),
    UNIQUE INDEX `uq_class_summary_cycle`(`school_id`, `class_section_id`, `assessment_cycle`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `class_domain_summaries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `class_summary_id` INTEGER NOT NULL,
    `domain_id` INTEGER NOT NULL,
    `s1_count` INTEGER NOT NULL DEFAULT 0,
    `s2_count` INTEGER NOT NULL DEFAULT 0,
    `s3_count` INTEGER NOT NULL DEFAULT 0,
    `s4_count` INTEGER NOT NULL DEFAULT 0,
    `s5_count` INTEGER NOT NULL DEFAULT 0,
    `total_with_stage` INTEGER NOT NULL DEFAULT 0,
    `dominant_stage` INTEGER NULL,
    `percent_below_dominant` DECIMAL(5, 2) NULL,
    `review_flag` VARCHAR(50) NULL,
    `support_band` TEXT NULL,
    `anchor_band` TEXT NULL,
    `stretch_band` TEXT NULL,
    `planning_implication` TEXT NULL,
    `framework_family` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `updated_by` INTEGER NULL,

    INDEX `idx_class_domain_summaries_class_summary_id`(`class_summary_id`),
    UNIQUE INDEX `uq_summary_domain`(`class_summary_id`, `domain_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `language_functions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `language_functions_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `themes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `themes_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `class_profiles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `school_id` INTEGER NOT NULL,
    `class_section_id` INTEGER NOT NULL,
    `class_summary_id` INTEGER NULL,
    `students_assessed` INTEGER NULL,
    `assessment_date` DATE NULL,
    `strong_domains` TEXT NULL,
    `weak_domains` TEXT NULL,
    `cross_domain_pattern` TEXT NULL,
    `communication_bottleneck` TEXT NULL,
    `provisional_language_direction` VARCHAR(255) NULL,
    `central_language_function_id` INTEGER NULL,
    `compatible_theme_id` INTEGER NULL,
    `immediate_planning_implication` TEXT NULL,
    `classroom_profile_paragraph` TEXT NULL,
    `ready_for_table39` ENUM('NO', 'NOT_YET', 'YES') NOT NULL DEFAULT 'NO',
    `table39_notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NOT NULL,
    `updated_by` INTEGER NULL,

    INDEX `idx_class_profiles_school_id`(`school_id`),
    INDEX `idx_class_profiles_class_section_id`(`class_section_id`),
    INDEX `idx_class_profiles_ready_for_table39`(`ready_for_table39`),
    UNIQUE INDEX `uq_school_class_profile`(`school_id`, `class_section_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `session_date` DATE NOT NULL,
    `class_id` INTEGER NOT NULL,
    `student_id` INTEGER NULL,
    `status` ENUM('P', 'A', 'HALF_DAY', 'ACTIVITY', 'CANCELLED') NOT NULL,
    `remarks` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_att_date_class`(`session_date`, `class_id`),
    INDEX `idx_att_status`(`status`),
    UNIQUE INDEX `uq_session_class_student`(`session_date`, `class_id`, `student_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `action` ENUM('CREATE', 'UPDATE', 'DELETE', 'OVERRIDE', 'SUBMIT', 'REVIEW', 'LOCK', 'UNLOCK') NOT NULL,
    `entity_name` VARCHAR(100) NOT NULL,
    `entity_id` INTEGER NULL,
    `details` TEXT NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_audit_logs_user_id`(`user_id`),
    INDEX `idx_audit_logs_action`(`action`),
    INDEX `idx_audit_logs_entity`(`entity_name`, `entity_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `schools` ADD CONSTRAINT `schools_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grades` ADD CONSTRAINT `grades_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `class_sections` ADD CONSTRAINT `class_sections_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `class_sections` ADD CONSTRAINT `class_sections_grade_id_fkey` FOREIGN KEY (`grade_id`) REFERENCES `grades`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `class_sections` ADD CONSTRAINT `class_sections_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `students` ADD CONSTRAINT `students_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `students` ADD CONSTRAINT `students_class_id_fkey` FOREIGN KEY (`class_id`) REFERENCES `class_sections`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `students` ADD CONSTRAINT `students_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_class_enrollments` ADD CONSTRAINT `student_class_enrollments_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_class_enrollments` ADD CONSTRAINT `student_class_enrollments_class_section_id_fkey` FOREIGN KEY (`class_section_id`) REFERENCES `class_sections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_class_enrollments` ADD CONSTRAINT `student_class_enrollments_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assessment_versions` ADD CONSTRAINT `assessment_versions_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assessment_items` ADD CONSTRAINT `assessment_items_assessment_version_id_fkey` FOREIGN KEY (`assessment_version_id`) REFERENCES `assessment_versions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assessment_items` ADD CONSTRAINT `assessment_items_domain_id_fkey` FOREIGN KEY (`domain_id`) REFERENCES `assessment_domains`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assessment_domain_stages` ADD CONSTRAINT `assessment_domain_stages_domain_id_fkey` FOREIGN KEY (`domain_id`) REFERENCES `assessment_domains`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assessment_domain_stages` ADD CONSTRAINT `assessment_domain_stages_stage_id_fkey` FOREIGN KEY (`stage_id`) REFERENCES `stages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `domain_framework_suggestions` ADD CONSTRAINT `domain_framework_suggestions_domain_id_fkey` FOREIGN KEY (`domain_id`) REFERENCES `assessment_domains`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `domain_framework_suggestions` ADD CONSTRAINT `domain_framework_suggestions_framework_family_id_fkey` FOREIGN KEY (`framework_family_id`) REFERENCES `framework_families`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `baseline_assessments` ADD CONSTRAINT `baseline_assessments_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `baseline_assessments` ADD CONSTRAINT `baseline_assessments_student_class_enrollment_id_fkey` FOREIGN KEY (`student_class_enrollment_id`) REFERENCES `student_class_enrollments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `baseline_assessments` ADD CONSTRAINT `baseline_assessments_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `baseline_assessments` ADD CONSTRAINT `baseline_assessments_class_section_id_fkey` FOREIGN KEY (`class_section_id`) REFERENCES `class_sections`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `baseline_assessments` ADD CONSTRAINT `baseline_assessments_assessment_version_id_fkey` FOREIGN KEY (`assessment_version_id`) REFERENCES `assessment_versions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `baseline_assessments` ADD CONSTRAINT `baseline_assessments_assessor_id_fkey` FOREIGN KEY (`assessor_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `baseline_assessments` ADD CONSTRAINT `baseline_assessments_reviewed_by_fkey` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `baseline_assessments` ADD CONSTRAINT `baseline_assessments_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `domain_results` ADD CONSTRAINT `domain_results_assessment_id_fkey` FOREIGN KEY (`assessment_id`) REFERENCES `baseline_assessments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `domain_results` ADD CONSTRAINT `domain_results_domain_id_fkey` FOREIGN KEY (`domain_id`) REFERENCES `assessment_domains`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `domain_results` ADD CONSTRAINT `domain_results_reviewed_by_fkey` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `domain_results` ADD CONSTRAINT `domain_results_support_code_id_fkey` FOREIGN KEY (`support_code_id`) REFERENCES `support_codes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `domain_results` ADD CONSTRAINT `domain_results_oral_flag_id_fkey` FOREIGN KEY (`oral_flag_id`) REFERENCES `oral_flags`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assessment_item_responses` ADD CONSTRAINT `assessment_item_responses_domain_result_id_fkey` FOREIGN KEY (`domain_result_id`) REFERENCES `domain_results`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assessment_item_responses` ADD CONSTRAINT `assessment_item_responses_assessment_item_id_fkey` FOREIGN KEY (`assessment_item_id`) REFERENCES `assessment_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `class_summaries` ADD CONSTRAINT `class_summaries_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `class_summaries` ADD CONSTRAINT `class_summaries_class_section_id_fkey` FOREIGN KEY (`class_section_id`) REFERENCES `class_sections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `class_summaries` ADD CONSTRAINT `class_summaries_generated_by_fkey` FOREIGN KEY (`generated_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `class_domain_summaries` ADD CONSTRAINT `class_domain_summaries_class_summary_id_fkey` FOREIGN KEY (`class_summary_id`) REFERENCES `class_summaries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `class_domain_summaries` ADD CONSTRAINT `class_domain_summaries_domain_id_fkey` FOREIGN KEY (`domain_id`) REFERENCES `assessment_domains`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `class_domain_summaries` ADD CONSTRAINT `class_domain_summaries_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `class_profiles` ADD CONSTRAINT `class_profiles_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `class_profiles` ADD CONSTRAINT `class_profiles_class_section_id_fkey` FOREIGN KEY (`class_section_id`) REFERENCES `class_sections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `class_profiles` ADD CONSTRAINT `class_profiles_class_summary_id_fkey` FOREIGN KEY (`class_summary_id`) REFERENCES `class_summaries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `class_profiles` ADD CONSTRAINT `class_profiles_central_language_function_id_fkey` FOREIGN KEY (`central_language_function_id`) REFERENCES `language_functions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `class_profiles` ADD CONSTRAINT `class_profiles_compatible_theme_id_fkey` FOREIGN KEY (`compatible_theme_id`) REFERENCES `themes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `class_profiles` ADD CONSTRAINT `class_profiles_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `class_profiles` ADD CONSTRAINT `class_profiles_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance` ADD CONSTRAINT `attendance_class_id_fkey` FOREIGN KEY (`class_id`) REFERENCES `class_sections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance` ADD CONSTRAINT `attendance_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
