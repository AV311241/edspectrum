# Lumino1 Backend - Attendance Module Implementation

## Overview
The Attendance Module provides production-ready daily attendance tracking, batch marking, session cancellation safeguards, daily register grids, automated monthly/risk analytics, and bulk Excel uploads for class sections and enrolled students.

> [!IMPORTANT]
> **Route mount path**: TSOA routes are registered at the **application root** (`RegisterRoutes(app)` in `src/index.ts`), *not* under `/api/v1`. The `/api/v1` mount only carries `/health` plus empty legacy router stubs. The paths below are the **actual** effective paths; older revisions of these documents wrote `/api/v1/...`, which was inaccurate. `apiUrl` in the frontend is the bare origin (`http://localhost:5000`).

---

## Key Architectural Components

### 0. Status Vocabulary - Single Source of Truth ([attendance.constants.ts](file:///c:/Users/av311/Desktop/NGO-app/backend/src/constants/attendance.constants.ts))

`ATTENDANCE_STATUS_VALUES` is the canonical tuple; every other status list in the codebase (Zod enums, upload DTOs, frontend templates) is derived from it.

```ts
export const ATTENDANCE_STATUS_VALUES = ['P', 'A', 'HALF_DAY', 'ACTIVITY', 'ON_LEAVE', 'CANCELLED'] as const;
export type AttendanceStatusValue = (typeof ATTENDANCE_STATUS_VALUES)[number];
```

| Status | Meaning | Markable per student? | Class-wide? |
| :--- | :--- | :--- | :--- |
| `P` | Present | Yes | No |
| `A` | Absent | Yes | No |
| `HALF_DAY` | Half-day leave | Yes | No |
| `ACTIVITY` | Held session (school function / outing / dance) | Yes | No |
| `ON_LEAVE` | Authorised leave | Yes | No |
| `CANCELLED` | Session did not run | No (`studentId` must be `null`) | Yes |

### 1. Input Validation & DTOs

#### 1a. Canonical bulk-upload schema ([schemas/attendance-upload.schema.ts](file:///c:/Users/av311/Desktop/NGO-app/backend/src/schemas/attendance-upload.schema.ts))

The authoritative Zod contract for bulk attendance uploads. Exports:

| Export | Purpose |
| :--- | :--- |
| `AttendanceStatusSchema` | `z.enum` over `ATTENDANCE_STATUS_VALUES` |
| `cleanseExcelStatus` | Folds real-world spreadsheet spellings to canonical statuses |
| `singleAttendanceRecordBaseSchema` | Base object; `.extend()`-able (see note) |
| `SingleAttendanceRecordSchema` | Base + `studentId`/`remarks` conditionals |
| `codeBasedAttendanceRowSchema` | Single record + `schoolCode` / `className` / `academicYear` |
| `BatchAttendanceUploadSchema` | Envelope form (class by primary key) |
| `CodeBasedAttendanceUploadSchema` | Per-row code form |
| `AttendanceUploadRequestSchema` | `z.union` of the two batch forms |
| `isEnvelopeForm` | Type guard discriminator on `classSectionId` |

> [!NOTE]
> `singleAttendanceRecordBaseSchema` exists separately from `SingleAttendanceRecordSchema` because `.superRefine()` returns a `ZodEffects`, and Zod forbids `.extend()` on a `ZodEffects`. Both variants therefore extend the *base object* and then apply the same shared `refineStudentOrCancellation` callback.

**Status cleansing rules** (`cleanseExcelStatus`) - case, whitespace and separators are normalised before matching:

| Input (any case / spacing) | Canonical |
| :--- | :--- |
| `p`, `present`, `pr` | `P` |
| `a`, `absent`, `ab`, `abs` | `A` |
| `half day`, `half_day`, `hd` | `HALF_DAY` |
| `activity`, `act`, `function`, `outing`, `dance`, `sports` | `ACTIVITY` |
| `on leave`, `leave`, `ol` | `ON_LEAVE` |
| `cancelled`, `canceled`, `cancel`, `holiday`, `school holiday` | `CANCELLED` |

Anything unrecognised is returned untouched so `AttendanceStatusSchema` raises a field-scoped error rather than the cleanser guessing.

> [!WARNING]
> **Deliberate divergence from the original brief**: the brief mapped `function` -> `CANCELLED`. This module maps it to `ACTIVITY` instead, because `ACTIVITY` is already defined as *"a full present day (school function / outing)"*. Mapping a held session to `CANCELLED` would remove it from the working-day denominator and **understate** class attendance. A genuine non-session day is expressed as `holiday` / `CANCELLED`.

