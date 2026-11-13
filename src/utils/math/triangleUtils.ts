
export interface Point {
    x: number;
    y: number;
}

export interface BarycentricCoords {
    u: number; // Weight for Top vertex
    v: number; // Weight for Bottom-Left vertex
    w: number; // Weight for Bottom-Right vertex
}

export interface TriangleStats {
    topPercentage: number;
    bottomLeftPercentage: number;
    bottomRightPercentage: number;
    centerPercentage: number;
    totalResponses: number;
    dominantLabel: 'Top' | 'Left' | 'Right' | 'Balanced';
}

/**
 * Clamps a percentage point (0-100) to ensure it strictly falls within the bounds of a
 * triangle where Top=(50, 0), BottomLeft=(0, 100), and BottomRight=(100, 100).
 */
export const clampToTrianglePercentage = (x: number, y: number): { x: number, y: number } => {
    // 1. Clamp Y to 0-100 first
    const clampedY = Math.max(0, Math.min(100, y !== null && y !== undefined ? y : 50));
    
    // 2. The valid X range varies linearly based on the Y position.
    // At y=0, x must be 50. At y=100, x must be between 0 and 100.
    const minX = 50 - 0.5 * clampedY;
    const maxX = 50 + 0.5 * clampedY;
    
    // 3. Clamp X to this new allowed range
    const clampedX = Math.max(minX, Math.min(maxX, x !== null && x !== undefined ? x : 50));
    
    return { x: clampedX, y: clampedY };
};

/**
 * Calculates statistics for a set of triangle responses.
 */
export const calculateTriangleStats = (responses: { x_position: number; y_position: number }[]): TriangleStats => {
    const total = responses.length;
    if (total === 0) {
        return {
            topPercentage: 0,
            bottomLeftPercentage: 0,
            bottomRightPercentage: 0,
            centerPercentage: 0,
            totalResponses: 0,
            dominantLabel: 'Balanced'
        };
    }

    let topCount3Way = 0;
    let leftCount3Way = 0;

    let topCount4Way = 0;
    let leftCount4Way = 0;
    let rightCount4Way = 0;
    let centerCount = 0;

    responses.forEach(r => {
        // 3-Way Split (Barycentric-like dominance)
        // Top: (50, 0), Left: (0, 100), Right: (100, 100)
        // We can use simple distance comparison to the 3 corners for the 3-way split
        // Optimization: replace Math.pow with inline multiplication
        const topDx = r.x_position - 50;
        const topDy = r.y_position;
        const dTop = Math.sqrt(topDx * topDx + topDy * topDy);

        const leftDx = r.x_position;
        const leftDy = r.y_position - 100;
        const dLeft = Math.sqrt(leftDx * leftDx + leftDy * leftDy);

        const rightDx = r.x_position - 100;
        const rightDy = r.y_position - 100;
        const dRight = Math.sqrt(rightDx * rightDx + rightDy * rightDy);

        if (dTop <= dLeft && dTop <= dRight) topCount3Way++;
        else if (dLeft <= dTop && dLeft <= dRight) leftCount3Way++;

        // 4-Way Split (Including Center)
        const centerDx = r.x_position - 50;
        const centerDy = r.y_position - 66.6;
        const dCenter = Math.sqrt(centerDx * centerDx + centerDy * centerDy);
        const min = Math.min(dTop, dLeft, dRight, dCenter);

        if (min === dTop) topCount4Way++;
        else if (min === dLeft) leftCount4Way++;
        else if (min === dRight) rightCount4Way++;
        else centerCount++;
    });

    // Percentages for the bars (3-way split)
    const topPercentage = Math.round((topCount3Way / total) * 100);
    const bottomLeftPercentage = Math.round((leftCount3Way / total) * 100);
    // Ensure they sum to 100
    const bottomRightPercentage = 100 - topPercentage - bottomLeftPercentage;

    // Center percentage (from 4-way split)
    const centerPercentage = Math.round((centerCount / total) * 100);

    // Dominant Label (from 4-way split)
    let dominantLabel: 'Top' | 'Left' | 'Right' | 'Balanced' = 'Balanced';
    const max = Math.max(topCount4Way, leftCount4Way, rightCount4Way, centerCount);

    if (topCount4Way === max) dominantLabel = 'Top';
    else if (leftCount4Way === max) dominantLabel = 'Left';
    else if (rightCount4Way === max) dominantLabel = 'Right';
    else dominantLabel = 'Balanced';

    return {
        topPercentage,
        bottomLeftPercentage,
        bottomRightPercentage,
        centerPercentage,
        totalResponses: total,
        dominantLabel
    };
};

