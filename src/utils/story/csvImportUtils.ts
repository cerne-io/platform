import { debugWarn } from "@/utils/debugLogger";
import { generateUUID } from "@/utils/uuid";
const MAX_CSV_FILE_BYTES = 10 * 1024 * 1024;
const MAX_CSV_ROWS = 5_000;
const MAX_CSV_COLUMNS = 200;

// Parse CSV file for import
export const parseCSVFile = async (file: File): Promise<Record<string, unknown>[]> => {
  if (file.size > MAX_CSV_FILE_BYTES) {
    throw new Error(`CSV file exceeds maximum size of ${MAX_CSV_FILE_BYTES / (1024 * 1024)} MB`);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        if (!event.target || !event.target.result) {
          reject(new Error('File could not be read'));
          return;
        }

        const csvContent = event.target.result as string;
        const content = csvContent.replace(/^\uFEFF/, '');
        const parsedRows = parseCSVRows(content);

        if (parsedRows.length === 0) {
          reject(new Error('CSV file is empty'));
          return;
        }

        if (parsedRows.length - 1 > MAX_CSV_ROWS) {
          reject(new Error(`CSV exceeds maximum of ${MAX_CSV_ROWS} rows`));
          return;
        }

        const header = parsedRows[0].map(col => col.trim());
        if (header.length > MAX_CSV_COLUMNS) {
          reject(new Error(`CSV exceeds maximum of ${MAX_CSV_COLUMNS} columns`));
          return;
        }

        const requiredColumns = ['ID', 'Date', 'Story Title', 'Story Text', 'Emotional Response'];
        const missingColumns = requiredColumns.filter(col => !header.includes(col));

        if (missingColumns.length > 0) {
          reject(new Error(`CSV is missing required columns: ${missingColumns.join(', ')}`));
          return;
        }

        const rows = [];
        for (let i = 1; i < parsedRows.length; i++) {
          const row = parsedRows[i];
          if (row.length === 1 && row[0].trim() === '') continue;

          if (row.length !== header.length) {
            debugWarn(`Row ${i} has ${row.length} columns instead of ${header.length}, skipping`);
            continue;
          }

          const rowData: Record<string, unknown> = {};
          header.forEach((column, index) => {
            rowData[column] = row[index];
          });

          rows.push(rowData);
        }

        resolve(rows);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Error reading the file'));
    };

    reader.readAsText(file);
  });
};

