import { canonicalStringify, areObjectsEqual } from '../src/utils/jsonUtils';

const generateLargeObj = (depth: number, width: number): Record<string, unknown> => {
  if (depth === 0) return { a: 1, b: "string", c: true, d: null };
  const obj: Record<string, unknown> = {};
  for (let i = 0; i < width; i++) {
    obj[`key_${i}`] = generateLargeObj(depth - 1, width);
  }
  return obj;
};

const largeObj = generateLargeObj(4, 5); // Decent size object

console.log("Starting benchmark...");
const iterations = 100000;
const start = performance.now();

for (let i = 0; i < iterations; i++) {
  canonicalStringify(largeObj);
}

const end = performance.now();
console.log(`Execution time for ${iterations} iterations: ${(end - start).toFixed(2)} ms`);

// Test primitive quoting bug
console.log("Bug fix check: 1 vs '1'");
console.log("areObjectsEqual(1, '1'):", areObjectsEqual(1, "1")); // Should be false

