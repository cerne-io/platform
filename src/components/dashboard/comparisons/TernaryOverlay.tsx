import React from 'react';
import { TriangleComparisonResult } from '@/utils/math/continuousComparisonTypes';

interface TernaryOverlayProps {
  finding: TriangleComparisonResult;
  groupAName: string;
  groupBName: string;
}

export const TernaryOverlay: React.FC<TernaryOverlayProps> = ({ finding, groupAName, groupBName }) => {
  // Use a standard coordinate space for the triangle
  const W = 320;
  const H = 277.1; // W * sin(60 deg)

  // Map corners to visual vertices
  // Top: (W/2, 0), Bottom-Right: (W, H), Bottom-Left: (0, H)
  const verticesMap: Record<string, { x: number; y: number; anchor: 'start' | 'middle' | 'end'; baseline: string }> = {
    'top': { x: W / 2, y: 0, anchor: 'middle', baseline: 'bottom' },
    'right': { x: W, y: H, anchor: 'middle', baseline: 'top' },
    'left': { x: 0, y: H, anchor: 'middle', baseline: 'top' }
  };

  const getCartesian = (centroid: { a: number; b: number; c: number }) => {
    // a corresponds to top, b to left, c to right based on continuousComparisonUtils mapping
    // where centroid.a = top, centroid.b = left, centroid.c = right
    const vTop = verticesMap['top'];
    const vLeft = verticesMap['left'];
    const vRight = verticesMap['right'];

    return {
      x: centroid.a * vTop.x + centroid.b * vLeft.x + centroid.c * vRight.x,
      y: centroid.a * vTop.y + centroid.b * vLeft.y + centroid.c * vRight.y
    };
  };

  const ptA = getCartesian(finding.groupA.centroid);
  const ptB = getCartesian(finding.groupB.centroid);

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-950" aria-label={`Ternary comparison of ${groupAName} and ${groupBName}. ${finding.findingText}`}>
       <div className="relative w-full max-w-[380px] aspect-square flex items-center justify-center">
           <svg width="100%" height="100%" viewBox={`-100 -40 ${W + 200} ${H + 80}`} className="overflow-visible block">
              {/* Triangle Boundary */}
              <polygon 
                  points={`${verticesMap['top'].x},${verticesMap['top'].y} ${verticesMap['right'].x},${verticesMap['right'].y} ${verticesMap['left'].x},${verticesMap['left'].y}`} 
                  fill="white" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  className="text-slate-300 dark:text-slate-700 dark:fill-slate-950"
              />
              
              {/* Labels */}
              {finding.corners.map((c) => {
                  const v = verticesMap[c.id];
                  if (!v) return null;
                  return (
                      <text 
                         key={c.id}
                         x={v.x} 
                         y={v.y + (c.id === 'top' ? -16 : 24)}
                         textAnchor={v.anchor}
                         fill="currentColor"
                         className="text-xs font-medium text-slate-700 dark:text-slate-300"
                         style={{ dominantBaseline: c.id === 'top' ? 'auto' : 'hanging' }}
                      >
                         {c.label}
                      </text>
                  );
              })}

              {/* Arrow from B to A */}
              <defs>
                  <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                      <polygon points="0 0, 8 4, 0 8" fill="currentColor" className="text-slate-400 dark:text-slate-500" />
                  </marker>
              </defs>
              <line 
                  x1={ptB.x} y1={ptB.y} 
                  x2={ptA.x} y2={ptA.y} 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeDasharray="4 2"
                  className="text-slate-400 dark:text-slate-500"
                  markerEnd="url(#arrowhead)"
              />

              {/* Centroid B */}
              <circle cx={ptB.x} cy={ptB.y} r="6" fill="currentColor" className="text-emerald-500 dark:text-emerald-600" />
              
              {/* Centroid A */}
              <circle cx={ptA.x} cy={ptA.y} r="6" fill="currentColor" className="text-indigo-600 dark:text-indigo-500" />
           </svg>
       </div>
       <div className="flex gap-6 mt-6 text-sm font-medium">
           <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
               <div className="w-3 h-3 rounded-full bg-indigo-600 dark:bg-indigo-500"></div>
               <span>{groupAName}</span>
           </div>
           <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-500">
               <div className="w-3 h-3 rounded-full bg-emerald-500 dark:bg-emerald-600"></div>
               <span>{groupBName}</span>
           </div>
       </div>
    </div>
  );
};
