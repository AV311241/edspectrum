# Lumino1 - Parent Interaction Register

## Overview
The **Parent Interaction Register** records each parent-teacher conversation: what was discussed, what was shared with the parent, what the parent committed to, and when the next interaction is due. It is uploaded in bulk from the "Parent Interaction" Excel sheet and then queried for follow-up lists and reporting.

> [!NOTE]
> **Route mount path**: TSOA routes are registered at the application root, not under `/api/v1` (see `CONTEXT.md` section 4). The product specification names `/api/parent-interactions/...`, so a real Express router is mounted at `/api` and forwards to the **same controller singleton**. Both spellings are live and cannot drift apart.

---

## 1. Architecture

| Layer | Location | Responsibility |
| :--- | :--- | :--- |
| Repository | `backend/src/repositories/parentInteraction.repository.ts` | Bulk insert (`createMany`), filter bag -> Prisma `where`, paginated reads, count |
| Service | `backend/src/services/parentInteraction.service.ts` | Input formatting: date coercion, `visitNo` parsing, vocabulary normalisation, row-level error capture, DTO mapping |
| Controller | `backend/src/controllers/parentInteraction.controller.ts` | TSOA routes at `/parent-interactions/*`; delegates validation to Zod, then to the service |
| Routes alias | `backend/src/routes/parentInteraction.routes.ts` | `/api/parent-interactions/*`; resolves the controller from the IoC container **lazily on first request** |
| Constants | `backend/src/constants/parentInteraction.constants.ts` | Canonical `mode` / `status` / `relation` vocabularies + alias tables |
| DTOs | `backend/src/dtos/parentInteraction.dto.ts` | Zod schemas, request/response contracts, `ParentInteractionFilterOptions` |

### Design decisions worth knowing

- **The table is deliberately denormalised.** `studentName` and `class` are text snapshots of the sheet, and `studentId` holds the human-facing student **code** (`Student.studentIdCode`), *not* `students.id`. A register is a historical document: renaming a student or a class later must not rewrite what was actually discussed with that parent on that date.
- **No foreign key on `studentId`, on purpose.** An unmatched code must still be recorded rather than rejected - losing a real parent-teacher conversation is worse than storing a dangling code. A nullable `studentRefId` FK was considered and rejected for this reason.
- **`relation` / `mode` / `status` are `String`, not Prisma enums.** An enum makes the database reject any value not yet listed, which would mean a migration for every new contact mode a programme introduces. Normalisation at the service layer gives the same exact-match grouping guarantee while staying forward-compatible.
- **Partial success is the model.** Each row is normalised independently; one unparseable row becomes a `RowErrorDTO` and never aborts the batch. Only rows that survive normalisation reach the single bulk `INSERT`.

---

## 2. Database schema changes

Migration `20260930090000_parent_interactions` - **additive only**. It creates one table and touches no existing table, column, index or enum, so it is safe to apply to a database already carrying live programme data.

| Column | Type | Null | Notes |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` PK AUTO_INCREMENT | no | |
| `student_id` | `VARCHAR(100)` | no | Student **code**, not a FK |
| `student_name` | `VARCHAR(200)` | no | Text snapshot from the sheet |
| `class` | `VARCHAR(100)` | no | Text snapshot from the sheet |
| `parent_name` | `VARCHAR(150)` | no | |
| `relation` | `VARCHAR(50)` | yes | Normalised to `PARENT_RELATIONS` |
| `date` | `DATE` | no | When the interaction happened; `@db.Date` so no time-of-day skew |
| `mode` | `VARCHAR(50)` | yes | Normalised to `PARENT_INTERACTION_MODES` |
| `visit_no` | `INTEGER` | yes | Running number entered by the user, not a DB sequence |
| `purpose` | `TEXT` | yes | |
| `parent_shared` | `TEXT` | yes | What was shared with the parent |
| `key_notes` | `TEXT` | yes | |
| `observation` | `TEXT` | yes | |
| `commitment` | `TEXT` | yes | What the parent committed to |
| `next_date` | `DATE` | yes | Drives the follow-up reminder list |
| `next_interaction` | `VARCHAR(255)` | yes | |
| `objective` | `TEXT` | yes | |
| `status` | `VARCHAR(50)` | yes | Default `PLANNED` |
| `photo_url` | `VARCHAR(500)` | yes | |
| `created_at` | `DATETIME(3)` | no | `DEFAULT CURRENT_TIMESTAMP(3)` |
| `updated_at` | `DATETIME(3)` | no | |

Indexes: `student_id`, `class`, `date`, `next_date`, `status`, `mode` - covering the exact filter set the `GET` endpoint exposes.

### Vocabularies

| Field | Canonical values |
| :--- | :--- |
| `mode` | `PHONE_CALL`, `IN_PERSON`, `HOME_VISIT`, `SCHOOL_MEETING`, `SMS`, `WHATSAPP`, `VIDEO_CALL`, `OTHER` |
| `status` | `PLANNED` (default), `COMPLETED`, `FOLLOW_UP`, `CANCELLED` |
| `relation` | `FATHER`, `MOTHER`, `GRANDFATHER`, `GRANDMOTHER`, `UNCLE`, `AUNT`, `SIBLING`, `LEGAL_GUARDIAN`, `OTHER` |

Spreadsheet shorthands are folded onto these tokens by `normaliseInteractionMode` / `normaliseInteractionStatus` / `normaliseParentRelation`: `"Phone call"`, `"phone-call"` and `"PHONE_CALL"` all resolve to `PHONE_CALL`. An unrecognised value becomes `OTHER` rather than being rejected.

## 3. Endpoints

| Method | Canonical (root) | Alias | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/parent-interactions/upload` | `/api/parent-interactions/upload` | Bulk upload the register |
| `GET` | `/parent-interactions` | `/api/parent-interactions` | List entries, newest interaction first |
| `GET` | `/parent-interactions/:id` | `/api/parent-interactions/:id` | Single entry by ID |

