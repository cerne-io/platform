import React from 'react';
import { Button } from "@/components/ui/button";
import { TriangleSelectionGroup } from "./TriangleSelectionTypes";
import { X, Save, Eye } from "lucide-react";

type SelectionActionBarProps = {
  selectedCount: number;
  groupA: TriangleSelectionGroup | null;
  groupB: TriangleSelectionGroup | null;
  onViewSelected: () => void;
  onSaveGroup: (id: "A" | "B") => void;
  onClearSelection: () => void;
  selectedStoryIds: Set<string>;
};

export const SelectionActionBar: React.FC<SelectionActionBarProps> = ({
  selectedCount,
  groupA,
  groupB,
  onViewSelected,
  onSaveGroup,
  onClearSelection,
  selectedStoryIds
}) => {
  if (selectedCount === 0) return null;

  const currentIds = Array.from(selectedStoryIds).sort();
  const currentStr = currentIds.join(',');

  const isExactMatchA = groupA && groupA.storyIds.join(',') === currentStr;
  const isExactMatchB = groupB && groupB.storyIds.join(',') === currentStr;

  return (
    <div className="flex flex-col p-1.5 bg-slate-800 dark:bg-slate-900 border border-slate-700 dark:border-slate-800 rounded-xl animate-in fade-in zoom-in-95 duration-200 shadow-xl w-40">
      <div className="px-2 py-1.5 mb-1 border-b border-slate-700 dark:border-slate-800">
        <span className="text-xs font-semibold text-slate-300">
          {selectedCount} stor{selectedCount === 1 ? 'y' : 'ies'} selected
        </span>
      </div>
      
      <div className="flex flex-col gap-0.5">
        <Button 
            variant="ghost" 
            size="sm" 
            onClick={onViewSelected} 
            className="justify-start text-xs h-8 text-indigo-300 hover:text-indigo-200 hover:bg-slate-700"
        >
            <Eye className="w-3.5 h-3.5 mr-2" />
            View stories
        </Button>
        
        <Button 
            variant="ghost" 
            size="sm" 
            disabled={Boolean(isExactMatchA)}
            onClick={() => onSaveGroup("A")}
            className="justify-start text-xs h-8 text-slate-300 hover:text-white hover:bg-slate-700"
        >
            <Save className="w-3.5 h-3.5 mr-2" />
            {isExactMatchA ? 'Saved as A' : (groupA ? 'Replace A' : 'Save as A')}
        </Button>
        
        <Button 
            variant="ghost" 
            size="sm" 
            disabled={Boolean(isExactMatchB)}
            onClick={() => onSaveGroup("B")}
            className="justify-start text-xs h-8 text-slate-300 hover:text-white hover:bg-slate-700"
        >
            <Save className="w-3.5 h-3.5 mr-2" />
            {isExactMatchB ? 'Saved as B' : (groupB ? 'Replace B' : 'Save as B')}
        </Button>
        
        <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClearSelection}
            className="justify-start text-xs h-8 text-slate-400 hover:text-red-300 hover:bg-slate-700 mt-1"
        >
            <X className="w-3.5 h-3.5 mr-2" />
            Clear selection
        </Button>
      </div>
    </div>
  );
};
