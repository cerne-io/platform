import { DeterministicComparisonInput } from './comparisonUtils';
import { 
  ContinuousComparisonThresholds, 
  DEFAULT_CONTINUOUS_THRESHOLDS, 
  PatternCategory, 
  SliderComparisonResult,
  TriangleComparisonResult,
  TriadPoint
} from './continuousComparisonTypes';
import { cartesianToBarycentric, barycentricToCartesian } from './triadGeometry';
import { getIndicators } from './indicatorUtils';

export function classifySliderPattern(metrics: {
  absoluteShift: number;
  spreadRatio: number;
  thresholds: ContinuousComparisonThresholds;
}): PatternCategory {
  const { thresholds } = metrics;
  
  if (metrics.absoluteShift >= thresholds.sliderMeaningfulShiftPoints) {
    return "shift";
  }
  
  if (metrics.spreadRatio >= thresholds.spreadRatioThreshold) {
    return "spread";
  }
  
  return "similar";
}

export function classifyTrianglePattern(metrics: {
  largestAbsoluteCornerDelta: number;
  thresholds: ContinuousComparisonThresholds;
}): PatternCategory {
  const { thresholds } = metrics;
  
  if (metrics.largestAbsoluteCornerDelta >= thresholds.triadMeaningfulCornerShift) {
    return "shift";
  }
  
  return "similar";
}

