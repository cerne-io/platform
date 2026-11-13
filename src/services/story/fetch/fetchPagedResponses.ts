import { supabase } from "@/integrations/supabase/client";
import { debugLog, debugError } from "@/utils/debugLogger";

const PAGE_SIZE = 1000;
const STORY_BATCH_SIZE = 100;

interface PagedFetchConfig {
  table: 'slider_responses' | 'triangle_responses' | 'participant_responses';
  columns: string;
  projectColumn: string;
  label: string;
}

async function fetchPage<T>(
  config: PagedFetchConfig,
  projectId: string,
  from: number,
  to: number,
  storyIdsBatch?: string[]
): Promise<T[]> {
  let query = supabase
    .from(config.table)
    .select(config.columns)
    .eq(config.projectColumn, projectId);

  if (storyIdsBatch && storyIdsBatch.length > 0) {
    query = query.in('story_id', storyIdsBatch);
  }

  const { data, error } = await query
    .order('id', { ascending: true })
    .range(from, to);

  if (error) {
    debugError(`STORY SERVICE - Error fetching ${config.label} page for project ${projectId}:`, error);
    throw error;
  }

  return (data || []) as T[];
}

async function fetchAllPages<T>(
  config: PagedFetchConfig,
  projectId: string,
  storyIdsBatch?: string[]
): Promise<T[]> {
  const allRows: T[] = [];
  let page = 0;

  while (true) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const data = await fetchPage<T>(config, projectId, from, to, storyIdsBatch);
    if (data.length === 0) break;

    allRows.push(...data);
    if (data.length < PAGE_SIZE) break;
    page++;
  }

  return allRows;
}

/**
 * Fetches all response rows for a project (optionally scoped to deduplicated storyIds in chunks of 100).
 */
export async function fetchPagedProjectResponses<T>(
  config: PagedFetchConfig,
  projectId: string,
  storyIds?: string[]
): Promise<T[]> {
  if (!projectId) {
    debugLog(`STORY SERVICE - No project ID provided for ${config.label}`);
    return [];
  }

  if (storyIds !== undefined && storyIds.length === 0) {
    debugLog(`STORY SERVICE - Empty storyIds array passed for project ID ${projectId}; returning empty responses`);
    return [];
  }

  try {
    if (storyIds && storyIds.length > 0) {
      const uniqueStoryIds = Array.from(new Set(storyIds));
      if (uniqueStoryIds.length === 0) return [];

      const chunks: string[][] = [];
      for (let i = 0; i < uniqueStoryIds.length; i += STORY_BATCH_SIZE) {
        chunks.push(uniqueStoryIds.slice(i, i + STORY_BATCH_SIZE));
      }

      const chunkResults = await Promise.all(
        chunks.map((chunk) => fetchAllPages<T>(config, projectId, chunk))
      );
      const allResponses = chunkResults.flat();
      debugLog(`STORY SERVICE - Fetched ${allResponses.length} ${config.label} for project ${projectId}`);
      return allResponses;
    }

    const allResponses = await fetchAllPages<T>(config, projectId);
    debugLog(`STORY SERVICE - Fetched ${allResponses.length} ${config.label} for project ${projectId}`);
    return allResponses;
  } catch (error) {
    debugError(`STORY SERVICE - Exception fetching ${config.label} for ${projectId}:`, error);
    throw error;
  }
}

