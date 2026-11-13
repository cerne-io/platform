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
import {
    exportTriangleSummaryCSV,
    exportTriangleRawDataCSV,
    exportTriangleChartPNG,
    exportTriangleChartSVG
} from "@/utils/story/triangleExportUtils";

interface TriangleExportMenuProps {
    stories: Story[];
    svgRef?: React.RefObject<SVGSVGElement>;
}

const TriangleExportMenu: React.FC<TriangleExportMenuProps> = ({ stories, svgRef }) => {
    const handleExportSummary = () => {
        exportTriangleSummaryCSV(stories);
    };

    const handleExportRawData = () => {
        exportTriangleRawDataCSV(stories);
    };

    const handleExportPNG = () => {
        if (svgRef && svgRef.current) {
            exportTriangleChartPNG(svgRef.current);
        }
    };

    const handleExportSVG = () => {
        if (svgRef && svgRef.current) {
            exportTriangleChartSVG(svgRef.current);
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
                <DropdownMenuItem onClick={handleExportSummary}>
                    Export Summary (CSV)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportRawData}>
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

export default TriangleExportMenu;
