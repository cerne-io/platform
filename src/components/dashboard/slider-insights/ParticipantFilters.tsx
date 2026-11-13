
import React, { useState } from "react";
import { ParticipantFilter } from "../slider-comparison/useSliderQuestions";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";


interface ParticipantFiltersProps {
  participantFilters: ParticipantFilter[];
  filters: Record<string, Set<string>>;
  setFilters: React.Dispatch<React.SetStateAction<Record<string, Set<string>>>>;
}

const ParticipantFilters: React.FC<ParticipantFiltersProps> = ({
  participantFilters,
  filters,
  setFilters
}) => {
  const [expandedFilters, setExpandedFilters] = useState<Record<string, boolean>>({});

  const toggleFilter = (filterId: string) => {
    setExpandedFilters(prev => {
      const newExpandedState = {
        ...prev,
        [filterId]: !prev[filterId]
      };

      // If we're collapsing a filter, clear all its checkboxes
      if (!newExpandedState[filterId]) {
        setFilters(currentFilters => {
          const updatedFilters = { ...currentFilters };
          if (updatedFilters[filterId]) {
            // Clear this filter's selections
            updatedFilters[filterId] = new Set();
          }
          return updatedFilters;
        });
      }

      return newExpandedState;
    });
  };

  const handleFilterChange = (questionId: string, choice: string) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      if (!newFilters[questionId]) {
        newFilters[questionId] = new Set();
      }

      if (newFilters[questionId].has(choice)) {
        newFilters[questionId].delete(choice);
      } else {
        newFilters[questionId].add(choice);
      }

      return newFilters;
    });
  };

  if (participantFilters.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-6">
      {participantFilters.map(filter => (
        <div key={filter.id} className="flex items-center gap-3">
          <div className="flex items-center space-x-2">
            <Switch
              id={`filter-${filter.id}`}
              checked={expandedFilters[filter.id] || false}
              onCheckedChange={() => toggleFilter(filter.id)}
            />
            <Label htmlFor={`filter-${filter.id}`} className="text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer">
              Filter by {filter.text}
            </Label>
          </div>

          {expandedFilters[filter.id] && (
            <div className="flex items-center gap-3 ml-2">
              {filter.choices.map(choice => {
                const isActive = filters[filter.id]?.has(choice) || false;
                return (
                  <div key={`${filter.id}-${choice}`} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${filter.id}-${choice}`}
                      checked={isActive}
                      onCheckedChange={() => handleFilterChange(filter.id, choice)}
                      className="h-5 w-5"
                    />
                    <label
                      htmlFor={`${filter.id}-${choice}`}
                      className={`text-sm cursor-pointer capitalize transition-colors duration-200 ${isActive ? "text-slate-900 dark:text-slate-100 font-medium" : "text-slate-500"}`}
                    >
                      {choice}
                    </label>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ParticipantFilters;
