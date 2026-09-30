/**
 * Metrics module constants - single source of truth for every threshold, band
 * and vocabulary the Akshara dashboard derives.
 *
 * The attendance vocabulary itself is NOT redefined here: `ATTENDANCE_PRESENT_WEIGHT`,
 * `ATTENDANCE_STATUS_VALUES` and the risk thresholds are imported from
 * `constants/attendance.constants.ts` so that a new attendance status can never be
 * honoured by the attendance module and silently ignored by the dashboard.
 */

/**
 * Monitoring & Evaluation (M&E) banding shown per school in the performance matrix.
 *
 * `CRITICAL` is the canonical value requested by the product spec. It maps to the
 * display string `'Needs Attention'`, which is what the Angular dashboard already
 * declares in `SchoolPerformanceItem.meStatus`. Emitting both lets the backend
 * speak the spec's vocabulary while remaining drop-in compatible with the
 * existing frontend union, without editing any frontend file.
 */
export enum MetricsStatusBand {
  ON_TRACK = 'ON_TRACK',
  WATCH = 'WATCH',
  CRITICAL = 'CRITICAL',
}

export const METRICS_STATUS_BAND_DISPLAY: Record<MetricsStatusBand, string> = {
  [MetricsStatusBand.ON_TRACK]: 'On Track',
  [MetricsStatusBand.WATCH]: 'Watch',
  [MetricsStatusBand.CRITICAL]: 'Critical',
};

/** Frontend-compatible alias: `'Critical'` is the internal band, `'Needs Attention'` the UI label. */
export const METRICS_STATUS_BAND_FRONTEND_LABEL: Record<MetricsStatusBand, string> = {
  [MetricsStatusBand.ON_TRACK]: 'On Track',
  [MetricsStatusBand.WATCH]: 'Watch',
  [MetricsStatusBand.CRITICAL]: 'Needs Attention',
};

/**
 * M&E banding thresholds.
 *
 * A school is escalated to CRITICAL only when it breaches BOTH the attendance
 * and the objectives thresholds, or when it has no assessment data at all.
 * Requiring a conjunction on the escalation path deliberately makes the
 * "Critical" badge trustworthy: a school is never flagged critical on the
 * strength of a single lagging indicator.
 */
export const METRICS_ME_THRESHOLDS = {
  attendancePercent: {
    watchBelow: 80,
    criticalBelow: 70,
  },
  objectivesCoveredPercent: {
    watchBelow: 60,
    criticalBelow: 40,
  },
  learningGainPoints: {
    watchBelow: 5,
  },
} as const;

/**
 * Composite "Risk Level Score" (0-100, higher = healthier).
 *
 * Derived metric #1. Weighted so attendance carries the most weight, then
 * objective coverage, then learning gain, then data completeness. A school with
 * no assessment data scores 0 on that component rather than being dropped, so an
 * empty classroom reports as risky instead of silently disappearing.
 */
export const METRICS_RISK_SCORE_WEIGHTS = {
  attendance: 0.35,
  objectives: 0.3,
  learningGain: 0.2,
  dataCompleteness: 0.15,
} as const;

/**
 * Composite "Class Equity Score" (0-100, higher = more equitable).
 *
 * Derived metric #2. One minus the Gini coefficient of the per-class spread,
 * scaled to 100. A programme where every class performs identically scores 100;
 * a single outlier class drives it down.
 */
export const METRICS_EQUITY_SCORE = {
  minPercent: 0,
  maxPercent: 100,
} as const;

/** Derived metric #3: month-over-month movement band for a delta in points. */
export const METRICS_MOM_THRESHOLDS = {
  improvingAtOrAbove: 0.5,
  decliningAtOrBelow: -0.5,
} as const;

