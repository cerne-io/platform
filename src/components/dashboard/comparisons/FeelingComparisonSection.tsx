import React, { useState } from 'react';
import { 
  CategoricalComparisonResult, 
  CategoryContrast,
  PARTICIPANT_FEELING_FIELD_ID, 
  FEELING_GROUP_FIELD_ID,
  FeelingComparisonSectionData
} from '@/utils/math/comparisonUtils';
import { ContrastEvidence } from './ContrastEvidence';

interface FeelingComparisonSectionProps {
  data: FeelingComparisonSectionData;
  groupALabel: string;
  groupBLabel: string;
  selectedContrast: { questionId: string, category: string } | null;
  onSelectFinding: (questionId: string, category: string) => void;
  // Using the same ContrastRow definition
  renderContrastRow: (contrast: CategoryContrast, diff: CategoricalComparisonResult, isSelected: boolean, onSelect: () => void) => React.ReactNode;
}

export const FeelingComparisonSection: React.FC<FeelingComparisonSectionProps> = ({
  data,
  groupALabel,
  groupBLabel,
  selectedContrast,
  onSelectFinding,
  renderContrastRow
}) => {
  const [showSpecificFeelings, setShowSpecificFeelings] = useState(false);
  const [showUnassigned, setShowUnassigned] = useState(false);

  const { groupedResults, exactResults, constituentTermsByGroup, unassignedTerms } = data;

  const handleSelect = (questionId: string, category: string) => {
    onSelectFinding(questionId, category);
  };

  if (groupedResults.length === 0 && exactResults.length === 0 && unassignedTerms.length === 0) {
    return null;
  }

  const groupedDiff = groupedResults[0];
  const exactDiff = exactResults[0];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
          PARTICIPANT-SELECTED FEELINGS
        </h3>

        <div className="space-y-4">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Feeling patterns</h4>
            
            {(!groupedDiff || groupedDiff.contrasts.length === 0) ? (
              <div className="text-sm text-muted-foreground p-3 bg-white dark:bg-slate-900 rounded-lg border border-border space-y-3">
                <div>
                  <div className="font-medium text-slate-800 dark:text-slate-200 mb-1">No notable difference in grouped feeling patterns.</div>
                  <p className="text-xs">Positive, Neutral, and Negative group participant-selected feelings for comparison.</p>
                </div>
                {exactDiff && exactDiff.contrasts.length > 0 && (
                  <p className="text-xs">
                    No broad grouped pattern met the comparison threshold. Individual participant-selected feelings may still offer leads to inspect.
                  </p>
                )}
              </div>
            ) : (
              groupedDiff.contrasts.map((contrast, idx) => {
              const isSelected = selectedContrast?.questionId === FEELING_GROUP_FIELD_ID && selectedContrast?.category === contrast.category;
              
              // Find constituents
              const groupCat = contrast.category as "positive" | "neutral" | "negative";
              const constituents = constituentTermsByGroup[groupCat] || [];

              // We render a specialized grouped row, but we can reuse the generic renderContrastRow and wrap it or modify it.
              // Wait, the user wants a specific layout for the grouped card with constituents.
              // Let's build a custom card for grouped feeling.
              const isGroupAHigher = contrast.differencePercentagePoints > 0;
              const dominantGroup = isGroupAHigher ? groupALabel : groupBLabel;
              
              // Helper to capitalize first letter
              const capitalizedCategory = contrast.category.charAt(0).toUpperCase() + contrast.category.slice(1);

              return (
                <GroupedFeelingCard 
                  key={idx}
                  contrast={contrast}
                  diff={groupedDiff}
                  groupALabel={groupALabel}
                  groupBLabel={groupBLabel}
                  isSelected={isSelected}
                  onSelect={() => handleSelect(FEELING_GROUP_FIELD_ID, contrast.category)}
                  constituents={constituents}
                  capitalizedCategory={capitalizedCategory}
                  dominantGroup={dominantGroup}
                  isGroupAHigher={isGroupAHigher}
                />
              );
              })
            )}
          </div>

          {/* Specific participant-selected feelings disclosure */}
          {exactDiff && exactDiff.contrasts.length > 0 && (
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Specific participant-selected feelings ({exactDiff.contrasts.length})
                </div>
                <button 
                  type="button"
                  onClick={() => setShowSpecificFeelings(!showSpecificFeelings)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 rounded-sm"
                >
                  {showSpecificFeelings ? 'Hide individual feelings' : 'Show individual feelings'}
                </button>
              </div>
              
              {showSpecificFeelings && (
                <div className="space-y-3 mt-3">
                  {exactDiff.contrasts.map((contrast, idx) => {
                    const isSelected = selectedContrast?.questionId === PARTICIPANT_FEELING_FIELD_ID && selectedContrast?.category === contrast.category;
                    return (
                      <React.Fragment key={idx}>
                        {renderContrastRow(contrast, exactDiff, isSelected, () => handleSelect(PARTICIPANT_FEELING_FIELD_ID, contrast.category))}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Unassigned feeling labels */}
          {unassignedTerms.length > 0 && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-1">
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Unassigned feeling labels ({unassignedTerms.length})
                </div>
                <button 
                  type="button"
                  onClick={() => setShowUnassigned(!showUnassigned)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 rounded-sm"
                >
                  {showUnassigned ? 'Hide unassigned feelings' : 'Show unassigned feelings'}
                </button>
              </div>
              <div className="text-xs text-muted-foreground mb-3">
                {unassignedTerms.length} participant-selected feelings do not have an AI feeling group. They are not included in Positive, Neutral, or Negative comparisons.
              </div>
              
              {showUnassigned && (
                <div className="space-y-1 mt-2 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                  {unassignedTerms.map((term, idx) => (
                    <div key={idx} className="text-sm flex items-center justify-between">
                      <span className="font-medium">- {term.label}</span>
                      <span className="text-muted-foreground text-xs">{term.totalCount} {term.totalCount === 1 ? 'story' : 'stories'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

const GroupedFeelingCard = ({ 
  contrast, 
  diff, 
  groupALabel, 
  groupBLabel, 
  isSelected, 
  onSelect, 
  constituents,
  capitalizedCategory,
  dominantGroup,
  isGroupAHigher
}: {
  contrast: CategoryContrast;
  diff: CategoricalComparisonResult;
  groupALabel: string;
  groupBLabel: string;
  isSelected: boolean;
  onSelect: () => void;
  constituents: { label: string, isCustom: boolean, groupACount: number, groupBCount: number, totalCount: number }[];
  capitalizedCategory: string;
  dominantGroup: string;
  isGroupAHigher: boolean;
}) => {
  const [showInfo, setShowInfo] = useState(false);
  
  const isInsufficient = diff.indicators?.some(i => i.kind === 'insufficient_responses') ?? false;
  const partialCoverageInd = contrast.indicators?.find(i => i.kind === 'partial_ai_group_coverage') as Extract<NonNullable<typeof contrast.indicators>[number], { kind: 'partial_ai_group_coverage' }> | undefined;
  return (
    <div 
        onClick={onSelect}
        className={`
            p-3 rounded-lg border cursor-pointer transition-colors
            ${isSelected 
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30' 
                : 'border-border bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
            }
            ${isInsufficient ? 'opacity-60' : ''}
        `}
    >
        <div className="font-medium text-sm mb-2">{capitalizedCategory} feeling group</div>
        
        <div className="space-y-1.5 text-sm">
            <div className="text-muted-foreground mb-1 text-xs">
              More {dominantGroup} stories had participant-selected feelings AI-grouped as {capitalizedCategory}.
            </div>
            <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{groupALabel}:</span>
                <span>{contrast.groupACount} of {contrast.groupAAnswered} stories ({contrast.groupAPercentage}%)</span>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{groupBLabel}:</span>
                <span>{contrast.groupBCount} of {contrast.groupBAnswered} stories ({contrast.groupBPercentage}%)</span>
            </div>
            
            {!isInsufficient && (
                <div className="pt-1 mt-1 border-t border-border flex justify-between items-start text-xs">
                    <span className="font-medium mt-0.5">Difference:</span>
                    <div className="flex flex-col items-end gap-2 text-right">
                        <div className="flex items-center gap-1.5">
                            <span className={isGroupAHigher ? "text-indigo-600 dark:text-indigo-400 font-medium" : "text-emerald-600 dark:text-emerald-400 font-medium"}>
                                {contrast.absoluteDifference} percentage points higher in {dominantGroup}
                            </span>
                            
                            <ContrastEvidence
                                absoluteDifference={contrast.absoluteDifference}
                                smoothedDifference={contrast.smoothedDifference ?? 0}
                                precision={contrast.precision ?? 0}
                                coverage={contrast.coverage ?? 0}
                                cohensH={contrast.cohensH ?? 0}
                                groupATotal={contrast.groupAAnswered}
                                groupBTotal={contrast.groupBAnswered}
                                corpusTotal={diff.corpusTotalAnswered}
                            />
                        </div>

                        {partialCoverageInd && partialCoverageInd.kind === 'partial_ai_group_coverage' && (
                            <span className="text-muted-foreground font-medium flex flex-col items-end mt-1">
                                <span>Partial AI-group coverage</span>
                                <span className="font-normal text-[10px]">
                                    {partialCoverageInd.groupA.hasValidGroup} of {partialCoverageInd.groupA.hasSelectedFeeling} {groupALabel} selected feelings were grouped
                                </span>
                            </span>
                        )}

                        {contrast.indicators?.some(i => i.kind === 'rare_response') && (
                            <span className="text-amber-600 dark:text-amber-500 font-medium mt-1">Rare response · {contrast.totalSelectedCategoryCount} selected stories</span>
                        )}
                        
                        <span className="text-muted-foreground font-medium mt-1">AI-grouped from participant-selected feelings</span>
                    </div>
                </div>
            )}
        </div>

        <div className="mt-3 text-xs text-muted-foreground bg-slate-50 dark:bg-slate-950 p-3 rounded space-y-2">
            <div className="flex justify-between items-start gap-2">
                <div className="flex-1 space-y-1">
                    <div className="font-semibold text-slate-700 dark:text-slate-300">Within {groupALabel} and {groupBLabel}</div>
                    <div>
                        {isGroupAHigher 
                            ? `${contrast.groupACount} of ${contrast.totalSelectedCategoryCount} stories with feelings AI-grouped as ${capitalizedCategory} are in ${groupALabel} (${contrast.concentrationA}%).`
                            : `${contrast.groupBCount} of ${contrast.totalSelectedCategoryCount} stories with feelings AI-grouped as ${capitalizedCategory} are in ${groupBLabel} (${contrast.concentrationB}%).`
                        }
                    </div>
                </div>
                <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowInfo(!showInfo); }}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 flex items-center gap-1 mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 rounded-sm"
                >
                    {showInfo ? '- details' : '+ details'}
                </button>
            </div>
            
            {showInfo && (
                <div className="text-slate-600 dark:text-slate-400 pt-3 mt-3 border-t border-slate-200 dark:border-slate-800 space-y-3 cursor-default" onClick={(e) => e.stopPropagation()}>
                    <div className="text-xs text-muted-foreground mb-4">
                        Positive, Neutral, and Negative group participant-selected feelings for comparison.
                    </div>
                    <div className="space-y-1">
                        <div className="font-semibold text-slate-700 dark:text-slate-300">Across all stories with valid feeling groups</div>
                        <div>
                            {isGroupAHigher
                                ? `${contrast.groupACount} of ${contrast.corpusTotalCategoryCount} stories in the ${capitalizedCategory} feeling group are in ${groupALabel} (${contrast.corpusConcentrationA}%).`
                                : `${contrast.groupBCount} of ${contrast.corpusTotalCategoryCount} stories in the ${capitalizedCategory} feeling group are in ${groupBLabel} (${contrast.corpusConcentrationB}%).`
                            }
                        </div>
                        <div>{contrast.corpusTotalCategoryCount - contrast.totalSelectedCategoryCount} stories in this feeling group are outside {groupALabel} and {groupBLabel}.</div>
                    </div>

                    <div className="space-y-1">
                        <div className="font-semibold text-slate-700 dark:text-slate-300">Included participant-selected feelings</div>
                        <div className="grid grid-cols-2 gap-4 mt-1">
                          <div>
                            <div className="font-medium text-slate-800 dark:text-slate-200 mb-1">{groupALabel}</div>
                            {constituents.filter(c => c.groupACount > 0).map((c, i) => (
                              <div key={i} className="flex items-center gap-1">
                                <span>- {c.label}: {c.groupACount}</span>
                                {c.isCustom && <span className="text-[10px] text-muted-foreground ml-1">· Custom response</span>}
                              </div>
                            ))}
                            {constituents.filter(c => c.groupACount > 0).length === 0 && <span className="text-muted-foreground italic">None</span>}
                          </div>
                          <div>
                            <div className="font-medium text-slate-800 dark:text-slate-200 mb-1">{groupBLabel}</div>
                            {constituents.filter(c => c.groupBCount > 0).map((c, i) => (
                              <div key={i} className="flex items-center gap-1">
                                <span>- {c.label}: {c.groupBCount}</span>
                                {c.isCustom && <span className="text-[10px] text-muted-foreground ml-1">· Custom response</span>}
                              </div>
                            ))}
                            {constituents.filter(c => c.groupBCount > 0).length === 0 && <span className="text-muted-foreground italic">None</span>}
                          </div>
                        </div>
                    </div>

                    <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
                        <div className="font-semibold text-slate-700 dark:text-slate-300">How this group was formed</div>
                        <div>Positive, Neutral, and Negative are AI-generated groupings of the participant-selected feeling. Original labels remain available for review.</div>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
