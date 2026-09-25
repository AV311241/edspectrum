# Lumino1 NGO Platform - API Tracking & Endpoints Registry

## 1. System Health Endpoint
| Method | Endpoint Path | Description | Access / Role |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | System Liveness & Health Check | Public |

## 2. Student Endpoints Summary
| Method | Endpoint Path | Description | Access / Role |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/students` | Create new student profile (with optional initial class enrollment) | Admin / Teacher |
| `GET` | `/api/v1/students` | List paginated students (Filters: `schoolId`, `classId`, `status`, `search`) | Admin / Teacher |
| `GET` | `/api/v1/students/:id` | Get student details by ID | Admin / Teacher |
| `PUT` | `/api/v1/students/:id` | Update student details | Admin / Teacher |
| `DELETE` | `/api/v1/students/:id` | Delete student record | Admin |
| `POST` | `/api/v1/students/:id/enroll` | Enroll student into a class section (Atomic transaction) | Admin / Teacher |
| `POST` | `/api/v1/students/:id/unenroll` | Unenroll student from a class section (Atomic transaction) | Admin / Teacher |
| `POST` | `/api/v1/students/:id/transfer` | Transfer student between class sections (Atomic transaction) | Admin / Teacher |

## 3. Class Section Endpoints Summary
| Method | Endpoint Path | Description | Access / Role |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/classes` | Create new class section | Admin |
| `GET` | `/api/v1/classes` | List paginated classes with capacity & available seat counts | Admin / Teacher |
| `GET` | `/api/v1/classes/:id` | Get class section details by ID | Admin / Teacher |
| `PUT` | `/api/v1/classes/:id` | Update class details or capacity | Admin |
| `DELETE` | `/api/v1/classes/:id` | Delete class section (Safeguard: prevents deletion if students are enrolled) | Admin |
| `GET` | `/api/v1/classes/:id/students` | Get paginated list of active enrolled students in class | Admin / Teacher |

## 4. Attendance Endpoints Summary
| Method | Endpoint Path | Description | Access / Role |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/attendance/batch` | Batch mark or update daily attendance for enrolled students | Teacher / Admin |
| `POST` | `/api/v1/attendance/cancel-class` | Cancel entire class session for a specific date | Teacher / Admin |
| `POST` | `/api/v1/attendance/uncancel-class` | Remove cancellation flag for a class session date | Teacher / Admin |
| `GET` | `/api/v1/attendance/register` | Get daily attendance register grid for a class section | Teacher / Admin |
| `GET` | `/api/v1/attendance/monthly-analytics` | Get monthly class attendance analytics & student metrics | Teacher / Admin |
| `GET` | `/api/v1/attendance/risk-analytics` | Get student risk analytics filtered by minimum risk level | Teacher / Admin |
| `GET` | `/api/v1/attendance` | List paginated attendance records | Teacher / Admin |
| `GET` | `/api/v1/attendance/:id` | Get individual attendance record by BigInt ID | Teacher / Admin |
| `PUT` | `/api/v1/attendance/:id` | Update individual attendance status or remarks | Teacher / Admin |
| `DELETE` | `/api/v1/attendance/:id` | Delete attendance record by BigInt ID | Admin |

## 5. Baseline Assessment Endpoints Summary
| Method | Endpoint Path | Description | Access / Role |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/baseline-assessments` | Create single student baseline assessment with 7 domain scores | Assessor / Admin |
| `GET` | `/api/v1/baseline-assessments/:id` | Fetch detailed baseline assessment record by ID | Assessor / Teacher |
| `GET` | `/api/v1/baseline-assessments/student/:studentId` | Query assessment history for a given student ID | Assessor / Teacher |
| `GET` | `/api/v1/baseline-assessments` | List and paginate baseline assessments (Filter by class, date, status) | Teacher / Admin |
| `PUT` | `/api/v1/baseline-assessments/:id` | Update assessment details / teacher final stage override | Teacher / Admin |
| `DELETE` | `/api/v1/baseline-assessments/:id` | Remove assessment record | Admin |
| `POST` | `/api/v1/baseline-assessments/import` | Bulk import assessments from parsed JSON / Excel matrix | Admin / Assessor |
| `GET` | `/api/v1/baseline-assessments/export/flat` | Export wide pivoted assessment dataset (Matching 75-column Excel) | Admin / Teacher |

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
