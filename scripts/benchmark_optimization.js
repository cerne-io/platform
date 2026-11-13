import { performance } from 'perf_hooks';

const NUM_STORIES = 10000;
const NUM_RESULTS = 1000;

// Create dummy data
const stories = Array.from({ length: NUM_STORIES }, (_, i) => ({
  id: i,
  title: `Story ${i}`,
  text: `Content ${i}`
}));

const semanticResults = Array.from({ length: NUM_RESULTS }, (_, i) => String(i * 10)); // Every 10th story matches

console.log(`Running benchmark with ${NUM_STORIES} stories and ${NUM_RESULTS} search results...`);

// Original implementation (O(N * M))
const startOld = performance.now();
const filteredOld = stories.filter(story => {
  return semanticResults.includes(String(story.id));
});
const endOld = performance.now();
console.log(`Original (Array.includes): ${(endOld - startOld).toFixed(2)}ms`);

// Optimized implementation (O(N + M))
const startNew = performance.now();
const semanticResultsSet = new Set(semanticResults);
const filteredNew = stories.filter(story => {
  return semanticResultsSet.has(String(story.id));
});
const endNew = performance.now();
console.log(`Optimized (Set.has): ${(endNew - startNew).toFixed(2)}ms`);

// Correctness check
if (filteredOld.length === filteredNew.length) {
  console.log(`Success: Both methods returned ${filteredOld.length} results.`);
} else {
  console.error(`Error: Result count mismatch! Old: ${filteredOld.length}, New: ${filteredNew.length}`);
}
