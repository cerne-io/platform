import { Story } from "@/types/story";
import { downloadCSV, formatCsvCell } from "./csvExportUtils";

// Helper to calculate barycentric coordinates (reused logic)
const calculateBarycentric = (x: number, y: number) => {
    const topPct = 100 * (1 - y / 100);
    const bottomLeftPct = 100 * (y / 200 - x / 100 + 0.5);
    const bottomRightPct = 100 * (x / 100 - 0.5 + y / 200);

    return {
        top: Math.max(0, Math.round(topPct)),
        bottomLeft: Math.max(0, Math.round(bottomLeftPct)),
        bottomRight: Math.max(0, Math.round(bottomRightPct))
    };
};

export const exportTriangleSummaryCSV = (stories: Story[]) => {
    // Group by question
    const questionMap = new Map<string, {
        text: string;
        topLabel: string;
        bottomLeftLabel: string;
        bottomRightLabel: string;
        count: number;
        sumTop: number;
        sumBottomLeft: number;
        sumBottomRight: number;
    }>();

    stories.forEach(story => {
        if (story.triangleResponses) {
            story.triangleResponses.forEach(resp => {
                const key = String(resp.question_id);
                if (!questionMap.has(key)) {
                    questionMap.set(key, {
                        text: resp.question_text || "Unknown Question",
                        topLabel: resp.top_label || "Top",
                        bottomLeftLabel: resp.bottom_left_label || "Bottom Left",
                        bottomRightLabel: resp.bottom_right_label || "Bottom Right",
                        count: 0,
                        sumTop: 0,
                        sumBottomLeft: 0,
                        sumBottomRight: 0
                    });
                }

                const stats = questionMap.get(key)!;
                if (resp.x_position !== null && resp.y_position !== null) {
                    const bary = calculateBarycentric(resp.x_position, resp.y_position);
                    stats.count++;
                    stats.sumTop += bary.top;
                    stats.sumBottomLeft += bary.bottomLeft;
                    stats.sumBottomRight += bary.bottomRight;
                }
            });
        }
    });

    const header = [
        "Question ID",
        "Question Text",
        "Top Label",
        "Bottom Left Label",
        "Bottom Right Label",
        "Response Count",
        "Avg Top %",
        "Avg Bottom Left %",
        "Avg Bottom Right %"
    ];

    const rows = Array.from(questionMap.entries()).map(([id, stats]) => {
        return [
            id,
            formatCsvCell(stats.text, true),
            formatCsvCell(stats.topLabel, true),
            formatCsvCell(stats.bottomLeftLabel, true),
            formatCsvCell(stats.bottomRightLabel, true),
            stats.count,
            stats.count > 0 ? (stats.sumTop / stats.count).toFixed(2) : 0,
            stats.count > 0 ? (stats.sumBottomLeft / stats.count).toFixed(2) : 0,
            stats.count > 0 ? (stats.sumBottomRight / stats.count).toFixed(2) : 0
        ].join(",");
    });

    const csvContent = [header.join(","), ...rows].join("\n");
    downloadCSV(csvContent, "triangle_summary.csv");
};

export const exportTriangleRawDataCSV = (stories: Story[]) => {
    const header = [
        "Story ID",
        "Date",
        "Question ID",
        "Question Text",
        "Top Label",
        "Bottom Left Label",
        "Bottom Right Label",
        "X Position",
        "Y Position",
        "Top %",
        "Bottom Left %",
        "Bottom Right %"
    ];

    const rows: string[] = [];

    stories.forEach(story => {
        if (story.triangleResponses) {
            story.triangleResponses.forEach(resp => {
                let topPct = "", bottomLeftPct = "", bottomRightPct = "";
                if (resp.x_position !== null && resp.y_position !== null) {
                    const bary = calculateBarycentric(resp.x_position, resp.y_position);
                    topPct = bary.top.toString();
                    bottomLeftPct = bary.bottomLeft.toString();
                    bottomRightPct = bary.bottomRight.toString();
                }

                rows.push([
                    story.id,
                    story.date ? new Date(story.date).toISOString().split('T')[0] : "",
                    resp.question_id,
                    formatCsvCell(resp.question_text || "", true),
                    formatCsvCell(resp.top_label || "", true),
                    formatCsvCell(resp.bottom_left_label || "", true),
                    formatCsvCell(resp.bottom_right_label || "", true),
                    resp.x_position ?? "",
                    resp.y_position ?? "",
                    topPct,
                    bottomLeftPct,
                    bottomRightPct
                ].join(","));
            });
        }
    });

    const csvContent = [header.join(","), ...rows].join("\n");
    downloadCSV(csvContent, "triangle_raw_data.csv");
};

