import React, { useState } from 'react';
import { SliderComparisonResult, TriangleComparisonResult } from '@/utils/math/continuousComparisonTypes';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TernaryOverlay } from './TernaryOverlay';
import { SliderOverlay } from './SliderOverlay';

interface ContinuousFindingRowProps {
  finding: SliderComparisonResult | TriangleComparisonResult;
  groupAName: string;
  groupBName: string;
  groupATotal: number;
  groupBTotal: number;
  isSelected?: boolean;
  onSelect?: () => void;
}

export const ContinuousFindingRow: React.FC<ContinuousFindingRowProps> = ({ 
  finding,
  groupAName,
  groupBName,
  groupATotal,
  groupBTotal,
  isSelected = false, 
  onSelect 
}) => {
  const [showInfo, setShowInfo] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const isSlider = finding.kind === 'slider';
  const sliderFinding = isSlider ? (finding as SliderComparisonResult) : null;
  const triangleFinding = !isSlider ? (finding as TriangleComparisonResult) : null;

  const findingText = finding.findingText
    .replace(/Group A/g, groupAName)
    .replace(/Group B/g, groupBName);

  const isInsufficient = finding.indicators.some(i => i.kind === 'insufficient_responses');
  const isEarlySignal = finding.indicators.some(i => i.kind === 'early_signal');
  const hasPartialCoverage = finding.indicators.some(i => i.kind === 'partial_coverage');
  const hasOverlap = finding.indicators.some(i => i.kind === 'groups_overlap');

  const primaryIndicator = isInsufficient ? 'insufficient_responses' : (isEarlySignal ? 'early_signal' : null);
  const secondaryIndicator = hasPartialCoverage ? 'partial_coverage' : (hasOverlap ? 'groups_overlap' : null);
  const displayIndicators = [primaryIndicator, secondaryIndicator].filter(Boolean) as string[];

  let badgeText = "";
  let strongestCornerLabel = "";
  if (isInsufficient) {
    // Suppress directional language completely
  } else if (isSlider) {
    if (finding.pattern === 'shift') badgeText = `${Math.round(sliderFinding!.absoluteShift)}-point median shift`;
    else if (finding.pattern === 'spread') badgeText = `${Math.round(sliderFinding!.spreadRatio * 10) / 10}× wider spread`;
    else badgeText = "Similar distribution";
  } else {
    if (finding.pattern === 'shift' && triangleFinding?.strongestShift) {
        strongestCornerLabel = triangleFinding.corners.find(c => c.id === triangleFinding.strongestShift!.cornerId)?.label || '';
        const dirText = triangleFinding.strongestShift.direction === 'toward' ? 'higher' : 'lower';
        badgeText = `${Math.round(Math.abs(triangleFinding.strongestShift.delta * 100))}-point ${dirText} average placement toward ${strongestCornerLabel}`;
    } else badgeText = "Similar distribution";
  }

  const doesNotOverlap = finding.indicators.some(i => i.kind === 'slider_middle_ranges_do_not_overlap');

  return (
    <div 
      onClick={onSelect}
      className={`
        p-3 rounded-lg border cursor-pointer transition-colors mb-3
        ${isSelected 
          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30' 
          : 'border-border bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
        }
      `}
    >
      <div className="flex justify-between items-start gap-2 mb-1">
          <div className={`font-medium text-sm text-foreground ${isInsufficient ? 'opacity-60' : ''}`}>{findingText}</div>
          {!isInsufficient && (
              <Popover open={showGraph} onOpenChange={setShowGraph}>
                  <PopoverTrigger asChild>
                      <button 
                          onClick={(e) => { e.stopPropagation(); }} 
                          className="text-[10px] uppercase font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 shrink-0 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-1 rounded transition-colors"
                      >
                          {showGraph ? 'Hide Graph' : 'See Graph'}
                      </button>
                  </PopoverTrigger>
                  <PopoverContent 
                      side="right" 
                      align="start" 
                      className="w-[420px] p-0 overflow-hidden shadow-xl border-slate-200 dark:border-slate-800" 
                      sideOffset={16}
                      onClick={(e) => e.stopPropagation()}
                  >
                      {isSlider ? (
                          <SliderOverlay finding={sliderFinding!} groupAName={groupAName} groupBName={groupBName} />
                      ) : (
                          <TernaryOverlay finding={triangleFinding!} groupAName={groupAName} groupBName={groupBName} />
                      )}
                  </PopoverContent>
              </Popover>
          )}
      </div>
      <div className="text-muted-foreground mb-2 text-xs truncate" title={finding.questionText}>
          {finding.questionText}
      </div>
      
      <div className={`space-y-1.5 text-sm ${isInsufficient ? 'opacity-60' : ''}`}>
          <div className="text-xs text-muted-foreground mb-2 leading-relaxed">
            {isInsufficient && (
              <>
                <span className="text-slate-500 font-medium">Insufficient responses</span>
                <span className="mx-1.5">·</span>
              </>
            )}
            {!isInsufficient && displayIndicators.map(kind => {
                let text = "";
                let colorClass = "text-amber-600 dark:text-amber-500";
                
                if (kind === 'early_signal') {
                    text = "Early signal";
                }
                else if (kind === 'partial_coverage') {
                    const ind = finding.indicators.find(i => i.kind === 'partial_coverage') as Extract<typeof finding.indicators[number], { kind: 'partial_coverage' }>;
                    if (ind.isSevere) {
                        text = "Limited response coverage";
                        colorClass = "text-red-600 dark:text-red-500";
                    }
                    else if (ind.group === 'both') text = "Partial coverage in both groups";
                    else text = `Partial coverage in ${ind.group === 'A' ? groupAName : groupBName}`;
                }
                else if (kind === 'groups_overlap') {
                    const ind = finding.indicators.find(i => i.kind === 'groups_overlap') as Extract<typeof finding.indicators[number], { kind: 'groups_overlap' }>;
                    if (ind.isSubstantial) text = `Substantial group overlap`;
                    else text = `Groups overlap`;
                }
                
                return (
                    <React.Fragment key={kind}>
                        <span className={`${colorClass} font-medium`}>{text}</span>
                        <span className="mx-1.5">·</span>
                    </React.Fragment>
                );
            })}
            
            {badgeText && (
                <>
                    <span className="font-medium text-foreground">{badgeText}</span>
                    <span className="mx-1.5">·</span>
                </>
            )}
            <span className="text-slate-500">
                {isInsufficient 
                    ? `${groupAName}: ${finding.groupA.n} valid responses · ${groupBName}: ${finding.groupB.n} valid responses`
                    : `${groupAName} (n=${finding.groupA.n}) vs. ${groupBName} (n=${finding.groupB.n})`
                }
            </span>
          </div>
      </div>

      <div className="mt-3 text-xs text-muted-foreground bg-slate-50 dark:bg-slate-950 p-3 rounded space-y-2">
          <div className="flex justify-between items-start gap-2">
              <div className="flex-1 space-y-1">
                  <div className="font-semibold text-slate-700 dark:text-slate-300">Typical position {isSlider ? '(median)' : '(average placement)'}</div>
                  <div className="text-foreground">
                      {isSlider ? (
                          <>
                             {groupAName}: {Math.round(sliderFinding!.groupA.median)} · {groupBName}: {Math.round(sliderFinding!.groupB.median)}
                          </>
                      ) : (
                          <>
                             {finding.pattern === 'shift' && triangleFinding?.strongestShift 
                               ? `Largest difference: ${Math.round(Math.abs(triangleFinding.strongestShift.delta * 100))} points ${triangleFinding.strongestShift.direction === 'toward' ? 'higher' : 'lower'} toward ${strongestCornerLabel}` 
                               : 'No strong directional difference'}
                          </>
                      )}
                  </div>
              </div>
              <button 
                  onClick={(e) => { e.stopPropagation(); setShowInfo(!showInfo); }}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 flex items-center gap-1 mt-1 text-[10px] uppercase font-semibold"
              >
                  {showInfo ? '- details' : '+ details'}
              </button>
          </div>

          {showInfo && (
              <div className="text-slate-600 dark:text-slate-400 pt-3 mt-3 border-t border-slate-200 dark:border-slate-800 space-y-4 cursor-default" onClick={e => e.stopPropagation()}>
                  {isSlider ? (
                    <>
                      {finding.pattern === 'shift' && (
                         <div className="space-y-1">
                           <div className="font-semibold text-slate-700 dark:text-slate-300">Difference</div>
                           <div>{groupAName}'s typical position was {Math.round(sliderFinding!.absoluteShift)} points closer to {sliderFinding!.direction === 'right' ? (sliderFinding!.labels.right || 'right') : (sliderFinding!.labels.left || 'left')}.</div>
                         </div>
                      )}

                      {finding.pattern === 'spread' && (
                         <div className="space-y-1">
                           <div className="font-semibold text-slate-700 dark:text-slate-300">Difference in spread</div>
                           <div>{(sliderFinding!.groupB.iqr > sliderFinding!.groupA.iqr ? groupBName : groupAName)}'s middle range was about {Math.round(sliderFinding!.spreadRatio * 10) / 10}× wider.</div>
                         </div>
                      )}



                      <div className="space-y-1">
                        <div className="font-semibold text-slate-700 dark:text-slate-300">Middle 50% of responses</div>
                        <div>{groupAName}: {Math.round(sliderFinding!.groupA.q1)}–{Math.round(sliderFinding!.groupA.q3)}</div>
                        <div>{groupBName}: {Math.round(sliderFinding!.groupB.q1)}–{Math.round(sliderFinding!.groupB.q3)}</div>
                        {doesNotOverlap && (
                            <div className="text-slate-500 italic mt-1">The groups' middle response ranges did not overlap.</div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Average placement by interpretation</div>
                        <div className="text-slate-500 dark:text-slate-400 mb-2">Each group's three values add to 100%.</div>
                        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 gap-y-1">
                          <div className="text-slate-500 font-medium"></div>
                          <div className="text-slate-500 font-medium text-right">{groupAName}</div>
                          <div className="text-slate-500 font-medium text-right">{groupBName}</div>
                          <div className="text-slate-500 font-medium text-right">Difference</div>
                          
                          {triangleFinding!.corners.map(corner => (
                            <React.Fragment key={corner.id}>
                              <div className="truncate" title={corner.label}>{corner.label}</div>
                              <div className="text-right">{Math.round(corner.groupAMean * 100)}%</div>
                              <div className="text-right">{Math.round(corner.groupBMean * 100)}%</div>
                              <div className="text-right">{corner.delta > 0 ? '+' : ''}{Math.round(corner.delta * 100)} points</div>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>

                      {finding.pattern === 'shift' && triangleFinding?.strongestShift && (
                        <>
                           <div className="space-y-1 pt-1">
                             <div className="font-semibold text-slate-700 dark:text-slate-300">Largest difference</div>
                             <div>{groupAName} placed {Math.round(Math.abs(triangleFinding.strongestShift.delta * 100))} points {triangleFinding.strongestShift.direction === 'toward' ? 'more' : 'less'} emphasis on {strongestCornerLabel}.</div>
                           </div>

                           <div className="space-y-1">
                             <div className="font-semibold text-slate-700 dark:text-slate-300">Where the emphasis shifted</div>
                             <div>
                                Compared with {groupBName}, {groupAName} placed{' '}
                                {(() => {
                                    const otherCorners = triangleFinding.corners.filter(c => c.id !== triangleFinding.strongestShift!.cornerId);
                                    const meaningfulShifts = otherCorners.filter(c => Math.abs(c.delta) >= 0.05); // > 5 points
                                    
                                    if (meaningfulShifts.length === 0) {
                                        return "the remaining emphasis similarly across the other interpretations.";
                                    }
                                    
                                    return meaningfulShifts.map((c, i) => (
                                        <React.Fragment key={c.id}>
                                            {i > 0 && " and "}
                                            {Math.round(Math.abs(c.delta * 100))} points {c.delta > 0 ? 'more' : 'less'} emphasis on {c.label}
                                        </React.Fragment>
                                    ));
                                })()}.
                             </div>
                           </div>
                        </>
                      )}
                    </>
                  )}

                  <div className="space-y-1">
                    <div className="font-semibold text-slate-700 dark:text-slate-300">Response coverage</div>
                    <div className="text-slate-500 dark:text-slate-400">Within the selected groups</div>
                    <div>{finding.groupA.n} of {groupATotal} {groupAName} stories included a valid response.</div>
                    <div>{finding.groupB.n} of {groupBTotal} {groupBName} stories included a valid response.</div>
                  </div>

                  {finding.indicators.some(i => i.kind === 'early_signal') && (
                    <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <div className="font-semibold text-amber-700 dark:text-amber-500">Why "Early signal"?</div>
                      <div>
                        {(() => {
                           const ind = finding.indicators.find(i => i.kind === 'early_signal') as Extract<typeof finding.indicators[number], { kind: 'early_signal' }>;
                           return `A visible response pattern meets this workspace's comparison threshold, but one selected group has fewer than ${ind.minimumGroupSize} valid responses. Inspect the linked stories before treating it as a stable group-level pattern.`;
                        })()}
                      </div>
                    </div>
                  )}

                  {finding.indicators.some(i => i.kind === 'partial_coverage') && (
                    <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <div className="font-semibold text-amber-700 dark:text-amber-500">Why "Partial response coverage"?</div>
                      <div>
                        {(() => {
                           const ind = finding.indicators.find(i => i.kind === 'partial_coverage') as Extract<typeof finding.indicators[number], { kind: 'partial_coverage' }>;
                           if (ind.isSevere) {
                             return `Only ${ind.validA} of ${ind.totalA} ${groupAName} stories and ${ind.validB} of ${ind.totalB} ${groupBName} stories included a valid response. Treat this comparison as describing a partial subset.`;
                           }
                           return `${ind.validA} of ${ind.totalA} ${groupAName} stories and ${ind.validB} of ${ind.totalB} ${groupBName} stories included a valid response. This finding describes only the stories with responses to this question.`;
                        })()}
                      </div>
                    </div>
                  )}

                  {finding.indicators.some(i => i.kind === 'groups_overlap') && (
                    <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <div className="font-semibold text-amber-700 dark:text-amber-500">Why "Groups overlap"?</div>
                      <div>
                        {(() => {
                           const ind = finding.indicators.find(i => i.kind === 'groups_overlap') as Extract<typeof finding.indicators[number], { kind: 'groups_overlap' }>;
                           return `${ind.sharedStoryCount} ${ind.sharedStoryCount === 1 ? 'story appears' : 'stories appear'} in both ${groupAName} and ${groupBName}. They contribute to both group summaries, so this is not a comparison of mutually exclusive sets.`;
                        })()}
                      </div>
                    </div>
                  )}

                  {finding.indicators.some(i => i.kind === 'insufficient_responses') && (
                    <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <div className="font-semibold text-slate-700 dark:text-slate-300">Why "Insufficient responses"?</div>
                      <div>
                        {(() => {
                           return `Below four valid responses per group, Cerne does not produce a continuous comparison finding. Although quartiles can be computed using software-specific interpolation rules at very small sample sizes, the resulting median and middle-range summary is too unstable to be useful as a comparison signal.`;
                        })()}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div className="font-semibold text-slate-700 dark:text-slate-300">How to read this</div>
                    {isSlider ? (
                        <div>{finding.pattern === 'spread' ? `The groups had similar typical positions, but ${(sliderFinding!.groupB.iqr > sliderFinding!.groupA.iqr ? groupBName : groupAName)}'s responses were less concentrated. This does not establish why the stories were more varied.` : `This describes how the selected groups positioned their stories on this continuum. It does not explain why they differed; inspect the linked stories for context.`}</div>
                    ) : (
                        <div>Each response distributes emphasis across the three interpretations. For each group, the average placements add to 100%. This describes how the selected groups framed their stories; inspect the linked stories to explore what may account for the difference.</div>
                    )}
                  </div>
              </div>
          )}
      </div>
    </div>
  );
};
