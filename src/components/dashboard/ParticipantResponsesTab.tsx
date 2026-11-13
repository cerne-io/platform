
import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, TooltipProps } from "recharts";
import { Story } from "@/types/story";

interface ParticipantResponsesTabProps {
  stories: Story[];
  questionText: string;
  totalStories: number;
}

const ParticipantResponsesTab: React.FC<ParticipantResponsesTabProps> = ({
  stories,

  questionText,
  totalStories
}) => {
  const responseData = useMemo(() => {
    const responseMap: Record<string, { count: number; label: string }> = {};

    // Optimization: Standard indexed for loop to avoid callback overhead in V8
    const storiesLen = stories.length;
    for (let i = 0; i < storiesLen; i++) {
      const story = stories[i];
      if (story.participantResponses) {
        // Find response by matching question text instead of ID to handle duplicate IDs for same question
        // Optimization: Standard for loop instead of .find for early break performance
        let responseCtx;
        const responses = story.participantResponses;
        const responsesLen = responses.length;
        for (let j = 0; j < responsesLen; j++) {
          if (responses[j].question_text === questionText) {
            responseCtx = responses[j];
            break;
          }
        }

        if (responseCtx && responseCtx.response !== null && responseCtx.response !== undefined) {
          let items: unknown[];
          if (Array.isArray(responseCtx.response)) {
            items = responseCtx.response;
          } else if (
            typeof responseCtx.response === 'string' &&
            responseCtx.response.startsWith('[') &&
            responseCtx.response.endsWith(']')
          ) {
            try {
              const parsed = JSON.parse(responseCtx.response);
              items = Array.isArray(parsed) ? parsed : [responseCtx.response];
            } catch {
              items = [responseCtx.response];
            }
          } else {
            items = [responseCtx.response];
          }

          for (let m = 0; m < items.length; m++) {
            const rawResponse = String(items[m] ?? '').trim();
            if (!rawResponse) continue;
            const normalizedKey = rawResponse.toLowerCase();

            if (!responseMap[normalizedKey]) {
              // content: "male" -> "Male", "female" -> "Female"
              const formattedLabel = rawResponse.charAt(0).toUpperCase() + rawResponse.slice(1).toLowerCase();

              responseMap[normalizedKey] = {
                count: 0,
                label: formattedLabel
              };
            }

            responseMap[normalizedKey].count += 1;
          }
        }
      }
    }

    return Object.values(responseMap).map(entry => ({
      response: entry.label,
      count: entry.count
    }));
  }, [stories, questionText]);

  // Sort data by count (descending)
  const sortedData = [...responseData].sort((a, b) => b.count - a.count);

  // Generate colors using the website's color palette
  // Generate colors using the gallery theme palette
  const colors = [
    "#2563EB", // Primary (Electric Cobalt)
    "#D97706", // Premium (Gallery Gold)
    "#0F172A", // Dark (Deep Slate)
    "#64748B", // Slate-500
    "#3B82F6", // Blue-500
    "#F59E0B", // Amber-500
    "#94A3B8", // Slate-400
  ];


  // Custom Tooltip Component
  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border/80 px-2.5 py-1.5 rounded-sm shadow-xs text-popover-foreground text-xs font-mono">
          <p className="font-semibold mb-0.5 text-foreground">{label}</p>
          <p className="text-muted-foreground">
            Count: <span className="font-bold text-foreground tabular-nums">{payload[0].value}</span> stories
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-card rounded-md border border-border/80 shadow-xs overflow-hidden h-full flex flex-col">
      <CardHeader className="bg-transparent border-b border-border/60 pb-3">
        <CardTitle className="font-heading font-bold text-xl sm:text-2xl tracking-tight text-foreground [text-wrap:balance]">{questionText}</CardTitle>
        <CardDescription className="text-xs text-muted-foreground mt-1">
          Distribution of responses (<span className="tabular-nums font-mono font-medium text-foreground">{sortedData.length}</span> different responses)
        </CardDescription>
      </CardHeader>
      <CardContent className="bg-transparent p-4 pt-4 flex-1 min-h-0">
        {totalStories === 0 ? (
          <div className="h-full min-h-[220px] flex items-center justify-center rounded-md border border-dashed border-border/70 bg-muted/20">
            <div className="text-center p-6">
              <p className="text-sm font-medium text-foreground mb-1">No story data available</p>
              <p className="text-xs text-muted-foreground">Add stories to see analytics for this project</p>
            </div>
          </div>
        ) : responseData.length === 0 ? (
          <div className="h-full min-h-[220px] flex items-center justify-center rounded-md border border-dashed border-border/70 bg-muted/20">
            <div className="text-center p-6">
              <p className="text-sm font-medium text-foreground mb-1">No responses for this question</p>
              <p className="text-xs text-muted-foreground">Participants haven't answered this question yet</p>
            </div>
          </div>
        ) : (
          <div className="h-full min-h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sortedData} margin={{ top: 5, right: 20, left: 10, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} />
                <XAxis
                  dataKey="response"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))", fontFamily: "var(--font-mono)" }}
                  interval={0}
                  tickFormatter={(value) => value.length > 10 ? `${value.substring(0, 10)}...` : value}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))", fontFamily: "var(--font-mono)" }}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: 'hsl(var(--primary))', opacity: 0.08 }}
                />
                <Bar
                  dataKey="count"
                  radius={[4, 4, 0, 0]}
                  animationDuration={1200}
                  animationBegin={300}
                >
                  {sortedData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={colors[index % colors.length]}
                      fillOpacity={0.9}
                      stroke={colors[index % colors.length]}
                      strokeWidth={1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ParticipantResponsesTab;
