-- Dashboard KPI snapshots (pre-aggregated dashboard read model) - ADDITIVE ONLY.
-- Creates one new table. No existing table, column, index or enum is altered,
-- dropped or renamed, so this migration is safe to apply to a database already
-- carrying live programme data.
--
-- The table holds one row per KPI per scope, in a narrow long format. A refresh
-- upserts every KPI in a single statement and then deletes rows that were not
-- rewritten, so the table stays "latest snapshot only" and carries no history.
--
-- NOT NULL sentinels are deliberate: `school_id = 0` is the NGO-wide total,
-- `class_section_id = 0` and `dim_key = ''` mean "not dimensioned". Nullable
-- dimensions are NOT used because MySQL treats NULLs as distinct inside a unique
-- index, which would let the upsert insert the same KPI twice and defeat the
-- composite primary key.
--
-- No foreign keys are declared: `school_id = 0` would violate any FK to
-- `schools`, and this table stores derived numbers rather than live references.

-- CreateTable
CREATE TABLE `dashboard_kpi_snapshots` (
    `academic_year` VARCHAR(20) NOT NULL,
    `metric_code` VARCHAR(40) NOT NULL,
    `school_id` INTEGER NOT NULL DEFAULT 0,
    `class_section_id` INTEGER NOT NULL DEFAULT 0,
    `dim_key` VARCHAR(64) NOT NULL DEFAULT '',
    `dim_label` VARCHAR(30) NULL,
    `value_num` DECIMAL(18,2) NOT NULL DEFAULT 0,
    `denominator_num` DECIMAL(18,2) NULL,
    `batch_slot` TINYINT UNSIGNED NOT NULL,
    `computed_at` DATETIME(0) NOT NULL,

    -- The clustered primary key already serves every dashboard read (equality on
    -- `academic_year`, `metric_code`, `school_id`), so no secondary index is
    -- declared here.
    PRIMARY KEY (`academic_year`, `metric_code`, `school_id`, `class_section_id`, `dim_key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CHECK constraints - expressed here as raw SQL because Prisma's schema language
-- cannot represent them, so `prisma migrate` would otherwise drop them.
--
-- `school_id >= 0` / `class_section_id >= 0` keep the sentinels meaningful: a
-- negative value could never be a real primary key, and the refresh never emits
-- one. `batch_slot IN (1, 2)` pins the field to the two documented daily
-- refresh slots (morning / evening).
ALTER TABLE `dashboard_kpi_snapshots`
    ADD CONSTRAINT `chk_kpi_school` CHECK (`school_id` >= 0),
    ADD CONSTRAINT `chk_kpi_class` CHECK (`class_section_id` >= 0),
    ADD CONSTRAINT `chk_kpi_slot` CHECK (`batch_slot` IN (1, 2));