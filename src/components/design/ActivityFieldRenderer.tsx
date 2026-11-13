import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FormField } from "./utils/fields";
import { Slider } from "@/components/ui/slider";
import DesignListInput from "./DesignListInput";
import { useProject } from "@/contexts/ProjectContext";

interface ActivityFieldRendererProps {
  field: FormField;
  value: string;
  onChange: (value: string) => void;
  activityId: string;
  mode?: "list" | "text";
  onModeChange?: (mode: "list" | "text") => void;
}

const ActivityFieldRenderer: React.FC<ActivityFieldRendererProps> = ({
  field,
  value,
  onChange,
  activityId,
  mode,
  onModeChange,
}) => {
  const { currentUserProjectRole } = useProject();
  const isReadOnly = currentUserProjectRole === 'viewer';
  const fieldId = `${activityId}-${field.id}`;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const handleSliderChange = (values: number[]) => {
    onChange(values[0].toString());
  };

  const renderInput = () => {
    if (field.isSlider) {
      return (
        <div className="pt-5 px-2">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>{field.leftLabel || 'Low'}</span>
            <span>{field.rightLabel || 'High'}</span>
          </div>
          <Slider
            id={fieldId}
            defaultValue={[value ? parseInt(value) : 50]}
            min={0}
            max={100}
            step={1}
            onValueChange={handleSliderChange}
            disabled={isReadOnly}
          />
        </div>
      );
    }

    if (field.isList) {
      return (
        <DesignListInput
          id={fieldId}
          value={value || ""}
          onChange={(val) => {
            if (!isReadOnly) onChange(val);
          }}
          mode={mode}
          onModeChange={isReadOnly ? undefined : onModeChange}
          placeholder={isReadOnly ? "No items" : `Enter ${field.label.toLowerCase()} item...`}
          disabled={isReadOnly}
        />
      );
    }

    if (field.isTextarea) {
      return (
        <Textarea
          id={fieldId}
          value={value || ""}
          onChange={handleChange}
          rows={5}
          className="w-full"
          placeholder={isReadOnly ? "" : `Enter your ${field.label.toLowerCase()}...`}
          disabled={isReadOnly}
        />
      );
    }

    return (
      <Input
        id={fieldId}
        value={value || ""}
        onChange={handleChange}
        className="w-full"
        placeholder={isReadOnly ? "" : `Enter your ${field.label.toLowerCase()}...`}
        disabled={isReadOnly}
      />
    );
  };

  return (
    <div key={field.id} className="space-y-2">
      <Label htmlFor={fieldId} className="dark:text-gray-200">{field.label}</Label>
      {renderInput()}
    </div>
  );
};

export default ActivityFieldRenderer;
