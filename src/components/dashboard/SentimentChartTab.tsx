import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SentimentChartTabProps {
  feelingData: { name: string; value: number }[];
  totalStories: number;
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border/80 px-2.5 py-1.5 rounded-sm shadow-xs text-popover-foreground text-xs font-mono">
        <span className="font-semibold">{payload[0].name}: </span>
        <span className="tabular-nums font-bold">{payload[0].value}</span>
      </div>
    );
  }
  return null;
};

const SentimentChartTab: React.FC<SentimentChartTabProps> = ({ feelingData, totalStories }) => {
  const getColor = (name: string) => {
    switch (name) {
      case "Positive": return "var(--chart-positive)";
      case "Neutral": return "var(--chart-neutral)";
      case "Negative": return "var(--chart-negative)";
      default: return "#94a3b8";
    }
  };

  return (
    <Card className="rounded-md border border-border/80 shadow-xs bg-card">
      <CardHeader className="bg-transparent border-b border-border/60 pb-3">
        <CardTitle className="font-heading font-bold text-xl sm:text-2xl tracking-tight text-foreground [text-wrap:balance]">
          Sentiment Distribution
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Breakdown by analyzed sentiment
        </CardDescription>
      </CardHeader>
      <CardContent className="bg-transparent pt-4">
        {totalStories === 0 ? (
          <div className="h-[280px] flex items-center justify-center text-xs text-muted-foreground">
            No story data available for this project
          </div>
        ) : (
          <div className="h-[280px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={feelingData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  stroke="hsl(var(--card))"
                  strokeWidth={2}
                >
                  {feelingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getColor(entry.name)} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="flex justify-center flex-wrap gap-4 sm:gap-6 mt-3">
          {feelingData.map((item) => (
            <div key={item.name} className="flex items-center text-xs font-medium text-foreground">
              <span
                className="w-2.5 h-2.5 rounded-[2px] mr-1.5 shrink-0"
                style={{ backgroundColor: getColor(item.name) }}
              />
              <span>{item.name}</span>
              <span className="font-mono tabular-nums text-muted-foreground ml-1.5">({item.value})</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SentimentChartTab;
