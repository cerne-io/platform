import React from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cluster } from "@/utils/math/sliderClusterUtils";

interface ClusterStat {
    id: number;
    label?: string;
    color?: string;
    count: number;
    percentage: number;
    avgX: number;
    avgY: number;
}

interface SliderClusterStatsProps {
    stats: ClusterStat[];
    clusters: Cluster[];
    xAxisLabel: string;
    yAxisLabel: string;
    projectId?: string;
    sessionToken?: string;
    isActiveProject?: boolean;
}

const SliderClusterStats: React.FC<SliderClusterStatsProps> = ({ stats, xAxisLabel, yAxisLabel }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base font-medium">Cluster Statistics</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Cluster</TableHead>
                            <TableHead className="text-right">Responses</TableHead>
                            <TableHead className="text-right">%</TableHead>
                            <TableHead className="text-right">Avg {xAxisLabel}</TableHead>
                            <TableHead className="text-right">Avg {yAxisLabel}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {stats.map((stat) => (
                            <TableRow key={stat.id}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center space-x-2">
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: stat.color }}
                                        />
                                        <span>{stat.label}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">{stat.count}</TableCell>
                                <TableCell className="text-right">{stat.percentage.toFixed(1)}%</TableCell>
                                <TableCell className="text-right">{stat.avgX.toFixed(1)}</TableCell>
                                <TableCell className="text-right">{stat.avgY.toFixed(1)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

export default SliderClusterStats;
