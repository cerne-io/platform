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
    label?: string;
    color?: string;
}

export interface ClusterStats {
    k: number;
    clusters: Cluster[];
    wcss: number; // Within-Cluster Sum of Squares
}

// Calculate Euclidean distance between two points
const distance = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
};

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
            let closestClusterIndex = 0;

            for (let j = 0; j < kLen; j++) {
                const centroid = centroids[j];
                const dx = point.x - centroid.x;
                const dy = point.y - centroid.y;
                // Optimization: Use squared distance to avoid Math.sqrt
                const dSq = dx * dx + dy * dy;

                if (dSq < minDistSq) {
                    minDistSq = dSq;
                    closestClusterIndex = j;
                }
            }

            newClusters[closestClusterIndex].points.push(point);
        }

        // Update centroids and check for convergence simultaneously
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

// Calculate WCSS (Within-Cluster Sum of Squares)
const calculateWCSS = (clusters: Cluster[]): number => {
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

// Find optimal K using the Elbow Method (simplified)
export const findOptimalK = (points: Point[], maxK: number = 6): number => {
    if (points.length < 2) return 1;

    const wcssValues: number[] = [];

    for (let k = 1; k <= maxK; k++) {
        const clusters = kMeansCluster(points, k);
        wcssValues.push(calculateWCSS(clusters));
    }

    // Simple elbow detection: find the point where the reduction in WCSS slows down significantly
    // We look for the "angle" in the curve
    let maxAngle = 0;
    let optimalK = 1;

    for (let i = 1; i < wcssValues.length - 1; i++) {
        const prev = wcssValues[i - 1];
        const curr = wcssValues[i];
        const next = wcssValues[i + 1];

        // Vector 1: (i-1, prev) -> (i, curr)
        // Vector 2: (i, curr) -> (i+1, next)
        // We want the point where the slope changes most drastically

        const slope1 = prev - curr;
        const slope2 = curr - next;

        const change = slope1 - slope2;

        if (change > maxAngle) {
            maxAngle = change;
            optimalK = i + 1;
        }
    }

    // Fallback if no clear elbow (or if data is very uniform)
    // Usually 3 is a good default for triangle data (corners)
    return optimalK > 1 ? optimalK : 3;
};

// Assign semantic labels to clusters based on position
export const assignClusterLabels = (
    clusters: Cluster[],
    topLabel: string,
    bottomLeftLabel: string,
    bottomRightLabel: string
): Cluster[] => {
    // Triangle vertices (assuming standard 100x100 percentage coordinates for logic)
    const nodes = [
        { id: "top", x: 50, y: 0, label: topLabel },
        { id: "left", x: 0, y: 100, label: bottomLeftLabel },
        { id: "right", x: 100, y: 100, label: bottomRightLabel }
    ];
    const center = { x: 50, y: 66.6, label: "Balanced / Central" };

    return clusters.map(cluster => {
        // 1. Check distance to center. If it's very close to the center, it's balanced.
        const distToCenter = distance(cluster.centroid, center);
        if (distToCenter < 15) {
            return {
                ...cluster,
                label: center.label,
                color: [
                    "#9C27B0", "#FF9800", "#009688", "#E91E63",
                    "#00BCD4", "#CDDC39", "#FFC107", "#3F51B5"
                ][cluster.id % 8]
            };
        }

        // 2. Calculate distances to all three main nodes
        const nodeDistances = nodes.map(n => ({
            ...n,
            dist: distance(cluster.centroid, { x: n.x, y: n.y })
        })).sort((a, b) => a.dist - b.dist);

        const closestNode = nodeDistances[0];
        const secondClosestNode = nodeDistances[1];

        let label = `Cluster ${cluster.id + 1}`;

        // 3. Determine blending thresholds based on relative distances
        // If the closest node is very close, or much closer than the second closest:
        if (closestNode.dist < 30 || (secondClosestNode.dist - closestNode.dist) > 25) {
            label = `Strong ${closestNode.label}`;
        }
        // If it's sitting somewhere between two nodes:
        else {
            label = `Leaning ${closestNode.label} & ${secondClosestNode.label}`;
        }

        return {
            ...cluster,
            label,
            // Assign a color based on ID (cycling through a palette)
            color: [
                "#9C27B0", // Purple
                "#FF9800", // Orange
                "#009688", // Teal
                "#E91E63", // Pink
                "#00BCD4", // Cyan
                "#CDDC39", // Lime
                "#FFC107", // Amber
                "#3F51B5"  // Indigo
            ][cluster.id % 8]
        };
    });
};

export const calculateClusterStats = (clusters: Cluster[]) => {
    return clusters.map(c => ({
        id: c.id,
        label: c.label,
        count: c.points.length,
        percentage: 0, // To be calculated by caller if needed
        centroid: c.centroid,
        color: c.color
    }));
};
