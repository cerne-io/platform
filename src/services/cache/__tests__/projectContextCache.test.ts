
import { describe, test, expect, beforeEach, vi } from 'vitest';
import {
  generateContextCacheKey,
  getCachedProjectContext,
  setCachedProjectContext,
  clearProjectContextCache,
  getOrSetFormattedContextCache
} from '../projectContextCache';

// Mock sessionStorage
let mockStorage: Record<string, string> = {};
const sessionStorageMock = {
  getItem: (key: string): string | null => mockStorage[key] || null,
  setItem: (key: string, value: string): void => { mockStorage[key] = value; },
  removeItem: (key: string): void => { delete mockStorage[key]; },
  clear: (): void => { mockStorage = {}; },
  key: (): string => Object.keys(mockStorage)[0],
  length: 0
};
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

describe('ProjectContextCache', () => {
  beforeEach(() => {
    // Clear all mocks and cache data before each test
    mockStorage = {};

    // Clear any in-memory cache for formatted context
    clearProjectContextCache();
  });

  test('generateContextCacheKey should create a consistent cache key', () => {
    const projectId = 'project123';
    const cacheKey = generateContextCacheKey(projectId);

    expect(cacheKey).toBe('context_project123');
  });

  test('should set and get cached project context', () => {
    const projectId = 'project456';
    const contextData = { info: 'Project context info' };

    // Set context
    setCachedProjectContext(projectId, contextData);

    // Get context
    const retrievedData = getCachedProjectContext(projectId, null);

    expect(retrievedData).toEqual(contextData);
  });

  test('should use in-memory cache for string context data', () => {
    const projectId = 'project789';
    const formattedContext = 'This is a long formatted context string';

    // Set context
    setCachedProjectContext(projectId, formattedContext);

    // Get context
    const retrievedContext = getCachedProjectContext<string>(projectId, '');

    expect(retrievedContext).toBe(formattedContext);

    // Should not be stored in session storage
    expect(mockStorage[`context_${projectId}_data`]).toBeUndefined();
  });

  test('should clear project context from cache', () => {
    const projectId = 'projectClear';
    setCachedProjectContext(projectId, { data: 'to be cleared' });
    setCachedProjectContext('projectString', 'string to be cleared');

    // Clear specific project
    clearProjectContextCache(projectId);

    // projectClear should be gone
    expect(getCachedProjectContext(projectId, 'default')).toBe('default');

    // projectString should remain
    expect(getCachedProjectContext<string>('projectString', '')).toBe('string to be cleared');

    // Clear all projects
    clearProjectContextCache();

    // Now projectString should be gone too
    expect(getCachedProjectContext<string>('projectString', 'fallback')).toBe('fallback');
  });

  test('getOrSetFormattedContextCache should use cached data when available', async () => {
    const projectId = 'projectAsync';
    const formattedContext = 'Cached formatted context';

    // Set initial data
    setCachedProjectContext(projectId, formattedContext);

    // Builder function that should not be called if cache exists
    const builder = vi.fn().mockResolvedValue('New formatted context');

    // Should use cached value
    const result = await getOrSetFormattedContextCache(projectId, builder);

    expect(result).toBe(formattedContext);
    expect(builder).not.toHaveBeenCalled();
  });

  test('getOrSetFormattedContextCache should build data when not cached', async () => {
    const projectId = 'projectAsyncBuild';
    const newContext = 'Newly built context';

    // Builder function that should be called
    const builder = vi.fn().mockResolvedValue(newContext);

    // Should call builder and cache result
    const result = await getOrSetFormattedContextCache(projectId, builder);

    expect(result).toBe(newContext);
    expect(builder).toHaveBeenCalledTimes(1);

    // Subsequent call should use cached value
    const secondResult = await getOrSetFormattedContextCache(projectId, vi.fn().mockResolvedValue('Different value'));
    expect(secondResult).toBe(newContext);
  });
});
