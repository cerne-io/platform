
import { describe, test, expect, beforeEach } from 'vitest';
import {
  generateCacheKey,
  getCachedResponse,
  setCachedResponse,
  clearCachedResponse,
  clearAllCachedResponses,
  clearProjectCachedResponses,
  clearActivityCache
} from '../activityResponseCache';

// Mock sessionStorage for tests
let mockStorage: Record<string, string> = {};
const sessionStorageMock = {
  getItem: (key: string): string | null => mockStorage[key] || null,
  setItem: (key: string, value: string): void => { mockStorage[key] = value; },
  removeItem: (key: string): void => { delete mockStorage[key]; },
  clear: (): void => { mockStorage = {}; },
  key: (index: number): string | null => Object.keys(mockStorage)[index] || null,
  get length() { return Object.keys(mockStorage).length; }
};
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

describe('ActivityResponseCache', () => {
  beforeEach(() => {
    // Clear all mocks and cache data before each test
    mockStorage = {};
  });

  test('generateCacheKey should create a consistent cache key', () => {
    const projectId = 'project123';
    const phaseId = 'phase456';
    const stepId = 'step789';
    const activityId = 'activity101';

    const cacheKey = generateCacheKey(projectId, phaseId, stepId, activityId);

    expect(cacheKey).toBe('response_project123_phase456_step789_activity101');
  });

  test('should set and get cached response', () => {
    const projectId = 'test-project';
    const phaseId = 'test-phase';
    const stepId = 'test-step';
    const activityId = 'test-activity';
    const cacheKey = generateCacheKey(projectId, phaseId, stepId, activityId);
    const testData = { response: 'Test response data' };

    // Set cache with validation metadata
    setCachedResponse(cacheKey, testData, projectId, phaseId, stepId, activityId);

    // Get cache with project validation
    const retrievedData = getCachedResponse<typeof testData>(cacheKey, projectId);

    expect(retrievedData).toEqual(testData);
  });

  test('should get specific response key from cached object', () => {
    const projectId = 'test-project';
    const phaseId = 'test-phase';
    const stepId = 'test-step';
    const activityId = 'test-activity-specific';
    const cacheKey = generateCacheKey(projectId, phaseId, stepId, activityId);
    const testData = {
      field1: 'value1',
      field2: 'value2',
      nested: { subfield: 'subvalue' }
    };

    // Set cache with metadata
    setCachedResponse(cacheKey, testData, projectId, phaseId, stepId, activityId);

    // Get specific field with project validation
    const field1 = getCachedResponse<string>(cacheKey, projectId, 'field1');
    const nested = getCachedResponse<{ subfield: string }>(cacheKey, projectId, 'nested');

    expect(field1).toBe('value1');
    expect(nested).toEqual({ subfield: 'subvalue' });
  });

  test('should clear cached response', () => {
    const projectId = 'test-project';
    const phaseId = 'test-phase';
    const stepId = 'test-step';
    const activityId = 'test-activity-clear';
    const cacheKey = generateCacheKey(projectId, phaseId, stepId, activityId);

    setCachedResponse(cacheKey, 'to be cleared', projectId, phaseId, stepId, activityId);

    // Verify it exists
    expect(getCachedResponse(cacheKey, projectId)).toBe('to be cleared');

    // Clear it
    clearCachedResponse(cacheKey);

    // Verify it's gone
    expect(getCachedResponse(cacheKey, projectId)).toBeNull();
  });

  test('should clear all cached responses', () => {
    const project1 = 'project1';
    const project2 = 'project2';

    // Set multiple responses
    setCachedResponse(
      generateCacheKey(project1, 'phase1', 'step1', 'key1'),
      'data1',
      project1, 'phase1', 'step1', 'key1'
    );
    setCachedResponse(
      generateCacheKey(project2, 'phase1', 'step1', 'key2'),
      'data2',
      project2, 'phase1', 'step1', 'key2'
    );

    // Clear all activity responses
    clearAllCachedResponses();

    // Activity responses should be gone
    expect(getCachedResponse(generateCacheKey(project1, 'phase1', 'step1', 'key1'), project1)).toBeNull();
    expect(getCachedResponse(generateCacheKey(project2, 'phase1', 'step1', 'key2'), project2)).toBeNull();
  });

  test('should clear project-specific responses', () => {
    const project1 = 'project1';
    const project2 = 'project2';

    // Set responses for different projects
    setCachedResponse(
      generateCacheKey(project1, 'phase1', 'step1', 'act1'),
      'data1',
      project1, 'phase1', 'step1', 'act1'
    );
    setCachedResponse(
      generateCacheKey(project1, 'phase2', 'step1', 'act1'),
      'data2',
      project1, 'phase2', 'step1', 'act1'
    );
    setCachedResponse(
      generateCacheKey(project2, 'phase1', 'step1', 'act1'),
      'data3',
      project2, 'phase1', 'step1', 'act1'
    );

    // Clear only project1 responses
    clearProjectCachedResponses(project1);

    // Project1 responses should be gone
    expect(getCachedResponse(generateCacheKey(project1, 'phase1', 'step1', 'act1'), project1)).toBeNull();
    expect(getCachedResponse(generateCacheKey(project1, 'phase2', 'step1', 'act1'), project1)).toBeNull();

    // Project2 responses should remain
    expect(getCachedResponse(generateCacheKey(project2, 'phase1', 'step1', 'act1'), project2)).toBe('data3');
  });

  test('clearActivityCache should clear specific activity response', () => {
    // Set up test data
    const projectId = 'project123';
    const phaseId = 'phase456';
    const stepId = 'step789';
    const activityId = 'activity101';
    const otherActivityId = 'otherActivity';

    const cacheKey = generateCacheKey(projectId, phaseId, stepId, activityId);
    const otherCacheKey = generateCacheKey(projectId, phaseId, stepId, otherActivityId);

    setCachedResponse(cacheKey, 'activity data', projectId, phaseId, stepId, activityId);
    setCachedResponse(otherCacheKey, 'other data', projectId, phaseId, stepId, otherActivityId);

    // Clear the specific activity
    clearActivityCache(projectId, phaseId, stepId, activityId);

    // Verify it's cleared
    expect(getCachedResponse(cacheKey, projectId)).toBeNull();

    // Other activity should remain
    expect(getCachedResponse(otherCacheKey, projectId)).toBe('other data');
  });
});
