# Lumino1 Backend - Metrics Module (Akshara Dashboard)

## Overview

The **Metrics Module** is a read-only backend module that serves every figure the
*"Akshara - English Skill Building Program"* dashboard renders. It covers all seven
core dashboard aspects plus three derived metrics.

It is an **enhancement**: no existing endpoint, service, table, column, index or enum
was removed or repurposed. The module reuses the existing `School`, `Class`,
`Student` and `Assessment` data through the same tables the current services read.

> [!IMPORTANT]
> **Route prefix.** TSOA routes are registered at the **application root** by
> `RegisterRoutes(app)` in `src/index.ts`, so the canonical metrics paths are
> `/metrics/...` — consistent with `/attendance/...`, `/students/...`, etc.
>
> The dashboard product specification names `/api/v1/metrics/...`, so a **thin
> compatibility alias** is additionally registered in `src/routes/index.ts`. Both
> prefixes resolve to the *same* `MetricsController` singleton and execute the same
> service graph, so they cannot drift apart. The alias exposes only `GET`
> endpoints, so it cannot widen the module's attack surface.

---

## 1. Module Layout

```text
backend/src/metrics/
├── constants/
│   └── metrics.constants.ts     # Thresholds, bands, vocabulary (single source of truth)
├── models/
│   └── metrics.models.ts        # Narrow read-model contracts (NOT Prisma models)
├── dtos/
│   ├── metricsFilter.dto.ts     # Shared filters + KpiMetric / KpiDelta / filter echo
│   ├── kpiSummary.dto.ts        # Aspect 1
│   ├── learningProgress.dto.ts  # Aspect 2
│   ├── schoolPerformance.dto.ts # Aspect 3
│   ├── needsAttention.dto.ts    # Aspect 4
│   ├── teachingObjectives.dto.ts# Aspect 5
│   ├── engagementMetrics.dto.ts # Aspect 6
│   ├── resourceFinance.dto.ts   # Aspect 7
│   └── dashboardSummary.dto.ts  # Unified payload + DerivedInsightsDTO
├── repositories/
│   └── metrics.repository.ts    # Read-only projections (interface + impl)
├── services/
│   ├── DomainMetricsCalculator.service.ts  # Aspect 2 derivations (pure)
│   ├── KPIMetricsCalculator.service.ts     # Aspect 1 derivations (pure)
│   └── metrics.service.ts                  # Orchestration (IMetricsService + impl)
├── utils/
│   └── MetricsCalculationUtils.ts          # Pure functions only
└── controllers/
    └── metrics.controller.ts               # TSOA controller
```

**Purity boundary.** The two calculators and the utils file perform no I/O and hold
no state. Only `MetricsService` and `MetricsRepository` touch Prisma. This is why
the whole calculation surface is unit-testable with plain object fixtures.

---

## 2. Endpoints

All endpoints are `GET` and read-only. All accept the same filter set (section 3).

| Method | Canonical path | `/api/v1` alias | Aspect |
| :--- | :--- | :--- | :--- |
| `GET` | `/metrics/dashboard` | `/api/v1/metrics/dashboard` | All 7 + derived insights |
| `GET` | `/metrics/kpis` | `/api/v1/metrics/kpis` | 1 - Top core KPIs |
| `GET` | `/metrics/learning-outcomes` | `/api/v1/metrics/learning-outcomes` | 2 - Learning progress |
| `GET` | `/metrics/school-performance` | `/api/v1/metrics/school-performance` | 3 - School matrix |
| `GET` | `/metrics/needs-attention` | `/api/v1/metrics/needs-attention` | 4 - Dynamic alerts |
| `GET` | `/metrics/teaching-objectives` | `/api/v1/metrics/teaching-objectives` | 5 - Objectives & coverage |
| `GET` | `/metrics/engagement` | `/api/v1/metrics/engagement` | 6 - Stakeholder engagement |
| `GET` | `/metrics/finance` | `/api/v1/metrics/finance` | 7 - Resources & finance |

Example:

```http
GET /metrics/dashboard?academicYear=2026-2027&year=2026&month=8&schoolId=2
```

