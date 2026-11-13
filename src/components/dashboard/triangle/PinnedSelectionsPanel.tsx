import React from 'react';
import { Button } from "@/components/ui/button";
import { TriangleSelectionGroup } from "./TriangleSelectionTypes";
import { BookOpen, RefreshCw, X, Layers } from "lucide-react";

type PinnedSelectionsPanelProps = {
  groupA: TriangleSelectionGroup | null;
  groupB: TriangleSelectionGroup | null;
  sharedStoryCount: number;
  onViewGroup: (id: "A" | "B") => void;
  onReplaceGroup: (id: "A" | "B") => void;
  onClearGroup: (id: "A" | "B") => void;
  onCompareGroups: () => void;
};

export const PinnedSelectionsPanel: React.FC<PinnedSelectionsPanelProps> = ({
  groupA,
  groupB,
  sharedStoryCount,
  onViewGroup,
  onReplaceGroup,
  onClearGroup,
  onCompareGroups
}) => {
  if (!groupA && !groupB) return null;

  const renderGroup = (group: TriangleSelectionGroup | null, id: "A" | "B") => {
    if (!group) return null;
    return (
      <div className="flex flex-col p-4 bg-white dark:bg-[#161B22] border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Group {id} <span className="text-muted-foreground font-normal mx-1">·</span> {group.selectionCount} stories
          </h4>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Selected by drag selection from "{group.triangleQuestionLabel || "this triangle"}"
        </p>
        <div className="flex items-center gap-2 mt-auto">
          <Button variant="secondary" size="sm" onClick={() => onViewGroup(id)} className="h-7 text-xs">
            <BookOpen className="w-3 h-3 mr-1.5" /> View
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onReplaceGroup(id)} className="h-7 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400">
            <RefreshCw className="w-3 h-3 mr-1.5" /> Replace
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onClearGroup(id)} className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" aria-label={`Clear Group ${id}`}>
            <X className="w-3 h-3 mr-1.5" /> Clear
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 animate-in fade-in duration-300">
      <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">Saved selections</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {renderGroup(groupA, "A")}
        {renderGroup(groupB, "B")}
      </div>

      {(groupA && groupB) && (
        <div className="mt-4 flex flex-col items-center justify-center gap-4 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800/50">
          <Button onClick={onCompareGroups} className="bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto px-8">
            <Layers className="w-4 h-4 mr-2" />
            Compare groups
          </Button>
          
          <div className="text-sm text-slate-600 dark:text-slate-400 text-center">
            {sharedStoryCount > 0 ? (
                <span><strong className="text-slate-800 dark:text-slate-200">{sharedStoryCount}</strong> stor{sharedStoryCount === 1 ? 'y is' : 'ies are'} in both groups.</span>
            ) : (
                <span>No overlapping stories between groups.</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
