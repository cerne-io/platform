
import React from 'react';
import { Story } from "@/types/story";
import { cleanStoryText } from "@/utils/story/formattingUtils";

interface PrintableStoryCardsProps {
    stories: Story[];
    projectName?: string;
}

const PrintableStoryCards = React.forwardRef<HTMLDivElement, PrintableStoryCardsProps>(
    ({ stories, projectName }, ref) => {
        // Current date for the report
        const printDate = new Date().toLocaleDateString();

        return (
            <div ref={ref} className="p-8 print-container text-black bg-white">
                {/* Print Header */}
                <div className="mb-8 border-b pb-4">
                    <h1 className="text-2xl font-bold mb-2">Story Cards Export</h1>
                    <div className="flex justify-between text-sm text-gray-600">
                        <span>Project: {projectName || 'Cerne Project'}</span>
                        <span>Date: {printDate}</span>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                        Total Stories: {stories.length}
                    </p>
                </div>

                {/* Stories Grid - 2 columns for print optimization */}
                <div className="grid grid-cols-2 gap-6">
                    {stories.map((story) => (
                        <div
                            key={story.id}
                            className="border border-gray-300 rounded-lg p-6 break-inside-avoid page-break-inside-avoid flex flex-col h-full bg-white shadow-none"
                        >
                            {/* Card Header */}
                            <div className="mb-3 pb-2 border-b border-gray-100">
                                <h3 className="font-bold text-lg leading-tight mb-2">{story.title}</h3>
                                <div className="flex justify-end">
                                    <div className="text-xs font-semibold text-gray-500 bg-gray-50 px-2 py-1 rounded">
                                        {story.feeling}
                                    </div>
                                </div>
                            </div>

                            {/* Story Content */}
                            <div className="flex-grow mb-4">
                                <p className="text-sm leading-relaxed whitespace-pre-wrap font-serif">
                                    {cleanStoryText(story.text, story.title, story.additional_comments)}
                                </p>
                                
                                {/* Additional Comments ("Anything else") */}
                                {story.additional_comments && (
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap font-serif mt-3">
                                        {story.additional_comments}
                                    </p>
                                )}
                            </div>

                            {/* Metadata Footer */}
                            <div className="mt-auto pt-3 border-t border-gray-200 space-y-3">

                                {/* Triangle Responses - Visualized (Full Width) */}
                                {story.triangleResponses && story.triangleResponses.length > 0 && (
                                    <div className="flex flex-row justify-between items-center w-full min-h-[44px]">
                                        {story.triangleResponses
                                            .map((triangle) => {
                                                // Triangle visualization - slightly larger now that we have space
                                                const width = 60;
                                                const height = 52;
                                                const padding = 4;
                                                const baseWidth = width - (padding * 2);

                                                const topVertex = { x: width / 2, y: padding };
                                                const bottomLeftVertex = { x: padding, y: height - padding };
                                                const bottomRightVertex = { x: width - padding, y: height - padding };

                                                // Calculate point position
                                                const x = triangle.x_position || 0;
                                                const y = triangle.y_position || 0;

                                                // Mapping logic 
                                                const svgX = padding + (x / 100) * baseWidth;
                                                const usableHeight = height - (padding * 2);
                                                const svgY = padding + (y / 100) * usableHeight;

                                                return (
                                                    <div key={triangle.id} className="flex flex-col items-center flex-1">
                                                        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
                                                            {/* Triangle Frame */}
                                                            <polygon
                                                                points={`${topVertex.x},${topVertex.y} ${bottomLeftVertex.x},${bottomLeftVertex.y} ${bottomRightVertex.x},${bottomRightVertex.y}`}
                                                                fill="transparent"
                                                                stroke="#374151" // gray-700
                                                                strokeWidth="1"
                                                            />
                                                            {/* Point - Only show if answered */}
                                                            {triangle.response_type !== "skipped" && triangle.x_position !== null && triangle.y_position !== null && (
                                                                <circle
                                                                    cx={svgX}
                                                                    cy={svgY}
                                                                    r="2"
                                                                    fill="#000"
                                                                />
                                                            )}
                                                        </svg>
                                                        {/* "Skipped" text for skipped responses */}
                                                        {triangle.response_type === "skipped" && (
                                                            <div className="text-[8px] text-gray-400 italic mt-0.5">Skipped</div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                    </div>
                                )}

                                {/* Slider Responses - Compact & Minimal */}
                                {story.sliderResponses && story.sliderResponses.length > 0 && (
                                    <div className="flex flex-wrap gap-y-1 gap-x-3 mt-1 pt-1 border-t border-gray-50 border-dashed">
                                        {story.sliderResponses
                                            .map((slider) => (
                                                <div key={slider.id} className="flex items-center" title={`${slider.left_label} - ${slider.right_label}`}>
                                                    <div className="w-16 h-1 bg-gray-200 rounded-full relative">
                                                        <div
                                                            className="absolute top-0 bottom-0 bg-gray-800 rounded-full w-1.5 h-1.5 -mt-0.5 transform -translate-x-1/2"
                                                            style={{ left: `${slider.value}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                )}

                                {/* Participant Responses - Added for consistency */}
                                {story.participantResponses && story.participantResponses.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-gray-100">
                                        {story.participantResponses.map((response) => {
                                            let respStr = response.response === null || response.response === undefined 
                                                ? '' 
                                                : Array.isArray(response.response) 
                                                    ? response.response.join(', ') 
                                                    : String(response.response);
                                            if (respStr.startsWith('[') && respStr.endsWith(']')) {
                                                try {
                                                    const parsed = JSON.parse(respStr);
                                                    if (Array.isArray(parsed)) respStr = parsed.join(', ');
                                                } catch {
                                                    // fallback
                                                }
                                            }
                                            const isSkipped = respStr.trim() === '';
                                            return (
                                                <div key={response.id} className="text-[9px] text-gray-700 bg-gray-50 px-2 py-1 rounded border border-gray-100 max-w-full">
                                                    <span className="font-bold mr-1">{response.question_text}:</span>
                                                    <span className={isSkipped ? "italic text-gray-400" : ""}>
                                                        {!isSkipped ? respStr : "Skipped"}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Author Info (Optional) */}
                                {story.name && (
                                    <div className="text-xs pt-1 mt-1 border-t border-gray-100 text-gray-500">
                                        <span className="font-medium">Author:</span> {story.name}
                                    </div>
                                )}

                            </div>
                        </div>
                    ))}
                </div>

                {/* Print Footer */}
                <div className="mt-8 pt-4 border-t text-center text-xs text-gray-400">
                    Exported from Cerne OSS
                </div>

                {/* CSS for Print specifically */}
                <style>{`
          @media print {
            @page {
              size: auto;
              margin: 20mm;
            }
            body {
              background: white;
              -webkit-print-color-adjust: exact !important; 
              print-color-adjust: exact !important;
            }
            .print-container {
              width: 100%;
              background: white;
            }
          }
        `}</style>
            </div>
        );
    }
);

PrintableStoryCards.displayName = "PrintableStoryCards";

export default PrintableStoryCards;
