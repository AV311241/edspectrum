# LUMINO1 COMPLETE APPLICATION SPECIFICATION - PART 2

**Document Version:** 1.0  
**Part:** 2 of 2  
**Content:** Database Design through Implementation Roadmap  

---

## 9. DATABASE DESIGN

### 9.1 PostgreSQL Schema

#### 9.1.1 Users & Authentication

```sql
-- Roles/Permissions (enum-like table for extensibility)
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert standard roles
INSERT INTO roles (code, name) VALUES
    ('SUPER_ADMIN', 'Super Administrator'),
    ('SCHOOL_ADMIN', 'School Administrator'),
    ('ASSESSOR', 'Teacher/Assessor'),
    ('HOD', 'Head of Department'),
    ('COORDINATOR', 'Academic Coordinator'),
    ('VIEWER', 'Read-Only Viewer');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role_id UUID NOT NULL REFERENCES roles(id),
    school_id UUID REFERENCES schools(id),
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    password_reset_required BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    CONSTRAINT school_id_required_non_admin 
        CHECK (role_id IN (SELECT id FROM roles WHERE code IN ('SUPER_ADMIN'))
            OR school_id IS NOT NULL)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_school_id ON users(school_id);
CREATE INDEX idx_users_role_id ON users(role_id);
```

---

#### 9.1.2 School & Organization

```sql
-- Schools table
CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    address VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    ngo_id UUID, -- Future: NGO entity
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL REFERENCES users(id)
);

CREATE INDEX idx_schools_code ON schools(code);
CREATE INDEX idx_schools_status ON schools(status);
```

---

#### 9.1.3 Grades & Classes

```sql
-- Grades table
CREATE TABLE grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    number INT NOT NULL CHECK (number BETWEEN 1 AND 12),
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, number)
);

CREATE INDEX idx_grades_school_id ON grades(school_id);

-- Class/Sections table
CREATE TABLE class_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    grade_id UUID NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
    section VARCHAR(10) NOT NULL,
    name VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
    assessment_cycle VARCHAR(50) DEFAULT 'DEFAULT',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL REFERENCES users(id),
    UNIQUE(school_id, grade_id, section)
);

CREATE INDEX idx_class_sections_school_id ON class_sections(school_id);
CREATE INDEX idx_class_sections_grade_id ON class_sections(grade_id);
```

---

#### 9.1.4 Students & Enrollment

```sql
-- Students table
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_id VARCHAR(100) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(20) CHECK (gender IN ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY')),
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'TRANSFERRED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL REFERENCES users(id),
    UNIQUE(school_id, student_id)
);

CREATE INDEX idx_students_school_id ON students(school_id);
CREATE INDEX idx_students_student_id ON students(school_id, student_id);

-- Student Class Enrollments (history)
CREATE TABLE student_class_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_section_id UUID NOT NULL REFERENCES class_sections(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id),
    enrolled_date DATE NOT NULL DEFAULT CURRENT_DATE,
    withdrawn_date DATE,
    status VARCHAR(20) DEFAULT 'PRESENT' CHECK (status IN ('PRESENT', 'ABSENT', 'TRANSFERRED', 'EXCLUDED')),
    is_current BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, class_section_id, enrolled_date),
    CONSTRAINT withdrawn_after_enrolled CHECK (withdrawn_date IS NULL OR withdrawn_date >= enrolled_date)
);

CREATE INDEX idx_enrollments_student_id ON student_class_enrollments(student_id);
CREATE INDEX idx_enrollments_class_section_id ON student_class_enrollments(class_section_id);
CREATE INDEX idx_enrollments_is_current ON student_class_enrollments(is_current);
CREATE INDEX idx_enrollments_status ON student_class_enrollments(status);
```

---

#### 9.1.5 Assessment Configuration

```sql
-- Assessment Domains
CREATE TABLE assessment_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    order_number INT UNIQUE CHECK (order_number BETWEEN 1 AND 7),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(order_number)
);

-- Insert domains
INSERT INTO assessment_domains (code, name, order_number) VALUES
    ('V', 'Vocabulary', 1),
    ('G', 'Grammar/Pattern', 2),
    ('P', 'Phrase/Sentence', 3),
    ('L', 'Listening', 4),
    ('S', 'Speaking', 5),
    ('R', 'Reading', 6),
    ('W', 'Writing', 7);

-- Assessment Versions
CREATE TABLE assessment_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_number VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_current BOOLEAN DEFAULT FALSE UNIQUE WHERE is_current IS TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL REFERENCES users(id)
);

-- Assessment Items (5 per domain = 35 total)
CREATE TABLE assessment_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
    domain_id UUID NOT NULL REFERENCES assessment_domains(id),
    item_number INT NOT NULL CHECK (item_number BETWEEN 1 AND 5),
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assessment_version_id, domain_id, item_number)
);

CREATE INDEX idx_assessment_items_version_id ON assessment_items(assessment_version_id);
CREATE INDEX idx_assessment_items_domain_id ON assessment_items(domain_id);

-- Achievement Stages
CREATE TABLE stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_number INT UNIQUE NOT NULL CHECK (stage_number BETWEEN 1 AND 5),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO stages (stage_number, name, description) VALUES
    (1, 'Emerging/Basic Recognition', 'Recognition of basic elements'),
    (2, 'Developing Controlled Use', 'Controlled use in familiar contexts'),
    (3, 'Independent Short/Connected Use', 'Independent use in connected contexts'),
    (4, 'Explanation, Connection, or Inference', 'Explains, connects, or infers'),
    (5, 'Flexible, Extended, Purposeful Use', 'Flexible and extended use');

-- Domain-Stage mappings (domain-specific descriptions)
CREATE TABLE assessment_domain_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID NOT NULL REFERENCES assessment_domains(id) ON DELETE CASCADE,
    stage_id UUID NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
    performance_description TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(domain_id, stage_id)
);

-- Support Codes
CREATE TABLE support_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) UNIQUE NOT NULL,
    meaning VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO support_codes (code, meaning, description) VALUES
    ('BLANK', 'Independent', 'No major support needed'),
    ('R', 'Repetition', 'Prompt repeated once'),
    ('P', 'Picture/Object', 'Visual support used'),
    ('WB', 'Word Bank', 'Vocabulary list provided'),
    ('F', 'Frame', 'Sentence starter provided'),
    ('O', 'Options', 'Answer options provided'),
    ('G', 'Gesture', 'Recognition only'),
    ('NR', 'No Response', 'No valid response given');

-- Oral Participation Flags
CREATE TABLE oral_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flag_code VARCHAR(10) UNIQUE NOT NULL,
    meaning VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO oral_flags (flag_code, meaning, description) VALUES
    ('C0', 'No Attempt', 'Freezes, refuses, or no valid oral attempt'),
    ('C1', 'Minimal', 'Whispers or one-word only'),
    ('C2', 'Supported', 'Speaks after rehearsal or support'),
    ('C3', 'Independent', 'Independent and confident speaking');
```

---

#### 9.1.6 Baseline Assessment