// ==========================================
// PHASE 1: GEOMETRIC MATHEMATICAL UTILITIES
// ==========================================

export type TrianglePoint = { storyId: string; x: number; y: number; };

// The coordinates in use are Top(50,0), Left(0,100), Right(100,100).
// Base = 100, Height = 100. 
// Side length = sqrt(50^2 + 100^2) = sqrt(12500) ≈ 111.803
export const TRIANGLE_SIDE_LENGTH = 111.803;

/**
 * Calculates Euclidean distance normalized by the triangle side length.
 */
export const normalizedDistance = (
    a: { x: number; y: number },
    b: { x: number; y: number }
): number => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy) / TRIANGLE_SIDE_LENGTH;
};

/**
 * Calculates the arithmetic centroid (center of mass) for a set of points.
 */
export const calculateCentroid = (points: { x: number; y: number }[]): { x: number; y: number } => {
    if (points.length === 0) return { x: 50, y: 66.6 }; // Default center
    
    // Optimization: Calculate centroid sum with an imperative for-loop instead of .reduce()
    // to avoid intermediate object allocations.
    let sumX = 0;
    let sumY = 0;
    for (let i = 0; i < points.length; i++) {
        sumX += points[i].x;
        sumY += points[i].y;
    }
    
    return { x: sumX / points.length, y: sumY / points.length };
};

/**
 * Calculates the median normalized distance and Interquartile Range (IQR) 
 * from the distribution's centroid.
 */
export const calculateSpread = (points: { x: number; y: number }[], centroid: { x: number; y: number }) => {
    if (points.length === 0) return { medianDistance: 0, iqr: 0, distances: [] };
    
    const distances = points.map(p => normalizedDistance(p, centroid)).sort((a, b) => a - b);
    
    const getPercentile = (arr: number[], p: number) => {
        const index = (arr.length - 1) * p;
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        const weight = index - lower;
        if (upper >= arr.length) return arr[lower];
        return arr[lower] * (1 - weight) + arr[upper] * weight;
    };

    const median = getPercentile(distances, 0.5);
    const q1 = getPercentile(distances, 0.25);
    const q3 = getPercentile(distances, 0.75);
    const iqr = q3 - q1;

    return { medianDistance: median, iqr, q1, q3, distances };
};

/**
 * Centralized policy thresholds for spatial pattern classification.
 * These will likely need calibration against real datasets.
 */
export const TrianglePatternThresholds = {
    minimumResponsesForPattern: 3,
    
    // Spread classifications (based on normalized median distance)
    tightMedianDistance: 0.15,
    broadMedianDistance: 0.30,
    
    // Distance indicating a point is 'near' the triangle center
    nearCentreDistance: 0.10,
    
    // Outlier detection (1.5 * IQR above Q3)
    outlierMultiplier: 1.5,
    
    // Cluster Separation Ratios
    // separation ratio = distance between centroids / average intra-cluster distance
    separationRatioForAdjacent: 1.2,
    separationRatioForSeparated: 2.0,
    
    // Minimums for a cluster to be considered a genuine distinct configuration
    minimumClusterSize: 3,
    minimumClusterShare: 0.15, // 15% of total points
};
