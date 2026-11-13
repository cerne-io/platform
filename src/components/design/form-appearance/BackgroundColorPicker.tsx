
import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface BackgroundColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const BackgroundColorPicker: React.FC<BackgroundColorPickerProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!disabled) {
      onChange(e.target.value);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between min-h-[24px]">
        <div className="flex items-center space-x-2">
          <Label htmlFor="background-color" className="text-sm font-medium dark:text-gray-200">Background Color</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="w-[220px] text-xs">
                  Choose a background color for your form. Use hex color codes like #f9fafb.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex items-center space-x-1.5">
          <div
            className="h-4 w-4 rounded-full border border-gray-300 dark:border-white/20 shadow-sm"
            style={{ backgroundColor: value }}
          />
          <Input
            type="color"
            value={value}
            onChange={handleChange}
            className="h-6 w-8 p-0 cursor-pointer border-none bg-transparent"
            disabled={disabled}
          />
        </div>
      </div>

      <Input
        id="background-color"
        value={value}
        onChange={handleChange}
        placeholder="#f9fafb"
        className="text-sm dark:bg-[#161B22] dark:border-white/10 dark:text-white"
        disabled={disabled}
      />

      <p className="text-xs text-gray-500 dark:text-gray-400">
        The background color of your public form page
      </p>
    </div>
  );
};

export default BackgroundColorPicker;