```sql
-- Baseline Assessments (main assessment table)
CREATE TABLE baseline_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    student_class_enrollment_id UUID NOT NULL REFERENCES student_class_enrollments(id),
    school_id UUID NOT NULL REFERENCES schools(id),
    class_section_id UUID NOT NULL REFERENCES class_sections(id),
    assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id),
    assessment_date DATE NOT NULL,
    assessor_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'DRAFT' CHECK (status IN (
        'DRAFT', 'SUBMITTED', 'IN_REVIEW', 'REVIEWED', 'REVIEWED_OVERRIDE', 'LOCKED'
    )),
    submission_date TIMESTAMP,
    review_date TIMESTAMP,
    reviewed_by UUID REFERENCES users(id),
    locked_at TIMESTAMP,
    qc_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL REFERENCES users(id),
    UNIQUE(student_id, class_section_id, assessment_version_id),
    CONSTRAINT submission_date_required_when_submitted 
        CHECK ((status IN ('SUBMITTED', 'IN_REVIEW', 'REVIEWED', 'REVIEWED_OVERRIDE', 'LOCKED') 
                AND submission_date IS NOT NULL)
            OR status IN ('DRAFT')),
    CONSTRAINT review_date_when_reviewed
        CHECK ((status IN ('REVIEWED', 'REVIEWED_OVERRIDE', 'LOCKED') 
                AND review_date IS NOT NULL)
            OR status NOT IN ('REVIEWED', 'REVIEWED_OVERRIDE', 'LOCKED'))
);

CREATE INDEX idx_assessments_student_id ON baseline_assessments(student_id);
CREATE INDEX idx_assessments_class_section_id ON baseline_assessments(class_section_id);
CREATE INDEX idx_assessments_status ON baseline_assessments(status);
CREATE INDEX idx_assessments_assessor_id ON baseline_assessments(assessor_id);

-- Domain Results (one row per domain per assessment)
CREATE TABLE domain_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES baseline_assessments(id) ON DELETE CASCADE,
    domain_id UUID NOT NULL REFERENCES assessment_domains(id),
    total_score INT CHECK (total_score BETWEEN 0 AND 20),
    suggested_stage INT CHECK (suggested_stage IS NULL OR suggested_stage BETWEEN 1 AND 5),
    review_needed BOOLEAN DEFAULT FALSE,
    final_stage INT CHECK (final_stage IS NULL OR final_stage BETWEEN 1 AND 5),
    final_stage_override BOOLEAN DEFAULT FALSE,
    override_reason TEXT,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    support_code VARCHAR(10) REFERENCES support_codes(code),
    oral_flag VARCHAR(10) REFERENCES oral_flags(flag_code),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assessment_id, domain_id),
    CONSTRAINT override_reason_required_when_override 
        CHECK ((final_stage_override IS TRUE AND override_reason IS NOT NULL)
            OR final_stage_override IS FALSE)
);

CREATE INDEX idx_domain_results_assessment_id ON domain_results(assessment_id);
CREATE INDEX idx_domain_results_domain_id ON domain_results(domain_id);
CREATE INDEX idx_domain_results_suggested_stage ON domain_results(suggested_stage);
CREATE INDEX idx_domain_results_final_stage ON domain_results(final_stage);

-- Assessment Item Responses (individual ratings)
CREATE TABLE assessment_item_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_result_id UUID NOT NULL REFERENCES domain_results(id) ON DELETE CASCADE,
    assessment_item_id UUID NOT NULL REFERENCES assessment_items(id),
    rating INT CHECK (rating IS NULL OR rating BETWEEN 0 AND 4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(domain_result_id, assessment_item_id)
);

CREATE INDEX idx_item_responses_domain_result_id ON assessment_item_responses(domain_result_id);
```

---

#### 9.1.7 Class Analysis

```sql
-- Class Summaries
CREATE TABLE class_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    class_section_id UUID NOT NULL REFERENCES class_sections(id) ON DELETE CASCADE,
    assessment_cycle VARCHAR(50) DEFAULT 'DEFAULT',
    total_assessed INT DEFAULT 0 CHECK (total_assessed >= 0),
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    generated_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, class_section_id, assessment_cycle)
);

CREATE INDEX idx_class_summaries_school_id ON class_summaries(school_id);
CREATE INDEX idx_class_summaries_class_section_id ON class_summaries(class_section_id);

-- Class Domain Summaries (one per domain per class)
CREATE TABLE class_domain_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_summary_id UUID NOT NULL REFERENCES class_summaries(id) ON DELETE CASCADE,
    domain_id UUID NOT NULL REFERENCES assessment_domains(id),
    s1_count INT DEFAULT 0 CHECK (s1_count >= 0),
    s2_count INT DEFAULT 0 CHECK (s2_count >= 0),
    s3_count INT DEFAULT 0 CHECK (s3_count >= 0),
    s4_count INT DEFAULT 0 CHECK (s4_count >= 0),
    s5_count INT DEFAULT 0 CHECK (s5_count >= 0),
    total_with_stage INT DEFAULT 0 CHECK (total_with_stage >= 0),
    dominant_stage INT CHECK (dominant_stage IS NULL OR dominant_stage BETWEEN 1 AND 5),
    percent_below_dominant DECIMAL(5, 2) CHECK (percent_below_dominant IS NULL OR (percent_below_dominant >= 0 AND percent_below_dominant <= 100)),
    review_flag VARCHAR(50) CHECK (review_flag IS NULL OR review_flag IN ('OK', 'REVIEW')),
    support_band TEXT,
    anchor_band TEXT,
    stretch_band TEXT,
    planning_implication TEXT,
    framework_family VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id),
    UNIQUE(class_summary_id, domain_id),
    CONSTRAINT total_with_stage_equals_sum
        CHECK (total_with_stage = s1_count + s2_count + s3_count + s4_count + s5_count)
);

CREATE INDEX idx_class_domain_summaries_class_summary_id ON class_domain_summaries(class_summary_id);
```

---

#### 9.1.8 Classroom Profile & Planning

```sql
-- Language Functions (TBC)
CREATE TABLE language_functions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Compatible Themes (TBC)
CREATE TABLE themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Class Profiles
CREATE TABLE class_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    class_section_id UUID NOT NULL REFERENCES class_sections(id) ON DELETE CASCADE,
    class_summary_id UUID REFERENCES class_summaries(id),
    students_assessed INT,
    assessment_date DATE,
    strong_domains TEXT,
    weak_domains TEXT,
    cross_domain_pattern TEXT,
    communication_bottleneck TEXT,
    provisional_language_direction VARCHAR(255),
    central_language_function_id UUID REFERENCES language_functions(id),
    compatible_theme_id UUID REFERENCES themes(id),
    immediate_planning_implication TEXT,
    classroom_profile_paragraph TEXT,
    ready_for_table39 VARCHAR(20) DEFAULT 'NO' CHECK (ready_for_table39 IN ('NO', 'NOT_YET', 'YES')),
    table39_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    UNIQUE(school_id, class_section_id)
);

CREATE INDEX idx_class_profiles_school_id ON class_profiles(school_id);
CREATE INDEX idx_class_profiles_class_section_id ON class_profiles(class_section_id);
CREATE INDEX idx_class_profiles_ready_for_table39 ON class_profiles(ready_for_table39);
```

---

#### 9.1.9 Audit Logging

