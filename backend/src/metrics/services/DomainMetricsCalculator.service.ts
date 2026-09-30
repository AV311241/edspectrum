import { provide } from 'inversify-binding-decorators';
import { DomainStageRow } from '../models/metrics.models';
import {
  DomainProgressDTO,
  LearningProgressDTO,
  OverallProgressSummaryDTO,
  SasDistributionItemDTO,
  StageDistributionItemDTO,
  StageMovementItemDTO,
} from '../dtos/learningProgress.dto';
import { MetricsStageCode, SasCategory, METRICS_STAGE_CODES } from '../constants/metrics.constants';
import {
  average,
  buildStageDistribution,
  classifySas,
  mean,
  normaliseStage,
  percentage,
  round,
  sasColor,
  stageToPercent,
} from '../utils/MetricsCalculationUtils';

/**
 * The four "core skill" domains the dashboard's learning-progress card renders.
 * `Phrase_Sentence` is a real baseline domain but is not charted on that card, so
 * it is reported in `domainProgress` only.
 */
const CORE_SKILL_DOMAINS: readonly string[] = ['Listening', 'Speaking', 'Reading', 'Writing'];

/**
 * Canonical baseline domain display order, mirroring `ALL_BASELINE_DOMAINS` in
 * `constants/baseline.constants.ts`, so the chart axes are stable between requests.
 */
const ALL_DOMAINS_ORDER: readonly string[] = [
  'Vocabulary',
  'Grammar',
  'Phrase_Sentence',
  'Listening',
  'Speaking',
  'Reading',
  'Writing',
];

/**
 * Per-student attainment snapshot.
 *
 * A student's "stage" for the distribution charts is the mean of their normalised
 * domain stages, rounded to the nearest whole stage. A mean is used rather than a
 * dominant/mode stage because a single strong domain should not hide five weak
 * ones - which is precisely the signal the Stage Distribution chart exists to show.
 */
export interface StudentSnapshot {
  studentId: number;
  schoolId: number;
  classSectionId: number;
  meanStage: number;
  nearestStage: MetricsStageCode;
  /** Mean of the domain stages mapped onto the 0-100 attainment scale. */
  attainmentPercent: number;
  domainCount: number;
}

/**
 * Builds per-student snapshots from flattened domain rows.
 *
 * `REVIEW` and `AB` stages are excluded: REVIEW means the assessor deferred a
 * judgement and AB means the student was absent, so neither represents attainment.
 * Students with no usable domain are dropped entirely rather than counted as S1,
 * which would otherwise inflate the Stage 1 bucket with unassessed students.
 */
export function buildSnapshots(rows: DomainStageRow[]): Map<number, StudentSnapshot> {
  const byStudent = new Map<number, { schoolId: number; classSectionId: number; stages: number[] }>();

  for (const row of rows) {
    const stage = normaliseStage(row.stage);
    if (stage === null) continue;
    const bucket = byStudent.get(row.studentId) ?? {
      schoolId: row.schoolId,
      classSectionId: row.classSectionId,
      stages: [],
    };
    bucket.stages.push(Number(stage.slice(1)));
    byStudent.set(row.studentId, bucket);
  }

  const snapshots = new Map<number, StudentSnapshot>();
  for (const [studentId, data] of byStudent) {
    if (data.stages.length === 0) continue;
    const meanStage = mean(data.stages);
    // Round half-up to the nearest stage, then clamp into S1..S5.
    const nearestNumber = Math.min(5, Math.max(1, Math.round(meanStage)));
    snapshots.set(studentId, {
      studentId,
      schoolId: data.schoolId,
      classSectionId: data.classSectionId,
      meanStage,
      nearestStage: `S${nearestNumber}` as MetricsStageCode,
      attainmentPercent: round(average(data.stages.map((s) => s * 20)), 2),
      domainCount: data.stages.length,
    });
  }
  return snapshots;
}

/**
 * DomainMetricsCalculator - every learning-outcome derivation in one place.
 *
 * Pure and synchronous: it takes already-fetched rows and returns DTOs. That makes
 * the whole Aspect 2 surface unit-testable without a database, and means the
 * service layer only has to worry about fetching.
 */