---

## 3. Request Filters

| Param | Type | Notes |
| :--- | :--- | :--- |
| `academicYear` | string | e.g. `2026-2027`. Omit to span every year. |
| `fromDate` / `toDate` | `YYYY-MM-DD` | `fromDate` must be on or before `toDate`. |
| `schoolId` | int > 0 | Restrict to one school. |
| `classId` | int > 0 | Restrict to one class section. |
| `month` | 1-12 | Requires `year`. Selects an exact calendar month. |
| `year` | 2000-2100 | Required when `month` is supplied. |

Validation lives in `metricsFilterQuerySchema` (Zod), which coerces query strings to
numbers and enforces both pairings. A violation returns `400` through the existing
`globalErrorHandler`.

### Reporting window resolution

| Request | Current window | Comparison (MoM) window |
| :--- | :--- | :--- |
| `month` + `year` | That exact calendar month | The preceding month (rolls back a year from January) |
| `fromDate` + `toDate` | That span | The immediately preceding span of **equal length** |
| Neither | Year-to-date (1 Jan -> today) | The equally long span before it |

Every response embeds a `filter` echo (`fromDate`, `toDate`, `schoolId`, `classId`,
`generatedAt`) so a client can prove which period the figures describe. This matters
when a dashboard caches sections independently and the user changes a filter
mid-session.

> [!NOTE]
> The Angular dashboard header sends `school` / `className` as **strings** with the
> sentinels `__ALL_SCHOOLS__` / `__ALL_CLASSES__` (see
> `frontend/src/app/core/models/dashboard.model.ts`). The API deliberately accepts
> **numeric primary keys** instead, because a school can legitimately be named
> "All Schools" and a name-based selector would then be ambiguous. The frontend maps
> its sentinel to "omit the parameter".

---

## 4. Aspect 1 - Top Core KPIs

| KPI | Value | Comparison | Source |
| :--- | :--- | :--- | :--- |
| Students Enrolled | Total by `StudentStatus` | % vs same span one year earlier | `students` |
| Attendance Rate | Weighted present-days / working days | **Points** vs preceding window | `attendance` |
| Avg. Learning Gain | Current % - baseline % | Points | `domain_results` |
| Objectives Covered | `COMPLETED / total` | Points | `program_objectives` |
| Active Students | Distinct students with AI/IVRS or practice | Points | `student_engagement_activities` |

### Attendance weighting (reused, not reimplemented)