```sql
-- Audit Logs (immutable)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(50) NOT NULL CHECK (action IN (
        'CREATE', 'UPDATE', 'DELETE', 'OVERRIDE', 'SUBMIT', 'REVIEW', 'LOCK', 'UNLOCK'
    )),
    resource_type VARCHAR(50) NOT NULL CHECK (resource_type IN (
        'ASSESSMENT', 'CLASS_SUMMARY', 'CLASS_PROFILE', 'STUDENT', 'CLASS', 'USER'
    )),
    resource_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    reason TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource_type_id ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
```

---

### 9.2 Key Database Constraints & Rules

| Constraint | Type | Description |
|-----------|------|-------------|
| `school_id` + `class_section_id` + `assessment_version_id` | UNIQUE | One assessment per student per class per version |
| `students` `school_id` + `student_id` | UNIQUE | Student ID unique within school |
| `grades` `school_id` + `number` | UNIQUE | Grade number unique per school |
| `class_sections` `school_id` + `grade_id` + `section` | UNIQUE | Class/section unique per school/grade |
| `student_class_enrollments` status | CHECK | Present/Absent/Transferred/Excluded |
| `baseline_assessments` status | CHECK | Draft → Submitted → In Review → Reviewed |
| `domain_results` total_score | CHECK | 0–20 (sum of 5 items) |
| `domain_results` override_reason | CHECK | Required if override = true |
| `stages` stage_number | UNIQUE | 1–5 only |
| `assessment_items` item_number | CHECK | 1–5 per domain |
| `stages` + `domains` | ✓ | 5 stages × 7 domains = 35 domain-stage combos |

---

### 9.3 Indexes for Performance

**High-frequency queries:**

```sql
-- Assessment lookups
CREATE INDEX idx_assessments_student_class_version 
    ON baseline_assessments(student_id, class_section_id, assessment_version_id);

-- Class Summary aggregations
CREATE INDEX idx_domain_results_assessment_domain 
    ON domain_results(assessment_id, domain_id);

-- Enrollment status filtering
CREATE INDEX idx_enrollments_status_current 
    ON student_class_enrollments(status, is_current);

-- Audit queries by time
CREATE INDEX idx_audit_logs_resource_date 
    ON audit_logs(resource_type, resource_id, created_at DESC);

-- User role filtering
CREATE INDEX idx_users_role_school 
    ON users(role_id, school_id);
```

---

## 10. ASSESSMENT ENGINE DESIGN

### 10.1 Core Logic (Backend Service, Language-Agnostic)

The assessment calculation engine is independent of HTTP framework or database.

**File:** `src/domain/assessment/assessment-calculator.ts`

```typescript
/**
 * Assessment Engine
 * Core logic for Lumino1 baseline assessment calculations
 * 
 * Principles:
 * - Pure functions, no side effects
 * - Framework-agnostic
 * - Fully testable
 * - Input validation at boundary
 * - Preserves exact Excel business rules
 */

export interface ItemRating {
  itemNumber: 1 | 2 | 3 | 4 | 5;
  rating: 0 | 1 | 2 | 3 | 4 | null;
}

export interface DomainAssessmentInput {
  domainCode: string;
  ratings: ItemRating[];
  supportCode?: string;
  oralFlag?: string;
}

export interface DomainAssessmentResult {
  domainCode: string;
  ratings: ItemRating[];
  totalScore: number | null;
  suggestedStage: 1 | 2 | 3 | 4 | 5 | 'Review' | null;
  reviewNeeded: boolean;
  finalStage: 1 | 2 | 3 | 4 | 5 | null;
  supportCode?: string;
  oralFlag?: string;
}

export class AssessmentCalculator {
  /**
   * Calculate suggested stage for a domain based on 5 item ratings
   * 
   * Rules:
   * S5: R5 >= 3 AND R1-R4 all >= 2
   * S4: R4 >= 3 AND R1-R3 all >= 2
   * S3: R3 >= 3 AND R1-R2 all >= 2
   * S2: R2 >= 3 AND R1 >= 2
   * S1: R1 >= 3
   * Review: None of above
   */
  calculateSuggestedStage(ratings: ItemRating[]): 1 | 2 | 3 | 4 | 5 | 'Review' | null {
    // All blank = null
    if (this.allBlank(ratings)) {
      return null;
    }

    // Normalize ratings for evaluation
    const r = ratings.map(item => item.rating ?? -1);
    const [r1, r2, r3, r4, r5] = r;

    // Stage 5: R5 >= 3 AND all previous >= 2
    if (r5 >= 3 && r1 >= 2 && r2 >= 2 && r3 >= 2 && r4 >= 2) {
      return 5;
    }

    // Stage 4: R4 >= 3 AND all previous >= 2
    if (r4 >= 3 && r1 >= 2 && r2 >= 2 && r3 >= 2) {
      return 4;
    }

    // Stage 3: R3 >= 3 AND all previous >= 2
    if (r3 >= 3 && r1 >= 2 && r2 >= 2) {
      return 3;
    }

    // Stage 2: R2 >= 3 AND R1 >= 2
    if (r2 >= 3 && r1 >= 2) {
      return 2;
    }

    // Stage 1: R1 >= 3
    if (r1 >= 3) {
      return 1;
    }

    // Review: None of above conditions met
    // But check if review conditions apply
    if (this.reviewNeeded(ratings)) {
      return 'Review';
    }

    // No data meets any condition
    return null;
  }

  /**
   * Detect review conditions
   * Review needed when higher-level rating >= 3 but prerequisites < 2
   */
  private reviewNeeded(ratings: ItemRating[]): boolean {
    const r = ratings.map(item => item.rating ?? -1);
    const [r1, r2, r3, r4, r5] = r;

    // R5 >= 3 but any R1-R4 < 2
    if (r5 >= 3 && (r1 < 2 || r2 < 2 || r3 < 2 || r4 < 2)) {
      return true;
    }

    // R4 >= 3 but any R1-R3 < 2
    if (r4 >= 3 && (r1 < 2 || r2 < 2 || r3 < 2)) {
      return true;
    }

    // R3 >= 3 but any R1-R2 < 2
    if (r3 >= 3 && (r1 < 2 || r2 < 2)) {
      return true;
    }

    // R2 >= 3 but R1 < 2
    if (r2 >= 3 && r1 < 2) {
      return true;
    }

    return false;
  }

  /**
   * Calculate total score (sum of 5 items)
   * Informational only; does NOT determine stage
   */
  calculateTotalScore(ratings: ItemRating[]): number | null {
    if (this.allBlank(ratings)) {
      return null;
    }

    const validRatings = ratings
      .filter(item => item.rating !== null && item.rating !== undefined)
      .map(item => item.rating as number);

    if (validRatings.length === 0) {
      return null;
    }

    return validRatings.reduce((sum, rating) => sum + rating, 0);
  }

  /**
   * Check if all ratings are blank
   */
  private allBlank(ratings: ItemRating[]): boolean {
    return ratings.every(item => item.rating === null || item.rating === undefined);
  }

  /**
   * Validate ratings array
   */
  validateRatings(ratings: ItemRating[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!ratings || ratings.length !== 5) {
      errors.push('Must have exactly 5 ratings');
      return { valid: false, errors };
    }

    ratings.forEach((item, index) => {
      if (item.itemNumber !== (index + 1)) {
        errors.push(`Item number mismatch at position ${index}`);
      }

      if (item.rating !== null && item.rating !== undefined) {
        if (item.rating < 0 || item.rating > 4 || !Number.isInteger(item.rating)) {
          errors.push(`Item ${item.itemNumber}: rating must be 0-4`);
        }
      }
    });

    return { valid: errors.length === 0, errors };
  }

  /**
   * Calculate full domain result
   */
  calculateDomainResult(input: DomainAssessmentInput): DomainAssessmentResult {
    // Validate input
    const validation = this.validateRatings(input.ratings);
    if (!validation.valid) {
      throw new Error(`Validation error: ${validation.errors.join('; ')}`);
    }

    const totalScore = this.calculateTotalScore(input.ratings);
    const suggestedStage = this.calculateSuggestedStage(input.ratings);

    return {
      domainCode: input.domainCode,
      ratings: input.ratings,
      totalScore,
      suggestedStage,
      reviewNeeded: suggestedStage === 'Review',
      finalStage: null, // Must be set by teacher review
      supportCode: input.supportCode,
      oralFlag: input.oralFlag,
    };
  }
}

export const assessmentCalculator = new AssessmentCalculator();
```

