import { MetricsModuleStatus } from '../constants/metrics.constants';

/** Aspect 5, tiles 1-4 - the objective overview counts. */
export interface ObjectiveProgressDTO {
  planned: number;
  completed: number;
  inProgress: number;
  upcoming: number;
  /** `completed / total * 100` - the "Objectives Covered" KPI. */
  completionPercent: number;
  total: number;
  /** Month-over-month change in `completionPercent`, in percentage points. */
  momDeltaPoints: number;
  momDirection: string;
}

/** One column header of the coverage matrix (M01..M10). */
export interface TeachingModuleColumnDTO {
  moduleId: number;
  code: string;
  name: string;
  sequenceNumber: number;
}

/**
 * One row of the "Objective Coverage by Class & Module" matrix.
 *
 * `modules` is positionally aligned with `TeachingObjectivesDTO.moduleColumns`,
 * and the string values are exactly the Angular `TeachingModuleStatus` union, so
 * the matrix component's three-state dot rendering works unmodified.
 */
export interface TeachingMatrixRowDTO {
  classSectionId: number;
  schoolId: number;
  schoolName: string;
  className: string;
  /** One status per module column, left to right. */
  modules: MetricsModuleStatus[];
  /** `covered / moduleCount * 100`. */
  coveragePercent: number;
  coveredCount: number;
  inProgressCount: number;
  notStartedCount: number;
  enrolledStudents: number;
}

/** Aspect 5 payload - `GET /metrics/teaching-objectives`. */
export interface TeachingObjectivesDTO {
  objectiveProgress: ObjectiveProgressDTO;
  /** Matrix column headers, ordered by `sequenceNumber`. */
  moduleColumns: TeachingModuleColumnDTO[];
  /** Matrix rows, one per in-scope class section. */
  teachingMatrix: TeachingMatrixRowDTO[];
  /** Programme-wide coverage across every cell, 0-100. */
  overallCoveragePercent: number;
}
