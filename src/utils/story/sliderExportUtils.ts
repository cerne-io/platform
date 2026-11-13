import { Story, SliderResponse } from "@/types/story";
import { downloadCSV, formatCsvCell } from "./csvExportUtils";
import { debugError } from "@/utils/debugLogger";

export const exportSliderSummaryCSV = (
    stories: Story[],
    xAxisQuestionId: number | string,
    yAxisQuestionId: number | string,
    xAxisLabel: string,
    yAxisLabel: string
) => {
    let count = 0;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    let sumY2 = 0;

    // Calculate stats
    stories.forEach(story => {
        let xResp: SliderResponse | undefined;
        let yResp: SliderResponse | undefined;
        if (story.sliderResponses) {
            for (let i = 0; i < story.sliderResponses.length; i++) {
                const r = story.sliderResponses[i];
                if (String(r.question_id) === String(xAxisQuestionId)) xResp = r;
                else if (String(r.question_id) === String(yAxisQuestionId)) yResp = r;
                if (xResp && yResp) break;
            }
        }

        if (xResp && yResp) {
            const x = xResp.value ?? 0;
            const y = yResp.value ?? 0;
            count++;
            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumX2 += x * x;
            sumY2 += y * y;
        }
    });

    const avgX = count > 0 ? sumX / count : 0;
    const avgY = count > 0 ? sumY / count : 0;

    // Correlation
    let correlation = 0;
    if (count > 1) {
        const numerator = count * sumXY - sumX * sumY;
        const denominator = Math.sqrt((count * sumX2 - sumX * sumX) * (count * sumY2 - sumY * sumY));
        if (denominator !== 0) {
            correlation = numerator / denominator;
        }
    }

    const header = [
        "X-Axis Question ID",
        "X-Axis Label",
        "Y-Axis Question ID",
        "Y-Axis Label",
        "Total Responses",
        "Average X Value",
        "Average Y Value",
        "Correlation Coefficient"
    ];

    const row = [
        xAxisQuestionId,
        formatCsvCell(xAxisLabel, true),
        yAxisQuestionId,
        formatCsvCell(yAxisLabel, true),
        count,
        avgX.toFixed(2),
        avgY.toFixed(2),
        correlation.toFixed(4)
    ];

    const csvContent = [header.join(","), row.join(",")].join("\n");
    downloadCSV(csvContent, "slider_comparison_summary.csv");
};

export const exportSliderRawDataCSV = (
    stories: Story[],
    xAxisQuestionId: number | string,
    yAxisQuestionId: number | string,
    xAxisLabel: string,
    yAxisLabel: string
) => {
    const header = [
        "Story ID",
        "Date",
        "X-Axis Question ID",
        "X-Axis Label",
        "X Value",
        "Y-Axis Question ID",
        "Y-Axis Label",
        "Y Value"
    ];

    const rows: string[] = [];

    stories.forEach(story => {
        let xResp: SliderResponse | undefined;
        let yResp: SliderResponse | undefined;
        if (story.sliderResponses) {
            for (let i = 0; i < story.sliderResponses.length; i++) {
                const r = story.sliderResponses[i];
                if (String(r.question_id) === String(xAxisQuestionId)) xResp = r;
                else if (String(r.question_id) === String(yAxisQuestionId)) yResp = r;
                if (xResp && yResp) break;
            }
        }

        if (xResp && yResp) {
            rows.push([
                story.id,
                story.date ? new Date(story.date).toISOString().split('T')[0] : "",
                xAxisQuestionId,
                formatCsvCell(xAxisLabel, true),
                xResp.value,
                yAxisQuestionId,
                formatCsvCell(yAxisLabel, true),
                yResp.value
            ].join(","));
        }
    });

    const csvContent = [header.join(","), ...rows].join("\n");
    downloadCSV(csvContent, "slider_comparison_raw_data.csv");
};

export const exportSliderChartPNG = (element: HTMLElement | SVGSVGElement, fileName: string = "slider_comparison_chart.png") => {
    let svgElement: SVGSVGElement | null = null;

    if (element instanceof SVGSVGElement) {
        svgElement = element;
    } else {
        svgElement = element.querySelector("svg");
    }

    if (!svgElement) {
        debugError("No SVG element found for export");
        return;
    }

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
    const background = computedStyle.getPropertyValue('--background').trim();
    const chartNeutral = computedStyle.getPropertyValue('--chart-neutral').trim();
    const chartPositive = computedStyle.getPropertyValue('--chart-positive').trim();
    const chartNegative = computedStyle.getPropertyValue('--chart-negative').trim();

    // Inject a style block with these variables
    const styleBlock = `
        <style>
            :root {
                --foreground: ${foreground};
                --muted-foreground: ${mutedForeground};
                --primary: ${primary};
                --primary-foreground: ${primaryForeground};
                --border: ${border};
                --card: ${card};
                --background: ${background};
                --chart-neutral: ${chartNeutral};
                --chart-positive: ${chartPositive};
                --chart-negative: ${chartNegative};
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
    const width = parseInt(svgElement.getAttribute("width") || "0") || svgElement.getBoundingClientRect().width || 800;
    const height = parseInt(svgElement.getAttribute("height") || "0") || svgElement.getBoundingClientRect().height || 600;

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

export const exportSliderChartSVG = (element: HTMLElement | SVGSVGElement, fileName: string = "slider_comparison_chart.svg") => {
    let svgElement: SVGSVGElement | null = null;

    if (element instanceof SVGSVGElement) {
        svgElement = element;
    } else {
        svgElement = element.querySelector("svg");
    }

    if (!svgElement) {
        debugError("No SVG element found for export");
        return;
    }

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
    const background = computedStyle.getPropertyValue('--background').trim();
    const chartNeutral = computedStyle.getPropertyValue('--chart-neutral').trim();
    const chartPositive = computedStyle.getPropertyValue('--chart-positive').trim();
    const chartNegative = computedStyle.getPropertyValue('--chart-negative').trim();

    const styleBlock = `
        <style>
            :root {
                --foreground: ${foreground};
                --muted-foreground: ${mutedForeground};
                --primary: ${primary};
                --primary-foreground: ${primaryForeground};
                --border: ${border};
                --card: ${card};
                --background: ${background};
                --chart-neutral: ${chartNeutral};
                --chart-positive: ${chartPositive};
                --chart-negative: ${chartNegative};
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