### 10.2 Unit Tests

**File:** `src/domain/assessment/assessment-calculator.spec.ts`

```typescript
describe('AssessmentCalculator', () => {
  const calc = assessmentCalculator;

  describe('calculateSuggestedStage', () => {
    it('S1: R1 >= 3, others any', () => {
      const ratings = [
        { itemNumber: 1, rating: 3 },
        { itemNumber: 2, rating: 0 },
        { itemNumber: 3, rating: 0 },
        { itemNumber: 4, rating: 0 },
        { itemNumber: 5, rating: 0 },
      ];
      expect(calc.calculateSuggestedStage(ratings)).toBe(1);
    });

    it('S2: R2 >= 3 AND R1 >= 2', () => {
      const ratings = [
        { itemNumber: 1, rating: 2 },
        { itemNumber: 2, rating: 3 },
        { itemNumber: 3, rating: 0 },
        { itemNumber: 4, rating: 0 },
        { itemNumber: 5, rating: 0 },
      ];
      expect(calc.calculateSuggestedStage(ratings)).toBe(2);
    });

    it('S3: R3 >= 3 AND R1,R2 >= 2', () => {
      const ratings = [
        { itemNumber: 1, rating: 2 },
        { itemNumber: 2, rating: 2 },
        { itemNumber: 3, rating: 3 },
        { itemNumber: 4, rating: 0 },
        { itemNumber: 5, rating: 0 },
      ];
      expect(calc.calculateSuggestedStage(ratings)).toBe(3);
    });

    it('S4: R4 >= 3 AND R1,R2,R3 >= 2', () => {
      const ratings = [
        { itemNumber: 1, rating: 2 },
        { itemNumber: 2, rating: 2 },
        { itemNumber: 3, rating: 2 },
        { itemNumber: 4, rating: 3 },
        { itemNumber: 5, rating: 0 },
      ];
      expect(calc.calculateSuggestedStage(ratings)).toBe(4);
    });

    it('S5: All >= 2 AND R5 >= 3', () => {
      const ratings = [
        { itemNumber: 1, rating: 2 },
        { itemNumber: 2, rating: 2 },
        { itemNumber: 3, rating: 2 },
        { itemNumber: 4, rating: 2 },
        { itemNumber: 5, rating: 3 },
      ];
      expect(calc.calculateSuggestedStage(ratings)).toBe(5);
    });

    it('Review: R5 >= 3 but R1 < 2', () => {
      const ratings = [
        { itemNumber: 1, rating: 1 },
        { itemNumber: 2, rating: 2 },
        { itemNumber: 3, rating: 2 },
        { itemNumber: 4, rating: 2 },
        { itemNumber: 5, rating: 3 },
      ];
      expect(calc.calculateSuggestedStage(ratings)).toBe('Review');
    });

    it('Null: All blank', () => {
      const ratings = [
        { itemNumber: 1, rating: null },
        { itemNumber: 2, rating: null },
        { itemNumber: 3, rating: null },
        { itemNumber: 4, rating: null },
        { itemNumber: 5, rating: null },
      ];
      expect(calc.calculateSuggestedStage(ratings)).toBeNull();
    });

    it('Null: No condition met', () => {
      const ratings = [
        { itemNumber: 1, rating: 0 },
        { itemNumber: 2, rating: 0 },
        { itemNumber: 3, rating: 0 },
        { itemNumber: 4, rating: 0 },
        { itemNumber: 5, rating: 0 },
      ];
      expect(calc.calculateSuggestedStage(ratings)).toBeNull();
    });
  });

  describe('calculateTotalScore', () => {
    it('Sum of 5 ratings', () => {
      const ratings = [
        { itemNumber: 1, rating: 4 },
        { itemNumber: 2, rating: 3 },
        { itemNumber: 3, rating: 2 },
        { itemNumber: 4, rating: 1 },
        { itemNumber: 5, rating: 0 },
      ];
      expect(calc.calculateTotalScore(ratings)).toBe(10);
    });

    it('Null if all blank', () => {
      const ratings = [
        { itemNumber: 1, rating: null },
        { itemNumber: 2, rating: null },
        { itemNumber: 3, rating: null },
        { itemNumber: 4, rating: null },
        { itemNumber: 5, rating: null },
      ];
      expect(calc.calculateTotalScore(ratings)).toBeNull();
    });
  });
});
```

---

## 11. CLASS SUMMARY ENGINE DESIGN

### 11.1 Summary Calculation Logic

**File:** `src/domain/class-summary/class-summary-calculator.ts`

