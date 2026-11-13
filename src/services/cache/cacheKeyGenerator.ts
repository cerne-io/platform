
/**
 * Centralized cache key generation utility
 */

const CACHE_VERSION = 'v1';

// Define allowed cache entity types as a const to ensure type safety
export const CACHE_ENTITIES = {
  FORM: 'form',
  PROJECT: 'project',
  CONTEXT: 'context',
  ACTIVITY: 'activity',
  RESPONSE: 'response',
  PATH: 'path'
} as const;

// Define allowed cache entity types
export type CacheEntity = typeof CACHE_ENTITIES[keyof typeof CACHE_ENTITIES];

interface CacheKeyOptions {
  entity: CacheEntity | string; // Allow both CacheEntity and string for backward compatibility
  id: string;
  subType?: string;
  version?: string;
}

/**
 * Generate a standardized cache key
 */
export const generateCacheKey = ({
  entity,
  id,
  subType,
  version = CACHE_VERSION
}: CacheKeyOptions): string => {
  const parts = [entity];
  
  if (subType) {
    parts.push(subType);
  }
  
  parts.push(id, version);
  
  return parts.join('_');
};

/**
 * Generate a path-based cache key
 */
export const generatePathCacheKey = (
  entity: string,
  parts: string[],
  version: string = CACHE_VERSION
): string => {
  return [entity, ...parts, version].join('_');
};

/**
 * Type guard to check if a string is a valid CacheEntity
 */
export const isCacheEntity = (entity: string): entity is CacheEntity => {
  return Object.values(CACHE_ENTITIES).includes(entity as CacheEntity);
};

/**
 * Pre-configured key generators for specific entities
 */
export const cacheKeys = {
  form: (projectId: string, formType: string = 'default') => 
    generateCacheKey({ 
      entity: CACHE_ENTITIES.FORM, 
      id: projectId, 
      subType: formType 
    }),
    
  project: (projectId: string) => 
    generateCacheKey({ 
      entity: CACHE_ENTITIES.PROJECT, 
      id: projectId 
    }),
    
  context: (projectId: string) => 
    generateCacheKey({ 
      entity: CACHE_ENTITIES.CONTEXT, 
      id: projectId 
    }),
    
  activity: (projectId: string, activityId: string) => 
    generateCacheKey({ 
      entity: CACHE_ENTITIES.ACTIVITY, 
      id: `${projectId}_${activityId}` 
    }),
    
  response: (responseId: string) => 
    generateCacheKey({ 
      entity: CACHE_ENTITIES.RESPONSE, 
      id: responseId 
    }),
    
  path: (components: string[]) =>
    generatePathCacheKey(
      CACHE_ENTITIES.PATH,
      components
    )
};

// Re-export version for compatibility
export { CACHE_VERSION };
