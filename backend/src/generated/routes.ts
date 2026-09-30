/* tslint:disable */
/* eslint-disable */
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import type { TsoaRoute } from '@tsoa/runtime';
import {  fetchMiddlewares, ExpressTemplateService } from '@tsoa/runtime';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { UserController } from './../controllers/user.controller';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { StudentController } from './../controllers/student.controller';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { SchoolController } from './../controllers/school.controller';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { ClassController } from './../controllers/class.controller';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { BaselineAssessmentController } from './../controllers/baselineAssessment.controller';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { AttendanceController } from './../controllers/attendance.controller';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { MetricsController } from './../metrics/controllers/metrics.controller';
import { iocContainer } from './../ioc';
import type { IocContainer, IocContainerFactory } from '@tsoa/runtime';
import type { Request as ExRequest, Response as ExResponse, RequestHandler, Router } from 'express';



// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

const models: TsoaRoute.Models = {
    "UserResponseDTO": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"double","required":true},
            "email": {"dataType":"string","required":true},
            "firstName": {"dataType":"string","required":true},
            "lastName": {"dataType":"string","required":true},
            "roleId": {"dataType":"double","required":true},
            "status": {"dataType":"string","required":true},
            "createdAt": {"dataType":"datetime","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateUserDTO": {
        "dataType": "refObject",
        "properties": {
            "email": {"dataType":"string","required":true},
            "firstName": {"dataType":"string","required":true},
            "lastName": {"dataType":"string","required":true},
            "passwordHash": {"dataType":"string","required":true},
            "roleId": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "_36_Enums.Gender": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["MALE"]},{"dataType":"enum","enums":["FEMALE"]},{"dataType":"enum","enums":["OTHER"]},{"dataType":"enum","enums":["PREFER_NOT_TO_SAY"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Gender": {
        "dataType": "refAlias",
        "type": {"ref":"_36_Enums.Gender","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "_36_Enums.StudentStatus": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["ACTIVE"]},{"dataType":"enum","enums":["INACTIVE"]},{"dataType":"enum","enums":["TRANSFERRED"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "StudentStatus": {
        "dataType": "refAlias",
        "type": {"ref":"_36_Enums.StudentStatus","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "_36_Enums.EnrollmentStatus": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["TRANSFERRED"]},{"dataType":"enum","enums":["PRESENT"]},{"dataType":"enum","enums":["ABSENT"]},{"dataType":"enum","enums":["EXCLUDED"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "EnrollmentStatus": {
        "dataType": "refAlias",
        "type": {"ref":"_36_Enums.EnrollmentStatus","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "EnrollmentRecordDTO": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"double","required":true},
            "studentId": {"dataType":"double","required":true},
            "classSectionId": {"dataType":"double","required":true},
            "schoolId": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}],"required":true},
            "withdrawnDate": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "status": {"ref":"EnrollmentStatus","required":true},
            "isCurrent": {"dataType":"boolean","required":true},
            "createdAt": {"dataType":"string","required":true},
            "className": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "StudentResponseDTO": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"double","required":true},
            "schoolId": {"dataType":"double","required":true},
            "classId": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}],"required":true},
            "studentIdCode": {"dataType":"string","required":true},
            "firstName": {"dataType":"string","required":true},
            "lastName": {"dataType":"string","required":true},
            "dateOfBirth": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "gender": {"dataType":"union","subSchemas":[{"ref":"Gender"},{"dataType":"enum","enums":[null]}],"required":true},
            "status": {"ref":"StudentStatus","required":true},
            "createdAt": {"dataType":"string","required":true},
            "updatedAt": {"dataType":"string","required":true},
            "createdById": {"dataType":"double","required":true},
            "schoolName": {"dataType":"string"},
            "className": {"dataType":"string"},
            "currentEnrollment": {"dataType":"union","subSchemas":[{"ref":"EnrollmentRecordDTO"},{"dataType":"enum","enums":[null]}]},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateStudentInput": {
        "dataType": "refObject",
        "properties": {
            "schoolId": {"dataType":"double","required":true},
            "studentIdCode": {"dataType":"string","required":true},
            "firstName": {"dataType":"string","required":true},
            "lastName": {"dataType":"string","required":true},
            "dateOfBirth": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
            "gender": {"dataType":"union","subSchemas":[{"ref":"Gender"},{"dataType":"enum","enums":[null]}]},
            "classId": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}]},
            "createdById": {"dataType":"double"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RowErrorDTO": {
        "dataType": "refObject",
        "properties": {
            "rowIndex": {"dataType":"double","required":true},
            "columnName": {"dataType":"string","required":true},
            "invalidValue": {"dataType":"any","required":true},
            "errorMessage": {"dataType":"string","required":true},
            "severity": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["ERROR"]},{"dataType":"enum","enums":["WARNING"]}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "BatchUploadResultDTO_StudentResponseDTO_": {
        "dataType": "refObject",
        "properties": {
            "totalRows": {"dataType":"double","required":true},
            "created": {"dataType":"double","required":true},
            "skipped": {"dataType":"double","required":true},
            "failed": {"dataType":"double","required":true},
            "records": {"dataType":"array","array":{"dataType":"refObject","ref":"StudentResponseDTO"},"required":true},
            "errors": {"dataType":"array","array":{"dataType":"refObject","ref":"RowErrorDTO"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "BatchStudentUploadResultDTO": {
        "dataType": "refAlias",
        "type": {"ref":"BatchUploadResultDTO_StudentResponseDTO_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "BatchStudentUploadRow": {
        "dataType": "refObject",
        "properties": {
            "studentId": {"dataType":"string","required":true},
            "schoolCode": {"dataType":"string","required":true},
            "className": {"dataType":"string","required":true},
            "academicYear": {"dataType":"string","required":true},
            "studentName": {"dataType":"string","required":true},
            "isActive": {"dataType":"boolean"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "BatchStudentUploadInput": {
        "dataType": "refObject",
        "properties": {
            "students": {"dataType":"array","array":{"dataType":"refObject","ref":"BatchStudentUploadRow"},"required":true},
            "createdById": {"dataType":"double"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PaginatedStudentResponseDTO": {
        "dataType": "refObject",
        "properties": {
            "records": {"dataType":"array","array":{"dataType":"refObject","ref":"StudentResponseDTO"},"required":true},
            "total": {"dataType":"double","required":true},
            "page": {"dataType":"double","required":true},
            "limit": {"dataType":"double","required":true},
            "totalPages": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateStudentInput": {
        "dataType": "refObject",
        "properties": {
            "schoolId": {"dataType":"double"},
            "studentIdCode": {"dataType":"string"},
            "firstName": {"dataType":"string"},
            "lastName": {"dataType":"string"},
            "dateOfBirth": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
            "gender": {"dataType":"union","subSchemas":[{"ref":"Gender"},{"dataType":"enum","enums":[null]}]},
            "classId": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}]},
            "status": {"ref":"StudentStatus"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "EnrollStudentInput": {
        "dataType": "refObject",
        "properties": {
            "classSectionId": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UnenrollStudentInput": {
        "dataType": "refObject",
        "properties": {
            "classSectionId": {"dataType":"double"},
            "reason": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TransferStudentInput": {
        "dataType": "refObject",
        "properties": {
            "fromClassSectionId": {"dataType":"double"},
            "toClassSectionId": {"dataType":"double","required":true},
            "reason": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "_36_Enums.SchoolStatus": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["ACTIVE"]},{"dataType":"enum","enums":["INACTIVE"]},{"dataType":"enum","enums":["ARCHIVED"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SchoolStatus": {
        "dataType": "refAlias",
        "type": {"ref":"_36_Enums.SchoolStatus","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SchoolSummaryDTO": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"double","required":true},
            "code": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
            "status": {"ref":"SchoolStatus","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateSchoolInput": {
        "dataType": "refObject",
        "properties": {
            "code": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Pick_SchoolSummaryDTO.id-or-code-or-name_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"id":{"dataType":"double","required":true},"code":{"dataType":"string","required":true},"name":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SchoolClassDTO": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"double","required":true},
            "className": {"dataType":"string","required":true},
            "academicYear": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "totalStudents": {"dataType":"double","required":true},
            "createdAt": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SchoolClassesResponseDTO": {
        "dataType": "refObject",
        "properties": {
            "school": {"ref":"Pick_SchoolSummaryDTO.id-or-code-or-name_","required":true},
            "classes": {"dataType":"array","array":{"dataType":"refObject","ref":"SchoolClassDTO"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateSchoolClassInput": {
        "dataType": "refObject",
        "properties": {
            "className": {"dataType":"string","required":true},
            "academicYear": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "_36_Enums.ClassStatus": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["ACTIVE"]},{"dataType":"enum","enums":["ARCHIVED"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ClassStatus": {
        "dataType": "refAlias",
        "type": {"ref":"_36_Enums.ClassStatus","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "EnrolledStudentSummaryDTO": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"double","required":true},
            "studentIdCode": {"dataType":"string","required":true},
            "firstName": {"dataType":"string","required":true},
            "lastName": {"dataType":"string","required":true},
            "gender": {"dataType":"union","subSchemas":[{"ref":"Gender"},{"dataType":"enum","enums":[null]}],"required":true},
            "status": {"ref":"StudentStatus","required":true},
            "enrolledAt": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ClassResponseDTO": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"double","required":true},
            "schoolId": {"dataType":"double","required":true},
            "gradeId": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}],"required":true},
            "className": {"dataType":"string","required":true},
            "section": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
            "academicYear": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "status": {"ref":"ClassStatus","required":true},
            "assessmentCycle": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "capacity": {"dataType":"double","required":true},
            "enrolledCount": {"dataType":"double","required":true},
            "availableSeats": {"dataType":"double","required":true},
            "createdAt": {"dataType":"string","required":true},
            "updatedAt": {"dataType":"string","required":true},
            "createdById": {"dataType":"double","required":true},
            "schoolName": {"dataType":"string"},
            "gradeName": {"dataType":"string"},
            "enrolledStudents": {"dataType":"array","array":{"dataType":"refObject","ref":"EnrolledStudentSummaryDTO"}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateClassInput": {
        "dataType": "refObject",
        "properties": {
            "schoolId": {"dataType":"double","required":true},
            "gradeId": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}]},
            "className": {"dataType":"string","required":true},
            "section": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
            "academicYear": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
            "assessmentCycle": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
            "capacity": {"dataType":"double"},
            "createdById": {"dataType":"double"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "BatchUploadResultDTO_ClassResponseDTO_": {
        "dataType": "refObject",
        "properties": {
            "totalRows": {"dataType":"double","required":true},
            "created": {"dataType":"double","required":true},
            "skipped": {"dataType":"double","required":true},
            "failed": {"dataType":"double","required":true},
            "records": {"dataType":"array","array":{"dataType":"refObject","ref":"ClassResponseDTO"},"required":true},
            "errors": {"dataType":"array","array":{"dataType":"refObject","ref":"RowErrorDTO"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "BatchClassUploadResultDTO": {
        "dataType": "refAlias",
        "type": {"ref":"BatchUploadResultDTO_ClassResponseDTO_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "BatchClassUploadRow": {
        "dataType": "refObject",
        "properties": {
            "schoolCode": {"dataType":"string","required":true},
            "className": {"dataType":"string","required":true},
            "academicYear": {"dataType":"string","required":true},
            "section": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
            "name": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
            "capacity": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}]},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "BatchClassUploadInput": {
        "dataType": "refObject",
        "properties": {
            "classes": {"dataType":"array","array":{"dataType":"refObject","ref":"BatchClassUploadRow"},"required":true},
            "createdById": {"dataType":"double"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PaginatedClassResponseDTO": {
        "dataType": "refObject",
        "properties": {
            "records": {"dataType":"array","array":{"dataType":"refObject","ref":"ClassResponseDTO"},"required":true},
            "total": {"dataType":"double","required":true},
            "page": {"dataType":"double","required":true},
            "limit": {"dataType":"double","required":true},
            "totalPages": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateClassInput": {
        "dataType": "refObject",
        "properties": {
            "schoolId": {"dataType":"double"},
            "gradeId": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}]},
            "className": {"dataType":"string"},
            "section": {"dataType":"string"},
            "name": {"dataType":"string"},
            "academicYear": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
            "assessmentCycle": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
            "capacity": {"dataType":"double"},
            "status": {"ref":"ClassStatus"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AssessmentStatus": {
        "dataType": "refEnum",
        "enums": ["Present","Absent","Partial"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "OralFlag": {
        "dataType": "refEnum",
        "enums": ["C0","C1","C2","C3"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "BaselineDomain": {
        "dataType": "refEnum",
        "enums": ["Vocabulary","Grammar","Phrase_Sentence","Listening","Speaking","Reading","Writing"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SuggestedStage": {
        "dataType": "refEnum",
        "enums": ["S1","S2","S3","S4","S5","Review","AB"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "DomainScoreRecord": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"double","required":true},
            "assessmentId": {"dataType":"double","required":true},
            "domain": {"ref":"BaselineDomain","required":true},
            "item1": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}],"required":true},
            "item2": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}],"required":true},
            "item3": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}],"required":true},
            "item4": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}],"required":true},
            "item5": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}],"required":true},
            "domainScore": {"dataType":"double","required":true},
            "suggestedStage": {"ref":"SuggestedStage","required":true},
            "finalStage": {"dataType":"union","subSchemas":[{"ref":"SuggestedStage"},{"dataType":"enum","enums":[null]}],"required":true},
            "reviewNeeded": {"dataType":"boolean","required":true},
            "createdAt": {"dataType":"datetime","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "BaselineAssessmentRecord": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"double","required":true},
            "studentId": {"dataType":"string","required":true},
            "assessmentDate": {"dataType":"string","required":true},
            "assessorName": {"dataType":"string","required":true},
            "status": {"ref":"AssessmentStatus","required":true},
            "keySupportFlag": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "oralFlag": {"dataType":"union","subSchemas":[{"ref":"OralFlag"},{"dataType":"enum","enums":[null]}],"required":true},
            "qcNotes": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "createdAt": {"dataType":"datetime","required":true},
            "updatedAt": {"dataType":"datetime","required":true},
            "domainScores": {"dataType":"array","array":{"dataType":"refObject","ref":"DomainScoreRecord"}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "DomainScoreInput": {
        "dataType": "refObject",
        "properties": {
            "domain": {"ref":"BaselineDomain","required":true},
            "item1": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}]},
            "item2": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}]},
            "item3": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}]},
            "item4": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}]},
            "item5": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}]},
            "domainScore": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}]},
            "suggestedStage": {"dataType":"union","subSchemas":[{"ref":"SuggestedStage"},{"dataType":"enum","enums":[null]}]},
            "finalStage": {"dataType":"union","subSchemas":[{"ref":"SuggestedStage"},{"dataType":"enum","enums":[null]}]},
            "reviewNeeded": {"dataType":"union","subSchemas":[{"dataType":"boolean"},{"dataType":"enum","enums":[null]}]},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateBaselineAssessmentInput": {
        "dataType": "refObject",
        "properties": {
            "studentId": {"dataType":"string","required":true},
            "assessmentDate": {"dataType":"string","required":true},
            "assessorName": {"dataType":"string","required":true},
            "status": {"ref":"AssessmentStatus"},
            "keySupportFlag": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
            "oralFlag": {"dataType":"union","subSchemas":[{"ref":"OralFlag"},{"dataType":"enum","enums":[null]}]},
            "qcNotes": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
            "domainScores": {"dataType":"array","array":{"dataType":"refObject","ref":"DomainScoreInput"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "BulkImportBaselineAssessmentInput": {
        "dataType": "refObject",
        "properties": {
            "assessments": {"dataType":"array","array":{"dataType":"refObject","ref":"CreateBaselineAssessmentInput"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Record_string.unknown_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{},"additionalProperties":{"dataType":"any"},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PaginatedBaselineAssessmentResponse": {
        "dataType": "refObject",
        "properties": {
            "records": {"dataType":"array","array":{"dataType":"any"},"required":true},
            "total": {"dataType":"double","required":true},
            "page": {"dataType":"double","required":true},
            "totalPages": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateBaselineAssessmentInput": {
        "dataType": "refObject",
        "properties": {
            "studentId": {"dataType":"string"},
            "assessmentDate": {"dataType":"string"},
            "assessorName": {"dataType":"string"},
            "status": {"ref":"AssessmentStatus"},
            "keySupportFlag": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
            "oralFlag": {"dataType":"union","subSchemas":[{"ref":"OralFlag"},{"dataType":"enum","enums":[null]}]},
            "qcNotes": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
            "domainScores": {"dataType":"array","array":{"dataType":"refObject","ref":"DomainScoreInput"}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "_36_Enums.AttendanceStatus": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["P"]},{"dataType":"enum","enums":["A"]},{"dataType":"enum","enums":["HALF_DAY"]},{"dataType":"enum","enums":["ACTIVITY"]},{"dataType":"enum","enums":["CANCELLED"]},{"dataType":"enum","enums":["ON_LEAVE"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AttendanceStatus": {
        "dataType": "refAlias",
        "type": {"ref":"_36_Enums.AttendanceStatus","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AttendanceStudentSummaryDTO": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"double","required":true},
            "studentIdCode": {"dataType":"string","required":true},
            "firstName": {"dataType":"string","required":true},
            "lastName": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AttendanceResponseDTO": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "classId": {"dataType":"double","required":true},
            "studentId": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}],"required":true},
            "sessionDate": {"dataType":"string","required":true},
            "status": {"ref":"AttendanceStatus","required":true},
            "remarks": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "createdAt": {"dataType":"string","required":true},
            "className": {"dataType":"string"},
            "student": {"dataType":"union","subSchemas":[{"ref":"AttendanceStudentSummaryDTO"},{"dataType":"enum","enums":[null]}]},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "BulkAttendanceUploadResultDTO": {
        "dataType": "refObject",
        "properties": {
            "totalRows": {"dataType":"double","required":true},
            "created": {"dataType":"double","required":true},
            "skipped": {"dataType":"double","required":true},
            "failed": {"dataType":"double","required":true},
            "records": {"dataType":"array","array":{"dataType":"refObject","ref":"AttendanceResponseDTO"},"required":true},
            "errors": {"dataType":"array","array":{"dataType":"refObject","ref":"RowErrorDTO"},"required":true},
            "cancellations": {"dataType":"double","required":true},
            "sessionsProcessed": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AttendanceUploadRequestBody": {
        "dataType": "refObject",
        "properties": {
            "schoolId": {"dataType":"double"},
            "classSectionId": {"dataType":"double"},
            "records": {"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"academicYear":{"dataType":"string"},"className":{"dataType":"string"},"schoolCode":{"dataType":"string"},"remarks":{"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},"status":{"dataType":"string","required":true},"sessionDate":{"dataType":"string","required":true},"studentId":{"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"double"},{"dataType":"enum","enums":[null]}]}}},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "BatchUpsertAttendanceResponseDTO": {
        "dataType": "refObject",
        "properties": {
            "classId": {"dataType":"double","required":true},
            "sessionDate": {"dataType":"string","required":true},
            "upserted": {"dataType":"double","required":true},
            "records": {"dataType":"array","array":{"dataType":"refObject","ref":"AttendanceResponseDTO"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AttendanceRecordInput": {
        "dataType": "refObject",
        "properties": {
            "studentId": {"dataType":"double","required":true},
            "status": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["P"]},{"dataType":"enum","enums":["A"]},{"dataType":"enum","enums":["HALF_DAY"]},{"dataType":"enum","enums":["ACTIVITY"]}],"required":true},
            "remarks": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "BatchUpsertAttendanceInput": {
        "dataType": "refObject",
        "properties": {
            "classId": {"dataType":"double","required":true},
            "sessionDate": {"dataType":"string","required":true},
            "records": {"dataType":"array","array":{"dataType":"refObject","ref":"AttendanceRecordInput"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ClassCancellationResponseDTO": {
        "dataType": "refObject",
        "properties": {
            "classId": {"dataType":"double","required":true},
            "sessionDate": {"dataType":"string","required":true},
            "status": {"ref":"AttendanceStatus","required":true},
            "remarks": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "removedStudentRecords": {"dataType":"double","required":true},
            "record": {"ref":"AttendanceResponseDTO","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CancelClassAttendanceInput": {
        "dataType": "refObject",
        "properties": {
            "classId": {"dataType":"double","required":true},
            "sessionDate": {"dataType":"string","required":true},
            "remarks": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MutationMessageDTO": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "message": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UncancelClassAttendanceInput": {
        "dataType": "refObject",
        "properties": {
            "classId": {"dataType":"double","required":true},
            "sessionDate": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "DailyRegisterEntryDTO": {
        "dataType": "refObject",
        "properties": {
            "studentId": {"dataType":"double","required":true},
            "studentIdCode": {"dataType":"string","required":true},
            "firstName": {"dataType":"string","required":true},
            "lastName": {"dataType":"string","required":true},
            "status": {"dataType":"union","subSchemas":[{"ref":"AttendanceStatus"},{"dataType":"enum","enums":["UNMARKED"]}],"required":true},
            "remarks": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "attendanceId": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "DailyRegisterResponseDTO": {
        "dataType": "refObject",
        "properties": {
            "classId": {"dataType":"double","required":true},
            "className": {"dataType":"string","required":true},
            "sessionDate": {"dataType":"string","required":true},
            "cancelled": {"dataType":"boolean","required":true},
            "cancellationRemarks": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "enrolledCount": {"dataType":"double","required":true},
            "markedCount": {"dataType":"double","required":true},
            "presentCount": {"dataType":"double","required":true},
            "absentCount": {"dataType":"double","required":true},
            "halfDayCount": {"dataType":"double","required":true},
            "activityCount": {"dataType":"double","required":true},
            "leaveCount": {"dataType":"double","required":true},
            "entries": {"dataType":"array","array":{"dataType":"refObject","ref":"DailyRegisterEntryDTO"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AttendanceRiskLevel": {
        "dataType": "refEnum",
        "enums": ["STABLE","WATCH","AT_RISK","CRITICAL"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "StudentMonthlyAnalyticsDTO": {
        "dataType": "refObject",
        "properties": {
            "studentId": {"dataType":"double","required":true},
            "studentIdCode": {"dataType":"string","required":true},
            "firstName": {"dataType":"string","required":true},
            "lastName": {"dataType":"string","required":true},
            "presentDays": {"dataType":"double","required":true},
            "absentDays": {"dataType":"double","required":true},
            "halfDays": {"dataType":"double","required":true},
            "activityDays": {"dataType":"double","required":true},
            "leaveDays": {"dataType":"double","required":true},
            "unmarkedDays": {"dataType":"double","required":true},
            "workingDays": {"dataType":"double","required":true},
            "attendancePercent": {"dataType":"double","required":true},
            "consecutiveAbsences": {"dataType":"double","required":true},
            "maxConsecutiveAbsences": {"dataType":"double","required":true},
            "riskLevel": {"ref":"AttendanceRiskLevel","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MonthlyAttendanceAnalyticsDTO": {
        "dataType": "refObject",
        "properties": {
            "classId": {"dataType":"double","required":true},
            "className": {"dataType":"string","required":true},
            "year": {"dataType":"double","required":true},
            "month": {"dataType":"double","required":true},
            "workingDays": {"dataType":"double","required":true},
            "cancelledDays": {"dataType":"double","required":true},
            "classAveragePercent": {"dataType":"double","required":true},
            "atRiskCount": {"dataType":"double","required":true},
            "students": {"dataType":"array","array":{"dataType":"refObject","ref":"StudentMonthlyAnalyticsDTO"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PaginatedAttendanceResponseDTO": {
        "dataType": "refObject",
        "properties": {
            "records": {"dataType":"array","array":{"dataType":"refObject","ref":"AttendanceResponseDTO"},"required":true},
            "total": {"dataType":"double","required":true},
            "page": {"dataType":"double","required":true},
            "limit": {"dataType":"double","required":true},
            "totalPages": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateAttendanceInput": {
        "dataType": "refObject",
        "properties": {
            "status": {"ref":"AttendanceStatus"},
            "remarks": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MetricsFilterEchoDTO": {
        "dataType": "refObject",
        "properties": {
            "academicYear": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "fromDate": {"dataType":"string","required":true},
            "toDate": {"dataType":"string","required":true},
            "schoolId": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}],"required":true},
            "classId": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}],"required":true},
            "month": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}],"required":true},
            "year": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}],"required":true},
            "generatedAt": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "KpiTrendDirection": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["UP"]},{"dataType":"enum","enums":["DOWN"]},{"dataType":"enum","enums":["FLAT"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "KpiDeltaDTO": {
        "dataType": "refObject",
        "properties": {
            "value": {"dataType":"double","required":true},
            "percent": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}],"required":true},
            "comparisonLabel": {"dataType":"string","required":true},
            "direction": {"ref":"KpiTrendDirection","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "KpiMetricDTO": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "title": {"dataType":"string","required":true},
            "value": {"dataType":"double","required":true},
            "unit": {"dataType":"string","required":true},
            "subtext": {"dataType":"string","required":true},
            "delta": {"ref":"KpiDeltaDTO","required":true},
            "isPositive": {"dataType":"boolean","required":true},
            "icon": {"dataType":"string","required":true},
            "trend": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "OverallProgressSummaryDTO": {
        "dataType": "refObject",
        "properties": {
            "baseline": {"dataType":"double","required":true},
            "current": {"dataType":"double","required":true},
            "increase": {"dataType":"double","required":true},
            "baselineStudents": {"dataType":"double","required":true},
            "currentStudents": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "DomainProgressDTO": {
        "dataType": "refObject",
        "properties": {
            "domain": {"dataType":"string","required":true},
            "baseline": {"dataType":"double","required":true},
            "current": {"dataType":"double","required":true},
            "gain": {"dataType":"double","required":true},
            "baselineStudents": {"dataType":"double","required":true},
            "currentStudents": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MetricsStageCode": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["S1"]},{"dataType":"enum","enums":["S2"]},{"dataType":"enum","enums":["S3"]},{"dataType":"enum","enums":["S4"]},{"dataType":"enum","enums":["S5"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "StageDistributionItemDTO": {
        "dataType": "refObject",
        "properties": {
            "stage": {"dataType":"string","required":true},
            "stageCode": {"ref":"MetricsStageCode","required":true},
            "studentCount": {"dataType":"double","required":true},
            "percentage": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "StageMovementItemDTO": {
        "dataType": "refObject",
        "properties": {
            "stage": {"dataType":"string","required":true},
            "stageCode": {"ref":"MetricsStageCode","required":true},
            "baselinePercentage": {"dataType":"double","required":true},
            "currentPercentage": {"dataType":"double","required":true},
            "deltaPoints": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SasCategory": {
        "dataType": "refEnum",
        "enums": ["Support","Core","Stretch"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SasDistributionItemDTO": {
        "dataType": "refObject",
        "properties": {
            "category": {"ref":"SasCategory","required":true},
            "percentage": {"dataType":"double","required":true},
            "studentCount": {"dataType":"double","required":true},
            "color": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "LearningProgressDTO": {
        "dataType": "refObject",
        "properties": {
            "overallProgress": {"ref":"OverallProgressSummaryDTO","required":true},
            "learningProgress": {"dataType":"array","array":{"dataType":"refObject","ref":"DomainProgressDTO"},"required":true},
            "domainProgress": {"dataType":"array","array":{"dataType":"refObject","ref":"DomainProgressDTO"},"required":true},
            "stageDistribution": {"dataType":"array","array":{"dataType":"refObject","ref":"StageDistributionItemDTO"},"required":true},
            "stageMovement": {"dataType":"array","array":{"dataType":"refObject","ref":"StageMovementItemDTO"},"required":true},
            "sasDistribution": {"dataType":"array","array":{"dataType":"refObject","ref":"SasDistributionItemDTO"},"required":true},
            "studentsAssessed": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MetricsStatusBand": {
        "dataType": "refEnum",
        "enums": ["ON_TRACK","WATCH","CRITICAL"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SchoolPerformanceDTO": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "school": {"dataType":"string","required":true},
            "students": {"dataType":"double","required":true},
            "attendance": {"dataType":"double","required":true},
            "learningGain": {"dataType":"double","required":true},
            "objectives": {"dataType":"double","required":true},
            "meStatus": {"dataType":"string","required":true},
            "meStatusCategory": {"dataType":"string","required":true},
            "schoolId": {"dataType":"double","required":true},
            "schoolCode": {"dataType":"string","required":true},
            "studentCount": {"dataType":"double","required":true},
            "attendancePercent": {"dataType":"double","required":true},
            "learningGainPoints": {"dataType":"double","required":true},
            "objectivesCoveredPercent": {"dataType":"double","required":true},
            "meStatusBand": {"ref":"MetricsStatusBand","required":true},
            "riskScore": {"dataType":"double","required":true},
            "dataCompletenessPercent": {"dataType":"double","required":true},
            "classCount": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "NeedsAttentionCategory": {
        "dataType": "refEnum",
        "enums": ["Attendance","Speaking Practice","Learning Gain","Objectives Coverage","Parental Engagement","Data Gap"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AlertSeverity": {
        "dataType": "refEnum",
        "enums": ["CRITICAL","WARNING","INFO"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "NeedsAttentionDTO": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "title": {"dataType":"string","required":true},
            "subtitle": {"dataType":"string","required":true},
            "category": {"ref":"NeedsAttentionCategory","required":true},
            "severity": {"ref":"AlertSeverity","required":true},
            "schoolId": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}],"required":true},
            "schoolName": {"dataType":"string","required":true},
            "classSectionId": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}],"required":true},
            "className": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "issueDescription": {"dataType":"string","required":true},
            "actionNeeded": {"dataType":"string","required":true},
            "observedValue": {"dataType":"double","required":true},
            "thresholdValue": {"dataType":"double","required":true},
            "unit": {"dataType":"string","required":true},
            "gapPoints": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ObjectiveProgressDTO": {
        "dataType": "refObject",
        "properties": {
            "planned": {"dataType":"double","required":true},
            "completed": {"dataType":"double","required":true},
            "inProgress": {"dataType":"double","required":true},
            "upcoming": {"dataType":"double","required":true},
            "completionPercent": {"dataType":"double","required":true},
            "total": {"dataType":"double","required":true},
            "momDeltaPoints": {"dataType":"double","required":true},
            "momDirection": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TeachingModuleColumnDTO": {
        "dataType": "refObject",
        "properties": {
            "moduleId": {"dataType":"double","required":true},
            "code": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
            "sequenceNumber": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MetricsModuleStatus": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["covered"]},{"dataType":"enum","enums":["in-progress"]},{"dataType":"enum","enums":["not-started"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TeachingMatrixRowDTO": {
        "dataType": "refObject",
        "properties": {
            "classSectionId": {"dataType":"double","required":true},
            "schoolId": {"dataType":"double","required":true},
            "schoolName": {"dataType":"string","required":true},
            "className": {"dataType":"string","required":true},
            "modules": {"dataType":"array","array":{"dataType":"refAlias","ref":"MetricsModuleStatus"},"required":true},
            "coveragePercent": {"dataType":"double","required":true},
            "coveredCount": {"dataType":"double","required":true},
            "inProgressCount": {"dataType":"double","required":true},
            "notStartedCount": {"dataType":"double","required":true},
            "enrolledStudents": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TeachingObjectivesDTO": {
        "dataType": "refObject",
        "properties": {
            "objectiveProgress": {"ref":"ObjectiveProgressDTO","required":true},
            "moduleColumns": {"dataType":"array","array":{"dataType":"refObject","ref":"TeachingModuleColumnDTO"},"required":true},
            "teachingMatrix": {"dataType":"array","array":{"dataType":"refObject","ref":"TeachingMatrixRowDTO"},"required":true},
            "overallCoveragePercent": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ClassParticipationRowDTO": {
        "dataType": "refObject",
        "properties": {
            "classSectionId": {"dataType":"double","required":true},
            "className": {"dataType":"string","required":true},
            "schoolName": {"dataType":"string","required":true},
            "participatingStudents": {"dataType":"double","required":true},
            "enrolledStudents": {"dataType":"double","required":true},
            "participationRatePercent": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ClassParticipationDTO": {
        "dataType": "refObject",
        "properties": {
            "participatingStudents": {"dataType":"double","required":true},
            "enrolledStudents": {"dataType":"double","required":true},
            "participationRatePercent": {"dataType":"double","required":true},
            "delta": {"ref":"KpiDeltaDTO","required":true},
            "byClass": {"dataType":"array","array":{"dataType":"refObject","ref":"ClassParticipationRowDTO"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ActivityTypeBreakdownDTO": {
        "dataType": "refObject",
        "properties": {
            "activityType": {"dataType":"string","required":true},
            "activeStudents": {"dataType":"double","required":true},
            "percentOfActive": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ActiveStudentsDTO": {
        "dataType": "refObject",
        "properties": {
            "activeStudents": {"dataType":"double","required":true},
            "enrolledStudents": {"dataType":"double","required":true},
            "activeRatePercent": {"dataType":"double","required":true},
            "delta": {"ref":"KpiDeltaDTO","required":true},
            "byActivityType": {"dataType":"array","array":{"dataType":"refObject","ref":"ActivityTypeBreakdownDTO"},"required":true},
            "sparkline": {"dataType":"array","array":{"dataType":"double"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ParentChannelBreakdownDTO": {
        "dataType": "refObject",
        "properties": {
            "channel": {"dataType":"string","required":true},
            "count": {"dataType":"double","required":true},
            "percent": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ParentEngagementDTO": {
        "dataType": "refObject",
        "properties": {
            "parentsReached": {"dataType":"double","required":true},
            "previousMonthParentsReached": {"dataType":"double","required":true},
            "momPercentChange": {"dataType":"double","required":true},
            "delta": {"ref":"KpiDeltaDTO","required":true},
            "byChannel": {"dataType":"array","array":{"dataType":"refObject","ref":"ParentChannelBreakdownDTO"},"required":true},
            "sparkline": {"dataType":"array","array":{"dataType":"double"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "HomeVisitsDTO": {
        "dataType": "refObject",
        "properties": {
            "completedVisits": {"dataType":"double","required":true},
            "previousMonthCompletedVisits": {"dataType":"double","required":true},
            "studentsReached": {"dataType":"double","required":true},
            "previousMonthStudentsReached": {"dataType":"double","required":true},
            "studentsReachedDelta": {"dataType":"double","required":true},
            "delta": {"ref":"KpiDeltaDTO","required":true},
            "sparkline": {"dataType":"array","array":{"dataType":"double"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "EngagementMetricsDTO": {
        "dataType": "refObject",
        "properties": {
            "classParticipation": {"ref":"ClassParticipationDTO","required":true},
            "activeStudents": {"ref":"ActiveStudentsDTO","required":true},
            "parentEngagement": {"ref":"ParentEngagementDTO","required":true},
            "homeVisits": {"ref":"HomeVisitsDTO","required":true},
            "overallEngagementScore": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "BudgetTrackingDTO": {
        "dataType": "refObject",
        "properties": {
            "totalAnnualBudget": {"dataType":"double","required":true},
            "spentTillDate": {"dataType":"double","required":true},
            "balanceRemaining": {"dataType":"double","required":true},
            "currency": {"dataType":"string","required":true},
            "utilisationPercent": {"dataType":"double","required":true},
            "expectedUtilisationPercent": {"dataType":"double","required":true},
            "burnRateDeltaPercent": {"dataType":"double","required":true},
            "academicYear": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "hasBudget": {"dataType":"boolean","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CategorySpendDTO": {
        "dataType": "refObject",
        "properties": {
            "name": {"dataType":"string","required":true},
            "category": {"dataType":"string","required":true},
            "amount": {"dataType":"double","required":true},
            "percentage": {"dataType":"double","required":true},
            "allocatedAmount": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}],"required":true},
            "varianceAmount": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MonthlySpendPointDTO": {
        "dataType": "refObject",
        "properties": {
            "month": {"dataType":"string","required":true},
            "monthNumber": {"dataType":"double","required":true},
            "year": {"dataType":"double","required":true},
            "amount": {"dataType":"double","required":true},
            "deltaFromPrevious": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ResourceFinanceDTO": {
        "dataType": "refObject",
        "properties": {
            "budget": {"ref":"BudgetTrackingDTO","required":true},
            "categorySpend": {"dataType":"array","array":{"dataType":"refObject","ref":"CategorySpendDTO"},"required":true},
            "monthlySpendTrend": {"dataType":"array","array":{"dataType":"refObject","ref":"MonthlySpendPointDTO"},"required":true},
            "totalSpendInAcademicYear": {"dataType":"double","required":true},
            "monthsWithSpend": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "EquityOutlierDTO": {
        "dataType": "refObject",
        "properties": {
            "classId": {"dataType":"double","required":true},
            "className": {"dataType":"string","required":true},
            "schoolName": {"dataType":"string","required":true},
            "classProgressPercent": {"dataType":"double","required":true},
            "gapPoints": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "DerivedInsightsDTO": {
        "dataType": "refObject",
        "properties": {
            "overallRiskScore": {"dataType":"double","required":true},
            "overallRiskBand": {"dataType":"string","required":true},
            "classEquityScore": {"dataType":"double","required":true},
            "equityOutliers": {"dataType":"array","array":{"dataType":"refObject","ref":"EquityOutlierDTO"},"required":true},
            "learningGainMomDeltaPoints": {"dataType":"double","required":true},
            "learningGainMomDirection": {"dataType":"string","required":true},
            "dataCompletenessPercent": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "DashboardSummaryResponseDTO": {
        "dataType": "refObject",
        "properties": {
            "filter": {"ref":"MetricsFilterEchoDTO","required":true},
            "kpiMetrics": {"dataType":"array","array":{"dataType":"refObject","ref":"KpiMetricDTO"},"required":true},
            "learningOutcomes": {"ref":"LearningProgressDTO","required":true},
            "schoolPerformance": {"dataType":"array","array":{"dataType":"refObject","ref":"SchoolPerformanceDTO"},"required":true},
            "needsAttention": {"dataType":"array","array":{"dataType":"refObject","ref":"NeedsAttentionDTO"},"required":true},
            "teachingObjectives": {"ref":"TeachingObjectivesDTO","required":true},
            "engagement": {"ref":"EngagementMetricsDTO","required":true},
            "resources": {"ref":"ResourceFinanceDTO","required":true},
            "derivedInsights": {"ref":"DerivedInsightsDTO","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "StudentsEnrolledDTO": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "value": {"dataType":"double","required":true},
            "unit": {"dataType":"string","required":true},
            "subtext": {"dataType":"string","required":true},
            "totalStudents": {"dataType":"double","required":true},
            "activeStudents": {"dataType":"double","required":true},
            "inactiveStudents": {"dataType":"double","required":true},
            "transferredStudents": {"dataType":"double","required":true},
            "delta": {"ref":"KpiDeltaDTO","required":true},
            "schoolsCount": {"dataType":"double","required":true},
            "classesCount": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AttendanceRateDTO": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "value": {"dataType":"double","required":true},
            "unit": {"dataType":"string","required":true},
            "subtext": {"dataType":"string","required":true},
            "attendancePercent": {"dataType":"double","required":true},
            "weightedPresentDays": {"dataType":"double","required":true},
            "workingDays": {"dataType":"double","required":true},
            "cancelledSessions": {"dataType":"double","required":true},
            "unmarkedRecords": {"dataType":"double","required":true},
            "delta": {"ref":"KpiDeltaDTO","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "LearningGainDTO": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "value": {"dataType":"double","required":true},
            "unit": {"dataType":"string","required":true},
            "subtext": {"dataType":"string","required":true},
            "gainPoints": {"dataType":"double","required":true},
            "baselinePercent": {"dataType":"double","required":true},
            "currentPercent": {"dataType":"double","required":true},
            "studentsWithBothAssessments": {"dataType":"double","required":true},
            "strongestDomain": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "weakestDomain": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "delta": {"ref":"KpiDeltaDTO","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ObjectivesCoveredDTO": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "value": {"dataType":"double","required":true},
            "unit": {"dataType":"string","required":true},
            "subtext": {"dataType":"string","required":true},
            "completionPercent": {"dataType":"double","required":true},
            "coveragePercent": {"dataType":"double","required":true},
            "totals": {"ref":"ObjectiveProgressDTO","required":true},
            "delta": {"ref":"KpiDeltaDTO","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ActiveStudentsKpiDTO": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "value": {"dataType":"double","required":true},
            "unit": {"dataType":"string","required":true},
            "subtext": {"dataType":"string","required":true},
            "activeRatePercent": {"dataType":"double","required":true},
            "activeStudents": {"dataType":"double","required":true},
            "enrolledStudents": {"dataType":"double","required":true},
            "delta": {"ref":"KpiDeltaDTO","required":true},
            "detail": {"ref":"ActiveStudentsDTO","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "KpiSummaryResponseDTO": {
        "dataType": "refObject",
        "properties": {
            "filter": {"ref":"MetricsFilterEchoDTO","required":true},
            "studentsEnrolled": {"ref":"StudentsEnrolledDTO","required":true},
            "attendanceRate": {"ref":"AttendanceRateDTO","required":true},
            "averageLearningGain": {"ref":"LearningGainDTO","required":true},
            "objectivesCovered": {"ref":"ObjectivesCoveredDTO","required":true},
            "activeStudents": {"ref":"ActiveStudentsKpiDTO","required":true},
            "kpiMetrics": {"dataType":"array","array":{"dataType":"refObject","ref":"KpiMetricDTO"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SchoolProgrammeAverageDTO": {
        "dataType": "refObject",
        "properties": {
            "attendancePercent": {"dataType":"double","required":true},
            "learningGainPoints": {"dataType":"double","required":true},
            "objectivesCoveredPercent": {"dataType":"double","required":true},
            "riskScore": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SchoolPerformanceResponseDTO": {
        "dataType": "refObject",
        "properties": {
            "schools": {"dataType":"array","array":{"dataType":"refObject","ref":"SchoolPerformanceDTO"},"required":true},
            "totalSchools": {"dataType":"double","required":true},
            "programmeAverage": {"ref":"SchoolProgrammeAverageDTO","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AlertSeverityCountsDTO": {
        "dataType": "refObject",
        "properties": {
            "critical": {"dataType":"double","required":true},
            "warning": {"dataType":"double","required":true},
            "info": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "NeedsAttentionResponseDTO": {
        "dataType": "refObject",
        "properties": {
            "alerts": {"dataType":"array","array":{"dataType":"refObject","ref":"NeedsAttentionDTO"},"required":true},
            "totalAlerts": {"dataType":"double","required":true},
            "bySeverity": {"ref":"AlertSeverityCountsDTO","required":true},
            "truncatedCount": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
};
const templateService = new ExpressTemplateService(models, {"noImplicitAdditionalProperties":"throw-on-extras","bodyCoercion":true});

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa




export function RegisterRoutes(app: Router) {

    // ###########################################################################################################
    //  NOTE: If you do not see routes for all of your controllers in this file, then you might not have informed tsoa of where to look
    //      Please look into the "controllerPathGlobs" config option described in the readme: https://github.com/lukeautry/tsoa
    // ###########################################################################################################


    
        const argsUserController_getUsers: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/users',
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.getUsers)),

            async function UserController_getUsers(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_getUsers, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<UserController>(UserController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getUsers',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUserController_getUserById: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"double"},
        };
        app.get('/users/:id',
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.getUserById)),

            async function UserController_getUserById(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_getUserById, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<UserController>(UserController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getUserById',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUserController_createUser: Record<string, TsoaRoute.ParameterSchema> = {
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"CreateUserDTO"},
        };
        app.post('/users',
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.createUser)),

            async function UserController_createUser(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_createUser, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<UserController>(UserController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'createUser',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsStudentController_createStudent: Record<string, TsoaRoute.ParameterSchema> = {
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"CreateStudentInput"},
        };
        app.post('/students',
            ...(fetchMiddlewares<RequestHandler>(StudentController)),
            ...(fetchMiddlewares<RequestHandler>(StudentController.prototype.createStudent)),

            async function StudentController_createStudent(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsStudentController_createStudent, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<StudentController>(StudentController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'createStudent',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsStudentController_batchUploadStudents: Record<string, TsoaRoute.ParameterSchema> = {
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"BatchStudentUploadInput"},
        };
        app.post('/students/batch',
            ...(fetchMiddlewares<RequestHandler>(StudentController)),
            ...(fetchMiddlewares<RequestHandler>(StudentController.prototype.batchUploadStudents)),

            async function StudentController_batchUploadStudents(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsStudentController_batchUploadStudents, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<StudentController>(StudentController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'batchUploadStudents',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsStudentController_listStudents: Record<string, TsoaRoute.ParameterSchema> = {
                page: {"in":"query","name":"page","dataType":"double"},
                limit: {"in":"query","name":"limit","dataType":"double"},
                schoolId: {"in":"query","name":"schoolId","dataType":"double"},
                classId: {"in":"query","name":"classId","dataType":"double"},
                status: {"in":"query","name":"status","ref":"StudentStatus"},
                search: {"in":"query","name":"search","dataType":"string"},
        };
        app.get('/students',
            ...(fetchMiddlewares<RequestHandler>(StudentController)),
            ...(fetchMiddlewares<RequestHandler>(StudentController.prototype.listStudents)),

            async function StudentController_listStudents(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsStudentController_listStudents, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<StudentController>(StudentController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'listStudents',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsStudentController_getStudentById: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"double"},
        };
        app.get('/students/:id',
            ...(fetchMiddlewares<RequestHandler>(StudentController)),
            ...(fetchMiddlewares<RequestHandler>(StudentController.prototype.getStudentById)),

            async function StudentController_getStudentById(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsStudentController_getStudentById, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<StudentController>(StudentController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getStudentById',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsStudentController_updateStudent: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"double"},
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"UpdateStudentInput"},
        };
        app.put('/students/:id',
            ...(fetchMiddlewares<RequestHandler>(StudentController)),
            ...(fetchMiddlewares<RequestHandler>(StudentController.prototype.updateStudent)),

            async function StudentController_updateStudent(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsStudentController_updateStudent, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<StudentController>(StudentController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'updateStudent',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsStudentController_deleteStudent: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"double"},
        };
        app.delete('/students/:id',
            ...(fetchMiddlewares<RequestHandler>(StudentController)),
            ...(fetchMiddlewares<RequestHandler>(StudentController.prototype.deleteStudent)),

            async function StudentController_deleteStudent(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsStudentController_deleteStudent, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<StudentController>(StudentController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'deleteStudent',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsStudentController_enrollStudent: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"double"},
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"EnrollStudentInput"},
        };
        app.post('/students/:id/enroll',
            ...(fetchMiddlewares<RequestHandler>(StudentController)),
            ...(fetchMiddlewares<RequestHandler>(StudentController.prototype.enrollStudent)),

            async function StudentController_enrollStudent(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsStudentController_enrollStudent, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<StudentController>(StudentController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'enrollStudent',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsStudentController_unenrollStudent: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"double"},
                requestBody: {"in":"body","name":"requestBody","ref":"UnenrollStudentInput"},
        };
        app.post('/students/:id/unenroll',
            ...(fetchMiddlewares<RequestHandler>(StudentController)),
            ...(fetchMiddlewares<RequestHandler>(StudentController.prototype.unenrollStudent)),

            async function StudentController_unenrollStudent(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsStudentController_unenrollStudent, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<StudentController>(StudentController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'unenrollStudent',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsStudentController_transferStudent: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"double"},
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"TransferStudentInput"},
        };
        app.post('/students/:id/transfer',
            ...(fetchMiddlewares<RequestHandler>(StudentController)),
            ...(fetchMiddlewares<RequestHandler>(StudentController.prototype.transferStudent)),

            async function StudentController_transferStudent(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsStudentController_transferStudent, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<StudentController>(StudentController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'transferStudent',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSchoolController_listSchools: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/schools',
            ...(fetchMiddlewares<RequestHandler>(SchoolController)),
            ...(fetchMiddlewares<RequestHandler>(SchoolController.prototype.listSchools)),

            async function SchoolController_listSchools(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSchoolController_listSchools, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<SchoolController>(SchoolController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'listSchools',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSchoolController_createSchool: Record<string, TsoaRoute.ParameterSchema> = {
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"CreateSchoolInput"},
        };
        app.post('/schools',
            ...(fetchMiddlewares<RequestHandler>(SchoolController)),
            ...(fetchMiddlewares<RequestHandler>(SchoolController.prototype.createSchool)),

            async function SchoolController_createSchool(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSchoolController_createSchool, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<SchoolController>(SchoolController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'createSchool',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSchoolController_getClassesBySchool: Record<string, TsoaRoute.ParameterSchema> = {
                schoolId: {"in":"path","name":"schoolId","required":true,"dataType":"double"},
        };
        app.get('/schools/:schoolId/classes',
            ...(fetchMiddlewares<RequestHandler>(SchoolController)),
            ...(fetchMiddlewares<RequestHandler>(SchoolController.prototype.getClassesBySchool)),

            async function SchoolController_getClassesBySchool(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSchoolController_getClassesBySchool, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<SchoolController>(SchoolController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getClassesBySchool',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSchoolController_createClass: Record<string, TsoaRoute.ParameterSchema> = {
                schoolId: {"in":"path","name":"schoolId","required":true,"dataType":"double"},
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"CreateSchoolClassInput"},
        };
        app.post('/schools/:schoolId/classes',
            ...(fetchMiddlewares<RequestHandler>(SchoolController)),
            ...(fetchMiddlewares<RequestHandler>(SchoolController.prototype.createClass)),

            async function SchoolController_createClass(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSchoolController_createClass, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<SchoolController>(SchoolController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'createClass',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsClassController_createClass: Record<string, TsoaRoute.ParameterSchema> = {
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"CreateClassInput"},
        };
        app.post('/classes',
            ...(fetchMiddlewares<RequestHandler>(ClassController)),
            ...(fetchMiddlewares<RequestHandler>(ClassController.prototype.createClass)),

            async function ClassController_createClass(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsClassController_createClass, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<ClassController>(ClassController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'createClass',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsClassController_batchUploadClasses: Record<string, TsoaRoute.ParameterSchema> = {
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"BatchClassUploadInput"},
        };
        app.post('/classes/batch',
            ...(fetchMiddlewares<RequestHandler>(ClassController)),
            ...(fetchMiddlewares<RequestHandler>(ClassController.prototype.batchUploadClasses)),

            async function ClassController_batchUploadClasses(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsClassController_batchUploadClasses, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<ClassController>(ClassController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'batchUploadClasses',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsClassController_listClasses: Record<string, TsoaRoute.ParameterSchema> = {
                page: {"in":"query","name":"page","dataType":"double"},
                limit: {"in":"query","name":"limit","dataType":"double"},
                schoolId: {"in":"query","name":"schoolId","dataType":"double"},
                gradeId: {"in":"query","name":"gradeId","dataType":"double"},
                status: {"in":"query","name":"status","ref":"ClassStatus"},
                academicYear: {"in":"query","name":"academicYear","dataType":"string"},
                search: {"in":"query","name":"search","dataType":"string"},
        };
        app.get('/classes',
            ...(fetchMiddlewares<RequestHandler>(ClassController)),
            ...(fetchMiddlewares<RequestHandler>(ClassController.prototype.listClasses)),

            async function ClassController_listClasses(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsClassController_listClasses, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<ClassController>(ClassController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'listClasses',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsClassController_getClassById: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"double"},
        };
        app.get('/classes/:id',
            ...(fetchMiddlewares<RequestHandler>(ClassController)),
            ...(fetchMiddlewares<RequestHandler>(ClassController.prototype.getClassById)),

            async function ClassController_getClassById(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsClassController_getClassById, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<ClassController>(ClassController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getClassById',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsClassController_updateClass: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"double"},
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"UpdateClassInput"},
        };
        app.put('/classes/:id',
            ...(fetchMiddlewares<RequestHandler>(ClassController)),
            ...(fetchMiddlewares<RequestHandler>(ClassController.prototype.updateClass)),

            async function ClassController_updateClass(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsClassController_updateClass, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<ClassController>(ClassController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'updateClass',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsClassController_deleteClass: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"double"},
        };
        app.delete('/classes/:id',
            ...(fetchMiddlewares<RequestHandler>(ClassController)),
            ...(fetchMiddlewares<RequestHandler>(ClassController.prototype.deleteClass)),

            async function ClassController_deleteClass(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsClassController_deleteClass, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<ClassController>(ClassController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'deleteClass',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsClassController_getEnrolledStudents: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"double"},
                page: {"in":"query","name":"page","dataType":"double"},
                limit: {"in":"query","name":"limit","dataType":"double"},
        };
        app.get('/classes/:id/students',
            ...(fetchMiddlewares<RequestHandler>(ClassController)),
            ...(fetchMiddlewares<RequestHandler>(ClassController.prototype.getEnrolledStudents)),

            async function ClassController_getEnrolledStudents(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsClassController_getEnrolledStudents, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<ClassController>(ClassController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getEnrolledStudents',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsBaselineAssessmentController_create: Record<string, TsoaRoute.ParameterSchema> = {
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"CreateBaselineAssessmentInput"},
        };
        app.post('/baseline-assessments',
            ...(fetchMiddlewares<RequestHandler>(BaselineAssessmentController)),
            ...(fetchMiddlewares<RequestHandler>(BaselineAssessmentController.prototype.create)),

            async function BaselineAssessmentController_create(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsBaselineAssessmentController_create, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<BaselineAssessmentController>(BaselineAssessmentController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'create',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsBaselineAssessmentController_importAssessments: Record<string, TsoaRoute.ParameterSchema> = {
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"BulkImportBaselineAssessmentInput"},
        };
        app.post('/baseline-assessments/import',
            ...(fetchMiddlewares<RequestHandler>(BaselineAssessmentController)),
            ...(fetchMiddlewares<RequestHandler>(BaselineAssessmentController.prototype.importAssessments)),

            async function BaselineAssessmentController_importAssessments(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsBaselineAssessmentController_importAssessments, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<BaselineAssessmentController>(BaselineAssessmentController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'importAssessments',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsBaselineAssessmentController_exportFlat: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/baseline-assessments/export/flat',
            ...(fetchMiddlewares<RequestHandler>(BaselineAssessmentController)),
            ...(fetchMiddlewares<RequestHandler>(BaselineAssessmentController.prototype.exportFlat)),

            async function BaselineAssessmentController_exportFlat(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsBaselineAssessmentController_exportFlat, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<BaselineAssessmentController>(BaselineAssessmentController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'exportFlat',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsBaselineAssessmentController_list: Record<string, TsoaRoute.ParameterSchema> = {
                page: {"in":"query","name":"page","dataType":"double"},
                limit: {"in":"query","name":"limit","dataType":"double"},
        };
        app.get('/baseline-assessments',
            ...(fetchMiddlewares<RequestHandler>(BaselineAssessmentController)),
            ...(fetchMiddlewares<RequestHandler>(BaselineAssessmentController.prototype.list)),

            async function BaselineAssessmentController_list(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsBaselineAssessmentController_list, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<BaselineAssessmentController>(BaselineAssessmentController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'list',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsBaselineAssessmentController_getById: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"double"},
        };
        app.get('/baseline-assessments/:id',
            ...(fetchMiddlewares<RequestHandler>(BaselineAssessmentController)),
            ...(fetchMiddlewares<RequestHandler>(BaselineAssessmentController.prototype.getById)),

            async function BaselineAssessmentController_getById(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsBaselineAssessmentController_getById, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<BaselineAssessmentController>(BaselineAssessmentController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getById',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsBaselineAssessmentController_getByStudentId: Record<string, TsoaRoute.ParameterSchema> = {
                studentId: {"in":"path","name":"studentId","required":true,"dataType":"string"},
        };
        app.get('/baseline-assessments/student/:studentId',
            ...(fetchMiddlewares<RequestHandler>(BaselineAssessmentController)),
            ...(fetchMiddlewares<RequestHandler>(BaselineAssessmentController.prototype.getByStudentId)),

            async function BaselineAssessmentController_getByStudentId(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsBaselineAssessmentController_getByStudentId, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<BaselineAssessmentController>(BaselineAssessmentController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getByStudentId',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsBaselineAssessmentController_update: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"double"},
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"UpdateBaselineAssessmentInput"},
        };
        app.put('/baseline-assessments/:id',
            ...(fetchMiddlewares<RequestHandler>(BaselineAssessmentController)),
            ...(fetchMiddlewares<RequestHandler>(BaselineAssessmentController.prototype.update)),

            async function BaselineAssessmentController_update(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsBaselineAssessmentController_update, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<BaselineAssessmentController>(BaselineAssessmentController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'update',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsBaselineAssessmentController_deleteAssessment: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"double"},
        };
        app.delete('/baseline-assessments/:id',
            ...(fetchMiddlewares<RequestHandler>(BaselineAssessmentController)),
            ...(fetchMiddlewares<RequestHandler>(BaselineAssessmentController.prototype.deleteAssessment)),

            async function BaselineAssessmentController_deleteAssessment(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsBaselineAssessmentController_deleteAssessment, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<BaselineAssessmentController>(BaselineAssessmentController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'deleteAssessment',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAttendanceController_bulkUploadAttendance: Record<string, TsoaRoute.ParameterSchema> = {
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"AttendanceUploadRequestBody"},
        };
        app.post('/attendance/batch-upload',
            ...(fetchMiddlewares<RequestHandler>(AttendanceController)),
            ...(fetchMiddlewares<RequestHandler>(AttendanceController.prototype.bulkUploadAttendance)),

            async function AttendanceController_bulkUploadAttendance(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAttendanceController_bulkUploadAttendance, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<AttendanceController>(AttendanceController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'bulkUploadAttendance',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAttendanceController_batchUpsertAttendance: Record<string, TsoaRoute.ParameterSchema> = {
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"BatchUpsertAttendanceInput"},
        };
        app.post('/attendance/batch',
            ...(fetchMiddlewares<RequestHandler>(AttendanceController)),
            ...(fetchMiddlewares<RequestHandler>(AttendanceController.prototype.batchUpsertAttendance)),

            async function AttendanceController_batchUpsertAttendance(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAttendanceController_batchUpsertAttendance, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<AttendanceController>(AttendanceController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'batchUpsertAttendance',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAttendanceController_cancelClassSession: Record<string, TsoaRoute.ParameterSchema> = {
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"CancelClassAttendanceInput"},
        };
        app.post('/attendance/cancel-class',
            ...(fetchMiddlewares<RequestHandler>(AttendanceController)),
            ...(fetchMiddlewares<RequestHandler>(AttendanceController.prototype.cancelClassSession)),

            async function AttendanceController_cancelClassSession(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAttendanceController_cancelClassSession, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<AttendanceController>(AttendanceController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'cancelClassSession',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAttendanceController_uncancelClassSession: Record<string, TsoaRoute.ParameterSchema> = {
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"UncancelClassAttendanceInput"},
        };
        app.post('/attendance/uncancel-class',
            ...(fetchMiddlewares<RequestHandler>(AttendanceController)),
            ...(fetchMiddlewares<RequestHandler>(AttendanceController.prototype.uncancelClassSession)),

            async function AttendanceController_uncancelClassSession(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAttendanceController_uncancelClassSession, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<AttendanceController>(AttendanceController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'uncancelClassSession',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAttendanceController_getDailyRegister: Record<string, TsoaRoute.ParameterSchema> = {
                classId: {"in":"query","name":"classId","required":true,"dataType":"double"},
                sessionDate: {"in":"query","name":"sessionDate","required":true,"dataType":"string"},
        };
        app.get('/attendance/register',
            ...(fetchMiddlewares<RequestHandler>(AttendanceController)),
            ...(fetchMiddlewares<RequestHandler>(AttendanceController.prototype.getDailyRegister)),

            async function AttendanceController_getDailyRegister(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAttendanceController_getDailyRegister, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<AttendanceController>(AttendanceController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getDailyRegister',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAttendanceController_getMonthlyAnalytics: Record<string, TsoaRoute.ParameterSchema> = {
                classId: {"in":"query","name":"classId","required":true,"dataType":"double"},
                year: {"in":"query","name":"year","required":true,"dataType":"double"},
                month: {"in":"query","name":"month","required":true,"dataType":"double"},
        };
        app.get('/attendance/monthly-analytics',
            ...(fetchMiddlewares<RequestHandler>(AttendanceController)),
            ...(fetchMiddlewares<RequestHandler>(AttendanceController.prototype.getMonthlyAnalytics)),

            async function AttendanceController_getMonthlyAnalytics(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAttendanceController_getMonthlyAnalytics, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<AttendanceController>(AttendanceController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getMonthlyAnalytics',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAttendanceController_getRiskAnalytics: Record<string, TsoaRoute.ParameterSchema> = {
                classId: {"in":"query","name":"classId","required":true,"dataType":"double"},
                year: {"in":"query","name":"year","required":true,"dataType":"double"},
                month: {"in":"query","name":"month","required":true,"dataType":"double"},
                minRiskLevel: {"in":"query","name":"minRiskLevel","ref":"AttendanceRiskLevel"},
        };
        app.get('/attendance/risk-analytics',
            ...(fetchMiddlewares<RequestHandler>(AttendanceController)),
            ...(fetchMiddlewares<RequestHandler>(AttendanceController.prototype.getRiskAnalytics)),

            async function AttendanceController_getRiskAnalytics(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAttendanceController_getRiskAnalytics, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<AttendanceController>(AttendanceController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getRiskAnalytics',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAttendanceController_listAttendance: Record<string, TsoaRoute.ParameterSchema> = {
                page: {"in":"query","name":"page","dataType":"double"},
                limit: {"in":"query","name":"limit","dataType":"double"},
                classId: {"in":"query","name":"classId","dataType":"double"},
                studentId: {"in":"query","name":"studentId","dataType":"double"},
                sessionDate: {"in":"query","name":"sessionDate","dataType":"string"},
                fromDate: {"in":"query","name":"fromDate","dataType":"string"},
                toDate: {"in":"query","name":"toDate","dataType":"string"},
                status: {"in":"query","name":"status","ref":"AttendanceStatus"},
        };
        app.get('/attendance',
            ...(fetchMiddlewares<RequestHandler>(AttendanceController)),
            ...(fetchMiddlewares<RequestHandler>(AttendanceController.prototype.listAttendance)),

            async function AttendanceController_listAttendance(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAttendanceController_listAttendance, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<AttendanceController>(AttendanceController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'listAttendance',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAttendanceController_getAttendanceById: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/attendance/:id',
            ...(fetchMiddlewares<RequestHandler>(AttendanceController)),
            ...(fetchMiddlewares<RequestHandler>(AttendanceController.prototype.getAttendanceById)),

            async function AttendanceController_getAttendanceById(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAttendanceController_getAttendanceById, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<AttendanceController>(AttendanceController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getAttendanceById',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAttendanceController_updateAttendance: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"UpdateAttendanceInput"},
        };
        app.put('/attendance/:id',
            ...(fetchMiddlewares<RequestHandler>(AttendanceController)),
            ...(fetchMiddlewares<RequestHandler>(AttendanceController.prototype.updateAttendance)),

            async function AttendanceController_updateAttendance(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAttendanceController_updateAttendance, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<AttendanceController>(AttendanceController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'updateAttendance',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAttendanceController_deleteAttendance: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.delete('/attendance/:id',
            ...(fetchMiddlewares<RequestHandler>(AttendanceController)),
            ...(fetchMiddlewares<RequestHandler>(AttendanceController.prototype.deleteAttendance)),

            async function AttendanceController_deleteAttendance(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAttendanceController_deleteAttendance, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<AttendanceController>(AttendanceController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'deleteAttendance',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsMetricsController_getDashboard: Record<string, TsoaRoute.ParameterSchema> = {
                academicYear: {"in":"query","name":"academicYear","dataType":"string"},
                fromDate: {"in":"query","name":"fromDate","dataType":"string"},
                toDate: {"in":"query","name":"toDate","dataType":"string"},
                schoolId: {"in":"query","name":"schoolId","dataType":"double"},
                classId: {"in":"query","name":"classId","dataType":"double"},
                month: {"in":"query","name":"month","dataType":"double"},
                year: {"in":"query","name":"year","dataType":"double"},
        };
        app.get('/metrics/dashboard',
            ...(fetchMiddlewares<RequestHandler>(MetricsController)),
            ...(fetchMiddlewares<RequestHandler>(MetricsController.prototype.getDashboard)),

            async function MetricsController_getDashboard(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMetricsController_getDashboard, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<MetricsController>(MetricsController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getDashboard',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsMetricsController_getKpis: Record<string, TsoaRoute.ParameterSchema> = {
                academicYear: {"in":"query","name":"academicYear","dataType":"string"},
                fromDate: {"in":"query","name":"fromDate","dataType":"string"},
                toDate: {"in":"query","name":"toDate","dataType":"string"},
                schoolId: {"in":"query","name":"schoolId","dataType":"double"},
                classId: {"in":"query","name":"classId","dataType":"double"},
                month: {"in":"query","name":"month","dataType":"double"},
                year: {"in":"query","name":"year","dataType":"double"},
        };
        app.get('/metrics/kpis',
            ...(fetchMiddlewares<RequestHandler>(MetricsController)),
            ...(fetchMiddlewares<RequestHandler>(MetricsController.prototype.getKpis)),

            async function MetricsController_getKpis(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMetricsController_getKpis, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<MetricsController>(MetricsController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getKpis',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsMetricsController_getLearningOutcomes: Record<string, TsoaRoute.ParameterSchema> = {
                academicYear: {"in":"query","name":"academicYear","dataType":"string"},
                fromDate: {"in":"query","name":"fromDate","dataType":"string"},
                toDate: {"in":"query","name":"toDate","dataType":"string"},
                schoolId: {"in":"query","name":"schoolId","dataType":"double"},
                classId: {"in":"query","name":"classId","dataType":"double"},
                month: {"in":"query","name":"month","dataType":"double"},
                year: {"in":"query","name":"year","dataType":"double"},
        };
        app.get('/metrics/learning-outcomes',
            ...(fetchMiddlewares<RequestHandler>(MetricsController)),
            ...(fetchMiddlewares<RequestHandler>(MetricsController.prototype.getLearningOutcomes)),

            async function MetricsController_getLearningOutcomes(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMetricsController_getLearningOutcomes, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<MetricsController>(MetricsController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getLearningOutcomes',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsMetricsController_getSchoolPerformance: Record<string, TsoaRoute.ParameterSchema> = {
                academicYear: {"in":"query","name":"academicYear","dataType":"string"},
                fromDate: {"in":"query","name":"fromDate","dataType":"string"},
                toDate: {"in":"query","name":"toDate","dataType":"string"},
                schoolId: {"in":"query","name":"schoolId","dataType":"double"},
                classId: {"in":"query","name":"classId","dataType":"double"},
                month: {"in":"query","name":"month","dataType":"double"},
                year: {"in":"query","name":"year","dataType":"double"},
        };
        app.get('/metrics/school-performance',
            ...(fetchMiddlewares<RequestHandler>(MetricsController)),
            ...(fetchMiddlewares<RequestHandler>(MetricsController.prototype.getSchoolPerformance)),

            async function MetricsController_getSchoolPerformance(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMetricsController_getSchoolPerformance, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<MetricsController>(MetricsController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getSchoolPerformance',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsMetricsController_getNeedsAttention: Record<string, TsoaRoute.ParameterSchema> = {
                academicYear: {"in":"query","name":"academicYear","dataType":"string"},
                fromDate: {"in":"query","name":"fromDate","dataType":"string"},
                toDate: {"in":"query","name":"toDate","dataType":"string"},
                schoolId: {"in":"query","name":"schoolId","dataType":"double"},
                classId: {"in":"query","name":"classId","dataType":"double"},
                month: {"in":"query","name":"month","dataType":"double"},
                year: {"in":"query","name":"year","dataType":"double"},
        };
        app.get('/metrics/needs-attention',
            ...(fetchMiddlewares<RequestHandler>(MetricsController)),
            ...(fetchMiddlewares<RequestHandler>(MetricsController.prototype.getNeedsAttention)),

            async function MetricsController_getNeedsAttention(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMetricsController_getNeedsAttention, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<MetricsController>(MetricsController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getNeedsAttention',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsMetricsController_getTeachingObjectives: Record<string, TsoaRoute.ParameterSchema> = {
                academicYear: {"in":"query","name":"academicYear","dataType":"string"},
                fromDate: {"in":"query","name":"fromDate","dataType":"string"},
                toDate: {"in":"query","name":"toDate","dataType":"string"},
                schoolId: {"in":"query","name":"schoolId","dataType":"double"},
                classId: {"in":"query","name":"classId","dataType":"double"},
                month: {"in":"query","name":"month","dataType":"double"},
                year: {"in":"query","name":"year","dataType":"double"},
        };
        app.get('/metrics/teaching-objectives',
            ...(fetchMiddlewares<RequestHandler>(MetricsController)),
            ...(fetchMiddlewares<RequestHandler>(MetricsController.prototype.getTeachingObjectives)),

            async function MetricsController_getTeachingObjectives(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMetricsController_getTeachingObjectives, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<MetricsController>(MetricsController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getTeachingObjectives',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsMetricsController_getEngagement: Record<string, TsoaRoute.ParameterSchema> = {
                academicYear: {"in":"query","name":"academicYear","dataType":"string"},
                fromDate: {"in":"query","name":"fromDate","dataType":"string"},
                toDate: {"in":"query","name":"toDate","dataType":"string"},
                schoolId: {"in":"query","name":"schoolId","dataType":"double"},
                classId: {"in":"query","name":"classId","dataType":"double"},
                month: {"in":"query","name":"month","dataType":"double"},
                year: {"in":"query","name":"year","dataType":"double"},
        };
        app.get('/metrics/engagement',
            ...(fetchMiddlewares<RequestHandler>(MetricsController)),
            ...(fetchMiddlewares<RequestHandler>(MetricsController.prototype.getEngagement)),

            async function MetricsController_getEngagement(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMetricsController_getEngagement, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<MetricsController>(MetricsController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getEngagement',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsMetricsController_getFinance: Record<string, TsoaRoute.ParameterSchema> = {
                academicYear: {"in":"query","name":"academicYear","dataType":"string"},
                fromDate: {"in":"query","name":"fromDate","dataType":"string"},
                toDate: {"in":"query","name":"toDate","dataType":"string"},
                schoolId: {"in":"query","name":"schoolId","dataType":"double"},
                classId: {"in":"query","name":"classId","dataType":"double"},
                month: {"in":"query","name":"month","dataType":"double"},
                year: {"in":"query","name":"year","dataType":"double"},
        };
        app.get('/metrics/finance',
            ...(fetchMiddlewares<RequestHandler>(MetricsController)),
            ...(fetchMiddlewares<RequestHandler>(MetricsController.prototype.getFinance)),

            async function MetricsController_getFinance(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMetricsController_getFinance, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<MetricsController>(MetricsController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getFinance',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa


    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
}

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