@provide(DomainMetricsCalculator)
export class DomainMetricsCalculator {
  /**
   * Split rows into "baseline" (each student's earliest assessment date) and
   * "current" (their latest). Comparing a student against themselves is the only
   * way the reported gain is a genuine learning gain rather than a difference
   * between two different cohorts.
   */
  private splitBaselineAndCurrent(
    rows: DomainStageRow[]
  ): { baseline: DomainStageRow[]; current: DomainStageRow[] } {
    const earliest = new Map<number, number>();
    const latest = new Map<number, number>();

    for (const row of rows) {
      const t = row.assessmentDate.getTime();
      const prevEarliest = earliest.get(row.studentId);
      if (prevEarliest === undefined || t < prevEarliest) earliest.set(row.studentId, t);
      const prevLatest = latest.get(row.studentId);
      if (prevLatest === undefined || t > prevLatest) latest.set(row.studentId, t);
    }

    const baseline: DomainStageRow[] = [];
    const current: DomainStageRow[] = [];
    for (const row of rows) {
      const t = row.assessmentDate.getTime();
      if (earliest.get(row.studentId) === t) baseline.push(row);
      if (latest.get(row.studentId) === t) current.push(row);
    }
    return { baseline, current };
  }

  /** Per-domain baseline vs current attainment percentages. */
  public buildDomainProgress(
    baselineRows: DomainStageRow[],
    currentRows: DomainStageRow[]
  ): DomainProgressDTO[] {
    const group = (rows: DomainStageRow[]): Map<string, number[]> => {
      const map = new Map<string, number[]>();
      for (const row of rows) {
        const stage = normaliseStage(row.stage);
        if (stage === null) continue;
        const bucket = map.get(row.domainName) ?? [];
        bucket.push(stageToPercent(stage));
        map.set(row.domainName, bucket);
      }
      return map;
    };

    const baselineByDomain = group(baselineRows);
    const currentByDomain = group(currentRows);

    const reported = new Set([...baselineByDomain.keys(), ...currentByDomain.keys()]);
    // Canonical order first, then any unexpected domain name appended
    // alphabetically so a newly added domain still renders rather than vanishing.
    const ordered = [
      ...ALL_DOMAINS_ORDER.filter((d) => reported.has(d)),
      ...[...reported].filter((d) => !ALL_DOMAINS_ORDER.includes(d)).sort(),
    ];

    return ordered.map((domain) => {
      const baselineValues = baselineByDomain.get(domain) ?? [];
      const currentValues = currentByDomain.get(domain) ?? [];
      const baseline = average(baselineValues);
      const current = average(currentValues);
      return {
        domain,
        baseline,
        current,
        gain: round(current - baseline, 2),
        baselineStudents: baselineValues.length,
        currentStudents: currentValues.length,
      };
    });
  }

  /** Programme-wide baseline vs current, averaged across every assessed domain. */
  public buildOverallProgress(
    baselineRows: DomainStageRow[],
    currentRows: DomainStageRow[]
  ): OverallProgressSummaryDTO {
    const toPercent = (rows: DomainStageRow[]): number[] => {
      const values: number[] = [];
      for (const row of rows) {
        const stage = normaliseStage(row.stage);
        if (stage !== null) values.push(stageToPercent(stage));
      }
      return values;
    };

    const baselineValues = toPercent(baselineRows);
    const currentValues = toPercent(currentRows);
    const baseline = average(baselineValues);
    const current = average(currentValues);

    return {
      baseline,
      current,
      increase: round(current - baseline, 2),
      baselineStudents: baselineValues.length,
      currentStudents: currentValues.length,
    };
  }

  /** Stage distribution of the current snapshot, as S1..S5 buckets. */
  public buildCurrentStageDistribution(rows: DomainStageRow[]): StageDistributionItemDTO[] {
    const snapshots = buildSnapshots(rows);
    return buildStageDistribution([...snapshots.values()].map((s) => s.nearestStage)).map(
      (bucket) => ({
        stage: bucket.label,
        stageCode: bucket.code as MetricsStageCode,
        studentCount: bucket.count,
        percentage: bucket.percentage,
      })
    );
  }