> [!WARNING]
> **Response envelope differs by path.** TSOA routes return the **bare DTO** (true of every pre-existing endpoint in this app). The `/api` alias wraps its payload in `{ success, statusCode, message, data }`, matching `/api/v1/metrics/*`. Clients must read the correct one for the path they call.

### `POST .../upload` - payload example

Accepts a `Date`, an ISO `YYYY-MM-DD` string, **or a raw Excel serial number** for any date cell. `visitNo` accepts `2`, `"2"` or `"2nd"`.

```json
{
  "records": [
    {
      "studentId": "EDSF-001",
      "studentName": "Asha Verma",
      "class": "Grade 5-A",
      "parentName": "Ramesh Verma",
      "relation": "father",
      "date": "2026-09-15",
      "mode": "Phone call",
      "visitNo": "2nd",
      "purpose": "Discuss term 1 progress",
      "parentShared": "Half-yearly report card",
      "keyNotes": "Parent will ensure daily reading",
      "observation": "Child is attentive at home",
      "commitment": "Parent to check homework daily",
      "nextDate": "2026-10-15",
      "nextInteraction": "Follow-up call",
      "objective": "Improve reading fluency",
      "status": "Completed",
      "photoUrl": "https://example.com/photo1.jpg"
    },
    {
      "studentId": "EDSF-002",
      "studentName": "Bilal Khan",
      "class": "Grade 5-A",
      "parentName": "Fatima Khan",
      "relation": "Mother",
      "date": 46298,
      "mode": "Home visit",
      "visitNo": 1
    }
  ]
}
```

**Response** - the shared `BatchUploadResultDTO`, with the rows normalised:

```json
{
  "totalRows": 3, "created": 2, "skipped": 0, "failed": 1,
  "records": [
    {
      "id": 1,
      "studentId": "EDSF-001",
      "studentName": "Asha Verma",
      "class": "Grade 5-A",
      "parentName": "Ramesh Verma",
      "relation": "FATHER",
      "date": "2026-09-15",
      "mode": "PHONE_CALL",
      "visitNo": 2,
      "purpose": "Discuss term 1 progress",
      "parentShared": "Half-yearly report card",
      "keyNotes": "Parent will ensure daily reading",
      "observation": "Child is attentive at home",
      "commitment": "Parent to check homework daily",
      "nextDate": "2026-10-15",
      "nextInteraction": "Follow-up call",
      "objective": "Improve reading fluency",
      "status": "COMPLETED",
      "photoUrl": "https://example.com/photo1.jpg",
      "createdAt": "2026-09-30T18:05:53.672Z",
      "updatedAt": "2026-09-30T18:05:53.672Z"
    }
  ],
  "errors": [
    {
      "rowIndex": 4,
      "columnName": "date",
      "invalidValue": null,
      "errorMessage": "date (row 4) must be formatted YYYY-MM-DD",
      "severity": "ERROR"
    }
  ]
}
```

`rowIndex` is 1-based **including the header row**, so it matches what the user sees in Excel. The second record's `date: 46298` is an Excel serial and is stored as `2026-10-03`; `visitNo: "2nd"` is stored as `2`.

### `GET ...` - filters

| Parameter | Type | Notes |
| :--- | :--- | :--- |
| `page` | number | default `1` |
| `limit` | number | default `50`, max `500` |
| `studentId` | string | Exact student code |
| `className` | string | Exact class snapshot (exposed as `className` because `class` is a SQL reserved word) |
| `parentName` | string | Exact match, case-insensitive via the `utf8mb4_unicode_ci` column collation |
| `relation` / `mode` / `status` | string | Normalised server-side, so `mode=Phone call` works |
| `fromDate` / `toDate` | `YYYY-MM-DD` | Inclusive range, applied to the **interaction** date |
| `search` | string | Substring across student name, parent name, student id, class (case-insensitive via column collation) |

Results are ordered `date DESC, id DESC` - newest interaction first.

**Response**: `{ records, total, page, limit, totalPages }`.

---

## 4. Implementation notes worth knowing

- **Excel serial conversion.** Excel's day zero is `1899-12-30`, not `1899-12-31`, because Lotus 1-2-3 treated 1900 as a leap year. `parseRegisterDate` therefore adds `Date.UTC(1899, 11, 30)` and range-checks the serial to a plausible 1990-2090 window, so a stray number is reported as a row error instead of silently becoming a year-4500 date.
- **The `nextDate >= date` guard.** A follow-up date earlier than the interaction itself is rejected, because it would corrupt the follow-up reminder list.
- **`createMany` returns no rows on MySQL.** The repository wraps the insert and the re-read in one transaction, capturing the auto-increment high-water mark *before* the insert so a concurrent upload cannot have its rows attributed to this request.
- **The alias resolves its controller lazily.** `inversify-binding-decorators` builds the provider module from `@provide` metadata present at `container.load()` time, so an eager top-level `iocContainer.get(...)` in a router throws "No matching bindings found". See the `ioc.ts` comment block and `CONTEXT.md` section 4.
- **No `mode: 'insensitive'` in Prisma filters.** Prisma 6.19.3 removed the `mode` key from `StringFilter`, so passing it is a compile error. Case-insensitive `equals` / `contains` instead come from the table's `utf8mb4_unicode_ci` collation, which is what `StudentRepository` already relies on.