`aggregateAttendance()` imports `ATTENDANCE_PRESENT_WEIGHT` and
`ATTENDANCE_CLASS_WIDE_STATUSES` from
[`attendance.constants.ts`](file:///c:/Users/av311/Desktop/NGO-app/backend/src/constants/attendance.constants.ts).
The dashboard and `GET /attendance/monthly-analytics` therefore **cannot** disagree
about what a `HALF_DAY` or an `ON_LEAVE` is worth. A new attendance status added in
one place is honoured in both, or the build fails.

- `P` and `ACTIVITY` = 1.0, `HALF_DAY` = 0.5, `A` and `ON_LEAVE` = 0.0.
- Working days = distinct session dates **minus** any class-wide `CANCELLED` row
  (`studentId IS NULL`), matching `collectWorkingDays()`.
- A class with no attendance rows contributes nothing rather than a fabricated
  `0%`, so an un-marker school is surfaced by the **Data Gap** alert instead of
  silently dragging the programme average down.

### Growth vs points

`growthDelta()` returns a **percentage**; `pointDelta()` returns **percentage
points**. A rate that already lives on a 0-100 scale is compared in points -
"attendance rose 3 points", never "rose 3.7% to 103.7% of its old value".
`growthDelta` returns `percent: null` when the base is 0, because "infinite growth"
is a misleading way to present a cold start.

---

## 5. Aspect 2 - Learning Progress & Outcomes

```
learningOutcomes: {
  overallProgress:   { baseline, current, increase, baselineStudents, currentStudents },
  learningProgress:  DomainProgressDTO[]   // 4 core skills, in chart order
  domainProgress:    DomainProgressDTO[]   // all 7 baseline domains
  stageDistribution: StageDistributionItemDTO[]   // S1..S5, always 5 buckets
  stageMovement:     StageMovementItemDTO[]       // baseline vs current + delta
  sasDistribution:   SasDistributionItemDTO[]     // Support / Core / Stretch
  studentsAssessed:  number
}
```

### Stage normalisation

| Rule | Behaviour |
| :--- | :--- |
| Stage column | `finalStage` (teacher override) wins, else `suggestedStage` - the same precedence the class summary uses, so the dashboard cannot contradict it. |
| `Review` / `AB` | **Excluded.** `Review` defers a judgement, `AB` means absent; neither is attainment. |
| Unassessed students | **Dropped**, not counted as `S1` - otherwise unassessed students inflate the Stage 1 bucket. |
| Percent scale | `S1`=20, `S2`=40, `S3`=60, `S4`=80, `S5`=100. |
| Spellings | `S3`, `Stage 3`, `Stage3` and `3` all normalise to `S3`. |
| Only submitted assessments | `SUBMITTED`, `REVIEWED`, `REVIEWED_OVERRIDE`, `LOCKED`. `DRAFT` / `IN_REVIEW` are work in progress and would report unagreed progress. |

### Baseline vs current

Baseline = each student's **earliest** `assessmentDate`; current = their **latest**.
Gain is only computed over students present in **both**, so the figure is genuine
within-student improvement rather than a difference between two cohorts. The same
intersection rule is used for `stageMovement`.

### Student stage = mean, not mode

A student's stage is the **mean** of their normalised domain stages, rounded to the
nearest stage. A mean is used deliberately: a single strong domain must not hide
five weak ones, which is exactly what the Stage Distribution chart exists to reveal.

### SAS (Student Achievement Status)

> [!WARNING]
> SAS is a **student-level attainment status** derived from the student's own mean
> stage (`meanStage < 2` -> Support, `>= 4` -> Stretch, otherwise Core).
>
> It is **NOT** the Support / Anchor / Stretch **Bands** stored in
> `class_domain_summaries`. `Docs/Class-summary.md` (section 11) records those as
> expert-entered planning targets owned by the Head of Department and **explicitly
> forbids auto-assigning them**. Nothing in this module reads, writes or overwrites
> those columns. SAS is a measurement; the Bands are a planning judgement.

---

## 6. Aspect 3 - School Performance Matrix

`SchoolPerformanceDTO` emits **both** vocabularies, because the product spec and the
existing Angular model disagree on the third state:

| Field | Values | Notes |
| :--- | :--- | :--- |
| `meStatus` | `On Track` \| `Watch` \| `Critical` | The **product spec's** vocabulary. |
| `meStatusCategory` | `On Track` \| `Watch` \| `Needs Attention` | Matches the existing Angular `SchoolPerformanceItem.meStatus` union. |
| `meStatusBand` | `ON_TRACK` \| `WATCH` \| `CRITICAL` | Machine-readable code. |

The frontend therefore needs **no change**. When it is next updated, `'Critical'`
can replace `'Needs Attention'` outright.

### Banding rule

```ts
if (!hasAssessmentData)                                   -> CRITICAL
if (attendance < 70 && objectives < 40)                   -> CRITICAL
if (attendance < 80 || objectives < 60 || gain < 5 pts)   -> WATCH
otherwise                                                  -> ON TRACK
```

The escalation to `CRITICAL` deliberately requires a **conjunction**: a school must
breach *both* the attendance and the objectives thresholds (or have no assessment
data at all). No school is ever flagged Critical on the strength of a single lagging
indicator. Thresholds live in `METRICS_ME_THRESHOLDS`.

### Head counts

Enrolled roll comes from `student_class_enrollments` where `isCurrent = true`, **not**
`students.classId`, because a transferred student keeps their student row but no
longer holds a current enrollment. This matches the `_count` projection that
`ClassService` and `SchoolService` already use.

---

## 7. Aspect 4 - Needs Attention Alerts

Alerts are **never persisted**. They are re-derived on every request from the same
figures that feed the KPI tiles and the school table, which is what guarantees the
alert list can never contradict the numbers shown beside it.

| Category | Severity | Trigger |
| :--- | :--- | :--- |
| `Data Gap` | CRITICAL | School has no attendance rows in the period. |
| `Attendance` | CRITICAL / WARNING | `< 80%` (CRITICAL below 70%). |
| `Learning Gain` | WARNING | Gain `< 5` points with assessment data present. |
| `Objectives Coverage` | WARNING | Objectives covered `< 60%`. |
| `Speaking Practice` | WARNING | Speaking `>= 8` points behind the programme average. |

Sorted CRITICAL -> WARNING -> INFO, then by shortfall, then by id for stability.
Capped at `METRICS_MAX_ALERTS` (50); the response reports `truncatedCount` so the UI
can say "and N more" rather than silently hiding alerts.

Each alert carries `observedValue`, `thresholdValue` and `gapPoints`, so the UI can
show *why* something fired without re-deriving it.

---

## 8. Aspect 5 - Teaching & Objectives

`objectiveProgress` counts `program_objectives` by status into the four tiles
(`planned`, `completed`, `inProgress`, `upcoming`).

`teachingMatrix` is one row per in-scope class section:

```json
{
  "className": "6A",
  "modules": ["covered","covered","in-progress","not-started", "..."],
  "coveragePercent": 64,
  "coveredCount": 7, "inProgressCount": 1, "notStartedCount": 2
}
```

- Column order is `TeachingModule.sequence_number` (**not** the primary key), so
  modules can be inserted out of order without reshuffling the UI.
- `modules` is positionally aligned with `moduleColumns` and uses exactly the
  Angular `TeachingModuleStatus` union, so the existing three-state dot rendering
  works unmodified.
- An **absent** coverage row means `not-started`, never a numeric zero - a module
  that was never planned is different from one that was planned and missed.
- `overallCoveragePercent` is the covered-cells / total-cells ratio.

---

## 9. Aspect 6 - Stakeholder Engagement

| Card | Numerator | Denominator |
| :--- | :--- | :--- |
| Class Participation | Distinct students with `CLASS_PARTICIPATION` | In-scope enrolled roll |
| AI/IVRS Active Students | Distinct students with `AI_IVRS` **or** `PRACTICE` | In-scope enrolled roll |
| Parent Engagement | `parent_engagements` rows in period (+ MoM) | - |
| Home Visits | `home_visits` where `status = COMPLETED` | - |

- A student counts **once** regardless of how many activities they logged: this is
  a rate of *students*, not of sessions.
- `studentsReached` is summed from the stored column rather than derived, so a
  single visit that reached several siblings is not simultaneously counted as one
  visit and as one student.
- `sparkline` arrays are zero-filled across the academic year (Apr -> Mar), so gaps
  read as gaps rather than being silently omitted.

---

## 10. Aspect 7 - Resources & Finance

`budget` prefers a school-specific `program_budgets` row, falling back to the
NGO-wide consolidated row (`school_id IS NULL`).

| Field | Meaning |
| :--- | :--- |
| `utilisationPercent` | `spentTillDate / totalAnnualBudget * 100` |
| `expectedUtilisationPercent` | Straight-line pace for the elapsed fraction of Apr 1 -> today |
| `burnRateDeltaPercent` | `utilisation - expected`. Positive = **ahead of pace**. |
| `hasBudget` | False when no budget row exists, so the UI can render an empty state. |

`categorySpend` always returns **all six** categories (zero-filled) so the chart
shape is stable. `allocatedAmount` / `varianceAmount` come from `budget_allocations`
and are `null` when no allocation is on record - an unsanctioned category is
reported as unknown, not as zero.

Only `entryType = EXPENSE` rows count as spend; a `BUDGET` line is the sanctioned
figure and must never be double-counted as an outflow.

---

## 11. The Three Derived Metrics

| Metric | Range | Definition |
| :--- | :--- | :--- |
| **Risk Level Score** | 0-100, higher is healthier | `0.35*attendance + 0.30*objectives + 0.20*gain + 0.15*dataCompleteness`, weights in `METRICS_RISK_SCORE_WEIGHTS`. A school with no assessment data scores 0 on that component rather than being dropped, so an empty classroom reports as risky instead of disappearing. Banded `HEALTHY >= 75`, `STABLE >= 60`, `AT_RISK >= 45`, else `CRITICAL`. |
| **Class Equity Score** | 0-100, higher is more equitable | `100 - Gini(per-class attainment)`. Identical classes score 100; a single outlier class measurably drags the programme down. `equityOutliers` lists the five worst, with signed gap in points. |
| **MoM Learning-Gain Delta** | points + direction | Headline gain in the current window minus the gain in the preceding window, with an explicit `UP`/`DOWN`/`FLAT` so the UI never infers direction from the sign of a string. |

Plus `dataCompletenessPercent` (share of enrolled students with at least one
assessment) as a data-quality signal.

---

## 12. Database Additions

Migration `20260927120000_metrics_module` is **purely additive**: nine new tables,
seven new enums, no `ALTER`/`DROP` against any pre-existing table.

| Table | Purpose |
| :--- | :--- |
| `program_budgets` | Annual programme budget. `school_id IS NULL` = NGO-wide consolidated. |
| `budget_allocations` | Sanctioned category split of a budget. |
| `finance_records` | Append-only ledger (`BUDGET` / `EXPENSE`). |
| `teaching_modules` | M01..M10 catalogue driving the matrix columns. |
| `program_objectives` | Planned objectives (the four overview tiles). |
| `objective_coverages` | One class x module matrix cell. |
| `student_engagement_activities` | AI/IVRS, practice and class-participation log. |
| `parent_engagements` | One reached parent/guardian. |
| `home_visits` | Home visits; only `COMPLETED` counts. |

The only edits to pre-existing models are **virtual back-relation array fields** on
`User`, `School`, `ClassSection` and `Student`, which Prisma requires for the new
relations and which generate no DDL.

> [!NOTE]
> `program_budgets` intentionally has **no** `UNIQUE(school_id, academic_year)`:
> MySQL treats NULLs as distinct inside a unique index, so a global budget row
> could otherwise be inserted more than once. That invariant is enforced in the
> service layer instead.

> [!WARNING]
> Every new model carries `// VERIFICATION NEEDED: Verify schema definition
> against existing DB models.` in `schema.prisma` and in
> `src/metrics/models/metrics.models.ts`. These entities are the module's
> interpretation of the requirements and should be confirmed against the
> production data model before the first migration is applied to a live database.

---

## 13. Configuration Change

`tsoa.json` now globs the nested metrics controller in **both** the `routes` and
`spec` sections:

```json
"controllerPathGlobs": [
  "src/controllers/*.controller.ts",
  "src/metrics/controllers/*.controller.ts"
]
```

Without this, TSOA silently ignores the module and the endpoints never register.

---

## 14. Inversify Bootstrap Note

`src/routes/index.ts` resolves the controller **lazily**, on first request:

```ts
function getMetricsController(): MetricsController {
  if (cachedController === undefined) cachedController = iocContainer.get(MetricsController);
  return cachedController;
}
```

This is mandatory, not stylistic. `inversify-binding-decorators` builds its provider
module by scanning the modules already in the require cache when `src/ioc.ts` first
evaluates. `src/index.ts` imports `./routes`, which imports `./ioc` and only
*afterwards* imports `MetricsController` - so an eager top-level `get()` throws
`No matching bindings found for serviceIdentifier: MetricsController`. Lazy
resolution sidesteps the ordering entirely, and memoisation keeps it a singleton.

---

## 15. Non-Destructive Guarantee

- No existing controller, service, repository, DTO or util was modified.
- No existing table, column, index or enum was altered or dropped.
- `GET /attendance/*`, `/students*`, `/classes*`, `/schools*` and `/api/v1/health`
  retain their existing behaviour (verified by a boot-time route assertion).
- The module is **read-only**: it exposes `GET` routes only and performs no writes.



