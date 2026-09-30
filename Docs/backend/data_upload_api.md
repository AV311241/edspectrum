# Lumino1 - Centralized Bulk Data Upload (Excel)

## Overview
The **Data Upload** page (`/data-upload`) provides a single, centralised Excel-to-database pipeline for four entity types: **Classes Master**, **Students Master**, **Daily Attendance**, and **Baseline Assessments**. It follows a five-step wizard and performs full client-side parsing and validation *before* any network request is issued.

> [!NOTE]
> **Route mount path**: TSOA routes are registered at the application root, not under `/api/v1` (see `attendance_api.md` for the full explanation). The endpoint paths below are the actual effective paths.

---

## 1. Architecture

| Layer | Location | Responsibility |
| :--- | :--- | :--- |
| Wizard page | `frontend/src/app/features/data-upload/data-upload-page.component.ts` | Signal-based state machine, step orchestration, row exclusion, commit |
| Sub-components | `features/data-upload/components/` | `upload-dropzone`, `validation-error-matrix`, `data-grid-editor` |
| Shared base | `frontend/src/app/core/services/bulk-upload-base.service.ts` | Parse / validate / dispatch scaffolding (**abstract, not `@Injectable`**) |
| Entity services | `core/services/{class,student,attendance}-upload.service.ts`, `core/services/baseline-assessment-upload.service.ts` | Isolated validation rules + endpoint dispatch per entity |
| Excel utils | `core/utils/excel-upload.utils.ts` | SheetJS parsing, header detection, Excel-serial dates, boolean coercion, template writer |
| Models | `core/models/upload.models.ts` | `ValidationError`, `ValidationResult<T>`, `ColumnSpec`, `DataGrid` |
| Backend DTOs | `backend/src/dtos/{class,student,attendance}-upload.dto.ts` | Zod request contracts |
| Backend shared | `backend/src/dtos/upload-common.dto.ts` | `RowErrorDTO`, `BatchUploadResultDTO`, reusable field schemas |

### Design decisions worth knowing

- **Each service declares its own constructor.** Angular cannot inherit a constructor from an undecorated base class (`NG2006`), so every concrete subclass declares `constructor(http: HttpClient) { super(http); }`.
- **The grid is the source of truth, not the `File`.** Parsing produces a `DataGrid` of raw cell strings; the rule engine then runs over that grid. This is what makes inline cell editing and row exclusion work - the same `validateGrid()` path runs for a freshly parsed file and for an edited grid.
- **Cross-row rules use a `crossRowRules()` hook**, returning errors keyed by row index, so duplicates are decided across the whole file rather than per row.
- **Code-based payloads.** The spreadsheet speaks human-readable codes (`schoolCode`, `className`, `studentId`); the services resolve those to numeric primary keys server-side in **bulk** queries. The frontend never needs a `schools` endpoint (none exists).

---