  /**
   * Stage movement - the baseline distribution against the current one.
   *
   * Computed on the *intersection* of students present in both snapshots. Using
   * each period's full population would make a cohort that merely grew look as
   * though the whole programme had moved up a stage.
   */
  public buildStageMovement(
    baselineRows: DomainStageRow[],
    currentRows: DomainStageRow[]
  ): StageMovementItemDTO[] {
    const baselineSnapshots = buildSnapshots(baselineRows);
    const currentSnapshots = buildSnapshots(currentRows);

    const shared = [...baselineSnapshots.keys()].filter((id) => currentSnapshots.has(id));
    const baselineDist = buildStageDistribution(
      shared.map((id) => baselineSnapshots.get(id)!.nearestStage)
    );
    const currentDist = buildStageDistribution(
      shared.map((id) => currentSnapshots.get(id)!.nearestStage)
    );

    return METRICS_STAGE_CODES.map((code, index) => ({
      stage: baselineDist[index]?.label ?? code,
      stageCode: code,
      baselinePercentage: baselineDist[index]?.percentage ?? 0,
      currentPercentage: currentDist[index]?.percentage ?? 0,
      deltaPoints: round(
        (currentDist[index]?.percentage ?? 0) - (baselineDist[index]?.percentage ?? 0),
        2
      ),
    }));
  }

  /** SAS split, classified from each student's mean stage at their current snapshot. */
  public buildSasDistribution(rows: DomainStageRow[]): SasDistributionItemDTO[] {
    const snapshots = buildSnapshots(rows);
    const categories: SasCategory[] = [SasCategory.SUPPORT, SasCategory.CORE, SasCategory.STRETCH];
    const total = snapshots.size;

    return categories.map((category) => {
      const count = [...snapshots.values()].filter((s) => classifySas(s.meanStage) === category)
        .length;
      return {
        category,
        studentCount: count,
        percentage: percentage(count, total),
        color: sasColor(category),
      };
    });
  }

  /** Per-class mean attainment, used for the equity score and its outlier list. */
  public buildClassProgress(rows: DomainStageRow[]): Map<number, number> {
    const snapshots = buildSnapshots(rows);
    const byClass = new Map<number, number[]>();
    for (const snapshot of snapshots.values()) {
      const bucket = byClass.get(snapshot.classSectionId) ?? [];
      bucket.push(snapshot.attainmentPercent);
      byClass.set(snapshot.classSectionId, bucket);
    }
    const result = new Map<number, number>();
    for (const [classId, values] of byClass) result.set(classId, average(values));
    return result;
  }

  /** Per-school mean attainment, used for the school performance matrix. */
  public buildSchoolProgress(rows: DomainStageRow[]): Map<number, number> {
    const snapshots = buildSnapshots(rows);
    const bySchool = new Map<number, number[]>();
    for (const snapshot of snapshots.values()) {
      const bucket = bySchool.get(snapshot.schoolId) ?? [];
      bucket.push(snapshot.attainmentPercent);
      bySchool.set(snapshot.schoolId, bucket);
    }
    const result = new Map<number, number>();
    for (const [schoolId, values] of bySchool) result.set(schoolId, average(values));
    return result;
  }

  /** Number of distinct students with a usable stage in the given rows. */
  public countAssessedStudents(rows: DomainStageRow[]): number {
    return buildSnapshots(rows).size;
  }

  /** Assembles the full Aspect 2 payload from a single set of domain rows. */
  public buildLearningProgress(rows: DomainStageRow[]): LearningProgressDTO {
    const { baseline, current } = this.splitBaselineAndCurrent(rows);
    const domainProgress = this.buildDomainProgress(baseline, current);

    return {
      overallProgress: this.buildOverallProgress(baseline, current),
      learningProgress: domainProgress.filter((d) => CORE_SKILL_DOMAINS.includes(d.domain)),
      domainProgress,
      stageDistribution: this.buildCurrentStageDistribution(current),
      stageMovement: this.buildStageMovement(baseline, current),
      sasDistribution: this.buildSasDistribution(current),
      studentsAssessed: buildSnapshots(current).size,
    };
  }

  /** Per-student snapshots, exposed so the service can compute class/school SAS. */
  public snapshotsFor(rows: DomainStageRow[]): Map<number, StudentSnapshot> {
    return buildSnapshots(rows);
  }

  /** Baseline/current split, exposed so the service can reuse it for KPIs. */
  public splitPeriods(
    rows: DomainStageRow[]
  ): { baseline: DomainStageRow[]; current: DomainStageRow[] } {
    return this.splitBaselineAndCurrent(rows);
  }
}
