import React from "react";
import { Cluster } from "@/utils/math/triangleClusterUtils";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TriangleClusterStatsProps {
    clusters: Cluster[];
    topLabel?: string;
    bottomLeftLabel?: string;
    bottomRightLabel?: string;
    projectId?: string;

    isActiveProject?: boolean;
}

const TriangleClusterStats: React.FC<TriangleClusterStatsProps> = ({
    clusters,
}) => {
    // Optimization: Replace .reduce with a standard for loop to avoid V8 callback overhead
    let totalPoints = 0;
    const len = clusters.length;
    for (let i = 0; i < len; i++) {
        totalPoints += clusters[i].points.length;
    }

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Cluster Analysis</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Cluster</TableHead>
                            <TableHead className="text-right">Count</TableHead>
                            <TableHead className="text-right">%</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {clusters.map((cluster) => (
                            <TableRow key={cluster.id}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center space-x-2">
                                        <svg width="16" height="16" viewBox="-10 -10 20 20" className="overflow-visible">
                                            <path
                                                d="M0,-8 L2,-2 L8,-2 L4,2 L6,8 L0,4 L-6,8 L-4,2 L-8,-2 L-2,-2 Z"
                                                fill={cluster.color}
                                                stroke="none"
                                            />
                                        </svg>
                                        <span>{cluster.label}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">{cluster.points.length}</TableCell>
                                <TableCell className="text-right">
                                    {totalPoints > 0
                                        ? ((cluster.points.length / totalPoints) * 100).toFixed(1)
                                        : 0}%
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

export default TriangleClusterStats;
