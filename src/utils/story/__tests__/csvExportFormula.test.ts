import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Story } from "@/types/story";
import * as csvExportUtils from "../csvExportUtils";
import { exportSliderSummaryCSV, exportSliderRawDataCSV } from "../sliderExportUtils";
import { exportTriangleSummaryCSV, exportTriangleRawDataCSV } from "../triangleExportUtils";

describe("CSV formula neutralization in slider and triangle exports", () => {
  let capturedCsv = "";

  beforeEach(() => {
    capturedCsv = "";
    vi.spyOn(csvExportUtils, "downloadCSV").mockImplementation((content: string) => {
      capturedCsv = content;
    });
  });

  const sampleStories: Story[] = [
    {
      id: "story-1",
      title: "T",
      text: "Body",
      date: "2026-01-01T00:00:00.000Z",
      feeling: "calm",
      sliderResponses: [
        { id: "sr-1", question_id: 1, question_text: "=1+1", value: 50, response_type: "answered" },
        { id: "sr-2", question_id: 2, question_text: "+cmd", value: 60, response_type: "answered" },
      ],
      triangleResponses: [
        {
          id: "tr-1",
          question_id: 10,
          question_text: "=HYPERLINK(\"http://x\",\"y\")",
          top_label: "@SUM(1,2)",
          bottom_left_label: "-2+3",
          bottom_right_label: "Safe",
          x_position: 50,
          y_position: 50,
          response_type: "answered",
        },
      ],
    },
  ];

  it("neutralizes formula prefixes in slider summary and raw CSV exports", () => {
    exportSliderSummaryCSV(sampleStories, 1, 2, "=1+1", "+cmd");
    expect(capturedCsv).toContain("\"'=1+1\"");
    expect(capturedCsv).toContain("\"'+cmd\"");

    exportSliderRawDataCSV(sampleStories, 1, 2, "=1+1", "-evil");
    expect(capturedCsv).toContain("\"'=1+1\"");
    expect(capturedCsv).toContain("\"'-evil\"");
  });

  it("neutralizes formula prefixes in triangle summary and raw CSV exports", () => {
    exportTriangleSummaryCSV(sampleStories);
    expect(capturedCsv).toContain("\"'=HYPERLINK");
    expect(capturedCsv).toContain("\"'@SUM(1,2)\"");
    expect(capturedCsv).toContain("\"'-2+3\"");

    exportTriangleRawDataCSV(sampleStories);
    expect(capturedCsv).toContain("\"'=HYPERLINK");
    expect(capturedCsv).toContain("\"'@SUM(1,2)\"");
    expect(capturedCsv).toContain("\"'-2+3\"");
  });

  it("rejects oversized CSV import files before reading", async () => {
    const { parseCSVFile } = await import("../csvImportUtils");
    const bigFile = new File(["x"], "big.csv", { type: "text/csv" });
    Object.defineProperty(bigFile, "size", { value: 11 * 1024 * 1024 });
    await expect(parseCSVFile(bigFile)).rejects.toThrow(/maximum size/i);
  });
});