## 2. Endpoints

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| `POST` | `/classes/batch` | Bulk-create class sections from codes |
| `POST` | `/students/batch` | Bulk-create students + enrol them into classes |
| `POST` | `/attendance/batch-upload` | Bulk upsert attendance (row-based **and** Excel matrix) |
| `POST` | `/baseline-assessments/import` | Bulk-create baseline assessments with all 35 rubric ratings |
| `POST` | `/parent-interactions/upload` | Bulk-create Parent Interaction register entries (see [`parent_interaction_api.md`](file:///c:/Users/av311/Desktop/NGO-app/Docs/backend/parent_interaction_api.md)) |

Each returns `BatchUploadResultDTO`:

```json
{
  "totalRows": 12, "created": 10, "skipped": 1, "failed": 1,
  "records": [],
  "errors": [{ "rowIndex": 5, "columnName": "studentId", "invalidValue": "EDSF-999",
               "errorMessage": "Student \"EDSF-999\" already exists in school \"SCH-001\". Row skipped.",
               "severity": "ERROR" }]
}
```

`RowErrorDTO` deliberately mirrors the frontend `ValidationError`, so a problem detected client-side and one detected server-side render in the **same** error matrix.

> [!NOTE]
> **Partial success is the model, not all-or-nothing.** Each row is processed independently; one bad row never aborts the batch. Failures are collected and returned as row-scoped errors.

---

## 3. Excel Contracts

### Classes Master
| Column | Required | Rule |
| :--- | :--- | :--- |
| `schoolCode` | Yes | Non-empty; must already exist in the Schools master |
| `className` | Yes | Non-empty, free text (`6A`, `8th A`) |
| `academicYear` | Yes | Must match `^\d{4}-\d{4}$` |
| `section` | No | Defaults to `"A"` |
| `name` | No | Defaults to `"<schoolCode> <className>"` |
| `capacity` | No | Whole number 1-500, defaults to 40 |

**Duplicate rule**: `schoolCode` + `className` + `academicYear` must be unique within the file (case-insensitive). The first occurrence is kept; later duplicates are flagged.

### Students Master
| Column | Required | Rule |
| :--- | :--- | :--- |
| `studentId` | Yes | Unique within the file (case-insensitive) |
| `schoolCode` | Yes | Must already exist |
| `className` | Yes | Must already exist for that school + academic year |
| `academicYear` | Yes | `^\d{4}-\d{4}$` |
| `studentName` | Yes | Non-empty; split into first/last name server-side |
| `isActive` | No | `TRUE`/`FALSE`, `1`/`0`, `YES`/`NO`, `active`/`inactive`. **Defaults to `true` when blank**; an unrecognised value is a hard `ERROR`, never a silent default |

### Daily Attendance
| Column | Required | Rule |
| :--- | :--- | :--- |
| `schoolCode` | Yes | Must already exist |
| `className` | Yes | Must already exist for that school + academic year |
| `academicYear` | Yes | `^\d{4}-\d{4}$` |
| `sessionDate` | Yes | `YYYY-MM-DD` or an Excel serial date (auto-converted) |
| `studentId` | Conditional | Required for every status **except** `CANCELLED` |
| `status` | Yes | `P`, `A`, `HALF_DAY`, `ACTIVITY`, `ON_LEAVE`, `CANCELLED` (case-insensitive, plus documented synonyms) |
| `remarks` | Conditional | **Required when `status` is `CANCELLED`** |

**Class-cancellation rule**: `status === 'CANCELLED'` may omit `studentId` but must supply `remarks` (e.g. *"School function"*, *"Teacher on leave"*). It produces a class-wide record with `studentId = null` and removes that date from the working-day denominator.

**Duplicate rule**: a student may hold only one mark per `(class, sessionDate)`.

#### Supported layouts
1. **Row-based** - one record per row, as in the table above.
2. **Matrix / grid** - dates across row 1, student IDs down column A. Blank cells mean "unmarked" and are skipped. The grid is **pivoted** into the same logical row shape, so validation, inline editing and dispatch are format-agnostic.

   ```
   schoolCode: SCH-001   className: 6A   academicYear: 2026-2027
   Student ID | 2026-01-05 | 2026-01-06 | 2026-01-07
   EDSF-349   | P          | A          | HALF_DAY
   EDSF-350   | A          | P          | (blank)
   ```

   Metadata is auto-detected from a `schoolCode: / className: / academicYear:` row near the top. If absent, the wizard exposes a **Matrix Context** panel where the class is supplied manually.

### Baseline Assessments
| Column | Required | Rule |
| :--- | :--- | :--- |
| `Student_ID` | Yes | Must already exist in the Students master |
| `Assessment_Date` | Yes | `YYYY-MM-DD` or an Excel serial date (auto-converted) |
| `Assessor` | Yes | Non-empty; **a blank value falls back to `"Assessor"` with a `WARNING`** |
| `Status` | No | `Present`, `Absent`, `Partial` (case-insensitive). **Defaults to `Present`** |
| `Key_Support_Flag` | No | Free text |
| `Oral_Flag` | No | `C0`, `C1`, `C2`, `C3` |
| `QC_Notes` | No | Free text |
| `V1`-`V5` | No | Vocabulary rubric items |
| `G1`-`G5` | No | Grammar rubric items |
| `P1`-`P5` | No | Phrase & Sentence rubric items |
| `L1`-`L5` | No | Listening rubric items |
| `S1`-`S5` | No | Speaking rubric items |
| `R1`-`R5` | No | Reading rubric items |
| `W1`-`W5` | No | Writing rubric items |

**Rubric rule**: every one of the 35 rating cells must be a whole number `0`-`4`, or `AB` / blank for "not rated". Anything else is a hard `ERROR`.

**Status rules**:
- A student marked `Absent` has **all 35 rubric ratings discarded**, whatever the sheet carried.
- A student that is *not* marked `Absent` must have **at least one** rated item, otherwise the row is rejected.

**Duplicate rule**: `studentId` + `assessmentDate` must be unique within the file (case-insensitive). The first occurrence is kept; later duplicates are flagged.

> [!NOTE]
> **Response shape.** `/baseline-assessments/import` predates the shared batch contract and answers `{ importedCount, records }`. `BaselineAssessmentUploadService.dispatch()` maps that onto `BatchUploadResultDTO` (`totalRows` / `created` / `failed`) so the shared success view renders it unchanged.

---

## 4. Wizard Flow

| Step | Action |
| :--- | :--- |
| 1 | Select entity type (Classes / Students / Attendance / Baseline Assessments cards) |
| 2 | Download a sample `.xlsx` template (generated client-side, includes an Instructions sheet) |
| 3 | Drag & drop or browse for the file. Accepts `.xlsx`, `.xls`, `.csv`, max 10 MB |
| 4 | Validation summary + error matrix + inline grid editor |
| 5 | Save to database |

**Row-exclusion model (approved design)**: rows with errors are blocked, but a user may *exclude* them and submit the clean subset. `Save` is enabled as soon as at least one clean, non-excluded row remains. This is why the button is not gated on "zero errors".

The error matrix provides a **"Show Errors Only"** toggle, an `ALL / ERROR / WARNING` severity filter, per-row `Exclude` / `Restore`, and bulk `Exclude all N error rows` / `Reset exclusions`.

Inline cell editing re-runs the rule engine on every commit, so the summary and matrix update immediately without re-uploading the file.

---

## 5. Verification Status

| Check | Result |
| :--- | :--- |
| `backend` `npm run build` (tsoa regen + `tsc`) | Pass |
| `frontend` `ng build` | Pass (pre-existing bundle-budget warning from `xlsx`) |
| Vitest suite | **38 passing** (9 classes / 9 students / 19 attendance) |
| `app.spec.ts` "should render title" | **Fails - pre-existing**, unrelated to this feature (expects scaffold text `Hello, frontend`; `app.html` contains only the layout shell) |

> [!TIP]
> **Latent bug that was found, fixed and guarded.** The matrix pivot produces multiple logical rows sharing one `rowIndex` (one per date column). An earlier implementation resolved raw cells with `rawRows.find(r => r.rowIndex === row.rowIndex)`, which handed every row after the first the *first* row's `sessionDate`. `annotate()` now uses the row **by identity**, and a regression test ("gives every pivoted row its OWN sessionDate") locks the behaviour in.
