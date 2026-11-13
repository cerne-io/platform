import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { calculateWordCloudData } from "./wordCloudUtils";

interface WordCloudProps {
  stories: { text: string }[];
  isLoading: boolean;
}

const WordCloudSection: React.FC<WordCloudProps> = React.memo(({ stories, isLoading }) => {
  // Use the extracted utility function with useMemo
  // This ensures styles and rotations are calculated only when stories change
  const wordFrequencies = useMemo(() => {
    return calculateWordCloudData(stories);
  }, [stories]);

  if (isLoading) {
    return null;
  }

  return (
    <Card className="col-span-1 w-full overflow-hidden h-full bg-card rounded-xl border border-border/80 shadow-xs flex flex-col">
      <CardHeader className="pb-4 bg-transparent border-b border-border/60">
        <div className="flex items-center gap-2">
          <CardTitle className="font-semibold text-2xl sm:text-3xl tracking-tight text-foreground">
            <Hash className="mr-2 h-6 w-6 inline" />
            Word Cloud
          </CardTitle>
        </div>
        <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
          Top 25 most common words in collected entries
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 bg-transparent rounded-b-md flex-grow flex flex-col pt-6">
        {wordFrequencies.length === 0 ? (
          <div className="text-center py-8 text-xs sm:text-sm text-muted-foreground flex-grow flex items-center justify-center">
            No story text available to generate a word cloud
          </div>
        ) : (
          <TooltipProvider>
            <div className="flex flex-wrap justify-center items-center gap-2 p-3 animate-fade-in flex-grow">
              {wordFrequencies.map(({ text, value, style, className }) => {
                return (
                  <Tooltip key={text}>
                    <TooltipTrigger asChild>
                      <span
                        className={cn(
                          "px-1.5 py-0.5 rounded-md cursor-pointer transition-all duration-200",
                          "hover:scale-110 hover:bg-muted/60",
                          className
                        )}
                        style={style}
                      >
                        {text}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-popover/95 backdrop-blur-xs border border-border/80 text-popover-foreground text-xs shadow-md px-2.5 py-1.5">
                      <span className="font-semibold text-foreground">{text}</span>: appears <span className="tabular-nums font-semibold">{value}</span> time{value !== 1 ? 's' : ''}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  );
});

WordCloudSection.displayName = "WordCloudSection";

export default WordCloudSection;
