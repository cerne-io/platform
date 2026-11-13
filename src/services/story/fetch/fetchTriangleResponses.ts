import { fetchPagedProjectResponses } from "./fetchPagedResponses";

export interface TriangleResponseRecord {
  id: string;
  story_id: string;
  question_id: number;
  question_text: string;
  x_position: number | null;
  y_position: number | null;
  response_type: string;
  top_label: string | null;
  bottom_left_label: string | null;
  bottom_right_label: string | null;
  created_at: string;
  tr_project_id: string | null;
}

export const fetchTriangleResponsesForProject = (
  projectId: string,
  storyIds?: string[]
): Promise<TriangleResponseRecord[]> =>
  fetchPagedProjectResponses<TriangleResponseRecord>(
    {
      table: 'triangle_responses',
      columns: 'id, story_id, question_id, question_text, x_position, y_position, response_type, top_label, bottom_left_label, bottom_right_label, created_at, tr_project_id',
      projectColumn: 'tr_project_id',
      label: 'triangle responses',
    },
    projectId,
    storyIds
  );
