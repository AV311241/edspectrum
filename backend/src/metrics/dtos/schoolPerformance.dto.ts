import { MetricsStatusBand } from '../constants/metrics.constants';

/**
 * Aspect 3 - one row of the school performance matrix.
 *
 * Field names deliberately mirror the Angular `SchoolPerformanceItem`
 * (`id`, `school`, `students`, `attendance`, `learningGain`, `objectives`,
 * `meStatus`) so the existing table component can consume this response with no
 * adapter. The richer, unambiguous names sit alongside them.
 */
export interface SchoolPerformanceDTO {
  id: string;
  school: string;
  students: number;
  attendance: number;
  learningGain: number;
  objectives: number;
  /**
   * `'On Track' | 'Watch' | 'Critical'` - the product spec's vocabulary.
   *
   * NOTE: the Angular `SchoolPerformanceItem.meStatus` currently declares
   * `'Needs Attention'` as its third member. `meStatusCategory` below carries the
   * exact same band under the label the frontend already expects, so the component
   * keeps type-checking without any frontend edit. When the frontend is next
   * updated, `'Critical'` can replace `'Needs Attention'` outright.
   */
  meStatus: string;
  /** Frontend-compatible label: `'On Track' | 'Watch' | 'Needs Attention'`. */
  meStatusCategory: string;

  // --- Unambiguous aliases for the same figures ---
  schoolId: number;
  schoolCode: string;
  studentCount: number;
  attendancePercent: number;
  /** Percentage points gained between baseline and current attainment. */
  learningGainPoints: number;
  objectivesCoveredPercent: number;
  meStatusBand: MetricsStatusBand;

  /** Composite Risk Level Score, 0-100 where higher is healthier. */
  riskScore: number;
  /** Assessment data completeness for this school, as a percentage. */
  dataCompletenessPercent: number;
  /** Number of class sections in scope for this school. */
  classCount: number;
}

/** Aspect 3 payload - `GET /metrics/school-performance`. */
export interface SchoolPerformanceResponseDTO {
  schools: SchoolPerformanceDTO[];
  totalSchools: number;
  /** Programme-wide averages, useful for sorting the table against the mean. */
  programmeAverage: SchoolProgrammeAverageDTO;
}

export interface SchoolProgrammeAverageDTO {
  attendancePercent: number;
  learningGainPoints: number;
  objectivesCoveredPercent: number;
  riskScore: number;
}