const getPercentile = (arr: number[], p: number) => {
  if (arr.length === 0) return 0;
  const index = (arr.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  if (upper >= arr.length) return arr[lower];
  return arr[lower] * (1 - weight) + arr[upper] * weight;
};

export function calculateContinuousDifferences(
  input: DeterministicComparisonInput, 
  thresholds = DEFAULT_CONTINUOUS_THRESHOLDS
): { sliders: SliderComparisonResult[], triangles: TriangleComparisonResult[] } {
  
  const { groupAStoryIds, groupBStoryIds, sharedStoryIds, overlapMode, metadataMap } = input;

  const finalA = overlapMode === "exclude_shared" 
    ? groupAStoryIds.filter(id => !sharedStoryIds.includes(id)) 
    : groupAStoryIds;
    
  const finalB = overlapMode === "exclude_shared"
    ? groupBStoryIds.filter(id => !sharedStoryIds.includes(id))
    : groupBStoryIds;

  const sliderMap = new Map<number | string, { text: string; left?: string; right?: string; A: number[]; B: number[] }>();
  const triangleMap = new Map<number | string, { text: string; labels: { top?: string; left?: string; right?: string; }; A: TriadPoint[]; B: TriadPoint[] }>();

  // Process a single story
  const processStory = (id: string, group: "A" | "B") => {
    const meta = metadataMap.get(id);
    if (!meta) return;

    if (meta.sliderResponses) {
      meta.sliderResponses.forEach(r => {
        if (r.response_type !== "answered" || r.value === null) return;
        if (!sliderMap.has(r.question_id)) {
          sliderMap.set(r.question_id, { text: r.question_text, left: r.left_label, right: r.right_label, A: [], B: [] });
        }
        sliderMap.get(r.question_id)![group].push(r.value);
      });
    }

    if (meta.triangleResponses) {
      meta.triangleResponses.forEach(r => {
        if (r.response_type !== "answered" || r.x_position === null || r.y_position === null) return;
        const conversion = cartesianToBarycentric({ x: r.x_position, y: r.y_position });
        if (!conversion.ok) return;

        if (!triangleMap.has(r.question_id)) {
          triangleMap.set(r.question_id, {
            text: r.question_text,
            labels: { top: r.top_label, left: r.bottom_left_label, right: r.bottom_right_label },
            A: [], B: []
          });
        }
        triangleMap.get(r.question_id)![group].push(conversion.value);
      });
    }
  };

  finalA.forEach(id => processStory(id, "A"));
  finalB.forEach(id => processStory(id, "B"));

  const sliders: SliderComparisonResult[] = [];
  const triangles: TriangleComparisonResult[] = [];

  sliderMap.forEach((data, id) => {
    data.A.sort((a, b) => a - b);
    data.B.sort((a, b) => a - b);

    const medianA = getPercentile(data.A, 0.5);
    const q1A = getPercentile(data.A, 0.25);
    const q3A = getPercentile(data.A, 0.75);
    const iqrA = q3A - q1A;

    const medianB = getPercentile(data.B, 0.5);
    const q1B = getPercentile(data.B, 0.25);
    const q3B = getPercentile(data.B, 0.75);
    const iqrB = q3B - q1B;

    const delta = medianA - medianB;
    const absShift = Math.abs(delta);
    
    // Spread ratio guard against 0 IQR
    const spreadRatio = Math.max(iqrA, iqrB) / Math.max(Math.min(iqrA, iqrB), 1);

    const pattern = classifySliderPattern({
      absoluteShift: absShift,
      spreadRatio,
      thresholds
    });

    const isSalient = pattern !== "similar";
    const indicators = getIndicators(
      data.A.length, data.B.length, 
      groupAStoryIds.length, groupBStoryIds.length, 
      sharedStoryIds.length, isSalient, thresholds,
      { aQ1: q1A, aQ3: q3A, bQ1: q1B, bQ3: q3B }
    );
    let direction: "left" | "right" | "none" = "none";
    if (pattern === "shift") {
      direction = delta < 0 ? "left" : "right";
    }

    let findingText = "No notable difference in typical position.";
    if (indicators.some(i => i.kind === 'insufficient_responses')) {
      findingText = "Insufficient responses to compare";
    } else if (pattern === "shift") {
      const endpoint = direction === "right" ? (data.right || "right") : (data.left || "left");
      findingText = `Group A tended ${Math.round(absShift)} points toward ${endpoint}.`;
    } else if (pattern === "spread") {
      findingText = `Group A showed a broader range of positions.`;
      if (iqrB > iqrA) {
        findingText = `Group B showed a broader range of positions.`;
      }
    }

    sliders.push({
      kind: "slider",
      questionId: id,
      questionText: data.text,
      labels: { left: data.left || "", right: data.right || "" },
      groupA: { n: data.A.length, median: medianA, q1: q1A, q3: q3A, iqr: iqrA },
      groupB: { n: data.B.length, median: medianB, q1: q1B, q3: q3B, iqr: iqrB },
      medianDelta: delta,
      absoluteShift: absShift,
      direction,
      spreadRatio,
      pattern,
      indicators,
      findingText
    });
  });

  triangleMap.forEach((data, id) => {
    // Optimization: Calculate centroid sum with an imperative for-loop instead of .reduce()
    // to avoid intermediate object allocations.
    const centroidA = { a: 0, b: 0, c: 0 };
    for (let i = 0; i < data.A.length; i++) {
      centroidA.a += data.A[i].a;
      centroidA.b += data.A[i].b;
      centroidA.c += data.A[i].c;
    }
    if (data.A.length > 0) {
      centroidA.a /= data.A.length; centroidA.b /= data.A.length; centroidA.c /= data.A.length;
    }
    
    const centroidB = { a: 0, b: 0, c: 0 };
    for (let i = 0; i < data.B.length; i++) {
      centroidB.a += data.B[i].a;
      centroidB.b += data.B[i].b;
      centroidB.c += data.B[i].c;
    }
    if (data.B.length > 0) {
      centroidB.a /= data.B.length; centroidB.b /= data.B.length; centroidB.c /= data.B.length;
    }

    const corners = [
      { id: "top", label: data.labels.top || "Top", groupAMean: centroidA.a, groupBMean: centroidB.a, delta: centroidA.a - centroidB.a },
      { id: "left", label: data.labels.left || "Left", groupAMean: centroidA.b, groupBMean: centroidB.b, delta: centroidA.b - centroidB.b },
      { id: "right", label: data.labels.right || "Right", groupAMean: centroidA.c, groupBMean: centroidB.c, delta: centroidA.c - centroidB.c }
    ];

    const sortedCorners = [...corners].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    const strongestCorner = sortedCorners[0];
    const absMaxDelta = Math.abs(strongestCorner.delta);

    const pattern = classifyTrianglePattern({
      largestAbsoluteCornerDelta: absMaxDelta,
      thresholds
    });

    const isSalient = pattern !== "similar";
    const indicators = getIndicators(
      data.A.length, data.B.length,
      groupAStoryIds.length, groupBStoryIds.length,
      sharedStoryIds.length, isSalient, thresholds
    );
    let strongestShift: { cornerId: string; delta: number; direction: "toward" | "away_from" } | undefined = undefined;
    let findingText = "No notable difference in typical position.";
    
    if (indicators.some(i => i.kind === 'insufficient_responses')) {
      findingText = "Insufficient responses to compare";
    } else if (pattern === "shift") {
      strongestShift = {
        cornerId: strongestCorner.id,
        delta: strongestCorner.delta,
        direction: strongestCorner.delta > 0 ? "toward" : "away_from"
      };
      
      const dirText = strongestShift.direction === "toward" ? "more" : "less";
      findingText = `Group A placed ${dirText} emphasis on ${strongestCorner.label}.`;
    }

    // Display centroid separation logic
    const cartA = barycentricToCartesian(centroidA);
    const cartB = barycentricToCartesian(centroidB);
    const dx = cartA.x - cartB.x;
    const dy = cartA.y - cartB.y;
    // Assuming Triangle is scaled to a standard size or normalized. 
    // We'll just provide the raw pixel distance on a 100x100 grid for now.
    const displayCentroidSeparation = Math.sqrt(dx * dx + dy * dy);

    triangles.push({
      kind: "triangle",
      questionId: id,
      questionText: data.text,
      corners,
      groupA: { n: data.A.length, centroid: centroidA },
      groupB: { n: data.B.length, centroid: centroidB },
      strongestShift,
      displayCentroidSeparation,
      pattern,
      indicators,
      findingText
    });
  });

  return { sliders, triangles };
}
