
import React from "react";
import { TriangleStats as TriangleStatsType } from "@/utils/math/triangleUtils";
import { Progress } from "@/components/ui/progress";

interface TriangleStatsProps {
    stats: TriangleStatsType;
    topLabel: string;
    bottomLeftLabel: string;
    bottomRightLabel: string;
}

const TriangleStats: React.FC<TriangleStatsProps> = ({
    stats,
    topLabel,
    bottomLeftLabel,
    bottomRightLabel,
}) => {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="font-medium truncate max-w-[200px]" title={topLabel}>{topLabel} (Top)</span>
                    <span className="text-muted-foreground dark:text-white">{stats.topPercentage}%</span>
                </div>
                <Progress value={stats.topPercentage} className="h-2" />
            </div>

            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="font-medium truncate max-w-[200px]" title={bottomLeftLabel}>{bottomLeftLabel} (Left)</span>
                    <span className="text-muted-foreground dark:text-white">{stats.bottomLeftPercentage}%</span>
                </div>
                <Progress value={stats.bottomLeftPercentage} className="h-2" />
            </div>

            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="font-medium truncate max-w-[200px]" title={bottomRightLabel}>{bottomRightLabel} (Right)</span>
                    <span className="text-muted-foreground dark:text-white">{stats.bottomRightPercentage}%</span>
                </div>
                <Progress value={stats.bottomRightPercentage} className="h-2" />
            </div>

            <div className="pt-4 border-t border-border">
                <div className="text-sm font-medium text-muted-foreground mb-1">Dominant Sentiment</div>
                <div className="text-lg font-semibold">
                    {stats.dominantLabel === 'Balanced'
                        ? 'Balanced Response'
                        : `Leaning towards ${stats.dominantLabel === 'Top' ? topLabel :
                            stats.dominantLabel === 'Left' ? bottomLeftLabel :
                                bottomRightLabel
                        }`
                    }
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                    Based on {stats.totalResponses} responses
                </div>
            </div>
        </div>
    );
};

export default TriangleStats;
