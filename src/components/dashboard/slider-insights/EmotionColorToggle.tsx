
import React from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface EmotionColorToggleProps {
  colorByEmotions: boolean;
  onToggleChange: (checked: boolean) => void;
}

const EmotionColorToggle: React.FC<EmotionColorToggleProps> = ({ 
  colorByEmotions, 
  onToggleChange 
}) => {
  return (
    <div className="flex items-center space-x-2">
      <Switch 
        id="color-toggle" 
        checked={colorByEmotions} 
        onCheckedChange={onToggleChange} 
      />
      <Label htmlFor="color-toggle" className="text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer">Color by emotions</Label>
    </div>
  );
};

export default EmotionColorToggle;
