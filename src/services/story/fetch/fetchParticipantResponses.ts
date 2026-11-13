import { fetchPagedProjectResponses } from "./fetchPagedResponses";

export interface ParticipantResponseRecord {
  id: string;
  story_id: string;
  question_id: string;
  question_text: string;
  response: string;
  created_at: string;
  pr_project_id: string | null;
}

export const fetchParticipantResponsesForProject = (
  projectId: string,
  storyIds?: string[]
): Promise<ParticipantResponseRecord[]> =>
  fetchPagedProjectResponses<ParticipantResponseRecord>(
    {
      table: 'participant_responses',
      columns: 'id, story_id, question_id, question_text, response, created_at, pr_project_id',
      projectColumn: 'pr_project_id',
      label: 'participant responses',
    },
    projectId,
    storyIds
  );
