# Lumino1 Backend - Attendance Module Implementation

## Overview
The Attendance Module provides production-ready daily attendance tracking, batch marking, session cancellation safeguards, daily register grids, and automated monthly/risk analytics for class sections and enrolled students.

---

## Key Architectural Components

### 1. Input Validation & DTOs ([attendance.dto.ts](file:///c:/Users/av311/Desktop/NGO-app/backend/src/dtos/attendance.dto.ts))
- **Strict Zod Validation Schemas**:
  - `batchUpsertAttendanceSchema`: Validates `classId`, `sessionDate` (YYYY-MM-DD), and array of student records (`studentId`, `status`: `P` \| `A` \| `HALF_DAY` \| `ACTIVITY`, optional `remarks`). Limit 1–200 records per batch.
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
  - `CANCELLED`: Excluded from working-day denominator.
- **Attendance Percentage Formula**:
  $$\text{Attendance \%} = \frac{\text{Weighted Present Days}}{\text{Total Class Working Days}} \times 100$$
- **Streak Calculation**: Tracks current consecutive absences and maximum consecutive absence streaks across active working days.
- **Risk Level Thresholds**:
  - `CRITICAL`: Attendance $< 60\%$ OR Max Consecutive Absences $\ge 5$
  - `AT_RISK`: Attendance $< 75\%$ OR Max Consecutive Absences $\ge 3$
  - `WATCH`: Attendance $< 85\%$
  - `STABLE`: Attendance $\ge 85\%$

### 3. Database Layer & Atomic Operations ([attendance.repository.ts](file:///c:/Users/av311/Desktop/NGO-app/backend/src/repositories/attendance.repository.ts))
- Uses Prisma ORM with HeatWave/MySQL compatibility.
- **`upsertStudentRecords`**: Executes an atomic Prisma transaction (`prisma.$transaction`) to upsert individual student attendance records per session date.
- **`cancelClassSession`**: Atomically deletes individual student records for that date and creates/updates a class-wide cancellation record (`studentId: null`, `status: CANCELLED`).
- **`uncancelClassSession`**: Deletes class-wide cancellation record to reopen session date for marking.

### 4. Service Layer ([attendance.service.ts](file:///c:/Users/av311/Desktop/NGO-app/backend/src/services/attendance.service.ts))
- Handles validation checks (e.g., verifying class existence, checking if date is cancelled before allowing batch marking).
- Sanitizes PII (`firstName`, `lastName`, `studentIdCode`) in responses and structured JSON logging.
- `BigInt` ID handling safely serialized to string.

### 5. Controllers & Routes ([attendance.controller.ts](file:///c:/Users/av311/Desktop/NGO-app/backend/src/controllers/attendance.controller.ts) & [attendance.routes.ts](file:///c:/Users/av311/Desktop/NGO-app/backend/src/routes/attendance.routes.ts))
- TSOA OpenAPI auto-generated spec & route annotations (`@Tags('Attendance')`, `@Route('attendance')`, `@provide(AttendanceController)`).
- Express router mounted at `/api/v1/attendance` with Zod middleware validation.

---

## API Endpoints Registry

| Method | Endpoint | Description | Query / Body Params |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/attendance/batch` | Batch mark/update attendance for enrolled students | Body: `{ classId, sessionDate, records: [{ studentId, status, remarks }] }` |
| `POST` | `/api/v1/attendance/cancel-class` | Cancel entire class session for a specific date | Body: `{ classId, sessionDate, remarks }` |
| `POST` | `/api/v1/attendance/uncancel-class` | Remove cancellation flag for a class session date | Body: `{ classId, sessionDate }` |
| `GET` | `/api/v1/attendance/register` | Get daily attendance register grid for a class section | Query: `classId`, `sessionDate` |
| `GET` | `/api/v1/attendance/monthly-analytics` | Get monthly class attendance analytics & student metrics | Query: `classId`, `year`, `month` |
| `GET` | `/api/v1/attendance/risk-analytics` | Get student risk analytics filtered by minimum risk level | Query: `classId`, `year`, `month`, `minRiskLevel` |
| `GET` | `/api/v1/attendance` | List paginated attendance records | Query: `page`, `limit`, `classId`, `studentId`, `sessionDate`, `fromDate`, `toDate`, `status` |
| `GET` | `/api/v1/attendance/{id}` | Get individual attendance record by BigInt ID | Path: `id` |
| `PUT` | `/api/v1/attendance/{id}` | Update individual attendance status or remarks | Path: `id`, Body: `{ status, remarks }` |
| `DELETE` | `/api/v1/attendance/{id}` | Delete attendance record by BigInt ID | Path: `id` |
