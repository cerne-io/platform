import React from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { Story } from "@/types/story";
import { exportSliderSummaryCSV, exportSliderRawDataCSV, exportSliderChartPNG, exportSliderChartSVG } from "@/utils/story/sliderExportUtils";

interface SliderExportMenuProps {
    stories: Story[];
    xAxisQuestionId: number | string;
    yAxisQuestionId: number | string;
    xAxisLabel: string;
    yAxisLabel: string;
    svgRef?: React.RefObject<SVGSVGElement>;
}

const SliderExportMenu: React.FC<SliderExportMenuProps> = ({
    stories,
    xAxisQuestionId,
    yAxisQuestionId,
    xAxisLabel,
    yAxisLabel,
    svgRef
}) => {
    const handleExportSummaryCSV = () => {
        exportSliderSummaryCSV(stories, xAxisQuestionId, yAxisQuestionId, xAxisLabel, yAxisLabel);
    };

    const handleExportRawDataCSV = () => {
        exportSliderRawDataCSV(stories, xAxisQuestionId, yAxisQuestionId, xAxisLabel, yAxisLabel);
    };

    const handleExportPNG = () => {
        if (svgRef?.current) {
            exportSliderChartPNG(svgRef.current);
        }
    };

    const handleExportSVG = () => {
        if (svgRef?.current) {
            exportSliderChartSVG(svgRef.current);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="ml-auto">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportSummaryCSV}>
                    Export Summary (CSV)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportRawDataCSV}>
                    Export Raw Data (CSV)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPNG} disabled={!svgRef?.current}>
                    Export Chart (PNG)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportSVG} disabled={!svgRef?.current}>
                    Export Chart (SVG)
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default SliderExportMenu;
