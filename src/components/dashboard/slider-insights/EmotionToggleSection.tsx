
import React from "react";
import { Loader2 } from "lucide-react";
import EmotionColorToggle from "./EmotionColorToggle";

interface EmotionToggleSectionProps {
  colorByEmotions: boolean;
  setColorByEmotions: (value: boolean) => void;
  isProcessing: boolean;
  processingComplete: boolean;
}

const EmotionToggleSection: React.FC<EmotionToggleSectionProps> = ({
  colorByEmotions,
  setColorByEmotions,
  isProcessing
}) => {
  return (
    <div className="flex items-center gap-6 text-xs text-slate-500 py-2">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <EmotionColorToggle
            colorByEmotions={colorByEmotions}
            onToggleChange={setColorByEmotions}
          />
        </div>

        {isProcessing && (
          <div className="flex items-center text-primary ml-2">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            <span className="text-[11px]">Processing...</span>
          </div>
        )}
      </div>

      {colorByEmotions && (
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-600"></span> Positive</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-500"></span> Neutral</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-600"></span> Negative</span>
        </div>
      )}
    </div>
  );
};

export default EmotionToggleSection;
