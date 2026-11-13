import { Story } from "@/types/story";

export interface Point {
    x: number;
    y: number;
    story?: Story;
}

export interface Cluster {
    id: number;
    centroid: { x: number; y: number };
    points: Point[];
    color?: string;
    label?: string;
}


// K-Means Clustering Algorithm
export const kMeansCluster = (points: Point[], k: number, maxIterations: number = 20): Cluster[] => {
    if (points.length === 0 || k <= 0) return [];
    if (k > points.length) k = points.length;

    // Initialize centroids randomly
    // Optimization: Replaced O(N log N) array sorting with O(k) random index selection
    // to vastly improve initialization speed on large datasets
    let centroids: { x: number; y: number }[] = [];
    const usedIndices = new Set<number>();
    
    while (centroids.length < k && centroids.length < points.length) {
        const randomIndex = Math.floor(Math.random() * points.length);
        if (!usedIndices.has(randomIndex)) {
            usedIndices.add(randomIndex);
            centroids.push({ x: points[randomIndex].x, y: points[randomIndex].y });
        }
    }

    let clusters: Cluster[] = [];
    let hasConverged = false;
    let iterations = 0;

    const len = points.length;
    const kLen = k;

    while (!hasConverged && iterations < maxIterations) {
        // Initialize new clusters
        const newClusters = new Array(kLen);
        for (let i = 0; i < kLen; i++) {
            newClusters[i] = {
                id: i,
                centroid: { x: centroids[i].x, y: centroids[i].y },
                points: []
            };
        }

        // Assign points to nearest centroid
        for (let i = 0; i < len; i++) {
            const point = points[i];
            let minDistSq = Infinity;
            let clusterIndex = 0;

            for (let j = 0; j < kLen; j++) {
                const centroid = centroids[j];
                const dx = point.x - centroid.x;
                const dy = point.y - centroid.y;
                // Optimization: Use squared distance to avoid Math.sqrt
                const dSq = dx * dx + dy * dy;

                if (dSq < minDistSq) {
                    minDistSq = dSq;
                    clusterIndex = j;
                }
            }

            newClusters[clusterIndex].points.push(point);
        }

        // Calculate new centroids and check for convergence simultaneously
        const newCentroids = new Array(kLen);
        hasConverged = true;

        for (let i = 0; i < kLen; i++) {
            const cluster = newClusters[i];
            const pLen = cluster.points.length;

            if (pLen === 0) {
                newCentroids[i] = cluster.centroid;
            } else {
                let sumX = 0;
                let sumY = 0;
                // Optimization: standard for loop
                for (let j = 0; j < pLen; j++) {
                    sumX += cluster.points[j].x;
                    sumY += cluster.points[j].y;
                }

                newCentroids[i] = {
                    x: sumX / pLen,
                    y: sumY / pLen
                };
            }

            // Check convergence for this centroid
            if (hasConverged &&
                (Math.abs(centroids[i].x - newCentroids[i].x) >= 0.01 ||
                    Math.abs(centroids[i].y - newCentroids[i].y) >= 0.01)) {
                hasConverged = false;
            }
        }

        centroids = newCentroids;
        clusters = newClusters;
        iterations++;
    }

    return clusters;
};

// Calculate Within-Cluster Sum of Squares (WCSS)
export const calculateWCSS = (clusters: Cluster[]): number => {
    let wcss = 0;
    const len = clusters.length;
    for (let i = 0; i < len; i++) {
        const cluster = clusters[i];
        const points = cluster.points;
        const pLen = points.length;
        const cx = cluster.centroid.x;
        const cy = cluster.centroid.y;

        for (let j = 0; j < pLen; j++) {
            const dx = points[j].x - cx;
            const dy = points[j].y - cy;
            wcss += dx * dx + dy * dy;
        }
    }
    return wcss;
};

// Find optimal K using Elbow Method
export const findOptimalK = (points: Point[], maxK: number = 6): number => {
    if (points.length < 2) return 1;

    // Limit maxK to number of points
    const effectiveMaxK = Math.min(maxK, points.length);

    const wcssValues: number[] = [];

    for (let k = 1; k <= effectiveMaxK; k++) {
        const clusters = kMeansCluster(points, k);
        wcssValues.push(calculateWCSS(clusters));
    }

    // Simple elbow detection: find the point where the rate of decrease slows down significantly
    // We look for the "angle" at each point
    let maxAngle = 0;
    let optimalK = 1;

    if (wcssValues.length < 3) return wcssValues.length;

    // Normalize values for geometry
    const maxWCSS = wcssValues[0];
    const normalizedWCSS = wcssValues.map(v => v / maxWCSS);

    for (let i = 1; i < wcssValues.length - 1; i++) {
        // Vector 1: (i-1) -> i
        const v1x = 1;
        const v1y = normalizedWCSS[i] - normalizedWCSS[i - 1];

        // Vector 2: i -> (i+1)
        const v2x = 1;
        const v2y = normalizedWCSS[i + 1] - normalizedWCSS[i];

        // Angle calculation (simplified as difference in slopes)
        const angle = Math.abs(Math.atan2(v2y, v2x) - Math.atan2(v1y, v1x));

        if (angle > maxAngle) {
            maxAngle = angle;
            optimalK = i + 1;
        }
    }

    // Default to 3 if calculation is ambiguous or data is sparse, but respect the calculation
    return optimalK > 1 ? optimalK : Math.min(3, points.length);
};

// Assign labels and colors to clusters
export const assignClusterLabels = (
    clusters: Cluster[],
    xAxisLabel: string,
    yAxisLabel: string
): Cluster[] => {
    return clusters.map((cluster, index) => {
        const { x, y } = cluster.centroid;

        // Helper to determine the strength/position on a single axis (0-100 scale)
        const getAxisLabel = (value: number, axisName: string) => {
            if (value < 25) return `Strong Low ${axisName}`;
            if (value < 40) return `Leaning Low ${axisName}`;
            if (value <= 60) return `Balanced ${axisName}`;
            if (value <= 75) return `Leaning High ${axisName}`;
            return `Strong High ${axisName}`;
        };

        let label = `Cluster ${index + 1}`;

        // If it's dead center on both axes
        if (x >= 40 && x <= 60 && y >= 40 && y <= 60) {
            label = "Balanced / Central";
        } else {
            const xDesc = getAxisLabel(x, xAxisLabel);
            const yDesc = getAxisLabel(y, yAxisLabel);
            label = `${xDesc}, ${yDesc}`;
        }

        // Truncate logic if the generated string is excessively long in the UI
        if (label.length > 50) {
            const shortX = getAxisLabel(x, "X");
            const shortY = getAxisLabel(y, "Y");
            label = (x >= 40 && x <= 60 && y >= 40 && y <= 60)
                ? "Center"
                : `${shortX}, ${shortY}`;
        }

        return {
            ...cluster,
            label,
            // Use Golden Angle approximation for distinct colors
            color: `hsl(${(index * 137.5) % 360}, 70%, 50%)`
        };
    });
};

export const calculateClusterStats = (clusters: Cluster[], totalPoints: number) => {
    return clusters.map(cluster => ({
        id: cluster.id,
        label: cluster.label,
        color: cluster.color,
        count: cluster.points.length,
        percentage: (cluster.points.length / totalPoints) * 100,
        avgX: cluster.centroid.x,
        avgY: cluster.centroid.y
    })).sort((a, b) => b.count - a.count);
};
