import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InfoIcon, Star } from "lucide-react";

interface SliderStatsProps {
    points: { x: number; y: number }[];
    xAxisLabel: string;
    yAxisLabel: string;
}

const SliderStats: React.FC<SliderStatsProps> = ({ points, xAxisLabel, yAxisLabel }) => {
    const count = points.length;
    if (count === 0) return null;

    // Single pass: accumulate all sums and quadrant counts (replaces 5× reduce + 4× filter)
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    let topRight = 0, topLeft = 0, bottomRight = 0, bottomLeft = 0;

    const midX = 50, midY = 50;

    for (let i = 0; i < count; i++) {
        const p = points[i];
        const x = p.x;
        const y = p.y;

        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
        sumY2 += y * y;

        if (x > midX) {
            if (y > midY) topRight++;
            else bottomRight++;
        } else {
            if (y > midY) topLeft++;
            else bottomLeft++;
        }
    }

    const avgX = sumX / count;
    const avgY = sumY / count;

    // Correlation
    let correlation = 0;
    if (count > 1) {
        const numerator = count * sumXY - sumX * sumY;
        const denominator = Math.sqrt((count * sumX2 - sumX * sumX) * (count * sumY2 - sumY * sumY));

        if (denominator !== 0) {
            correlation = numerator / denominator;
        }
    }

    // Quadrant Analysis
    const quadrants = { topRight, topLeft, bottomRight, bottomLeft };

    const quadrantPcts = {
        topRight: (quadrants.topRight / count) * 100,
        topLeft: (quadrants.topLeft / count) * 100,
        bottomRight: (quadrants.bottomRight / count) * 100,
        bottomLeft: (quadrants.bottomLeft / count) * 100,
    };

    const isSignificant = count > 49 && Math.abs(correlation) >= 0.4 && xAxisLabel !== yAxisLabel;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-medium">General Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total Responses:</span>
                        <span className="font-medium">{count}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Avg {xAxisLabel}:</span>
                        <span className="font-medium">{avgX.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Avg {yAxisLabel}:</span>
                        <span className="font-medium">{avgY.toFixed(1)}</span>
                    </div>
                    <div className={`flex justify-between items-center ${isSignificant ? 'bg-primary/10 p-2 -mx-2 rounded-md' : ''}`}>
                        <div className="flex items-center gap-2">
                            <span className={`text-sm ${isSignificant ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>Correlation:</span>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <InfoIcon className="h-3 w-3 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-[400px]">
                                        <div className="text-xs space-y-2">
                                            <p className="font-semibold">What is correlation?</p>
                                            <p>Correlation measures whether two things move together. When you have two variables, correlation tells you if they're connected in a predictable way.</p>

                                            <p>The correlation number (r) ranges from -1 to 1. What does each number mean for your actual situation?</p>

                                            <ul className="list-disc pl-3 space-y-1">
                                                <li><strong>If r is close to 1</strong>, you have a strong positive relationship. Both variables increase together. Think about studying hours and test scores. More studying tends to mean higher scores.</li>
                                                <li><strong>If r is close to 0</strong>, there's no real relationship. The variables don't move together in any predictable way. Knowing one tells you almost nothing about the other.</li>
                                                <li><strong>If r is close to -1</strong>, you have a strong negative relationship. When one goes up, the other goes down. Imagine exercise frequency and resting heart rate. More exercise tends to lower your heart rate.</li>
                                            </ul>

                                            <p className="font-semibold">Why does this matter?</p>
                                            <p>Correlation helps you spot patterns. It answers whether two things are actually connected or just seem related by chance. This matters because if you find a real correlation, you can make predictions. If you know the relationship exists, you can estimate one variable from the other. Careful that correlation does not mean causation, ie, a high correlation does not tell us one thing causes another.</p>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className={`font-medium ${Math.abs(correlation) > 0.5 ? 'text-primary' : ''} ${isSignificant ? 'text-lg font-bold' : ''}`}>
                                {correlation.toFixed(2)}
                            </span>
                            {isSignificant && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 animate-pulse" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="text-xs max-w-[200px]">
                                                We noticed a possible pattern! This isn't proof of anything, but it suggests you can draw a relationship between those two variables.
                                            </p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-medium">Quadrant Distribution</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">High X, High Y:</span>
                        <span className="font-medium">{quadrantPcts.topRight.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Low X, High Y:</span>
                        <span className="font-medium">{quadrantPcts.topLeft.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">High X, Low Y:</span>
                        <span className="font-medium">{quadrantPcts.bottomRight.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Low X, Low Y:</span>
                        <span className="font-medium">{quadrantPcts.bottomLeft.toFixed(1)}%</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default SliderStats;
