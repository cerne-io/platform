import React from 'react';
import { SliderComparisonResult } from '@/utils/math/continuousComparisonTypes';

interface SliderOverlayProps {
  finding: SliderComparisonResult;
  groupAName: string;
  groupBName: string;
}

export const SliderOverlay: React.FC<SliderOverlayProps> = ({ finding, groupAName, groupBName }) => {
  // SVG coordinates
  const W = 400;
  const H = 100;
  const paddingX = 20;
  
  const scaleX = (val: number) => paddingX + (val / 100) * (W - 2 * paddingX);
  
  const yA = 40;
  const yB = 70;

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-950" aria-label={`Slider comparison of ${groupAName} and ${groupBName}. ${finding.findingText}`}>
       <div className="relative w-full max-w-[380px] h-[160px] flex items-center justify-center">
           <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H + 40}`} className="overflow-visible block">
              {/* Background axis line */}
              <line x1={scaleX(0)} y1={55} x2={scaleX(100)} y2={55} stroke="currentColor" strokeWidth="1" className="text-slate-200 dark:text-slate-800" />
              <line x1={scaleX(0)} y1={50} x2={scaleX(0)} y2={60} stroke="currentColor" strokeWidth="1" className="text-slate-200 dark:text-slate-800" />
              <line x1={scaleX(100)} y1={50} x2={scaleX(100)} y2={60} stroke="currentColor" strokeWidth="1" className="text-slate-200 dark:text-slate-800" />
              
              {/* Labels */}
              <text x={scaleX(0)} y={H + 15} textAnchor="start" className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{finding.labels.left}</text>
              <text x={scaleX(100)} y={H + 30} textAnchor="end" className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{finding.labels.right}</text>

              {/* Group B (Reference) IQR and Median */}
              <line x1={scaleX(finding.groupB.q1)} y1={yB} x2={scaleX(finding.groupB.q3)} y2={yB} stroke="currentColor" strokeWidth="6" strokeLinecap="round" className="text-emerald-200 dark:text-emerald-900/40" />
              <circle cx={scaleX(finding.groupB.median)} cy={yB} r="6" fill="currentColor" className="text-emerald-500 dark:text-emerald-600" />

              {/* Group A IQR and Median */}
              <line x1={scaleX(finding.groupA.q1)} y1={yA} x2={scaleX(finding.groupA.q3)} y2={yA} stroke="currentColor" strokeWidth="6" strokeLinecap="round" className="text-indigo-200 dark:text-indigo-900/40" />
              <circle cx={scaleX(finding.groupA.median)} cy={yA} r="6" fill="currentColor" className="text-indigo-600 dark:text-indigo-500" />

              {/* Connecting dashed line between medians */}
              <defs>
                  <marker id="arrowhead-slider" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                      <polygon points="0 0, 6 3, 0 6" fill="currentColor" className="text-slate-400 dark:text-slate-500" />
                  </marker>
              </defs>
              <line 
                  x1={scaleX(finding.groupB.median)} 
                  y1={yB - 8} 
                  x2={scaleX(finding.groupA.median)} 
                  y2={yA + 8} 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  strokeDasharray="3 3"
                  className="text-slate-400 dark:text-slate-500"
                  markerEnd="url(#arrowhead-slider)"
              />
           </svg>
       </div>
       <div className="flex gap-6 mt-4 text-sm font-medium">
           <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
               <div className="w-3 h-3 rounded-full bg-indigo-600 dark:bg-indigo-500"></div>
               <span>{groupAName}</span>
           </div>
           <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-500">
               <div className="w-3 h-3 rounded-full bg-emerald-500 dark:bg-emerald-600"></div>
               <span>{groupBName}</span>
           </div>
       </div>
       <div className="mt-6 text-[10px] text-slate-500 dark:text-slate-400 text-center max-w-[90%] leading-tight">
          Showing each group's median (as a dot) and their middle-50% spread/IQR (as a thick underlying line).
       </div>
    </div>
  );
};