```typescript
export interface StudentDomainResult {
  studentId: string;
  domainCode: string;
  finalStage: 1 | 2 | 3 | 4 | 5 | null;
}

export interface DomainSummaryInput {
  domainCode: string;
  studentResults: StudentDomainResult[];
}

export interface DomainSummaryOutput {
  domainCode: string;
  s1Count: number;
  s2Count: number;
  s3Count: number;
  s4Count: number;
  s5Count: number;
  totalWithStage: number;
  dominantStage: 1 | 2 | 3 | 4 | 5 | null;
  percentBelowDominant: number | null;
  reviewFlag: 'OK' | 'REVIEW' | null;
}

export class ClassSummaryCalculator {
  /**
   * Calculate stage distribution from student results
   */
  calculateStageDistribution(input: DomainSummaryInput): DomainSummaryOutput {
    const results = input.studentResults;

    // Count students at each stage (ignore null)
    const stageCounts = {
      s1: 0,
      s2: 0,
      s3: 0,
      s4: 0,
      s5: 0,
    };

    results.forEach(student => {
      if (student.finalStage === 1) stageCounts.s1++;
      else if (student.finalStage === 2) stageCounts.s2++;
      else if (student.finalStage === 3) stageCounts.s3++;
      else if (student.finalStage === 4) stageCounts.s4++;
      else if (student.finalStage === 5) stageCounts.s5++;
    });

    const totalWithStage = 
      stageCounts.s1 + stageCounts.s2 + stageCounts.s3 + stageCounts.s4 + stageCounts.s5;

    // No assessed students
    if (totalWithStage === 0) {
      return {
        domainCode: input.domainCode,
        s1Count: 0,
        s2Count: 0,
        s3Count: 0,
        s4Count: 0,
        s5Count: 0,
        totalWithStage: 0,
        dominantStage: null,
        percentBelowDominant: null,
        reviewFlag: null,
      };
    }

    // Determine dominant stage (mode)
    const counts = [stageCounts.s1, stageCounts.s2, stageCounts.s3, stageCounts.s4, stageCounts.s5];
    const maxCount = Math.max(...counts);
    const dominantStageIndex = counts.indexOf(maxCount);
    const dominantStage = (dominantStageIndex + 1) as 1 | 2 | 3 | 4 | 5;

    // Calculate % Below Dominant
    let belowCount = 0;
    if (dominantStage > 1) {
      for (let i = 0; i < dominantStage - 1; i++) {
        belowCount += counts[i];
      }
    }
    const percentBelowDominant = 
      totalWithStage > 0 ? (belowCount / totalWithStage) * 100 : null;

    // Determine review flag (>35% threshold)
    let reviewFlag: 'OK' | 'REVIEW' | null = null;
    if (percentBelowDominant !== null) {
      reviewFlag = percentBelowDominant > 35 ? 'REVIEW' : 'OK';
    }

    return {
      domainCode: input.domainCode,
      s1Count: stageCounts.s1,
      s2Count: stageCounts.s2,
      s3Count: stageCounts.s3,
      s4Count: stageCounts.s4,
      s5Count: stageCounts.s5,
      totalWithStage,
      dominantStage,
      percentBelowDominant: percentBelowDominant !== null 
        ? Math.round(percentBelowDominant * 100) / 100 
        : null,
      reviewFlag,
    };
  }

  /**
   * Calculate entire class summary
   */
  async calculateClassSummary(
    classId: string,
    assessmentCycle: string,
    assessmentRepo: AssessmentRepository,
    classRepo: ClassRepository,
  ): Promise<ClassSummaryOutput> {
    // 1. Get class and enrolled students (Present status only)
    const classData = await classRepo.getClassWithEnrollments(classId, 'PRESENT');

    // 2. Get all assessed students for this class/cycle
    const assessments = await assessmentRepo.findByClassAndCycle(classId, assessmentCycle);

    // 3. Extract final stages by domain
    const domainResults: Map<string, StudentDomainResult[]> = new Map();
    const domains = ['V', 'G', 'P', 'L', 'S', 'R', 'W'];

    domains.forEach(domain => {
      domainResults.set(domain, []);
    });

    assessments.forEach(assessment => {
      assessment.domainResults.forEach(domainResult => {
        const domain = domainResult.domain.code;
        domainResults.get(domain)?.push({
          studentId: assessment.student.id,
          domainCode: domain,
          finalStage: domainResult.finalStage,
        });
      });
    });

    // 4. Calculate per-domain summary
    const domainSummaries = domains.map(domain => {
      return this.calculateStageDistribution({
        domainCode: domain,
        studentResults: domainResults.get(domain) || [],
      });
    });

    return {
      classId,
      assessmentCycle,
      totalAssessed: assessments.length,
      domainSummaries,
    };
  }
}

export const classSummaryCalculator = new ClassSummaryCalculator();
```

### 11.2 Unit Tests

```typescript
describe('ClassSummaryCalculator', () => {
  const calc = classSummaryCalculator;

  describe('calculateStageDistribution', () => {
    it('Calculates correct dominant stage', () => {
      const input = {
        domainCode: 'V',
        studentResults: [
          { studentId: '1', domainCode: 'V', finalStage: 2 },
          { studentId: '2', domainCode: 'V', finalStage: 2 },
          { studentId: '3', domainCode: 'V', finalStage: 3 },
          { studentId: '4', domainCode: 'V', finalStage: 3 },
          { studentId: '5', domainCode: 'V', finalStage: 3 },
        ],
      };
      const result = calc.calculateStageDistribution(input);
      expect(result.dominantStage).toBe(3);
      expect(result.totalWithStage).toBe(5);
    });

    it('Calculates % Below Dominant correctly', () => {
      // S3 dominant, 2 below (S2 = 2)
      const input = {
        domainCode: 'V',
        studentResults: [
          { studentId: '1', domainCode: 'V', finalStage: 2 },
          { studentId: '2', domainCode: 'V', finalStage: 2 },
          { studentId: '3', domainCode: 'V', finalStage: 3 },
          { studentId: '4', domainCode: 'V', finalStage: 3 },
          { studentId: '5', domainCode: 'V', finalStage: 3 },
        ],
      };
      const result = calc.calculateStageDistribution(input);
      expect(result.percentBelowDominant).toBe(40); // 2/5 = 40%
    });

    it('Sets review flag when >35% below dominant', () => {
      const input = {
        domainCode: 'V',
        studentResults: [
          { studentId: '1', domainCode: 'V', finalStage: 2 },
          { studentId: '2', domainCode: 'V', finalStage: 2 },
          { studentId: '3', domainCode: 'V', finalStage: 2 },
          { studentId: '4', domainCode: 'V', finalStage: 3 },
          { studentId: '5', domainCode: 'V', finalStage: 3 },
        ],
      };
      const result = calc.calculateStageDistribution(input);
      expect(result.percentBelowDominant).toBe(60); // 3/5 = 60%
      expect(result.reviewFlag).toBe('REVIEW');
    });

    it('Sets OK flag when <=35% below dominant', () => {
      const input = {
        domainCode: 'V',
        studentResults: [
          { studentId: '1', domainCode: 'V', finalStage: 2 },
          { studentId: '2', domainCode: 'V', finalStage: 3 },
          { studentId: '3', domainCode: 'V', finalStage: 3 },
          { studentId: '4', domainCode: 'V', finalStage: 3 },
          { studentId: '5', domainCode: 'V', finalStage: 3 },
      };
      const result = calc.calculateStageDistribution(input);
      expect(result.percentBelowDominant).toBe(20); // 1/5 = 20%
      expect(result.reviewFlag).toBe('OK');
    });
  });
});
```

---

## 12. BACKEND ARCHITECTURE (NestJS)

### 12.1 Module Structure