**Conditional rules** (`refineStudentOrCancellation`):
- `CANCELLED` -> `studentId` must be absent, `remarks` is **required**.
- Every other status -> `studentId` is **required**.

**Identifier coercion**: `studentId` accepts `string | number` (Excel writes text or numbers depending on column formatting) and is normalised to a trimmed string; `sessionDate` must be `YYYY-MM-DD` *and* a real calendar date (rejects `2026-02-31`).

#### 1b. Session DTOs ([attendance.dto.ts](file:///c:/Users/av311/Desktop/NGO-app/backend/src/dtos/attendance.dto.ts))
- **Strict Zod Validation Schemas**:
  - `batchUpsertAttendanceSchema`: Validates `classId`, `sessionDate` (YYYY-MM-DD), and array of student records (`studentId`, `status` over `STUDENT_MARKABLE_STATUSES` = `P | A | HALF_DAY | ACTIVITY | ON_LEAVE`, optional `remarks`). Limit 1–200 records per batch.
  - `cancelClassAttendanceSchema`: Requires `classId`, `sessionDate`, and mandatory `remarks` for class-wide session cancellation.
  - `uncancelClassAttendanceSchema`: Requires `classId` and `sessionDate`.
  - `dailyRegisterQuerySchema`: Requires `classId` and `sessionDate`.
  - `monthlyAnalyticsQuerySchema`: Validates `classId`, `year` (2000–2100), and `month` (1–12).
  - `riskAnalyticsQuerySchema`: Extends monthly analytics query with optional `minRiskLevel` (`STABLE`, `WATCH`, `AT_RISK`, `CRITICAL`).
  - `attendanceFilterQuerySchema`: Enforces pagination (`page`, `limit` default 50, max 200), optional `classId`, `studentId`, `sessionDate`, `fromDate`, `toDate`, and `status`.

### 2. Business Rules & Calculation Engine ([attendanceCalculator.utils.ts](file:///c:/Users/av311/Desktop/NGO-app/backend/src/utils/attendanceCalculator.utils.ts) & [attendance.constants.ts](file:///c:/Users/av311/Desktop/NGO-app/backend/src/constants/attendance.constants.ts))

- **Present-Day Weights**:
  - `P` (Present): `1.0`
  - `ACTIVITY` (School event/outing): `1.0`
  - `HALF_DAY`: `0.5`
  - `A` (Absent): `0.0`
  - `ON_LEAVE` (authorised leave): `0.0`
  - `CANCELLED`: Excluded from working-day denominator.
- **Attendance Percentage Formula**:
  $$\text{Attendance \%} = \frac{\text{Weighted Present Days}}{\text{Total Class Working Days}} \times 100$$
- **Streak Calculation**: Tracks current consecutive absences and maximum consecutive absence streaks across active working days. **`ON_LEAVE` deliberately does not extend an absence streak** - a student on approved medical leave must not be escalated to `AT_RISK`/`CRITICAL` merely for taking leave. `ON_LEAVE` is surfaced separately as `leaveDays` / `leaveCount` so it is never silently invisible.
- **Risk Level Thresholds**:
  - `CRITICAL`: Attendance $< 60\%$ OR Max Consecutive Absences $\ge 5$
  - `AT_RISK`: Attendance $< 75\%$ OR Max Consecutive Absences $\ge 3$
  - `WATCH`: Attendance $< 85\%$
  - `STABLE`: Attendance $\ge 85\%$

> [!IMPORTANT]
> **The weight table is a compile-time contract.** `ATTENDANCE_PRESENT_WEIGHT` is typed as `Record<AttendanceStatusValue, number>`, and `presentWeight()` indexes it directly:
> ```ts
> return ATTENDANCE_PRESENT_WEIGHT[status] ?? 0;
> ```
> Without the `Record` type a newly added enum value yields `undefined`, turning the running weighted-present sum into **`NaN`**; `resolveRiskLevel(NaN, ...)` then falls through every `<` comparison and returns **`STABLE`** - i.e. the *healthiest* risk band for a student whose percentage is `NaN`. That is a silent reporting failure, so the `Record` annotation is kept deliberately to turn it into a build error.
>
> **Checklist when adding an `AttendanceStatus`:** add it to `ATTENDANCE_STATUS_VALUES`, `ATTENDANCE_PRESENT_WEIGHT`, `STUDENT_MARKABLE_STATUSES`, the frontend `ATTENDANCE_STATUSES`, create a Prisma migration, and regenerate the client (`npx prisma generate`).

