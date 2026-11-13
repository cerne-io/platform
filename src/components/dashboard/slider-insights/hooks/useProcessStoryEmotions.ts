
import { useState, useEffect, useRef, useCallback } from "react";
import { Story } from "@/types/story";
import { sentimentService } from "@/services/sentimentService";
import { determineEmotionLocally, isValidSentiment } from "@/utils/sentiment/emotionClassifier";
import { debugLog } from "@/utils/debugLogger";

/**
 * Custom hook to process story emotions for sentiment analysis with efficient batching and caching
 */
export function useProcessStoryEmotions(stories: Story[], colorByEmotions: boolean, projectId?: string, isPublic: boolean = false) {
  const [processedStories, setProcessedStories] = useState<Record<string, "positive" | "negative" | "neutral">>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingComplete, setProcessingComplete] = useState(false);
  const processedStoriesRef = useRef<Set<string>>(new Set());
  const processingInProgressRef = useRef(false);
  const processingQueueRef = useRef<string[]>([]);
  const batchSizeRef = useRef(20); // Increased batch size for parallel processing
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Determines if emotion processing should run
   */
  const shouldProcessEmotions = (colorByEmotions: boolean): boolean => {
    return colorByEmotions;
  };

  /**
   * Processes the next batch of stories from the queue
   */
  const processNextBatch = useCallback(async () => {
    // Skip if already processing, queue is empty, or component unmounted
    if (!isMountedRef.current || processingInProgressRef.current || processingQueueRef.current.length === 0) {
      if (isMountedRef.current && processingQueueRef.current.length === 0) {
        // Queue is empty - all processing is complete
        setIsProcessing(false);
        setProcessingComplete(true);
      }
      return;
    }

    // Set flag to prevent concurrent processing
    processingInProgressRef.current = true;
    setIsProcessing(true);

    const currentBatch = getNextBatch(processingQueueRef, batchSizeRef.current);
    debugLog(`Processing emotions batch of ${currentBatch.length} stories`);

    // Process the current batch
    const batchEmotions = await processBatch(currentBatch, stories, projectId);

    // Bail out if unmounted during await
    if (!isMountedRef.current) return;

    // Update the processed stories state (only if there are new emotions to add)
    if (Object.keys(batchEmotions).length > 0) {
      setProcessedStories(prev => ({
        ...prev,
        ...batchEmotions
      }));
    }

    // Clear processing flag
    processingInProgressRef.current = false;

    // If there are more stories to process, schedule the next batch
    if (processingQueueRef.current.length > 0) {
      setTimeout(() => {
        if (isMountedRef.current) {
          void processNextBatch();
        }
      }, 10);
    } else {
      // No more stories to process
      setIsProcessing(false);
      setProcessingComplete(true);
    }
  }, [stories, projectId]);

  // Process stories' feelings for sentiment analysis - optimized with batching
  useEffect(() => {
    if (!shouldProcessEmotions(colorByEmotions)) {
      setIsProcessing(false);
      return;
    }

    // Sync already-resolved sentiments (from DB / PublicDashboard enrichment / local classifier) immediately
    const resolved: Record<string, "positive" | "negative" | "neutral"> = {};
    for (const story of stories) {
      const id = String(story.id);
      if (isValidSentiment(story.feelingSentiment)) {
        resolved[id] = story.feelingSentiment;
        processedStoriesRef.current.add(id);
      } else if (story.feeling && story.feeling !== "unspecified") {
        const local = determineEmotionLocally(story.feeling);
        if (local !== "unknown") {
          resolved[id] = local;
        }
      }
    }
    if (Object.keys(resolved).length > 0) {
      setProcessedStories(prev => ({ ...prev, ...resolved }));
    }

    // Public dashboards enrich stories via PublicDashboard with dashboardToken; never call unauthenticated /api/ai/sentiment here
    if (isPublic) {
      setIsProcessing(false);
      setProcessingComplete(true);
      return;
    }

    setProcessingComplete(false);
    initializeProcessingQueue(stories, processedStoriesRef, processingQueueRef);

    if (processingQueueRef.current.length > 0) {
      setIsProcessing(true);
      void processNextBatch();
    } else {
      setProcessingComplete(true);
      setIsProcessing(false);
    }

    return () => {
      // Clean up - if component unmounts during processing
      processingInProgressRef.current = false;
    };
  }, [stories, colorByEmotions, isPublic, processNextBatch]);

  return {
    processedStories,
    isProcessing,
    processingComplete
  };
}

/**
 * Initializes the processing queue with unprocessed stories
 */
function initializeProcessingQueue(
  stories: Story[],
  processedStoriesRef: React.MutableRefObject<Set<string>>,
  processingQueueRef: React.MutableRefObject<string[]>
) {
  // Find stories that haven't been processed yet
  const unprocessedStoryIds = stories
    .filter(story => story.feeling && !processedStoriesRef.current.has(String(story.id)))
    .map(story => {
      // Mark this story as processed to avoid reprocessing
      const storyId = String(story.id);
      processedStoriesRef.current.add(storyId);
      return storyId;
    });

  // Add unprocessed stories to the queue
  if (unprocessedStoryIds.length > 0) {
    processingQueueRef.current = [...processingQueueRef.current, ...unprocessedStoryIds];
  }
}

/**
 * Gets the next batch of stories to process from the queue
 */
function getNextBatch(
  processingQueueRef: React.MutableRefObject<string[]>,
  batchSize: number
): string[] {
  const currentBatch = processingQueueRef.current.slice(0, batchSize);

  // Remove the current batch from the queue
  processingQueueRef.current = processingQueueRef.current.slice(batchSize);

  return currentBatch;
}

/**
 * Processes a batch of stories to determine their emotional sentiment
 * Now uses parallel processing for maximum speed
 */
async function processBatch(
  storyIds: string[],
  stories: Story[],
  projectId?: string
): Promise<Record<string, "positive" | "negative" | "neutral">> {
  // Collect all emotions from stories
  const emotionsMap = new Map<string, string>();

  // ⚡ Pre-compute O(1) lookup map to avoid O(N*M) nested iterations
  const storyMap = new Map(stories.map(s => [String(s.id), s]));

  storyIds.forEach(storyId => {
    const story = storyMap.get(storyId);
    if (story?.feeling) {
      emotionsMap.set(storyId, story.feeling);
    }
  });

  // Get all unique emotions
  const uniqueEmotions = Array.from(new Set(emotionsMap.values()));

  if (uniqueEmotions.length === 0) {
    return {};
  }

  // Process all emotions in ONE batch API call (with caching)
  const sentimentResults = await sentimentService.getBatchSentiments(uniqueEmotions, projectId);

  // Map results back to story IDs
  const storyEmotions: Record<string, "positive" | "negative" | "neutral"> = {};
  emotionsMap.forEach((emotion, storyId) => {
    storyEmotions[storyId] = sentimentResults.get(emotion) || "neutral";
  });

  return storyEmotions;
}
