
import React, { useState } from "react";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { FormErrorFallback } from "@/components/ui/form-error-fallback";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";
import { HistogramBin } from "./histogramUtils";
import CustomHistogramBar from "./CustomHistogramBar";

interface DistributionHistogramProps {
  histogramData: HistogramBin[];
  leftLabel?: string;
  rightLabel?: string;
  questionText: string;
  colorByEmotions: boolean;
}

const DistributionHistogram: React.FC<DistributionHistogramProps> = ({
  histogramData,
  leftLabel = "Low",
  rightLabel = "High",
  questionText,
  colorByEmotions,
}) => {
  const [chartError, setChartError] = useState<Error | null>(null);

  // Optimization: Replace .reduce with a standard for loop to avoid V8 callback overhead
  let totalResponses = 0;
  const len = histogramData.length;
  for (let i = 0; i < len; i++) {
    totalResponses += histogramData[i].count;
  }
  const isMobile = useIsMobile();

  // Reset chart error
  const handleResetError = () => {
    setChartError(null);
  };

  // Show fallback if we have a chart error
  if (chartError) {
    return (
      <div className="mt-8">
        <FormErrorFallback
          error={chartError}
          title="Histogram Error"
          message={`There was a problem rendering the histogram for "${questionText}".`}
          resetError={handleResetError}
        />
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="text-sm font-medium text-center mb-2">
        Distribution for "{questionText}"
      </div>

      {totalResponses === 0 ? (
        <div className="h-[200px] flex items-center justify-center bg-muted/30 rounded-md border border-dashed border-border">
          <p className="text-muted-foreground">No data matches the current filters</p>
        </div>
      ) : (
        <div className="h-[200px]">
          <ErrorBoundary
            fallback={
              <div className="h-full flex items-center justify-center bg-gray-50 rounded-md border border-red-100">
                <p className="text-red-500">Failed to render chart. Please try again.</p>
              </div>
            }
            componentName={`Histogram-${questionText}`}
            onError={(err) => setChartError(err)}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={histogramData}
                margin={isMobile ? { top: 10, right: 0, left: -20, bottom: 0 } : { top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" strokeOpacity={0.6} vertical={false} />
                <XAxis 
                  dataKey="label" 
                  tick={{ fill: "currentColor" }}
                  className="text-slate-500 dark:text-slate-400 text-xs"
                />
                <YAxis 
                  allowDecimals={false} 
                  tick={{ fill: "currentColor" }}
                  className="text-slate-500 dark:text-slate-400 text-xs"
                />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === 'count') return [`${value} responses`, 'Count'];
                    if (colorByEmotions && (name === 'positive' || name === 'negative' || name === 'neutral')) {
                      return [`${value} ${name}`, name];
                    }
                    return [`${value}`, name];
                  }}
                  labelFormatter={(label) => `Range: ${label}`}
                />
                <Bar
                  dataKey="count"
                  fill="var(--chart-neutral)"
                  shape={(props: unknown) => {
                    const typedProps = props as { index?: number;[key: string]: unknown };
                    return (
                      <CustomHistogramBar
                        {...typedProps}
                        colorByEmotions={colorByEmotions}
                        positive={histogramData[typedProps.index || 0]?.positive || 0}
                        negative={histogramData[typedProps.index || 0]?.negative || 0}
                        neutral={histogramData[typedProps.index || 0]?.neutral || 0}
                        count={histogramData[typedProps.index || 0]?.count || 0}
                      />
                    );
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </ErrorBoundary>
        </div>
      )}

      <div className="flex justify-between mt-2 px-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
        <span>&larr; {leftLabel}</span>
        <span>{rightLabel} &rarr;</span>
      </div>
    </div>
  );
};

export default DistributionHistogram;