### 3. Database Layer & Atomic Operations ([attendance.repository.ts](file:///c:/Users/av311/Desktop/NGO-app/backend/src/repositories/attendance.repository.ts))
- Uses Prisma ORM with HeatWave/MySQL compatibility.
- **`upsertStudentRecords`**: Executes an atomic Prisma transaction (`prisma.$transaction`) to upsert individual student attendance records per session date.
- **`cancelClassSession`**: Atomically deletes individual student records for that date and creates/updates a class-wide cancellation record (`studentId: null`, `status: CANCELLED`).
- **`uncancelClassSession`**: Deletes class-wide cancellation record to reopen session date for marking.

### 4. Service Layer ([attendance.service.ts](file:///c:/Users/av311/Desktop/NGO-app/backend/src/services/attendance.service.ts))
- Handles validation checks (e.g., verifying class existence, checking if date is cancelled before allowing batch marking).
- Sanitizes PII (`firstName`, `lastName`, `studentIdCode`) in responses and structured JSON logging.
- `BigInt` ID handling safely serialized to string.
- `bulkUploadAttendanceByClass`: per-class bulk upsert backing the envelope form of `POST /attendance/batch-upload`.
- `bulkUploadAttendance`: multi-class bulk upsert backing the code form; resolves `schoolCode` / `className` / `academicYear` to primary keys and delegates to the existing primitives.

### 5. Controllers & Routes ([attendance.controller.ts](file:///c:/Users/av311/Desktop/NGO-app/backend/src/controllers/attendance.controller.ts))
- TSOA OpenAPI auto-generated spec & route annotations (`@Tags('Attendance')`, `@Route('attendance')`, `@provide(AttendanceController)`).
- Zod is invoked as `schema.parse(requestBody)` inside the controller; the central `globalErrorHandler` maps any `ZodError` to a `400` with per-field paths. No framework validation pipe is required.

> [!NOTE]
> The `@Body()` parameter of `bulkUploadAttendance` is typed as the plain interface `AttendanceUploadRequestBody` rather than the Zod-inferred union. TSOA must resolve the declared parameter type when generating routes/OpenAPI and cannot introspect `z.infer<typeof SomeUnionSchema>`. The interface documents both accepted shapes for the spec; `AttendanceUploadRequestSchema` remains the authoritative runtime gate.


---

## Bulk Upload Write Semantics (`POST /attendance/batch-upload`)

`bulkUploadAttendanceByClass` performs the following, in order:

1. **Class ownership check** - `prisma.classSection.findFirst({ where: { id: classSectionId, schoolId } })`. A class that exists but belongs to a different school yields a `404`, not a silent cross-school write.
2. **Student verification (single round-trip)** - all distinct `studentId` codes are resolved with **one** `prisma.student.findMany({ where: { schoolId, studentIdCode: { in: [...] } } })`, then indexed into an `O(1)` `code -> primary key` map. Unresolved codes become **row-scoped errors** (with the correct `rowIndex`) rather than aborting the whole batch, so the wizard can highlight the exact cells.
3. **Write-set construction** - resolved rows only.
4. **Class-wide cancellations** - collected into a `(sessionDate -> remarks)` map; `CANCELLED` never carries a student.
5. **Atomic write** - a single `prisma.$transaction` with chunks of `CHUNK_SIZE = 200` to stay clear of SQL parameter limits. Any failure rolls the **whole** upload back and surfaces as a `500`.

> [!WARNING]
> **`createMany({ skipDuplicates: true })` is deliberately NOT used.** Despite being frequently described as an "upsert", it *discards* conflicting rows rather than updating them. Re-uploading a corrected sheet (e.g. `A` -> `P`) would leave the stale value in place while still reporting success. Real `tx.attendance.upsert()` is used against the unique index `uq_session_class_student (session_date, class_id, student_id)` instead, so re-uploads **correct** rather than silently no-op.

> [!NOTE]
> **Class-wide cancellations need a different write path.** Prisma cannot match `studentId: null` inside a compound-unique `where` clause, so the class-wide row is located with an explicit `findFirst({ where: { classSectionId, sessionDate, studentId: null } })` and then updated or created - still inside the same transaction. MySQL treats `NULL`s as distinct in a unique index, so multiple class-wide rows for one date cannot collide.

---

## Database Migrations

| Migration | Purpose |
| :--- | :--- |
| `20260923205125_init_schema` | Initial schema. **Created `attendance.status` with only five enum values**, omitting `ON_LEAVE`. |
| `20260926000000_attendance_status_on_leave` | Re-declares `attendance.status` to include `ON_LEAVE`. |

