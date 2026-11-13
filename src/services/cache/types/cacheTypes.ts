
export interface CacheOptions {
  storage?: 'memory' | 'session' | 'local';
  ttl?: number; // Time to live in milliseconds, -1 for infinite
  expiration?: number; // For backward compatibility
}

export type CacheEntity = 'form' | 'project' | 'context' | 'activity' | 'response';

export interface CacheKeyOptions {
  entity: CacheEntity | string; // Allow string for backward compatibility
  id: string;
  subType?: string;
  version?: string;
}

export interface CacheManager {
  get<T>(key: string, defaultValue: T, options?: CacheOptions): T;
  set<T>(key: string, data: T, options?: CacheOptions): void;
  remove(key: string, options?: CacheOptions): void;
  clearPattern(pattern: string, options?: CacheOptions): void;
  shouldLoadFromRemote(key: string, options?: CacheOptions): boolean;
  isValid(key: string, options?: CacheOptions): boolean;
}
