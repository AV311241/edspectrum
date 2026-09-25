# Lumino1 Backend - Student & Class API Module Implementation

## Overview
Production-ready **CRUD, Enrollment, Unenrollment, and Transfer APIs** for `Student` and `Class` (`ClassSection`) entities using Express, TypeScript, Prisma ORM, TSOA (OpenAPI), InversifyJS, and Zod validation.

---

## Key Architectural Components

### 1. Input Validation & DTOs ([student.dto.ts](file:///c:/Users/av311/Desktop/NGO-app/backend/src/dtos/student.dto.ts) & [class.dto.ts](file:///c:/Users/av311/Desktop/NGO-app/backend/src/dtos/class.dto.ts))
- **Strict Zod Schemas**:
  - `createStudentSchema`, `updateStudentSchema`: Validates `schoolId`, `studentIdCode`, `firstName`, `lastName`, `dateOfBirth` (YYYY-MM-DD), `gender`, and optional initial `classId`.
  - `enrollStudentSchema`: Requires `classSectionId`.
  - `unenrollStudentSchema`: Optional `classSectionId` and `reason`.
  - `transferStudentSchema`: Requires `toClassSectionId`, optional `fromClassSectionId` and `reason`.
  - `createClassSchema`, `updateClassSchema`: Validates `schoolId`, `className`, `section`, `name`, `academicYear`, `assessmentCycle`, and `capacity` (min 1, max 500, default 40).
  - Filter Schemas: Enforces strict pagination boundaries (`page` default 1, `limit` default 20, max 100).

### 2. Centralized Error Handling ([errorHandler.middleware.ts](file:///c:/Users/av311/Desktop/NGO-app/backend/src/middlewares/errorHandler.middleware.ts))
- Standardized JSON error response format handling `400` (Bad Request), `404` (Not Found), `409` (Conflict), and `500` (Internal Server Error).
- Maps Zod field errors, TSOA `ValidateError`, operational `AppError`, and Prisma unique constraint violations (`P2002` $\rightarrow$ `409 Conflict`).

```json
{
  "success": false,
  "statusCode": 409,
  "error": {
    "code": "CONFLICT",
    "message": "Class 'Grade 5-A' has reached its maximum capacity of 40 students",
    "details": null
  }
}
```

### 3. Atomic Repositories & Database Layer ([student.repository.ts](file:///c:/Users/av311/Desktop/NGO-app/backend/src/repositories/student.repository.ts) & [class.repository.ts](file:///c:/Users/av311/Desktop/NGO-app/backend/src/repositories/class.repository.ts))
- Prisma ORM transactions (`prisma.$transaction`) ensure multi-step atomic integrity:
  - **`enrollInClassTx`**: Deactivates previous enrollments (`isCurrent: false`, status `TRANSFERRED`), registers new active enrollment (`isCurrent: true`, status `PRESENT`), and updates `Student.classId`.
  - **`unenrollFromClassTx`**: Updates status to `EXCLUDED`, sets `withdrawnDate`, and clears `Student.classId`.
  - **`transferClassTx`**: Atomically updates source enrollment to `TRANSFERRED`, creates target class enrollment, and updates `Student.classId` and `Student.schoolId`.

### 4. Business Logic Services & Structured Logging ([student.service.ts](file:///c:/Users/av311/Desktop/NGO-app/backend/src/services/student.service.ts) & [class.service.ts](file:///c:/Users/av311/Desktop/NGO-app/backend/src/services/class.service.ts))
- **Production Safeguards**:
  - **Capacity Checks**: Rejects enrollment/transfer if target class reached max capacity (`409 Conflict`).
  - **Duplicate Safeguards**: Blocks duplicate active enrollments (`409 Conflict`).
  - **Deletion Safeguards**: Blocks deleting a class section with active enrolled students (`409 Conflict`).
  - **PII Sanitization**: Redacts student names and DOB in structured logs using `sanitizePII` ([sanitizer.utils.ts](file:///c:/Users/av311/Desktop/NGO-app/backend/src/utils/sanitizer.utils.ts)).

### 5. Controllers & Routing ([student.controller.ts](file:///c:/Users/av311/Desktop/NGO-app/backend/src/controllers/student.controller.ts) & [class.controller.ts](file:///c:/Users/av311/Desktop/NGO-app/backend/src/controllers/class.controller.ts))
- TSOA OpenAPI annotated controllers bound to Inversify IoC container (`@provide`). Mounted at `/api/v1/students` and `/api/v1/classes`.

---

## API Endpoints Registry

### Student APIs
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/students` | Create new student profile (with optional initial class enrollment) |
| `GET` | `/api/v1/students` | List paginated students (Filters: `schoolId`, `classId`, `status`, `search`) |
| `GET` | `/api/v1/students/{id}` | Get student details by ID |
| `PUT` | `/api/v1/students/{id}` | Update student details |
| `DELETE` | `/api/v1/students/{id}` | Delete student record |
| `POST` | `/api/v1/students/{id}/enroll` | Enroll student into a class section (Atomic transaction) |
| `POST` | `/api/v1/students/{id}/unenroll` | Unenroll student from a class section (Atomic transaction) |
| `POST` | `/api/v1/students/{id}/transfer` | Transfer student between class sections (Atomic transaction) |

### Class Section APIs
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/classes` | Create new class section |
| `GET` | `/api/v1/classes` | List paginated classes with capacity & available seat counts |
| `GET` | `/api/v1/classes/{id}` | Get class details by ID |
| `PUT` | `/api/v1/classes/{id}` | Update class details or capacity |
| `DELETE` | `/api/v1/classes/{id}` | Delete class section (Safeguard: prevents deletion if students are enrolled) |
| `GET` | `/api/v1/classes/{id}/students` | Get paginated list of active enrolled students in class |
