/** Aspect 7, card 1 - budget vs actuals. */
export interface BudgetTrackingDTO {
  totalAnnualBudget: number;
  spentTillDate: number;
  balanceRemaining: number;
  currency: string;
  /** `spentTillDate / totalAnnualBudget * 100`. */
  utilisationPercent: number;
  /**
   * Straight-line expectation for the elapsed fraction of the academic year.
   * Lets the UI say "ahead of / behind pace" rather than just showing a raw
   * percentage, which is otherwise impossible to interpret in April.
   */
  expectedUtilisationPercent: number;
  /** `utilisationPercent - expectedUtilisationPercent`; positive = ahead of pace. */
  burnRateDeltaPercent: number;
  academicYear: string | null;
  /** False when no budget row exists, so the UI can render an empty state. */
  hasBudget: boolean;
}

/** Aspect 7, card 2 - spend split across the six categories. */
export interface CategorySpendDTO {
  /** e.g. "Human Resources". */
  name: string;
  category: string;
  amount: number;
  /** Share of total spend, 0-100. Sums to 100 when any spend exists. */
  percentage: number;
  /** The sanctioned allocation for this category, when a budget is on record. */
  allocatedAmount: number | null;
  /** `amount - allocatedAmount`; negative = underspent. */
  varianceAmount: number | null;
}

export interface MonthlySpendPointDTO {
  /** Short month label, e.g. "Apr". */
  month: string;
  /** 1-12, for charting against a real date axis. */
  monthNumber: number;
  year: number;
  amount: number;
  /** Month-over-month change in absolute currency. */
  deltaFromPrevious: number;
}

/** Aspect 7 payload - `GET /metrics/finance`. */
export interface ResourceFinanceDTO {
  budget: BudgetTrackingDTO;
  categorySpend: CategorySpendDTO[];
  monthlySpendTrend: MonthlySpendPointDTO[];
  totalSpendInAcademicYear: number;
  /** Months that have at least one ledger row, so gaps are visible as gaps. */
  monthsWithSpend: number;
}