```
src/
├── main.ts                           # Entry point
├── app.module.ts                     # Root module
│
├── auth/
│   ├── auth.module.ts
│   ├── auth.service.ts               # JWT, login logic
│   ├── jwt.strategy.ts
│   ├── jwt.guard.ts
│   ├── roles.guard.ts
│   └── dto/
│       ├── login.dto.ts
│       └── token.dto.ts
│
├── users/
│   ├── users.module.ts
│   ├── users.service.ts
│   ├── users.controller.ts
│   ├── entities/user.entity.ts
│   └── dto/
│       ├── create-user.dto.ts
│       ├── update-user.dto.ts
│       └── user.dto.ts
│
├── schools/
│   ├── schools.module.ts
│   ├── schools.service.ts
│   ├── schools.controller.ts
│   ├── entities/school.entity.ts
│   └── dto/
│       ├── create-school.dto.ts
│       ├── update-school.dto.ts
│       └── school.dto.ts
│
├── classes/
│   ├── classes.module.ts
│   ├── classes.service.ts
│   ├── classes.controller.ts
│   ├── entities/
│   │   ├── grade.entity.ts
│   │   └── class-section.entity.ts
│   └── dto/
│       ├── create-class.dto.ts
│       ├── class.dto.ts
│       └── grade.dto.ts
│
├── students/
│   ├── students.module.ts
│   ├── students.service.ts
│   ├── students.controller.ts
│   ├── entities/
│   │   ├── student.entity.ts
│   │   └── student-enrollment.entity.ts
│   └── dto/
│       ├── create-student.dto.ts
│       ├── student.dto.ts
│       └── enrollment.dto.ts
│
├── assessments/
│   ├── assessments.module.ts
│   ├── assessments.service.ts
│   ├── assessments.controller.ts
│   ├── entities/
│   │   ├── baseline-assessment.entity.ts
│   │   ├── domain-result.entity.ts
│   │   └── item-response.entity.ts
│   ├── dto/
│   │   ├── create-assessment.dto.ts
│   │   ├── update-assessment.dto.ts
│   │   ├── assessment.dto.ts
│   │   └── domain-result.dto.ts
│   └── validators/
│       └── assessment-validation.ts
│
├── assessment-engine/               # Core calculation logic
│   ├── assessment-engine.module.ts
│   ├── assessment-calculator.service.ts
│   └── assessment-calculator.spec.ts
│
├── class-summary/
│   ├── class-summary.module.ts
│   ├── class-summary.service.ts
│   ├── class-summary.controller.ts
│   ├── entities/
│   │   ├── class-summary.entity.ts
│   │   └── class-domain-summary.entity.ts
│   ├── calculator/
│   │   ├── class-summary-calculator.service.ts
│   │   └── class-summary-calculator.spec.ts
│   └── dto/
│       ├── class-summary.dto.ts
│       └── class-domain-summary.dto.ts
│
├── class-profile/
│   ├── class-profile.module.ts
│   ├── class-profile.service.ts
│   ├── class-profile.controller.ts
│   ├── entities/class-profile.entity.ts
│   └── dto/
│       ├── create-profile.dto.ts
│       ├── update-profile.dto.ts
│       └── class-profile.dto.ts
│
├── reference-data/                  # Enums, configs
│   ├── reference-data.module.ts
│   ├── reference-data.service.ts
│   ├── reference-data.controller.ts
│   ├── entities/
│   │   ├── domain.entity.ts
│   │   ├── stage.entity.ts
│   │   ├── support-code.entity.ts
│   │   ├── oral-flag.entity.ts
│   │   ├── language-function.entity.ts
│   │   └── theme.entity.ts
│   └── dto/
│       └── reference-data.dto.ts
│
├── audit/
│   ├── audit.module.ts
│   ├── audit.service.ts
│   ├── audit.controller.ts
│   ├── entities/audit-log.entity.ts
│   ├── dto/audit-log.dto.ts
│   └── audit.interceptor.ts
│
├── common/
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   ├── public.decorator.ts
│   │   ├── roles.decorator.ts
│   │   └── audit.decorator.ts
│   ├── filters/
│   │   ├── http-exception.filter.ts
│   │   └── validation-exception.filter.ts
│   ├── interceptors/
│   │   ├── logging.interceptor.ts
│   │   ├── transform.interceptor.ts
│   │   └── audit-trail.interceptor.ts
│   ├── guards/
│   │   ├── jwt.guard.ts
│   │   ├── roles.guard.ts
│   │   └── school-data.guard.ts
│   ├── pipes/
│   │   ├── validation.pipe.ts
│   │   └── parse-uuid.pipe.ts
│   └── exceptions/
│       ├── app.exception.ts
│       └── validation.exception.ts
│
├── config/
│   ├── app.config.ts
│   ├── database.config.ts
│   ├── auth.config.ts
│   └── environment.ts
│
├── prisma/
│   ├── prisma.service.ts
│   ├── schema.prisma
│   └── migrations/
│
└── tests/
    ├── assessment-calculator.spec.ts
    ├── class-summary-calculator.spec.ts
    └── integration/
```

### 12.2 Key Service Examples

**AuthService:**
```typescript
@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || !await this.validatePassword(password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role.code,
      schoolId: user.schoolId,
    };

    return {
      accessToken: this.jwtService.sign(payload, {
        expiresIn: this.configService.get('JWT_EXPIRY'),
      }),
      refreshToken: this.jwtService.sign(payload, {
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRY'),
      }),
      user: this.usersService.toDTO(user),
    };
  }
}
```

**AssessmentsService:**
```typescript
@Injectable()
export class AssessmentsService {
  constructor(
    private prisma: PrismaService,
    private assessmentCalculator: AssessmentCalculatorService,
    private auditService: AuditService,
  ) {}

  async createAssessment(
    input: CreateAssessmentDto,
    userId: string,
  ): Promise<AssessmentDto> {
    // Validate enrollment
    const enrollment = await this.prisma.studentClassEnrollment.findUnique({
      where: { id: input.studentClassEnrollmentId },
    });

    if (!enrollment || enrollment.status !== 'PRESENT') {
      throw new BadRequestException('Invalid enrollment');
    }

    // Create assessment
    const assessment = await this.prisma.baselineAssessment.create({
      data: {
        studentId: input.studentId,
        studentClassEnrollmentId: input.studentClassEnrollmentId,
        schoolId: input.schoolId,
        classSectionId: input.classSectionId,
        assessmentVersionId: input.assessmentVersionId,
        assessmentDate: input.assessmentDate,
        assessorId: input.assessorId,
        status: 'DRAFT',
        createdBy: userId,
        domainResults: {
          create: input.domains.map(domain => ({
            domainId: domain.domainId,
            assessmentItemResponses: {
              create: domain.ratings.map(rating => ({
                assessmentItemId: rating.assessmentItemId,
                rating: rating.rating,
              })),
            },
          })),
        },
      },
      include: { domainResults: { include: { assessmentItemResponses: true } } },
    });

    // Calculate suggested stages
    for (const domainResult of assessment.domainResults) {
      const ratings = domainResult.assessmentItemResponses
        .sort((a, b) => a.assessmentItemId.localeCompare(b.assessmentItemId))
        .map(r => ({ itemNumber: /* parsed */, rating: r.rating }));

      const calculation = this.assessmentCalculator.calculateSuggestedStage(ratings);

      await this.prisma.domainResult.update({
        where: { id: domainResult.id },
        data: {
          suggestedStage: calculation.stage,
          reviewNeeded: calculation.reviewNeeded,
          totalScore: calculation.totalScore,
        },
      });
    }

    // Audit log
    await this.auditService.log({
      userId,
      action: 'CREATE',
      resourceType: 'ASSESSMENT',
      resourceId: assessment.id,
      newValues: this.toDTO(assessment),
    });

    return this.toDTO(assessment);
  }

  async submitAssessment(assessmentId: string, userId: string) {
    const assessment = await this.prisma.baselineAssessment.findUnique({
      where: { id: assessmentId },
    });

    if (assessment.status !== 'DRAFT') {
      throw new BadRequestException('Can only submit draft assessments');
    }

    const updated = await this.prisma.baselineAssessment.update({
      where: { id: assessmentId },
      data: {
        status: 'IN_REVIEW',
        submissionDate: new Date(),
      },
      include: { domainResults: true },
    });

    await this.auditService.log({
      userId,
      action: 'SUBMIT',
      resourceType: 'ASSESSMENT',
      resourceId: assessmentId,
      newValues: { status: 'IN_REVIEW' },
    });

    // Notify HOD
    // ... notification logic

    return this.toDTO(updated);
  }

  async reviewAssessment(
    assessmentId: string,
    overrides: { [domainId: string]: number | null },
    reasons: { [domainId: string]: string },
    userId: string,
  ) {
    const assessment = await this.prisma.baselineAssessment.findUnique({
      where: { id: assessmentId },
      include: { domainResults: true },
    });

    const updates = assessment.domainResults.map(async dr => {
      const finalStage = overrides[dr.domainId] ?? dr.suggestedStage;
      const wasOverridden = finalStage !== dr.suggestedStage;

      return this.prisma.domainResult.update({
        where: { id: dr.id },
        data: {
          finalStage,
          finalStageOverride: wasOverridden,
          overrideReason: wasOverridden ? reasons[dr.domainId] : null,
          reviewedBy: userId,
          reviewedAt: new Date(),
        },
      });
    });

    await Promise.all(updates);

    const updated = await this.prisma.baselineAssessment.update({
      where: { id: assessmentId },
      data: {
        status: overrides ? 'REVIEWED_OVERRIDE' : 'REVIEWED',
        reviewDate: new Date(),
        reviewedBy: userId,
      },
      include: { domainResults: true },
    });

    await this.auditService.log({
      userId,
      action: 'REVIEW',
      resourceType: 'ASSESSMENT',
      resourceId: assessmentId,
      newValues: { status: updated.status, overrides },
    });

    return this.toDTO(updated);
  }
}
```

