import { Story } from "@/types/story";
import { ParticipantQuestion } from "@/services/types/designTypes";
import { getBaseLabel } from "@/utils/participantFilterUtils";

export interface SliderQuestion {
  id: number | string;
  question_text: string;
  left_label?: string;
  right_label?: string;
  responses: number[];
  average: number;
  stories?: { id: string; feeling: string; value: number }[];
}

export interface HistogramBin {
  label: string;
  count: number;
  range: [number, number];
  positive: number;
  negative: number;
  neutral: number;
}

/**
 * Creates empty histogram bins (0-10, 11-20, etc.)
 */
export function createHistogramBins(): HistogramBin[] {
  return Array(10).fill(0).map((_, i) => ({
    label: `${i * 10 + 1}-${(i + 1) * 10}`,
    count: 0,
    range: [i * 10 + 1, (i + 1) * 10] as [number, number],
    positive: 0,
    negative: 0,
    neutral: 0
  }));
}

/**
 * Checks if a story passes the applied filters
 * Updated to take a Story object directly for performance
 */
function storyPassesFilters(
  story: Story | undefined,
  filters: Record<string, Set<string>>,
  formParticipantQuestions?: ParticipantQuestion[]
): boolean {
  // If story is not found but filters are active, it fails validation
  if (!story) {
    return false;
  }

  // Check if this story passes all active filters
  const filterEntries = Object.entries(filters);
  const filterLen = filterEntries.length;
  
  for (let i = 0; i < filterLen; i++) {
    const filterId = filterEntries[i][0];
    const selectedChoices = filterEntries[i][1];
    
    if (selectedChoices.size === 0) continue; // Skip if no choices selected for this filter

    // Optimization: Standard for loops over arrays are faster than .find in heavy iteration paths
    let matchFound = false;
    const participantResponses = story.participantResponses;
    
    if (participantResponses) {
      const len = participantResponses.length;
      for (let j = 0; j < len; j++) {
        const response = participantResponses[j];
        if (response.question_id === filterId) {
          if (selectedChoices.has(getBaseLabel(response.question_id, response.response, formParticipantQuestions))) {
            matchFound = true;
          }
          break; // Found the question, stop looking
        }
      }
    }

    if (!matchFound) {
      // This story doesn't match a filter criteria
      return false;
    }
  }

  return true;
}

/**
 * Determines if there are any active filters applied
 */
function hasActiveFilters(filters: Record<string, Set<string>>): boolean {
  return Object.values(filters).some(set => set.size > 0);
}

/**
 * Updates the bin counters based on story data and its sentiment
 */
function updateBinCounters(
  bins: HistogramBin[],
  value: number,
  sentiment: "positive" | "negative" | "neutral"
): void {
  const binIndex = Math.min(Math.floor(value / 10), 9);
  bins[binIndex].count++;

  if (sentiment === "positive") {
    bins[binIndex].positive++;
  } else if (sentiment === "negative") {
    bins[binIndex].negative++;
  } else {
    bins[binIndex].neutral++;
  }
}

/**
 * Prepares histogram data for the selected question
 * Optimized to use cached emotion data and minimize processing
 */
export function prepareHistogramData(
  question: SliderQuestion,
  processedStories: Record<string, "positive" | "negative" | "neutral">,
  filters: Record<string, Set<string>> = {},
  stories: Story[] = [],
  formParticipantQuestions?: ParticipantQuestion[]
): HistogramBin[] {
  // Create empty bins for the histogram
  const bins = createHistogramBins();

  // Check if we need to apply filters
  const shouldFilter = hasActiveFilters(filters);

  // OPTIMIZATION: Create a map for O(1) lookup if filtering is needed.
  // This avoids O(N) search inside the loop, reducing complexity from O(N * M) to O(N + M).
  const storyMap = shouldFilter ? new Map(stories.map(s => [String(s.id), s])) : null;

  // Process each story response
  question.stories?.forEach((storyData) => {
    if (typeof storyData.value !== 'number') {
      return;
    }

    // Check if story passes filters
    if (shouldFilter) {
      // Use the map for O(1) lookup
      const story = storyMap!.get(String(storyData.id));

      if (!storyPassesFilters(story, filters, formParticipantQuestions)) {
        return;
      }
    }

    // Use the pre-processed sentiment if available, default to neutral
    const sentiment = processedStories[storyData.id] || "neutral";

    // Update bin counters based on story data
    updateBinCounters(bins, storyData.value, sentiment);
  });

  return bins;
}