/**
 * SAS (Student Achievement Status) bands.
 *
 * IMPORTANT - read before changing:
 * SAS is a *student-level attainment status* computed from the student's own mean
 * stage across the domains that were actually assessed. It is a measurement.
 *
 * It is deliberately NOT the same thing as the Support / Anchor / Stretch *Bands*
 * held in `class_domain_summaries`, which `Docs/Class-summary.md` (section 11)
 * records as expert-entered planning targets owned by the Head of Department, and
 * which that document explicitly forbids auto-assigning. Nothing in this module
 * reads, writes or overwrites those columns.
 */
export enum SasCategory {
  SUPPORT = 'Support',
  CORE = 'Core',
  STRETCH = 'Stretch',
}

/** Mean-stage boundaries for the SAS bands (mean stage is in the range 1..5). */
export const SAS_MEAN_STAGE_THRESHOLDS = {
  /** meanStage < supportBelow -> SUPPORT */
  supportBelow: 2,
  /** supportBelow <= meanStage < stretchAtOrAbove -> CORE, otherwise STRETCH */
  stretchAtOrAbove: 4,
} as const;

/** Display colours for the SAS donut, matching the Angular chart mock data. */
export const SAS_CATEGORY_COLORS: Record<SasCategory, string> = {
  [SasCategory.SUPPORT]: '#A8005B',
  [SasCategory.CORE]: '#10B981',
  [SasCategory.STRETCH]: '#F97316',
};

/**
 * The 5 achievement stages, in display order. `S1` is the lowest.
 * Kept as a literal tuple so the array is also usable as a Zod enum.
 */
export const METRICS_STAGE_CODES = ['S1', 'S2', 'S3', 'S4', 'S5'] as const;
export type MetricsStageCode = (typeof METRICS_STAGE_CODES)[number];

/** The dashboard renders the codes as human labels ("Stage 1"). */
export const METRICS_STAGE_LABELS: Record<MetricsStageCode, string> = {
  S1: 'Stage 1',
  S2: 'Stage 2',
  S3: 'Stage 3',
  S4: 'Stage 4',
  S5: 'Stage 5',
};

/**
 * Per-domain status used by the "Objective Coverage by Class & Module" matrix.
 * The string values are exactly the Angular `TeachingModuleStatus` union.
 */
export const METRICS_MODULE_STATUS_VALUES = ['covered', 'in-progress', 'not-started'] as const;
export type MetricsModuleStatus = (typeof METRICS_MODULE_STATUS_VALUES)[number];

/** The six budget categories, in the order the dashboard renders them. */
export const METRICS_BUDGET_CATEGORY_LABELS = {
  HUMAN_RESOURCES: 'Human Resources',
  TRAVEL: 'Travel',
  TEACHING_MATERIALS: 'Teaching Materials',
  TECHNOLOGY: 'Technology (AI/IVRS)',
  EVENTS: 'Events & Showcase',
  OTHERS: 'Others',
} as const;

/** Alert categories emitted by the dynamic "Needs Attention" generator. */
export enum NeedsAttentionCategory {
  ATTENDANCE = 'Attendance',
  SPEAKING_PRACTICE = 'Speaking Practice',
  LEARNING_GAIN = 'Learning Gain',
  OBJECTIVES = 'Objectives Coverage',
  PARENT_ENGAGEMENT = 'Parental Engagement',
  DATA_GAP = 'Data Gap',
}

export enum AlertSeverity {
  CRITICAL = 'CRITICAL',
  WARNING = 'WARNING',
  INFO = 'INFO',
}

/** Thresholds that drive the dynamic alert generator. */
export const METRICS_ALERT_THRESHOLDS = {
  attendancePercentBelow: 80,
  /** A domain lagging the programme average by this many points raises an alert. */
  domainLagPoints: 8,
  learningGainPointsBelow: 5,
  objectivesCoveredPercentBelow: 60,
  /** Parent engagement falling by this many percent MoM raises an alert. */
  parentEngagementMomDropPercent: 15,
  /** A school with zero attendance rows in the period raises a data-gap alert. */
  attendanceRowGap: 0,
} as const;

/** Maximum number of alerts returned by the generator before truncation. */
export const METRICS_MAX_ALERTS = 50;