---

## 13. FRONTEND ARCHITECTURE (ANGULAR)

### 13.1 Feature Module Structure

```
src/app/
├── core/                            # Singleton services
│   ├── http/
│   │   ├── api.service.ts
│   │   └── error.interceptor.ts
│   ├── auth/
│   │   ├── auth.service.ts
│   │   └── auth.guard.ts
│   ├── state/
│   │   ├── app.state.ts
│   │   └── observable-store.service.ts (if not using NgRx)
│   └── core.module.ts
│
├── shared/                          # Reusable components & utilities
│   ├── components/
│   │   ├── navigation/
│   │   │   ├── sidebar.component.ts
│   │   │   └── header.component.ts
│   │   ├── tables/
│   │   │   ├── data-table.component.ts
│   │   │   └── paginator.component.ts
│   │   └── forms/
│   │       ├── form-field.component.ts
│   │       └── validation-messages.component.ts
│   ├── pipes/
│   │   ├── stage.pipe.ts
│   │   └── status.pipe.ts
│   ├── directives/
│   │   └── role-based-visibility.directive.ts
│   ├── validators/
│   │   ├── rating-validator.ts
│   │   └── async-validators.ts
│   └── shared.module.ts
│
├── layout/                          # App shell
│   ├── app-shell.component.ts
│   ├── navigation.component.ts
│   └── layout.module.ts
│
├── features/
│   ├── auth/
│   │   ├── login/login.component.ts
│   │   ├── reset-password/reset-password.component.ts
│   │   └── auth.module.ts
│   │
│   ├── dashboard/
│   │   ├── dashboard.component.ts
│   │   ├── role-specific-dashboards/
│   │   │   ├── admin-dashboard.component.ts
│   │   │   ├── assessor-dashboard.component.ts
│   │   │   └── hod-dashboard.component.ts
│   │   └── dashboard.module.ts
│   │
│   ├── schools/
│   │   ├── list/schools-list.component.ts
│   │   ├── detail/school-detail.component.ts
│   │   ├── form/school-form.component.ts
│   │   ├── schools.service.ts
│   │   └── schools.module.ts
│   │
│   ├── classes/
│   │   ├── list/classes-list.component.ts
│   │   ├── detail/class-detail.component.ts
│   │   ├── form/class-form.component.ts
│   │   ├── classes.service.ts
│   │   └── classes.module.ts
│   │
│   ├── students/
│   │   ├── list/students-list.component.ts
│   │   ├── detail/student-detail.component.ts
│   │   ├── form/student-form.component.ts
│   │   ├── students.service.ts
│   │   └── students.module.ts
│   │
│   ├── assessments/
│   │   ├── entry/
│   │   │   ├── assessment-entry.component.ts
│   │   │   ├── domain-rating-form.component.ts
│   │   │   ├── assessment-summary.component.ts
│   │   │   └── real-time-stage-calculator.component.ts
│   │   ├── review/
│   │   │   ├── assessment-review.component.ts
│   │   │   ├── override-dialog.component.ts
│   │   │   └── pending-reviews.component.ts
│   │   ├── history/
│   │   │   └── assessment-history.component.ts
│   │   ├── assessments.service.ts
│   │   ├── assessment-calculator.service.ts (mirrors backend)
│   │   └── assessments.module.ts
│   │
│   ├── class-summary/
│   │   ├── summary-view/summary-view.component.ts
│   │   ├── domain-summary-table/domain-summary-table.component.ts
│   │   ├── planning-fields/planning-fields.component.ts
│   │   ├── class-summary.service.ts
│   │   └── class-summary.module.ts
│   │
│   ├── classroom-profile/
│   │   ├── profile-form/profile-form.component.ts
│   │   ├── profile-view/profile-view.component.ts
│   │   ├── paragraph-builder/paragraph-builder.component.ts
│   │   ├── classroom-profile.service.ts
│   │   └── classroom-profile.module.ts
│   │
│   ├── reference-data/
│   │   ├── domain-config/domain-config.component.ts
│   │   ├── stage-config/stage-config.component.ts
│   │   ├── reference-data.service.ts
│   │   └── reference-data.module.ts
│   │
│   ├── audit-log/
│   │   ├── audit-log-view/audit-log-view.component.ts
│   │   ├── audit.service.ts
│   │   └── audit-log.module.ts
│   │
│   └── users/
│       ├── list/users-list.component.ts
│       ├── form/user-form.component.ts
│       ├── users.service.ts
│       └── users.module.ts
│
├── app.module.ts
├── app-routing.module.ts
└── app.component.ts
```

### 13.2 State Management (RxJS + Services)

For MVP, use reactive service pattern rather than NgRx to reduce complexity:

**File:** `src/app/core/state/app.state.ts`