> [!CAUTION]
> `ON_LEAVE` was present in `schema.prisma` but was **never migrated**, so `schema.prisma` and the migration history were out of sync and any `ON_LEAVE` insert failed with MySQL error 1265 (*Data truncated for column 'status'*) against a database built from the initial migration. Run `npx prisma migrate deploy` (and `npx prisma generate` after pulling) before deploying code that writes `ON_LEAVE`.
>
> `ON_LEAVE` was present in `schema.prisma` but was **never migrated**, so `schema.prisma` and the migration history were out of sync and any `ON_LEAVE` insert failed with MySQL error 1265 (*Data truncated for column 'status'*) against a database built from the initial migration. Run `npx prisma migrate deploy` (and `npx prisma generate` after pulling) before deploying code that writes `ON_LEAVE`.
>
> The pre-existing `uq_session_class_student` unique index and `idx_att_date_class` already cover `(session_date, class_id, student_id)` and `(session_date, class_id)` respectively, so no index migration was required.

---

## API Endpoints Registry

| Method | Endpoint | Description | Query / Body Params |
| :--- | :--- | :--- | :--- |
| `POST` | `/attendance/batch` | Batch mark/update attendance for one class session (numeric FKs) | Body: `{ classId, sessionDate, records: [{ studentId, status, remarks }] }` |
| `POST` | `/attendance/batch-upload` | **Bulk upload from Excel. Accepts two shapes** (see below) | Envelope: `{ schoolId, classSectionId, records: [...] }` &middot; Code: `{ records: [{ schoolCode, className, academicYear, sessionDate, studentId, status, remarks }] }` |
| `POST` | `/attendance/cancel-class` | Cancel entire class session for a specific date | Body: `{ classId, sessionDate, remarks }` |
| `POST` | `/attendance/uncancel-class` | Remove cancellation flag for a class session date | Body: `{ classId, sessionDate }` |
| `GET` | `/attendance/register` | Get daily attendance register grid for a class section | Query: `classId`, `sessionDate` |
| `GET` | `/attendance/monthly-analytics` | Get monthly class attendance analytics & student metrics | Query: `classId`, `year`, `month` |
| `GET` | `/attendance/risk-analytics` | Get student risk analytics filtered by minimum risk level | Query: `classId`, `year`, `month`, `minRiskLevel` |
| `GET` | `/attendance` | List paginated attendance records | Query: `page`, `limit`, `classId`, `studentId`, `sessionDate`, `fromDate`, `toDate`, `status` |
| `GET` | `/attendance/{id}` | Get individual attendance record by BigInt ID | Path: `id` |
| `PUT` | `/attendance/{id}` | Update individual attendance status or remarks | Path: `id`, Body: `{ status, remarks }` |
| `DELETE` | `/attendance/{id}` | Delete attendance record by BigInt ID | Path: `id` |

### `POST /attendance/batch-upload` - two accepted shapes

`classSectionId` is the discriminator (`isEnvelopeForm`).

**Envelope form** - the class is named once by primary key, so the class of every student is implied:
```json
{
  "schoolId": 1,
  "classSectionId": 12,
  "records": [
    { "studentId": "EDSF-349", "sessionDate": "2026-01-05", "status": "P" },
    { "studentId": 350, "sessionDate": "2026-01-05", "status": "ON_LEAVE", "remarks": "Medical" },
    { "sessionDate": "2026-01-06", "status": "CANCELLED", "remarks": "School function" }
  ]
}
```

**Code form** - each row names its class by human-readable code, so one sheet may span several classes (what the Excel matrix/grid pivot produces):
```json
{
  "records": [
    { "schoolCode": "SCH-001", "className": "6A", "academicYear": "2026-2027",
      "sessionDate": "2026-01-05", "studentId": "EDSF-349", "status": "P" }
  ]
}
```

Both return `BulkAttendanceUploadResultDTO`:
```json
{
  "totalRows": 3, "created": 3, "skipped": 0, "failed": 0,
  "cancellations": 1, "sessionsProcessed": 2,
  "records": [],
  "errors": [{ "rowIndex": 4, "columnName": "studentId", "invalidValue": "EDSF-999",
               "errorMessage": "Student \"EDSF-999\" was not found in school ID 1. ...",
               "severity": "ERROR" }]
}
```

### Response field additions

`DailyRegisterResponseDTO` gained `leaveCount`; `StudentMonthlyAnalyticsDTO` gained `leaveDays`.
