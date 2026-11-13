export type ComparisonIndicator = 
  | { kind: "early_signal"; groupAN: number; groupBN: number; minimumGroupSize: number; }
  | { kind: "insufficient_responses"; groupAN: number; groupBN: number; hardMinimum: number; }
  | { kind: "partial_coverage"; group: "A" | "B" | "both"; validA: number; totalA: number; validB: number; totalB: number; isSevere: boolean; }
  | { kind: "groups_overlap"; sharedStoryCount: number; overlapRate: number; isSubstantial: boolean; }
  | { kind: "slider_middle_ranges_do_not_overlap"; groupAQ1: number; groupAQ3: number; groupBQ1: number; groupBQ3: number; }
  | { kind: "rare_response"; countA: number; countB: number; total: number; rareBelowTotalCount: number; }
  | { kind: "identical_groups" }
  | { kind: "partial_ai_group_coverage"; groupA: { hasSelectedFeeling: number; hasValidGroup: number; unassigned: number; }; groupB: { hasSelectedFeeling: number; hasValidGroup: number; unassigned: number; }; };

export type IndicatorThresholds = {
  minimumGroupSize: number; // For early_signal
  hardMinimum: number;      // For insufficient_responses
  partialCoverageThreshold?: number; // default 0.8
  severeCoverageThreshold?: number;  // default 0.5
  substantialOverlapThreshold?: number; // default 0.2
};

export function getIndicators(
  groupAN: number,
  groupBN: number,
  totalA: number,
  totalB: number,
  sharedStoryCount: number,
  isSalient: boolean,
  thresholds: IndicatorThresholds,
  q1q3?: { aQ1: number; aQ3: number; bQ1: number; bQ3: number }
): ComparisonIndicator[] {
  const indicators: ComparisonIndicator[] = [];

  const partialThreshold = thresholds.partialCoverageThreshold ?? 0.8;
  const severeThreshold = thresholds.severeCoverageThreshold ?? 0.5;
  const overlapThreshold = thresholds.substantialOverlapThreshold ?? 0.2;

  if (groupAN < thresholds.hardMinimum || groupBN < thresholds.hardMinimum || groupAN === 0 || groupBN === 0) {
    indicators.push({ kind: "insufficient_responses", groupAN, groupBN, hardMinimum: thresholds.hardMinimum });
    return indicators;
  }

  if (isSalient && (groupAN < thresholds.minimumGroupSize || groupBN < thresholds.minimumGroupSize)) {
    indicators.push({ kind: "early_signal", groupAN, groupBN, minimumGroupSize: thresholds.minimumGroupSize });
  }

  if (sharedStoryCount > 0) {
    if (sharedStoryCount === totalA && sharedStoryCount === totalB) {
      indicators.push({ kind: "identical_groups" });
    } else {
      const overlapRate = sharedStoryCount / Math.min(totalA, totalB);
      indicators.push({ 
        kind: "groups_overlap", 
        sharedStoryCount, 
        overlapRate, 
        isSubstantial: overlapRate >= overlapThreshold 
      });
    }
  }

  const coverageA = totalA > 0 ? groupAN / totalA : 0;
  const coverageB = totalB > 0 ? groupBN / totalB : 0;
  if (coverageA < partialThreshold || coverageB < partialThreshold) {
    const isSevere = coverageA < severeThreshold || coverageB < severeThreshold;
    indicators.push({
      kind: "partial_coverage",
      group: (coverageA < partialThreshold && coverageB < partialThreshold) ? "both" : (coverageA < partialThreshold ? "A" : "B"),
      validA: groupAN,
      totalA,
      validB: groupBN,
      totalB,
      isSevere
    });
  }

  if (q1q3) {
    const overlap = Math.max(q1q3.aQ1, q1q3.bQ1) <= Math.min(q1q3.aQ3, q1q3.bQ3);
    if (!overlap) {
      indicators.push({
        kind: "slider_middle_ranges_do_not_overlap",
        groupAQ1: q1q3.aQ1, groupAQ3: q1q3.aQ3, groupBQ1: q1q3.bQ1, groupBQ3: q1q3.bQ3
      });
    }
  }

  return indicators;
}
