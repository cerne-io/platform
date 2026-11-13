import { ComparisonIndicator } from './indicatorUtils';
export type PatternCategory = "shift" | "spread" | "similar";

export type { ComparisonIndicator };

export type TriangleCornerId = string;

export type ContinuousComparisonThresholds = {
  sliderMeaningfulShiftPoints: number; // default: 10
  triadMeaningfulCornerShift: number;  // default: 0.10
  spreadRatioThreshold: number;        // default: 1.5
  minimumGroupSize: number;            // default: 8
  hardMinimum: number;                 // default: 4
};

export const DEFAULT_CONTINUOUS_THRESHOLDS: ContinuousComparisonThresholds = {
  sliderMeaningfulShiftPoints: 10,
  triadMeaningfulCornerShift: 0.10,
  spreadRatioThreshold: 1.5,
  minimumGroupSize: 8,
  hardMinimum: 4
};

export type SliderComparisonResult = {
  kind: "slider";
  questionId: number | string;
  questionText: string;
  labels: { left: string; right: string; };
  groupA: { n: number; median: number; q1: number; q3: number; iqr: number; };
  groupB: { n: number; median: number; q1: number; q3: number; iqr: number; };
  medianDelta: number;
  absoluteShift: number;
  direction: "left" | "right" | "none";
  spreadRatio: number;
  pattern: PatternCategory;
  indicators: ComparisonIndicator[];
  findingText: string;
  qualifierText?: string;
};

export type TriadPoint = { a: number; b: number; c: number; };

export type TriangleComparisonResult = {
  kind: "triangle";
  questionId: number | string;
  questionText: string;
  corners: Array<{
    id: TriangleCornerId;
    label: string;
    groupAMean: number;
    groupBMean: number;
    delta: number;
  }>;
  groupA: { n: number; centroid: TriadPoint; };
  groupB: { n: number; centroid: TriadPoint; };
  strongestShift?: { cornerId: TriangleCornerId; delta: number; direction: "toward" | "away_from"; };
  displayCentroidSeparation: number;
  pattern: PatternCategory;
  indicators: ComparisonIndicator[];
  findingText: string;
  qualifierText?: string;
};
