/**
 * Canonical JSON stringifier that sorts keys before stringifying.
 * Useful for deep comparison of JSON objects where key order might differ.
 */
export const canonicalStringify = (obj: unknown): string => {
  if (obj === null || obj === undefined) return '';
  if (typeof obj === 'string') return `"${obj}"`;
  if (typeof obj !== 'object') return String(obj);
  
  if (Array.isArray(obj)) {
    let result = '[';
    for (let i = 0; i < obj.length; i++) {
      if (i > 0) result += ',';
      result += canonicalStringify(obj[i]);
    }
    return result + ']';
  }

  // Sort keys alphabetically
  const objRecord = obj as Record<string, unknown>;
  const keys = Object.keys(objRecord).sort();
  
  // Optimization: Use standard for loop with string concatenation instead of .reduce().map().join(',')
  // This avoids intermediate array/object allocations and significantly speeds up deep comparisons
  let result = '{';
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (i > 0) result += ',';
    result += `"${key}":${canonicalStringify(objRecord[key])}`;
  }
  return result + '}';
};

/**
 * Deep comparison of two objects using canonical stringification.
 */
export const areObjectsEqual = (obj1: unknown, obj2: unknown): boolean => {
  if (obj1 === obj2) return true;
  if (!obj1 || !obj2) return false;
  return canonicalStringify(obj1) === canonicalStringify(obj2);
};
