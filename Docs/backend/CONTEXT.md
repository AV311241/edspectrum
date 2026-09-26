# Lumino1 Backend Master Context Map

> [!IMPORTANT]
> ### SYSTEM INSTRUCTION FOR AI AGENTS & ASSISTANTS
> 1. **Default Context Boundary**: By default, read ONLY this master file (`CONTEXT.md`). It contains the complete structural overview, architecture summary, and key system contracts.
> 2. **Targeted Deep-Dive Access**: Do NOT load sub-documents into your context window unless a task explicitly requires specific information contained within those paths.
> 3. **Mandatory Documentation Sync Rule**: Every single time code is changed, a new feature is successfully implemented, or an architectural decision is made, you **MUST** automatically update the relevant sub-documentation files AND this master index (`CONTEXT.md`) to reflect the changes before concluding the task.

---

## 1. High-Level Backend Summary
- **Project**: Lumino1 NGO Baseline Assessment Backend
- **Architecture**: Clean Layered Architecture (`Controller -> Service -> Repository`) with Inversify IoC & TSOA OpenAPI Spec Generation.
- **Runtime**: Node.js 24 LTS, TypeScript 5.x, Express.js 4.x, Prisma ORM (HeatWave/MySQL).
- **Validation & Error Handling**: Zod Schema DTO validation middleware, TSOA validation errors, Prisma known code mapping (`P2002` $\rightarrow$ `409 Conflict`), operational `AppError` exception hierarchy.
- **Security & Logging**: Helmet, CORS, Winston structured JSON logging with PII sanitization (`sanitizePII`).

---

## 2. Modular Sub-Documentation Context Map

When detailed context is required for specific tasks, refer strictly to the following file paths:

| Sub-Document Path | Scope & Focus Area | Read When You Need... |
| :--- | :--- | :--- |
| [`Docs/backend/architecture.md`](file:///c:/Users/av311/Desktop/NGO-app/Docs/backend/architecture.md) | Structural layout, layer boundaries, calculation pipeline, and bi-directional Excel import/export logic. | Refactoring layers, adding new domain logic, or modifying stage calculation rules. |
| [`Docs/backend/configuration.md`](file:///c:/Users/av311/Desktop/NGO-app/Docs/backend/configuration.md) | `.env` variables, database pool config, security middleware parameters (Helmet/CORS). | Adding environment variables, database configuration, or security policies. |
| [`Docs/backend/tracking.md`](file:///c:/Users/av311/Desktop/NGO-app/Docs/backend/tracking.md) | Full API Route Registry for Students, Classes, Attendance, and Baseline Assessments. | Adding new API endpoints, modifying request/response DTOs, or auditing route specs. |
| [`Docs/backend/student_class_api.md`](file:///c:/Users/av311/Desktop/NGO-app/Docs/backend/student_class_api.md) | Student & Class Section CRUD, enrollment, unenrollment, class transfers, capacity checks, and Prisma transaction architecture. | Inspecting or modifying Student and Class management features. |
| [`Docs/backend/attendance_api.md`](file:///c:/Users/av311/Desktop/NGO-app/Docs/backend/attendance_api.md) | Daily attendance marking, batch upserts, session cancellations, daily register grids, monthly analytics, risk level formulas, the canonical bulk-upload Zod schema, and the `ON_LEAVE` status. | Inspecting or modifying Attendance tracking, calculation rules, status weights, or risk algorithms. |
| [`Docs/backend/data_upload_api.md`](file:///c:/Users/av311/Desktop/NGO-app/Docs/backend/data_upload_api.md) | The centralized Excel bulk-upload pipeline: Classes / Students / Attendance Excel contracts, the 5-step wizard, per-entity upload services, and the batch endpoints. | Working on the Data Upload page, spreadsheet templates, or the `/batch` upload endpoints. |

---

## 3. Core System Contracts & Enums Summary
- **Baseline Domains (7)**: `Vocabulary`, `Grammar`, `Phrase_Sentence`, `Listening`, `Speaking`, `Reading`, `Writing`
- **Baseline Stages**: `S1`, `S2`, `S3`, `S4`, `S5`, `Review`, `AB` (Absent).
- **Attendance Statuses** (canonical list: `ATTENDANCE_STATUS_VALUES` in [`attendance.constants.ts`](file:///c:/Users/av311/Desktop/NGO-app/backend/src/constants/attendance.constants.ts)): `P` (Present, 1.0), `A` (Absent, 0.0), `HALF_DAY` (0.5), `ACTIVITY` (held session, 1.0), `ON_LEAVE` (authorised leave, 0.0, **not** an absence streak), `CANCELLED` (session cancelled, excluded from working-day denominator).
  - Only `CANCELLED` is class-wide and may omit a `studentId`; it requires `remarks`.
  - `ATTENDANCE_PRESENT_WEIGHT` is typed `Record<AttendanceStatusValue, number>`. **Adding a status without adding its weight would silently produce `NaN` percentages and a `STABLE` risk level**, so the type makes it a compile error. See the checklist in [`attendance_api.md`](file:///c:/Users/av311/Desktop/NGO-app/Docs/backend/attendance_api.md).
  - `ON_LEAVE` required migration `20260926000000_attendance_status_on_leave`; it had been added to `schema.prisma` without a migration.
- **Attendance Risk Levels**: `STABLE` ($\ge 85\%$), `WATCH` ($< 85\%$), `AT_RISK` ($< 75\%$ or $\ge 3$ consecutive absences), `CRITICAL` ($< 60\%$ or $\ge 5$ consecutive absences).
- **Student Statuses**: `ACTIVE`, `INACTIVE`, `TRANSFERRED`.
- **Enrollment Statuses**: `PRESENT`, `ABSENT`, `TRANSFERRED`, `EXCLUDED`.

---

## 4. Route Prefix Convention

TSOA routes are registered at the **application root** via `RegisterRoutes(app)` in `src/index.ts`. The `/api/v1` Express mount carries only `/health` plus empty legacy router stubs. Frontend services therefore call e.g. `${environment.apiUrl}/attendance/batch-upload`, **not** `/api/v1/attendance/batch-upload`.
