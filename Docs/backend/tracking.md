# Lumino1 NGO Platform - API Tracking & Endpoints Registry

> [!IMPORTANT]
> **Route prefix**: TSOA routes are registered at the **application root** (`RegisterRoutes(app)`), not under `/api/v1`. The `/api/v1` mount only carries `/health` plus empty legacy router stubs. The tables below now use the **actual** effective paths. (Previous revisions of this file wrote `/api/v1/...`, which was inaccurate.)

## 1. System Health Endpoint
| Method | Endpoint Path | Description | Access / Role |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | System Liveness & Health Check | Public |

## 2. Student Endpoints Summary
| Method | Endpoint Path | Description | Access / Role |
| :--- | :--- | :--- | :--- |
| `POST` | `/students` | Create new student profile (with optional initial class enrollment) | Admin / Teacher |
| `GET` | `/students` | List paginated students (Filters: `schoolId`, `classId`, `status`, `search`) | Admin / Teacher |
| `GET` | `/students/:id` | Get student details by ID | Admin / Teacher |
| `PUT` | `/students/:id` | Update student details | Admin / Teacher |
| `DELETE` | `/students/:id` | Delete student record | Admin |
| `POST` | `/students/:id/enroll` | Enroll student into a class section (Atomic transaction) | Admin / Teacher |
| `POST` | `/students/:id/unenroll` | Unenroll student from a class section (Atomic transaction) | Admin / Teacher |
| `POST` | `/students/:id/transfer` | Transfer student between class sections (Atomic transaction) | Admin / Teacher |
| `POST` | `/students/batch` | **Bulk create students from Excel codes + auto-enrol** (see `data_upload_api.md`) | Admin |

## 3. Class Section Endpoints Summary
| Method | Endpoint Path | Description | Access / Role |
| :--- | :--- | :--- | :--- |
| `POST` | `/classes` | Create new class section | Admin |
| `GET` | `/classes` | List paginated classes with capacity & available seat counts | Admin / Teacher |
| `GET` | `/classes/:id` | Get class section details by ID | Admin / Teacher |
| `PUT` | `/classes/:id` | Update class details or capacity | Admin |
| `DELETE` | `/classes/:id` | Delete class section (Safeguard: prevents deletion if students are enrolled) | Admin |
| `GET` | `/classes/:id/students` | Get paginated list of active enrolled students in class | Admin / Teacher |
| `POST` | `/classes/batch` | **Bulk create class sections from Excel codes** (see `data_upload_api.md`) | Admin |

## 4. Attendance Endpoints Summary
| Method | Endpoint Path | Description | Access / Role |
| :--- | :--- | :--- | :--- |
| `POST` | `/attendance/batch` | Batch mark or update daily attendance for one class session (numeric FKs) | Teacher / Admin |
| `POST` | `/attendance/batch-upload` | **Bulk upload from Excel.** Accepts an envelope form (`schoolId` + `classSectionId`) *or* a per-row code form. See `attendance_api.md` | Teacher / Admin |
| `POST` | `/attendance/cancel-class` | Cancel entire class session for a specific date | Teacher / Admin |
| `POST` | `/attendance/uncancel-class` | Remove cancellation flag for a class session date | Teacher / Admin |
| `GET` | `/attendance/register` | Get daily attendance register grid for a class section | Teacher / Admin |
| `GET` | `/attendance/monthly-analytics` | Get monthly class attendance analytics & student metrics | Teacher / Admin |
| `GET` | `/attendance/risk-analytics` | Get student risk analytics filtered by minimum risk level | Teacher / Admin |
| `GET` | `/attendance` | List paginated attendance records | Teacher / Admin |
| `GET` | `/attendance/:id` | Get individual attendance record by BigInt ID | Teacher / Admin |
| `PUT` | `/attendance/:id` | Update individual attendance status or remarks | Teacher / Admin |
| `DELETE` | `/attendance/:id` | Delete attendance record by BigInt ID | Admin |

## 5. Baseline Assessment Endpoints Summary
| Method | Endpoint Path | Description | Access / Role |
| :--- | :--- | :--- | :--- |
| `POST` | `/baseline-assessments` | Create single student baseline assessment with 7 domain scores | Assessor / Admin |
| `GET` | `/baseline-assessments/:id` | Fetch detailed baseline assessment record by ID | Assessor / Teacher |
| `GET` | `/baseline-assessments/student/:studentId` | Query assessment history for a given student ID | Assessor / Teacher |
| `GET` | `/baseline-assessments` | List and paginate baseline assessments (Filter by class, date, status) | Teacher / Admin |
| `PUT` | `/baseline-assessments/:id` | Update assessment details / teacher final stage override | Teacher / Admin |
| `DELETE` | `/baseline-assessments/:id` | Remove assessment record | Admin |
| `POST` | `/baseline-assessments/import` | Bulk import assessments from parsed JSON / Excel matrix | Admin / Assessor |
| `GET` | `/baseline-assessments/export/flat` | Export wide pivoted assessment dataset (Matching 75-column Excel) | Admin / Teacher |


## 6. Standardized JSON Response Formats

### Success Response (`200 OK`, `201 Created`)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Error Response (`400 Bad Request`, `404 Not Found`, `409 Conflict`, `500 Server Error`)
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
