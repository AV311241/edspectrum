import { SuggestedStage } from '../constants/baseline.constants';

export interface DomainItemsInput {
  item1: number | null;
  item2: number | null;
  item3: number | null;
  item4: number | null;
  item5: number | null;
}

/**
 * Enterprise Stage Calculation Function
 * Exact TypeScript implementation matching SQL Stored Function `fn_calculate_suggested_stage`
 */
export function calculateSuggestedStage(
  items: DomainItemsInput,
  isAbsent: boolean
): SuggestedStage {
  if (isAbsent) {
    return SuggestedStage.AB;
  }

  const { item1: i1, item2: i2, item3: i3, item4: i4, item5: i5 } = items;

  if (i1 === null && i2 === null && i3 === null && i4 === null && i5 === null) {
    return SuggestedStage.REVIEW;
  }

  const v1 = i1 ?? 0;
  const v2 = i2 ?? 0;
  const v3 = i3 ?? 0;
  const v4 = i4 ?? 0;
  const v5 = i5 ?? 0;

  // Evaluate stage progression rules from S5 down to S1
  if (v5 >= 3 && v1 >= 2 && v2 >= 2 && v3 >= 2 && v4 >= 2) {
    return SuggestedStage.S5;
  } else if (v4 >= 3 && v1 >= 2 && v2 >= 2 && v3 >= 2) {
    return SuggestedStage.S4;
  } else if (v3 >= 3 && v1 >= 2 && v2 >= 2) {
    return SuggestedStage.S3;
  } else if (v2 >= 3 && v1 >= 2) {
    return SuggestedStage.S2;
  } else if (v1 >= 3) {
    return SuggestedStage.S1;
  } else {
    return SuggestedStage.REVIEW;
  }
}
