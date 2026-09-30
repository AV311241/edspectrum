import { provide } from 'inversify-binding-decorators';
import { EngagementActivityType } from '@prisma/client';
import { KpiMetricDTO, KpiDeltaDTO } from '../dtos/metricsFilter.dto';
import {
  ActiveStudentsKpiDTO,
  AttendanceRateDTO,
  LearningGainDTO,
  ObjectivesCoveredDTO,
  StudentsEnrolledDTO,
} from '../dtos/kpiSummary.dto';
import { ObjectiveProgressDTO } from '../dtos/teachingObjectives.dto';
import { ActivityTypeBreakdownDTO, ActiveStudentsDTO } from '../dtos/engagementMetrics.dto';
import { DomainProgressDTO } from '../dtos/learningProgress.dto';
import { EngagementActivityModel, AttendanceRow } from '../models/metrics.models';
import {
  aggregateAttendance,
  average,
  distinctCount,
  formatTrend,
  growthDelta,
  percentage,
  pointDelta,
  round,
  AttendanceAggregate,
} from '../utils/MetricsCalculationUtils';

/**
 * KPIMetricsCalculator - assembles the five headline cards (Aspect 1).
 *
 * Pure and synchronous. Every figure is derived from data the service has already
 * fetched, so the whole KPI surface is testable with plain fixtures and cannot
 * drift away from the numbers shown on the charts beside it: all five cards and
 * all seven aspects read from the SAME fetched snapshot within one request.
 */
@provide(KPIMetricsCalculator)
export class KPIMetricsCalculator {
  /** Wrap a growth/point delta into the transport shape, with a display string. */
  private toDelta(
    current: number,
    previous: number,
    comparisonLabel: string,
    style: 'PERCENT' | 'POINTS'
  ): KpiDeltaDTO {
    const delta = style === 'POINTS' ? pointDelta(current, previous) : growthDelta(current, previous);
    return { value: delta.value, percent: delta.percent, comparisonLabel, direction: delta.direction };
  }

  public buildStudentsEnrolled(params: {
    countsByStatus: Record<string, number>;
    enrolledStudents: number;
    previousYearStudents: number;
    schoolsCount: number;
    classesCount: number;
  }): StudentsEnrolledDTO {
    const active = params.countsByStatus.ACTIVE ?? 0;
    const inactive = params.countsByStatus.INACTIVE ?? 0;
    const transferred = params.countsByStatus.TRANSFERRED ?? 0;
    const total = active + inactive + transferred;

    return {
      id: 'students-enrolled',
      value: total,
      unit: '',
      subtext: 'Students Enrolled',
      totalStudents: total,
      activeStudents: active,
      inactiveStudents: inactive,
      transferredStudents: transferred,
      delta: this.toDelta(total, params.previousYearStudents, 'vs last year', 'PERCENT'),
      schoolsCount: params.schoolsCount,
      classesCount: params.classesCount,
    };
  }

  public buildAttendanceRate(params: {
    current: AttendanceAggregate;
    previous: AttendanceAggregate;
  }): AttendanceRateDTO {
    return {
      id: 'attendance-rate',
      value: params.current.attendancePercent,
      unit: '%',
      subtext: 'Attendance Rate',
      attendancePercent: params.current.attendancePercent,
      weightedPresentDays: params.current.weightedPresentDays,
      workingDays: params.current.workingDays,
      cancelledSessions: params.current.cancelledSessions,
      unmarkedRecords: params.current.unmarkedRecords,
      delta: this.toDelta(
        params.current.attendancePercent,
        params.previous.attendancePercent,
        'vs last month',
        'POINTS'
      ),
    };
  }

  /**
   * Average learning gain.
   *
   * The gain is only computed over students who have BOTH a baseline and a
   * current snapshot, so the figure is a true within-student improvement rather
   * than a difference between two different populations.
   */
  public buildLearningGain(params: {
    baselinePercent: number;
    currentPercent: number;
    studentsWithBoth: number;
    domainProgress: DomainProgressDTO[];
    previousGainPoints: number | null;
  }): LearningGainDTO {
    const gainPoints = round(params.currentPercent - params.baselinePercent, 2);
    const delta = this.toDelta(gainPoints, params.previousGainPoints ?? 0, 'vs last month', 'POINTS');

    const comparable = params.domainProgress.filter(
      (d) => d.baselineStudents > 0 && d.currentStudents > 0
    );
    const strongest = comparable.reduce<DomainProgressDTO | null>(
      (best, d) => (best === null || d.gain > best.gain ? d : best),
      null
    );
    const weakest = comparable.reduce<DomainProgressDTO | null>(
      (worst, d) => (worst === null || d.gain < worst.gain ? d : worst),
      null
    );

    return {
      id: 'learning-gain',
      // The card shows a signed number ("+9"), so the sign is part of the value.
      value: gainPoints,
      unit: ' pts',
      subtext: '(Assessment %)',
      gainPoints,
      baselinePercent: params.baselinePercent,
      currentPercent: params.currentPercent,
      studentsWithBothAssessments: params.studentsWithBoth,
      strongestDomain: strongest?.domain ?? null,
      weakestDomain: weakest?.domain ?? null,
      delta,
    };
  }

