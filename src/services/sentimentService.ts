import { postAiEndpoint } from "@/lib/localClient";
import { determineEmotionLocally, isValidSentiment, Sentiment } from "@/utils/sentiment/emotionClassifier";
import { debugLog, debugError } from "@/utils/debugLogger";
import { getNonSecretShareId } from "@/hooks/queries/useSentimentEnrichmentQuery";

export type { Sentiment };

export interface BatchSentimentOptions {
  projectId?: string;
  accessScope?: 'authenticated' | 'public';
  scopeIdentity?: string;
  dashboardToken?: string;
  signal?: AbortSignal;
}

/**
 * Service for sentiment analysis with multi-level caching
 */
class SentimentService {
  private readonly memoryCache = new Map<string, Sentiment>();

  private buildCacheKey(
    accessScope: string,
    scopeIdentity: string,
    projectId: string | undefined,
    emotion: string
  ): string {
    return `${accessScope}:${scopeIdentity}:${projectId || 'none'}:${emotion}`;
  }

  /**
   * Get sentiment for a single emotion (with caching)
   */
  async getSentiment(
    emotion: string,
    projectId?: string,
    dashboardToken?: string,
    signal?: AbortSignal
  ): Promise<Sentiment | undefined> {
    // 1. Check local keyword matching first (provisional fallback)
    const localSentiment = determineEmotionLocally(emotion);
    if (localSentiment !== "unknown") {
      return localSentiment;
    }

    const accessScope = dashboardToken ? 'public' : 'authenticated';
    const scopeIdentity = dashboardToken ? getNonSecretShareId(dashboardToken) : 'default';
    const cacheKey = this.buildCacheKey(accessScope, scopeIdentity, projectId, emotion);

    // 2. Check in-memory cache
    if (this.memoryCache.has(cacheKey)) {
      return this.memoryCache.get(cacheKey)!;
    }

    // 3. Call API as last resort (use batch for efficiency)
    const results = await this.getBatchSentiments([emotion], {
      projectId,
      dashboardToken,
      signal,
      accessScope,
      scopeIdentity,
    });
    return results.get(emotion);
  }

  /**
   * Get sentiments for multiple emotions in batch (most efficient)
   */
  async getBatchSentiments(
    emotions: string[],
    options?: BatchSentimentOptions | string,
    dashboardToken?: string,
    signal?: AbortSignal
  ): Promise<Map<string, Sentiment>> {
    if (emotions.length === 0) {
      return new Map();
    }

    let opts: BatchSentimentOptions;
    if (typeof options === 'string') {
      opts = { projectId: options, dashboardToken, signal };
    } else {
      opts = options || {};
    }

    const { signal: reqSignal } = opts;
    if (reqSignal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const accessScope = opts.accessScope || (opts.dashboardToken ? 'public' : 'authenticated');
    const scopeIdentity = opts.scopeIdentity || (opts.dashboardToken ? getNonSecretShareId(opts.dashboardToken) : 'default');

    const results = new Map<string, Sentiment>();
    const needsAPI: string[] = [];

    // Process all emotions
    for (const emotion of emotions) {
      const cacheKey = this.buildCacheKey(accessScope, scopeIdentity, opts.projectId, emotion);
      if (this.memoryCache.has(cacheKey)) {
        results.set(emotion, this.memoryCache.get(cacheKey)!);
        continue;
      }

      needsAPI.push(emotion);
    }

    // Call API for any remaining emotions
    if (needsAPI.length > 0) {
      debugLog(`SENTIMENT - Calling API for ${needsAPI.length} uncached emotions`);

      // Chunk request to adhere to the 50-item limit per edge function call
      const MAX_BATCH_SIZE = 50;
      for (let i = 0; i < needsAPI.length; i += MAX_BATCH_SIZE) {
        if (reqSignal?.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }

        const chunk = needsAPI.slice(i, i + MAX_BATCH_SIZE);
        const apiResults = await this.callBatchSentimentAPI(chunk, opts);
        apiResults.forEach((sentiment, emotion) => {
          results.set(emotion, sentiment);
          const cacheKey = this.buildCacheKey(accessScope, scopeIdentity, opts.projectId, emotion);
          this.memoryCache.set(cacheKey, sentiment);
        });
      }
    }

    return results;
  }

  /**
   * Call the batch sentiment API
   */
  private async callBatchSentimentAPI(
    emotions: string[],
    opts: BatchSentimentOptions
  ): Promise<Map<string, Sentiment>> {
    if (opts.signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const { data, error } = await postAiEndpoint(
      "/api/ai/sentiment",
      {
        emotions,
        projectId: opts.projectId,
        dashboardToken: opts.dashboardToken,
      },
      {
        signal: opts.signal,
        skipUnauthorizedLock: Boolean(opts.dashboardToken),
      }
    );

    if (error) {
      debugError('SENTIMENT ERROR - Batch API call failed:', error);
      throw error instanceof Error
        ? error
        : new Error(typeof error === 'string' ? error : (error as { message?: string })?.message || 'Batch sentiment analysis failed');
    }

    const results = new Map<string, Sentiment>();
    if (Array.isArray(data?.results)) {
      data.results.forEach((r: { emotion: string; sentiment: unknown }) => {
        if (r && typeof r.emotion === 'string' && isValidSentiment(r.sentiment)) {
          results.set(r.emotion, r.sentiment);
        }
      });
    }

    debugLog(`SENTIMENT - API returned ${results.size} classifications`);
    return results;
  }

  /**
   * Clear in-memory cache (either entirely or for a specific scope)
   */
  clearMemoryCache(scopeIdentity?: string) {
    if (!scopeIdentity) {
      this.memoryCache.clear();
      return;
    }
    for (const key of Array.from(this.memoryCache.keys())) {
      if (key.includes(`:${scopeIdentity}:`)) {
        this.memoryCache.delete(key);
      }
    }
  }
}

// Export singleton instance
export const sentimentService = new SentimentService();
