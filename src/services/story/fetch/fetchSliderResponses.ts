import { fetchPagedProjectResponses } from "./fetchPagedResponses";

export interface SliderResponseRecord {
  id: string;
  story_id: string;
  question_id: number;
  question_text: string;
  value: number | null;
  response_type: string;
  left_label: string | null;
  right_label: string | null;
  created_at: string;
  sr_project_id: string | null;
}

export const fetchSliderResponsesForProject = (
  projectId: string,
  storyIds?: string[]
): Promise<SliderResponseRecord[]> =>
  fetchPagedProjectResponses<SliderResponseRecord>(
    {
      table: 'slider_responses',
      columns: 'id, story_id, question_id, question_text, value, response_type, left_label, right_label, created_at, sr_project_id',
      projectColumn: 'sr_project_id',
      label: 'slider responses',
    },
    projectId,
    storyIds
  );
