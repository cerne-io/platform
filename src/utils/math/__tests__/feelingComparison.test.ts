import { describe, it, expect } from 'vitest';
import { 
  calculateCategoricalDifferences, 
  DeterministicComparisonInput, 
  ComparisonPolicy,
  StoryMetadata,
  PARTICIPANT_FEELING_FIELD_ID,
  FEELING_GROUP_FIELD_ID
} from '../comparisonUtils';

describe("feeling comparisons", () => {
  const policy: ComparisonPolicy = {
    minimumGroupAnswered: 1,
    minimumCategoryCount: 1,
    minimumDifferencePercentagePoints: 0,
    rareBelowTotalCount: 5
  };

  it("creates exact-feeling results from story.feeling", () => {
    const metadataMap = new Map<string, StoryMetadata>();
    metadataMap.set("1", { feeling: "Skeptical", feelingSentiment: "neutral" });
    
    const input: DeterministicComparisonInput = {
      groupAStoryIds: ["1"],
      groupBStoryIds: [],
      sharedStoryIds: [],
      overlapMode: "include_shared",
      metadataMap,
      policies: policy
    };

    const results = calculateCategoricalDifferences(input);
    const exactResults = results.find(r => r.questionId === PARTICIPANT_FEELING_FIELD_ID);
    expect(exactResults).toBeDefined();
    
    const skepticalContrast = exactResults!.contrasts.find(c => c.category === "Skeptical");
    expect(skepticalContrast).toBeDefined();
    expect(skepticalContrast!.groupACount).toBe(1);
    expect(skepticalContrast!.evidenceSource).toBe("participant_selected_response");
  });

  it("creates grouped-feeling results from feelingSentiment", () => {
    const metadataMap = new Map<string, StoryMetadata>();
    metadataMap.set("1", { feeling: "Skeptical", feelingSentiment: "neutral" });
    
    const input: DeterministicComparisonInput = {
      groupAStoryIds: ["1"],
      groupBStoryIds: [],
      sharedStoryIds: [],
      overlapMode: "include_shared",
      metadataMap,
      policies: policy
    };

    const results = calculateCategoricalDifferences(input);
    const groupedResults = results.find(r => r.questionId === FEELING_GROUP_FIELD_ID);
    expect(groupedResults).toBeDefined();
    
    const neutralContrast = groupedResults!.contrasts.find(c => c.category === "neutral");
    expect(neutralContrast).toBeDefined();
    expect(neutralContrast!.groupACount).toBe(1);
    expect(neutralContrast!.evidenceSource).toBe("ai_derived_feeling_group");
  });

  it("does not count a group label without a participant feeling", () => {
    const metadataMap = new Map<string, StoryMetadata>();
    // feeling is undefined, feelingSentiment is negative -> should be excluded
    metadataMap.set("1", { feelingSentiment: "negative" });
    
    const input: DeterministicComparisonInput = {
      groupAStoryIds: ["1"],
      groupBStoryIds: [],
      sharedStoryIds: [],
      overlapMode: "include_shared",
      metadataMap,
      policies: policy
    };

    const results = calculateCategoricalDifferences(input);
    const groupedResults = results.find(r => r.questionId === FEELING_GROUP_FIELD_ID);
    expect(groupedResults).toBeUndefined(); // Or empty contrasts
  });

  it("marks an exact feeling as rare but allows its group to be supported", () => {
    const metadataMap = new Map<string, StoryMetadata>();
    metadataMap.set("1", { feeling: "Frustrated", feelingSentiment: "negative" });
    metadataMap.set("2", { feeling: "Frustrated", feelingSentiment: "negative" });
    metadataMap.set("3", { feeling: "Frustrated", feelingSentiment: "negative" });
    metadataMap.set("4", { feeling: "Angry", feelingSentiment: "negative" });
    metadataMap.set("5", { feeling: "Angry", feelingSentiment: "negative" });
    metadataMap.set("6", { feeling: "Angry", feelingSentiment: "negative" });

    const input: DeterministicComparisonInput = {
      groupAStoryIds: ["1", "2", "3", "4", "5", "6"],
      groupBStoryIds: [],
      sharedStoryIds: [],
      overlapMode: "include_shared",
      metadataMap,
      policies: policy
    };

    const results = calculateCategoricalDifferences(input);
    const exactResults = results.find(r => r.questionId === PARTICIPANT_FEELING_FIELD_ID);
    const groupedResults = results.find(r => r.questionId === FEELING_GROUP_FIELD_ID);
    
    expect(exactResults).toBeDefined();
    expect(groupedResults).toBeDefined();

    const frustratedContrast = exactResults!.contrasts.find(c => c.category === "Frustrated");
    const negativeContrast = groupedResults!.contrasts.find(c => c.category === "negative");

    // Frustrated total is 3, rareBelowTotalCount is 5
    expect(frustratedContrast!.indicators!.some(i => i.kind === "rare_response")).toBe(true);
    
    // Negative total is 6
    expect(negativeContrast!.indicators!.some(i => i.kind === "rare_response")).toBe(false);
  });

  it("reports incomplete AI-group coverage separately", () => {
    const metadataMap = new Map<string, StoryMetadata>();
    metadataMap.set("1", { feeling: "Custom1", feelingSentiment: "positive" });
    metadataMap.set("2", { feeling: "Custom2" }); // No feelingSentiment
    metadataMap.set("3", { feeling: "Custom3" }); // No feelingSentiment

    const input: DeterministicComparisonInput = {
      groupAStoryIds: ["1", "2", "3"],
      groupBStoryIds: [],
      sharedStoryIds: [],
      overlapMode: "include_shared",
      metadataMap,
      policies: policy
    };

    const results = calculateCategoricalDifferences(input);
    const groupedResults = results.find(r => r.questionId === FEELING_GROUP_FIELD_ID);
    
    expect(groupedResults).toBeDefined();
    const partialCoverage = groupedResults!.indicators?.find(i => i.kind === "partial_ai_group_coverage");
    expect(partialCoverage).toBeDefined();
    if (partialCoverage?.kind === "partial_ai_group_coverage") {
      expect(partialCoverage.groupA.hasSelectedFeeling).toBe(3);
      expect(partialCoverage.groupA.hasValidGroup).toBe(1);
      expect(partialCoverage.groupA.unassigned).toBe(2);
    }
  });

  it("retains group overlap semantics for both exact and grouped views", () => {
    const metadataMap = new Map<string, StoryMetadata>();
    metadataMap.set("1", { feeling: "Frustrated", feelingSentiment: "negative" });
    
    const input: DeterministicComparisonInput = {
      groupAStoryIds: ["1"],
      groupBStoryIds: ["1"],
      sharedStoryIds: ["1"],
      overlapMode: "include_shared",
      metadataMap,
      policies: policy
    };

    const results = calculateCategoricalDifferences(input);
    const exactResults = results.find(r => r.questionId === PARTICIPANT_FEELING_FIELD_ID);
    const groupedResults = results.find(r => r.questionId === FEELING_GROUP_FIELD_ID);

    expect(exactResults!.contrasts[0].totalSelectedCategoryCount).toBe(1);
    expect(groupedResults!.contrasts[0].totalSelectedCategoryCount).toBe(1);
  });
});