```typescript
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface AppState {
  currentUser: User | null;
  currentSchool: School | null;
  currentClass: ClassSection | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AppState = {
  currentUser: null,
  currentSchool: null,
  currentClass: null,
  isLoading: false,
  error: null,
};

@Injectable({ providedIn: 'root' })
export class AppStateService {
  private state$ = new BehaviorSubject<AppState>(initialState);

  constructor() {
    this.loadFromStorage();
  }

  // Selectors
  selectState(): Observable<AppState> {
    return this.state$.asObservable();
  }

  selectCurrentUser(): Observable<User | null> {
    return this.state$.pipe(map(s => s.currentUser));
  }

  selectCurrentSchool(): Observable<School | null> {
    return this.state$.pipe(map(s => s.currentSchool));
  }

  selectIsLoading(): Observable<boolean> {
    return this.state$.pipe(map(s => s.isLoading));
  }

  // Mutators
  setUser(user: User | null) {
    const current = this.state$.value;
    this.state$.next({ ...current, currentUser: user });
  }

  setSchool(school: School | null) {
    const current = this.state$.value;
    this.state$.next({ ...current, currentSchool: school });
  }

  setClass(classSection: ClassSection | null) {
    const current = this.state$.value;
    this.state$.next({ ...current, currentClass: classSection });
  }

  setLoading(isLoading: boolean) {
    const current = this.state$.value;
    this.state$.next({ ...current, isLoading });
  }

  setError(error: string | null) {
    const current = this.state$.value;
    this.state$.next({ ...current, error });
  }

  private loadFromStorage() {
    const stored = localStorage.getItem('appState');
    if (stored) {
      this.state$.next(JSON.parse(stored));
    }
  }

  saveToStorage() {
    localStorage.setItem('appState', JSON.stringify(this.state$.value));
  }
}
```

### 13.3 Key Component Example: Assessment Entry

**File:** `src/app/features/assessments/entry/assessment-entry.component.ts`

```typescript
@Component({
  selector: 'app-assessment-entry',
  templateUrl: './assessment-entry.component.html',
  styleUrls: ['./assessment-entry.component.scss'],
})
export class AssessmentEntryComponent implements OnInit, OnDestroy {
  form: FormGroup;
  assessment: AssessmentDto | null = null;
  domains: AssessmentDomainDto[] = [];
  isSubmitting = false;
  destroy$ = new Subject<void>();

  domainResults$ = new BehaviorSubject<DomainResultDto[]>([]);
  suggestedStages$ = new BehaviorSubject<Map<string, number | null>>(new Map());

  constructor(
    private route: ActivatedRoute,
    private assessmentsService: AssessmentsService,
    private assessmentCalculatorService: AssessmentCalculatorService,
    private referenceDataService: ReferenceDataService,
    private formBuilder: FormBuilder,
  ) {}

  ngOnInit() {
    this.loadDomains();
    this.initializeForm();
    this.watchFormChanges();
  }

  private loadDomains() {
    this.referenceDataService
      .getDomains()
      .pipe(takeUntil(this.destroy$))
      .subscribe(domains => {
        this.domains = domains;
      });
  }

  private initializeForm() {
    const domainGroups = {};
    this.domains.forEach(domain => {
      const itemGroups = {};
      for (let i = 1; i <= 5; i++) {
        itemGroups[`item${i}`] = new FormControl(null, [
          Validators.required,
          Validators.min(0),
          Validators.max(4),
        ]);
      }
      domainGroups[domain.code] = new FormGroup(itemGroups);
    });

    this.form = this.formBuilder.group({
      assessmentDate: [new Date(), Validators.required],
      assessorName: ['', Validators.required],
      qcNotes: [''],
      ...domainGroups,
    });
  }

  private watchFormChanges() {
    // Watch each domain group for changes and calculate suggested stage
    this.domains.forEach(domain => {
      const domainGroup = this.form.get(domain.code) as FormGroup;
      
      domainGroup.valueChanges
        .pipe(
          debounceTime(300),
          map(values => this.extractRatings(values)),
          map(ratings => this.assessmentCalculatorService.calculateSuggestedStage(ratings)),
          takeUntil(this.destroy$),
        )
        .subscribe(suggestedStage => {
          // Update display of suggested stage
          this.updateSuggestedStage(domain.code, suggestedStage);
        });
    });
  }

  private extractRatings(values: any): ItemRating[] {
    return [1, 2, 3, 4, 5].map(i => ({
      itemNumber: i as 1 | 2 | 3 | 4 | 5,
      rating: values[`item${i}`],
    }));
  }

  private updateSuggestedStage(domainCode: string, stage: number | string | null) {
    const current = this.suggestedStages$.value;
    current.set(domainCode, stage as number | null);
    this.suggestedStages$.next(new Map(current));
  }

  submit() {
    if (this.form.invalid) {
      this.markFormGroupTouched(this.form);
      return;
    }

    this.isSubmitting = true;

    const payload = this.buildPayload();

    this.assessmentsService
      .submitAssessment(payload)
      .pipe(
        finalize(() => this.isSubmitting = false),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (assessment) => {
          this.router.navigate(['/assessments', assessment.id, 'review']);
        },
        error: (err) => {
          // Show error notification
        },
      });
  }

  private buildPayload(): CreateAssessmentDto {
    // Build assessment DTO from form
    return {
      // ...
    };
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

---

## 14. API SPECIFICATION (REST)

### 14.1 Assessment Endpoints

```
POST   /api/v1/assessments
GET    /api/v1/assessments/:id
PATCH  /api/v1/assessments/:id
POST   /api/v1/assessments/:id/submit
POST   /api/v1/assessments/:id/review
GET    /api/v1/assessments?classId=&status=
GET    /api/v1/students/:studentId/assessments
GET    /api/v1/classes/:classId/assessments
```

### 14.2 Class Summary Endpoints

```
GET    /api/v1/class-summaries/:classId
POST   /api/v1/class-summaries/:classId/generate
PATCH  /api/v1/class-summaries/:classId/planning
GET    /api/v1/class-domain-summaries/:classId/:domainId
```

### 14.3 Class Profile Endpoints

```
POST   /api/v1/class-profiles
GET    /api/v1/class-profiles/:classId
PATCH  /api/v1/class-profiles/:classId
GET    /api/v1/class-profiles/:classId/readiness
```

---

## CLOSING NOTES

This two-part specification provides:

✅ **Part 1:**
- Executive summary
- Confirmed requirements (FR-001 through FR-014)
- Business rules (assessment, class summary, profiles)
- User roles & permissions
- Application workflow
- Page architecture
- Complete domain model & entity design

✅ **Part 2:**
- PostgreSQL database schema (with SQL)
- Assessment calculation engine (with unit tests)
- Class summary engine (with unit tests)
- NestJS backend architecture
- Angular frontend architecture
- API specification outline
- Key service examples

### Outstanding Items (To Be Confirmed)

1. **Framework Definitions:** MEU, Functional Phonics, RRI, NPU, FEC, 3L, PRSP, PERC, LIT, IWDR
2. **06_Cross_Domain_Guide:** Pattern selection framework
3. **Table 39:** Row-bundle definitions and planning rules
4. **Language Functions & Themes:** Dropdown values

### Next Steps

1. **Confirm outstanding items** with business stakeholders
2. **Obtain missing reference documents** (06_Cross_Domain_Guide, Table 39)
3. **Review & approve architecture** with team
4. **Set up development environment** (NestJS + Angular + PostgreSQL)
5. **Initialize Prisma schema** and create initial migration
6. **Begin Phase 1 development** (authentication + master data)

---

**Document Prepared:** Senior Software Architect  
**Status:** Ready for Implementation  
**Version:** 1.0  
**Date:** September 2026

