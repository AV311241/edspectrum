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
| [`Docs/backend/metrics_api.md`](file:///c:/Users/av311/Desktop/NGO-app/Docs/backend/metrics_api.md) | The read-only Akshara dashboard module: 5 top KPIs, learning progress & SAS distribution, school performance matrix, dynamic Needs-Attention alerts, objective coverage matrix, engagement, finance, plus 3 derived metrics. | Working on the dashboard, any KPI/chart/alert figure, or the metrics-owned tables. |

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
- **Metrics Module** (see [`metrics_api.md`](file:///c:/Users/av311/Desktop/NGO-app/Docs/backend/metrics_api.md)): read-only, `GET`-only. Reuses `ATTENDANCE_PRESENT_WEIGHT` rather than re-deriving attendance weights, and reuses the `finalStage ?? suggestedStage` precedence so the dashboard cannot contradict the class summary.
  - **M&E Status Bands**: `ON_TRACK` / `WATCH` / `CRITICAL`. Escalation to `CRITICAL` requires breaching **both** the attendance and objectives thresholds (or having no assessment data). Emits `meStatus` (`'On Track' | 'Watch' | 'Critical'`) **and** `meStatusCategory` (`… | 'Needs Attention'`) so the existing Angular `SchoolPerformanceItem.meStatus` union keeps type-checking unchanged.
  - **SAS (Student Achievement Status)**: a *student-level attainment status* from mean stage (`< 2` Support, `>= 4` Stretch, else Core). **Not** the HOD-entered Support/Anchor/Stretch **Bands** in `class_domain_summaries`, which [`Class-summary.md`](file:///c:/Users/av311/Desktop/NGO-app/Docs/Class-summary.md) (section 11) forbids auto-assigning. Nothing in the metrics module touches those columns.
  - **Stage normalisation**: `Review` / `AB` and unassessed students are excluded (not counted as `S1`); only `SUBMITTED` / `REVIEWED` / `REVIEWED_OVERRIDE` / `LOCKED` assessments are read; `S1..S5` map to `20..100`.
  - **Growth vs points**: counts use percentage growth (`growthDelta`), rates use percentage **points** (`pointDelta`). `growthDelta` returns `percent: null` on a zero base.
  - **New enums**: `ObjectiveModuleStatus`, `ObjectivePlanStatus`, `BudgetCategory`, `FinanceEntryType`, `EngagementActivityType`, `HomeVisitStatus`, `ParentEngagementChannel`. **New tables**: `program_budgets`, `budget_allocations`, `finance_records`, `teaching_modules`, `program_objectives`, `objective_coverages`, `student_engagement_activities`, `parent_engagements`, `home_visits` (migration `20260927120000_metrics_module`, additive only). Every new model carries a `// VERIFICATION NEEDED` header.

---

## 4. Route Prefix Convention

TSOA routes are registered at the **application root** via `RegisterRoutes(app)` in `src/index.ts`. The `/api/v1` Express mount carries only `/health` plus empty legacy router stubs. Frontend services therefore call e.g. `${environment.apiUrl}/attendance/batch-upload`, **not** `/api/v1/attendance/batch-upload`.

> [!NOTE]
> **One documented exception: the metrics module.** The Akshara dashboard product
> specification names `/api/v1/metrics/...`, so `src/routes/index.ts` registers a
> read-only alias that forwards to the same `MetricsController` singleton. Both
> `/metrics/dashboard` and `/api/v1/metrics/dashboard` work and execute identical
> code. See [`metrics_api.md`](file:///c:/Users/av311/Desktop/NGO-app/Docs/backend/metrics_api.md).
