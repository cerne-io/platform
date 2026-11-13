
import { formatDateYYYYMMDD } from './formattingUtils';

const FORMULA_PREFIX_RE = /^[\t\r ]*[=+\-@]/;

function neutralizeFormula(value: string): string {
  return FORMULA_PREFIX_RE.test(value) ? `'${value}` : value;
}

export function formatCsvCell(value: unknown, alwaysQuote: boolean = false): string {
  if (value === null || value === undefined) return '';
  const safe = neutralizeFormula(String(value));
  if (alwaysQuote || safe.includes('"') || safe.includes(',') || safe.includes('\n') || safe.includes('\r')) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

// Convert stories to CSV format
export const convertStoriesToCSV = (stories: Record<string, unknown>[]) => {
  // First, collect all unique participant question IDs across all stories
  const participantQuestionMap = new Map<string, string>();

  stories.forEach(story => {
    if (story.participantResponses && Array.isArray(story.participantResponses) && story.participantResponses.length > 0) {
      story.participantResponses.forEach((resp: unknown) => {
        const r = resp as { question_id: string; question_text: string };
        if (!participantQuestionMap.has(r.question_id)) {
          participantQuestionMap.set(r.question_id, r.question_text);
        }
      });
    }
  });

  // Convert to array of question IDs and texts
  const participantQuestions = Array.from(participantQuestionMap.entries()).map(([id, text]) => ({
    id,
    text
  }));

  // Define CSV header with participant question columns and slider labels
  const csvHeader = [
    'ID',
    'Date',
    'Story Title',
    'Story Text',
    'Emotional Response',
    'Slider 1',
    'Slider 1 Question Text',
    'Slider 1 Left Label',
    'Slider 1 Right Label',
    'Slider 2',
    'Slider 2 Question Text',
    'Slider 2 Left Label',
    'Slider 2 Right Label',
    'Slider 3',
    'Slider 3 Question Text',
    'Slider 3 Left Label',
    'Slider 3 Right Label',
    'Triangle 1',
    'Triangle 1 Top Label',
    'Triangle 1 Bottom Left Label',
    'Triangle 1 Bottom Right Label',
    'Triangle 1 X',
    'Triangle 1 Y',
    'Triangle 1 Top %',
    'Triangle 1 Bottom Left %',
    'Triangle 1 Bottom Right %',
    'Triangle 2',
    'Triangle 2 Top Label',
    'Triangle 2 Bottom Left Label',
    'Triangle 2 Bottom Right Label',
    'Triangle 2 X',
    'Triangle 2 Y',
    'Triangle 2 Top %',
    'Triangle 2 Bottom Left %',
    'Triangle 2 Bottom Right %',
    'Triangle 3',
    'Triangle 3 Top Label',
    'Triangle 3 Bottom Left Label',
    'Triangle 3 Bottom Right Label',
    'Triangle 3 X',
    'Triangle 3 Y',
    'Triangle 3 Top %',
    'Triangle 3 Bottom Left %',
    'Triangle 3 Bottom Right %'
  ];

  // Add participant question columns to header
  participantQuestions.forEach(question => {
    csvHeader.push(formatCsvCell(question.text));
  });

  // Add Additional Comments as the last column
  csvHeader.push('Additional Comments');

  // Helper to calculate barycentric coordinates
  const calculateBarycentric = (x: number, y: number) => {
    // Based on TrianglePicker geometry:
    // Top (A) = (50, 0)
    // Bottom Left (B) = (0, 100)
    // Bottom Right (C) = (100, 100)

    // Formulas derived from geometry:
    const topPct = 100 * (1 - y / 100);
    const bottomLeftPct = 100 * (y / 200 - x / 100 + 0.5);
    const bottomRightPct = 100 * (x / 100 - 0.5 + y / 200);

    return {
      top: Math.max(0, Math.round(topPct)),
      bottomLeft: Math.max(0, Math.round(bottomLeftPct)),
      bottomRight: Math.max(0, Math.round(bottomRightPct))
    };
  };

  // Format data rows
  const csvRows = stories.map(story => {
    // Extract slider values and labels
    const sliderValues = [null, null, null]; // Default empty values for 3 sliders
    const sliderLeftLabels = ["", "", ""];
    const sliderRightLabels = ["", "", ""];
    const sliderTexts = ["", "", ""];

    // If the story has slider responses, extract the first 3
    if (story.sliderResponses && Array.isArray(story.sliderResponses) && story.sliderResponses.length > 0) {
      // Sort slider responses by question_id to ensure consistent ordering
      const sortedResponses = [...story.sliderResponses].sort((a: unknown, b: unknown) => {
        const aVal = (a as Record<string, unknown>).question_id as number;
        const bVal = (b as Record<string, unknown>).question_id as number;
        return aVal - bVal;
      });

      // Get values and labels for up to 3 sliders
      for (let i = 0; i < Math.min(sortedResponses.length, 3); i++) {
        sliderValues[i] = sortedResponses[i].value;
        sliderLeftLabels[i] = sortedResponses[i].left_label || "";
        sliderRightLabels[i] = sortedResponses[i].right_label || "";
        sliderTexts[i] = sortedResponses[i].question_text || `Slider Question ${i + 1}`;
      }
    }

    // Extract triangle values and labels
    const triangleData = Array(3).fill(null).map(() => ({
      question: "",
      topLabel: "",
      bottomLeftLabel: "",
      bottomRightLabel: "",
      x: null as number | null,
      y: null as number | null,
      topPct: null as number | null,
      bottomLeftPct: null as number | null,
      bottomRightPct: null as number | null
    }));

    if (story.triangleResponses && Array.isArray(story.triangleResponses) && story.triangleResponses.length > 0) {
      const sortedTriangles = [...story.triangleResponses].sort((a: unknown, b: unknown) => {
        const aVal = (a as Record<string, unknown>).question_id as number;
        const bVal = (b as Record<string, unknown>).question_id as number;
        return aVal - bVal;
      });

      for (let i = 0; i < Math.min(sortedTriangles.length, 3); i++) {
        const t = sortedTriangles[i];
        triangleData[i].question = t.question_text || `Triangle Question ${i + 1}`;
        triangleData[i].topLabel = t.top_label || "";
        triangleData[i].bottomLeftLabel = t.bottom_left_label || "";
        triangleData[i].bottomRightLabel = t.bottom_right_label || "";
        triangleData[i].x = t.x_position;
        triangleData[i].y = t.y_position;

        if (t.x_position !== null && t.y_position !== null) {
          const barycentric = calculateBarycentric(t.x_position, t.y_position);
          triangleData[i].topPct = barycentric.top;
          triangleData[i].bottomLeftPct = barycentric.bottomLeft;
          triangleData[i].bottomRightPct = barycentric.bottomRight;
        }
      }
    }

    // Create a map of participant responses for this story
    const participantResponseMap = new Map<string, string>();
    if (story.participantResponses && Array.isArray(story.participantResponses) && story.participantResponses.length > 0) {
      story.participantResponses.forEach((resp: unknown) => {
        const r = resp as { question_id: string; response: string };
        participantResponseMap.set(r.question_id, r.response);
      });
    }

    // Start with the basic story data
    const rowData = [
      formatCsvCell(story.id),
      formatCsvCell(formatDateYYYYMMDD(story.date as string)),
      formatCsvCell((story.title as string) || '', true),
      formatCsvCell((story.text as string) || '', true),
      formatCsvCell((story.feeling as string) || '', Boolean(story.feeling)),
      sliderValues[0] !== null ? sliderValues[0] : '', // Slider 1
      formatCsvCell(sliderTexts[0], true), // Slider 1 Question Text
      formatCsvCell(sliderLeftLabels[0], true), // Slider 1 Left Label
      formatCsvCell(sliderRightLabels[0], true), // Slider 1 Right Label
      sliderValues[1] !== null ? sliderValues[1] : '', // Slider 2
      formatCsvCell(sliderTexts[1], true), // Slider 2 Question Text
      formatCsvCell(sliderLeftLabels[1], true), // Slider 2 Left Label
      formatCsvCell(sliderRightLabels[1], true), // Slider 2 Right Label
      sliderValues[2] !== null ? sliderValues[2] : '', // Slider 3
      formatCsvCell(sliderTexts[2], true), // Slider 3 Question Text
      formatCsvCell(sliderLeftLabels[2], true), // Slider 3 Left Label
      formatCsvCell(sliderRightLabels[2], true), // Slider 3 Right Label

      // Triangle 1
      formatCsvCell(triangleData[0].question, true),
      formatCsvCell(triangleData[0].topLabel, true),
      formatCsvCell(triangleData[0].bottomLeftLabel, true),
      formatCsvCell(triangleData[0].bottomRightLabel, true),
      triangleData[0].x !== null ? triangleData[0].x : '',
      triangleData[0].y !== null ? triangleData[0].y : '',
      triangleData[0].topPct !== null ? triangleData[0].topPct : '',
      triangleData[0].bottomLeftPct !== null ? triangleData[0].bottomLeftPct : '',
      triangleData[0].bottomRightPct !== null ? triangleData[0].bottomRightPct : '',

      // Triangle 2
      formatCsvCell(triangleData[1].question, true),
      formatCsvCell(triangleData[1].topLabel, true),
      formatCsvCell(triangleData[1].bottomLeftLabel, true),
      formatCsvCell(triangleData[1].bottomRightLabel, true),
      triangleData[1].x !== null ? triangleData[1].x : '',
      triangleData[1].y !== null ? triangleData[1].y : '',
      triangleData[1].topPct !== null ? triangleData[1].topPct : '',
      triangleData[1].bottomLeftPct !== null ? triangleData[1].bottomLeftPct : '',
      triangleData[1].bottomRightPct !== null ? triangleData[1].bottomRightPct : '',

      // Triangle 3
      formatCsvCell(triangleData[2].question, true),
      formatCsvCell(triangleData[2].topLabel, true),
      formatCsvCell(triangleData[2].bottomLeftLabel, true),
      formatCsvCell(triangleData[2].bottomRightLabel, true),
      triangleData[2].x !== null ? triangleData[2].x : '',
      triangleData[2].y !== null ? triangleData[2].y : '',
      triangleData[2].topPct !== null ? triangleData[2].topPct : '',
      triangleData[2].bottomLeftPct !== null ? triangleData[2].bottomLeftPct : '',
      triangleData[2].bottomRightPct !== null ? triangleData[2].bottomRightPct : '',
    ];

    // Add participant responses in the same order as the header
    participantQuestions.forEach(question => {
      const response = participantResponseMap.get(question.id) || '';
      rowData.push(formatCsvCell(response, true));
    });

    // Add additional comments at the end
    rowData.push(story.additional_comments ? formatCsvCell(story.additional_comments as string, true) : '');

    return rowData;
  });

  // Combine header and rows
  // Optimization: Replacing the spread operator `[csvHeader, ...csvRows]` 
  // with a standard for loop prevents 'Maximum call stack size exceeded' 
  // errors on huge CSV exports and avoids creating intermediate O(N) arrays.
  let result = csvHeader.join(',') + '\n';
  const rowsLen = csvRows.length;
  for (let i = 0; i < rowsLen; i++) {
    result += csvRows[i].join(',') + (i === rowsLen - 1 ? '' : '\n');
  }
  return result;
};

// Download CSV file
export const downloadCSV = (csvContent: string, fileName: string) => {
  // Add UTF-8 BOM to ensure Excel opens the file with the correct encoding
  const BOM = "\uFEFF";
  const csvContentWithBOM = BOM + csvContent;

  // Create blob with the CSV content
  const blob = new Blob([csvContentWithBOM], { type: 'text/csv;charset=utf-8;' });

  // Create object URL for the blob
  const url = URL.createObjectURL(blob);

  // Create download link
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';

  // Add link to document, click it, and remove it
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up by revoking the object URL
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 100);
};
