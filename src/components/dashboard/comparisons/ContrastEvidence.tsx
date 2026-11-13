import React from 'react';
import { getEvidenceStrength, getCohensHEffectMagnitude } from '@/utils/math/comparisonUtils';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

export type ContrastEvidenceProps = {
  absoluteDifference: number;
  smoothedDifference: number;
  precision: number;
  coverage: number;
  cohensH: number;
  groupATotal: number;
  groupBTotal: number;
  corpusTotal: number;
};

export function ContrastEvidence({
  absoluteDifference,
  smoothedDifference,
  precision,
  coverage,
  cohensH,
  groupATotal,
  groupBTotal,
  corpusTotal,
}: ContrastEvidenceProps) {
  const evidenceStrength = getEvidenceStrength(precision);
  const effectMagnitude = getCohensHEffectMagnitude(cohensH);
  
  const representedResponses = groupATotal + groupBTotal;
  const adjustedDifferencePoints = smoothedDifference * 100;
  const observedDifferencePoints = absoluteDifference;
  // Coverage squared gives the proportion of respondents represented
  const coveragePercent = coverage * coverage * 100;

  const strengthConfig = {
    strong: { label: 'Strong evidence', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
    moderate: { label: 'Moderate evidence', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400' },
    tentative: { label: 'Tentative', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' }
  };

  const currentConfig = strengthConfig[evidenceStrength];

  return (
    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span role="button" tabIndex={0} className="cursor-pointer text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors inline-flex outline-none">
              <Info className="w-4 h-4" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs p-3 text-sm space-y-3 shadow-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-[100]" sideOffset={6}>
            <div className="space-y-1.5">
              <p className="font-semibold text-slate-900 dark:text-white">
                Evidence: 
                {evidenceStrength === 'tentative' ? (
                  <span 
                    className="ml-1 underline decoration-dashed underline-offset-2 cursor-help decoration-slate-300 dark:decoration-slate-600"
                    title={`Tentative because the smaller group has only ${Math.min(groupATotal, groupBTotal)} responses; its observed rate is adjusted toward the overall response pattern.`}
                  >
                    {currentConfig.label.replace(' evidence', '')}
                  </span>
                ) : (
                  <span className="ml-1">{currentConfig.label.replace(' evidence', '')}</span>
                )}
              </p>
              <div className="grid grid-cols-[1fr,auto] gap-x-4 gap-y-1">
                <span className="text-slate-500 dark:text-slate-400">Observed difference</span>
                <span className="font-medium text-right text-slate-700 dark:text-slate-200">{Math.round(observedDifferencePoints)} pts</span>
                
                <span 
                  className="text-slate-500 dark:text-slate-400 underline decoration-dashed underline-offset-2 cursor-help decoration-slate-300 dark:decoration-slate-600"
                  title="Adjusted to prevent small, noisy groups from dominating the ranking."
                >
                  Adjusted difference
                </span>
                <span className="font-medium text-right text-slate-700 dark:text-slate-200">{Math.round(adjustedDifferencePoints)} pts</span>
                
                <span className="text-slate-500 dark:text-slate-400">Proportional effect</span>
                <span className="font-medium text-right text-slate-700 dark:text-slate-200">{effectMagnitude} <span className="text-xs text-slate-400">(h={Math.abs(cohensH).toFixed(2)})</span></span>
                
                <span className="text-slate-500 dark:text-slate-400">Responses compared</span>
                <span className="font-medium text-right text-slate-700 dark:text-slate-200">{representedResponses} of {corpusTotal} <span className="text-xs text-slate-400">({coveragePercent.toFixed(0)}%)</span></span>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
