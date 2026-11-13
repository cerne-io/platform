import { describe, it, expect } from 'vitest';
import { convertStoriesToCSV } from '../story/csvExportUtils';
import { parseCSVRows, convertCSVToStories } from '../story/csvImportUtils';

describe('convertStoriesToCSV', () => {
  it('should convert stories to CSV format correctly', () => {
    const stories = [
      {
        id: 'story-1',
        date: '2026-05-18T13:00:00Z',
        title: 'Story 1',
        text: 'This is the first story text, it has a comma.',
        feeling: 'Happy',
        sliderResponses: [
          {
            question_id: 1,
            value: 80,
            left_label: 'Sad',
            right_label: 'Happy',
            question_text: 'How happy are you?'
          }
        ],
        triangleResponses: [
          {
            question_id: 1,
            question_text: 'Triangle 1',
            top_label: 'Top',
            bottom_left_label: 'Left',
            bottom_right_label: 'Right',
            x_position: 50,
            y_position: 50
          }
        ],
        participantResponses: [
          {
            question_id: 'q1',
            question_text: 'Gender',
            response: 'Female'
          }
        ],
        additional_comments: 'No comments'
      }
    ];

    const csv = convertStoriesToCSV(stories);
    expect(csv).toContain('ID,Date,Story Title,Story Text,Emotional Response');
    expect(csv).toContain('Gender');
    expect(csv).toContain('story-1');
    expect(csv).toContain('2026-05-18');
    expect(csv).toContain('"Story 1"');
    expect(csv).toContain('"This is the first story text, it has a comma."');
    expect(csv).toContain('Happy');
    expect(csv).toContain('80');
    expect(csv).toContain('"How happy are you?"');
    expect(csv).toContain('"Female"');
    expect(csv).toContain('"No comments"');
  });

  it('should handle stories with missing responses or elements', () => {
    const stories = [
      {
        id: 'story-2',
        date: '2026-05-18T13:00:00Z',
        title: null,
        text: '',
        feeling: '',
        sliderResponses: [],
        triangleResponses: [],
        participantResponses: [],
        additional_comments: ''
      }
    ];

    const csv = convertStoriesToCSV(stories);
    expect(csv).toContain('story-2');
  });

  it('round-trips multi-line stories, commas in participant headers, and neutralizes formulas', () => {
    const stories = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        date: '2026-05-18T13:00:00Z',
        title: '=HYPERLINK("http://evil.example","Click")',
        text: 'Line one\nLine two, with "quotes"',
        feeling: 'Hopeful, calm',
        sliderResponses: [{ question_id: 1, value: 42, left_label: 'L', right_label: 'R', question_text: 'Q1' }],
        triangleResponses: [{ question_id: 1, question_text: 'T1', top_label: 'T', bottom_left_label: 'BL', bottom_right_label: 'BR', x_position: 30, y_position: 70 }],
        participantResponses: [{ question_id: 'role', question_text: 'Role, Team', response: 'Design' }],
        additional_comments: 'Note line 1\nNote line 2',
      },
    ];

    const csv = convertStoriesToCSV(stories);
    expect(csv).toContain('"\'=HYPERLINK(""http://evil.example"",""Click"")"');
    expect(csv).toContain('"Role, Team"');

    const rows = parseCSVRows(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveLength(rows[1].length);

    const header = rows[0].map((c) => c.trim());
    const rowObj: Record<string, unknown> = {};
    header.forEach((col, idx) => {
      rowObj[col] = rows[1][idx];
    });
    const [imported] = convertCSVToStories([rowObj]) as Array<{
      text: string;
      additional_comments: string;
      triangleResponses: Array<{ response_type: string; x_position: number }>;
    }>;
    expect(imported.text).toBe('Line one\nLine two, with "quotes"');
    expect(imported.additional_comments).toBe('Note line 1\nNote line 2');
    expect(imported.triangleResponses[0].response_type).toBe('answered');
    expect(imported.triangleResponses[0].x_position).toBe(30);

    // Non-numeric slider/triangle cells are skipped instead of producing NaN
    const [badNums] = convertCSVToStories([
      {
        ID: 'not-a-uuid',
        Date: '2026-05-18',
        'Story Title': 'Bad nums',
        'Story Text': 'Body',
        'Emotional Response': 'Calm',
        'Slider 1': 'N/A',
        'Triangle 1 X': 'bad',
        'Triangle 1 Y': '50',
      },
    ]) as Array<{ sliderResponses: unknown[]; triangleResponses: unknown[] }>;
    expect(badNums.sliderResponses).toEqual([]);
    expect(badNums.triangleResponses).toEqual([]);
  });
});