export const exportTriangleChartPNG = (svgElement: SVGSVGElement, fileName: string = "triangle_chart.png") => {
    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(svgElement);

    // Add namespace if missing
    if (!svgString.includes('xmlns="http://www.w3.org/2000/svg"')) {
        svgString = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    // Get computed styles for CSS variables used in the SVG
    const computedStyle = getComputedStyle(document.documentElement);
    const foreground = computedStyle.getPropertyValue('--foreground').trim();
    const mutedForeground = computedStyle.getPropertyValue('--muted-foreground').trim();
    const primary = computedStyle.getPropertyValue('--primary').trim();
    const primaryForeground = computedStyle.getPropertyValue('--primary-foreground').trim();
    const border = computedStyle.getPropertyValue('--border').trim();
    const card = computedStyle.getPropertyValue('--card').trim();

    // Inject a style block with these variables
    // We wrap them in :root so they are available globally within the SVG
    const styleBlock = `
        <style>
            :root {
                --foreground: ${foreground};
                --muted-foreground: ${mutedForeground};
                --primary: ${primary};
                --primary-foreground: ${primaryForeground};
                --border: ${border};
                --card: ${card};
            }
            text {
                font-family: sans-serif;
            }
        </style>
    `;

    // Insert style block after <svg ...> tag
    const svgTagEnd = svgString.indexOf('>') + 1;
    svgString = svgString.slice(0, svgTagEnd) + styleBlock + svgString.slice(svgTagEnd);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    // Get SVG dimensions
    const width = parseInt(svgElement.getAttribute("width") || "0") || svgElement.getBoundingClientRect().width || 600;
    const height = parseInt(svgElement.getAttribute("height") || "0") || svgElement.getBoundingClientRect().height || 520;

    canvas.width = width;
    canvas.height = height;

    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
        if (ctx) {
            // Fill white background
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0);

            const pngUrl = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.href = pngUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    };

    img.src = url;
};

export const exportTriangleChartSVG = (svgElement: SVGSVGElement, fileName: string = "triangle_chart.svg") => {
    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(svgElement);

    // Add namespace if missing
    if (!svgString.includes('xmlns="http://www.w3.org/2000/svg"')) {
        svgString = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    // Get computed styles for CSS variables
    const computedStyle = getComputedStyle(document.documentElement);
    const foreground = computedStyle.getPropertyValue('--foreground').trim();
    const mutedForeground = computedStyle.getPropertyValue('--muted-foreground').trim();
    const primary = computedStyle.getPropertyValue('--primary').trim();
    const primaryForeground = computedStyle.getPropertyValue('--primary-foreground').trim();
    const border = computedStyle.getPropertyValue('--border').trim();
    const card = computedStyle.getPropertyValue('--card').trim();

    const styleBlock = `
        <style>
            :root {
                --foreground: ${foreground};
                --muted-foreground: ${mutedForeground};
                --primary: ${primary};
                --primary-foreground: ${primaryForeground};
                --border: ${border};
                --card: ${card};
            }
            text {
                font-family: sans-serif;
            }
        </style>
    `;

    const svgTagEnd = svgString.indexOf('>') + 1;
    svgString = svgString.slice(0, svgTagEnd) + styleBlock + svgString.slice(svgTagEnd);

    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