// RFC-4180 CSV parser preserving newlines inside quoted fields
export const parseCSVRows = (content: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (char === '"') {
      if (inQuotes && i + 1 < content.length && content[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(current);
      current = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && i + 1 < content.length && content[i + 1] === '\n') {
        i++;
      }
      row.push(current);
      rows.push(row);
      row = [];
      current = '';
    } else {
      current += char;
    }
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  return rows;
};

// Standard columns to ignore when extracting participant responses
const STANDARD_COLUMNS_SET = new Set([
  'ID', 'Date', 'Story Title', 'Story Text', 'Emotional Response',
  'Slider 1', 'Slider 1 Question Text', 'Slider 1 Left Label', 'Slider 1 Right Label',
  'Slider 2', 'Slider 2 Question Text', 'Slider 2 Left Label', 'Slider 2 Right Label',
  'Slider 3', 'Slider 3 Question Text', 'Slider 3 Left Label', 'Slider 3 Right Label',
  'Triangle 1', 'Triangle 1 Top Label', 'Triangle 1 Bottom Left Label', 'Triangle 1 Bottom Right Label',
  'Triangle 1 X', 'Triangle 1 Y', 'Triangle 1 Top %', 'Triangle 1 Bottom Left %', 'Triangle 1 Bottom Right %',
  'Triangle 2', 'Triangle 2 Top Label', 'Triangle 2 Bottom Left Label', 'Triangle 2 Bottom Right Label',
  'Triangle 2 X', 'Triangle 2 Y', 'Triangle 2 Top %', 'Triangle 2 Bottom Left %', 'Triangle 2 Bottom Right %',
  'Triangle 3', 'Triangle 3 Top Label', 'Triangle 3 Bottom Left Label', 'Triangle 3 Bottom Right Label',
  'Triangle 3 X', 'Triangle 3 Y', 'Triangle 3 Top %', 'Triangle 3 Bottom Left %', 'Triangle 3 Bottom Right %',
  'Additional Comments'
]);

// Convert CSV data to story format for import
export const convertCSVToStories = (csvData: Record<string, unknown>[]): Record<string, unknown>[] => {
  return csvData.map(row => {
    // Extract slider values if present
    const sliderResponses = [];
    for (let i = 1; i <= 3; i++) {
      const sliderVal = row[`Slider ${i}`] as string;
      // Include the actual slider question text from column header if present
      const questionText = (row[`Slider ${i} Question Text`] as string) || `Slider Question ${i}`;
      const leftLabel = (row[`Slider ${i} Left Label`] as string) || '';
      const rightLabel = (row[`Slider ${i} Right Label`] as string) || '';

      if (sliderVal !== undefined && sliderVal !== '') {
        const parsedSlider = parseInt(sliderVal, 10);
        if (Number.isFinite(parsedSlider)) {
          sliderResponses.push({
            question_id: i,
            question_text: questionText,
            value: parsedSlider,
            response_type: 'answered',
            left_label: leftLabel,
            right_label: rightLabel
          });
        }
      }
    }

    // Extract triangle values if present
    const triangleResponses = [];
    for (let i = 1; i <= 3; i++) {
      const xVal = row[`Triangle ${i} X`] as string;
      const yVal = row[`Triangle ${i} Y`] as string;

      // Check if we have valid coordinates
      if (xVal !== undefined && xVal !== '' && yVal !== undefined && yVal !== '') {
        const parsedX = parseFloat(xVal);
        const parsedY = parseFloat(yVal);
        if (!Number.isFinite(parsedX) || !Number.isFinite(parsedY)) {
          continue;
        }
        const questionText = (row[`Triangle ${i}`] as string) || `Triangle Question ${i}`;
        const topLabel = (row[`Triangle ${i} Top Label`] as string) || '';
        const bottomLeftLabel = (row[`Triangle ${i} Bottom Left Label`] as string) || '';
        const bottomRightLabel = (row[`Triangle ${i} Bottom Right Label`] as string) || '';

        triangleResponses.push({
          question_id: i, // Using index as ID for now, similar to sliders
          question_text: questionText,
          x_position: parsedX,
          y_position: parsedY,
          response_type: 'answered',
          top_label: topLabel,
          bottom_left_label: bottomLeftLabel,
          bottom_right_label: bottomRightLabel
        });
      }
    }

    // Extract participant responses
    const participantResponses: { question_id: string; question_text: string; response: unknown }[] = [];
    Object.keys(row).forEach(key => {
      if (!STANDARD_COLUMNS_SET.has(key) && row[key] !== '') {
        participantResponses.push({
          question_id: key.replace(/\s+/g, '_').toLowerCase(),
          question_text: key,
          response: row[key]
        });
      }
    });

    return {
      // Use existing ID if it matches UUID format, otherwise generate a new one
      id: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row['ID'] as string)
        ? row['ID']
        : generateUUID(),
      title: row['Story Title'] || 'Untitled Story',
      text: row['Story Text'] || '',
      feeling: row['Emotional Response'] || 'unspecified',
      date: row['Date'] || new Date().toISOString(),
      additional_comments: row['Additional Comments'] || '',
      sliderResponses,
      triangleResponses,
      participantResponses
    };
  });
};

// Validate CSV file extension
export const isCSVFile = (file: File): boolean => {
  return file.name.toLowerCase().endsWith('.csv');
};
