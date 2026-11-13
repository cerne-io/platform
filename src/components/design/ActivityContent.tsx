
import React from "react";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import { ActivityFormData } from "@/types/activity";
import { getQuestionFields } from "./utils/fields/questionFields";

interface ActivityContentProps {
  activityData: ActivityFormData;
  onEdit: () => void;
  hideContent?: boolean;
  phaseId?: string;
  stepId?: string;
  activityId?: string;
}

const ActivityContent: React.FC<ActivityContentProps> = ({
  activityData,
  onEdit,
  hideContent = false,
  phaseId,
  stepId,
  activityId,
}) => {
  if (!activityData || Object.keys(activityData).length === 0 || hideContent) {
    return null;
  }

  // Get field definitions to identify list fields
  const fields = (phaseId && stepId && activityId) 
    ? getQuestionFields(phaseId, stepId, activityId)
    : [];

  return (
    <div className="mt-4 space-y-8 text-left">
      {Object.entries(activityData).map(([key, value]) => {
        if (!value || (typeof value === 'string' && value.trim() === "")) return null;
        if (key.endsWith('_mode')) return null;

        const fieldDef = fields.find(f => f.id === key);
        const savedMode = activityData[`${key}_mode`];
        const isList = savedMode ? savedMode === "list" : fieldDef?.isList;

        // Format the key for display by capitalizing and replacing underscores with spaces
        let formattedKey = key
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        // Clean up common suffixes for a more professional look
        if (formattedKey.endsWith(' Description')) {
          formattedKey = formattedKey.replace(' Description', '');
        }
        
        // If the key becomes empty or is too generic, fallback or use 'Response'
        if (!formattedKey || formattedKey.toLowerCase() === 'response') {
          formattedKey = 'Response';
        }

        return (
          <div key={key} className="pl-[10px]">
            <h4 className="text-xs uppercase tracking-widest text-muted-foreground mb-4 font-medium">{formattedKey}</h4>
            <div className="text-left border-l-2 border-transparent">
              {isList ? (
                <ul className="list-disc pl-5 space-y-2">
                  {value.split('\n\n')
                    .filter(item => item.trim() !== "")
                    .map((item, index) => (
                      <li key={index} className="text-lg font-normal text-[#2D3748] dark:text-gray-100 leading-relaxed">
                        {item}
                      </li>
                    ))
                  }
                </ul>
              ) : (
                <p className="text-lg font-normal text-[#2D3748] dark:text-gray-100 leading-relaxed whitespace-pre-wrap">
                  {value}
                </p>
              )}
            </div>
          </div>
        );
      })}

      <div className="flex justify-end mt-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onEdit}
          className="text-cerne-600 border-cerne-200 flex items-center gap-1 dark:text-gray-300 dark:border-white/20 dark:hover:bg-white/5 dark:hover:text-white"
        >
          <Edit size={14} />
          Edit this Activity
        </Button>
      </div>
    </div>
  );
};

export default ActivityContent;