  public buildObjectivesCovered(params: {
    objectiveProgress: ObjectiveProgressDTO;
    coveragePercent: number;
    previousCompletionPercent: number | null;
  }): ObjectivesCoveredDTO {
    return {
      id: 'objectives-covered',
      value: params.objectiveProgress.completionPercent,
      unit: '%',
      subtext: 'Objectives Covered',
      completionPercent: params.objectiveProgress.completionPercent,
      coveragePercent: params.coveragePercent,
      totals: params.objectiveProgress,
      delta: this.toDelta(
        params.objectiveProgress.completionPercent,
        params.previousCompletionPercent ?? 0,
        'vs last month',
        'POINTS'
      ),
    };
  }

  /**
   * Active students = AI/IVRS or practice activity, per the card's own subtext.
   *
   * A student counts once regardless of how many activities they logged, so this
   * is a rate of *students*, not of sessions.
   */
  public buildActiveStudents(params: {
    activities: EngagementActivityModel[];
    enrolledStudents: number;
    previousActiveStudents: number;
  }): ActiveStudentsKpiDTO {
    const detail = this.buildActiveStudentsDetail(params);
    return {
      id: 'active-students',
      value: detail.activeRatePercent,
      unit: '%',
      subtext: '(AI/IVRS + Practice)',
      activeRatePercent: detail.activeRatePercent,
      activeStudents: detail.activeStudents,
      enrolledStudents: detail.enrolledStudents,
      delta: this.toDelta(
        detail.activeRatePercent,
        percentage(params.previousActiveStudents, params.enrolledStudents),
        'vs last month',
        'POINTS'
      ),
      detail,
    };
  }

  /** The engagement-facing view of the active-students figure. */
  public buildActiveStudentsDetail(params: {
    activities: EngagementActivityModel[];
    enrolledStudents: number;
  }): ActiveStudentsDTO {
    const practiceTypes: EngagementActivityType[] = [
      EngagementActivityType.AI_IVRS,
      EngagementActivityType.PRACTICE,
    ];
    const practice = params.activities.filter((a) => practiceTypes.includes(a.activityType));
    const activeStudents = distinctCount(practice.map((a) => a.studentId));

    const byActivityType: ActivityTypeBreakdownDTO[] = practiceTypes.map((type) => {
      const count = distinctCount(
        practice.filter((a) => a.activityType === type).map((a) => a.studentId)
      );
      return {
        activityType: type,
        activeStudents: count,
        percentOfActive: percentage(count, activeStudents),
      };
    });

    return {
      activeStudents,
      enrolledStudents: params.enrolledStudents,
      activeRatePercent: percentage(activeStudents, params.enrolledStudents),
      // Placeholder delta: the month-over-month comparison is supplied by the
      // service, which owns the previous-period fetch.
      delta: { value: 0, percent: null, comparisonLabel: 'vs last month', direction: 'FLAT' },
      byActivityType,
      // No per-day breakdown is requested here, so the sparkline is empty rather
      // than an invented trend line.
      sparkline: [],
    };
  }

  /**
   * Flatten the five cards into the `KpiMetric[]` the ribbon component renders.
   *
   * Both the Angular field names (`value` as a display string, `trend`, `icon`) and
   * the typed shape (`delta`, `unit`) are emitted, so the same object serves the
   * existing ribbon and a stricter future consumer.
   */
  public buildKpiRibbon(
    enrolled: StudentsEnrolledDTO,
    attendance: AttendanceRateDTO,
    gain: LearningGainDTO,
    objectives: ObjectivesCoveredDTO,
    active: ActiveStudentsKpiDTO
  ): KpiMetricDTO[] {
    return [
      {
        id: enrolled.id,
        title: 'Students Enrolled',
        value: enrolled.value,
        unit: enrolled.unit,
        subtext: enrolled.subtext,
        delta: enrolled.delta,
        // More students is good, so the trend is positive when the count rose.
        isPositive: enrolled.delta.direction !== 'DOWN',
        icon: 'users',
        trend: formatTrend(
          growthDelta(enrolled.value, enrolled.value - enrolled.delta.value),
          'vs last year'
        ),
      },
      {
        id: attendance.id,
        title: 'Attendance Rate',
        value: attendance.value,
        unit: attendance.unit,
        subtext: attendance.subtext,
        delta: attendance.delta,
        isPositive: attendance.delta.direction !== 'DOWN',
        icon: 'academic-cap',
        trend: formatTrend(attendance.delta, 'vs last month', 'POINTS'),
      },
      {
        id: gain.id,
        title: 'Avg. Learning Gain',
        value: gain.value,
        unit: gain.unit,
        subtext: gain.subtext,
        delta: gain.delta,
        isPositive: gain.delta.direction !== 'DOWN',
        icon: 'chart-bar',
        trend: formatTrend(gain.delta, 'vs last month', 'POINTS'),
      },
      {
        id: objectives.id,
        title: 'Objectives Covered',
        value: objectives.value,
        unit: objectives.unit,
        subtext: objectives.subtext,
        delta: objectives.delta,
        isPositive: objectives.delta.direction !== 'DOWN',
        icon: 'target',
        trend: formatTrend(objectives.delta, 'vs last month', 'POINTS'),
      },
      {
        id: active.id,
        title: 'Active Students',
        value: active.value,
        unit: active.unit,
        subtext: active.subtext,
        delta: active.delta,
        isPositive: active.delta.direction !== 'DOWN',
        icon: 'user-voice',
        trend: formatTrend(active.delta, 'vs last month', 'POINTS'),
      },
    ];
  }

  /** Convenience: aggregate a raw row set into an attendance aggregate. */
  public attendanceFrom(rows: AttendanceRow[]): AttendanceAggregate {
    return aggregateAttendance(rows);
  }

  /** Convenience: mean of a numeric list. */
  public meanOf(values: number[]): number {
    return average(values);
  }
}