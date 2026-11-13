import { ParticipantResponse, SliderResponse, TriangleResponse } from '@/types/story';
import { getIndicators, ComparisonIndicator } from './indicatorUtils';

export const PARTICIPANT_FEELING_FIELD_ID = "__system.participant_selected_feeling" as const;
export const FEELING_GROUP_FIELD_ID = "__derived.feeling_group" as const;

export type CategoricalEvidenceSource = 
  | "form_question" 
  | "participant_selected_response" 
  | "ai_derived_feeling_group";

export type ComparisonPolicy = {
  enabledFieldIds?: string[];
  restrictedFieldIds?: string[];
  minimumGroupAnswered: number;
  minimumCategoryCount: number;
  minimumDifferencePercentagePoints: number;
  rareBelowTotalCount?: number;
};

export type StoryMetadata = {
  participantResponses?: ParticipantResponse[];
  sliderResponses?: SliderResponse[];
  triangleResponses?: TriangleResponse[];
  feeling?: string;
  feelingSentiment?: "positive" | "neutral" | "negative";
};

export type EvidenceStrength = "strong" | "moderate" | "tentative";

export function getEvidenceStrength(precision: number): EvidenceStrength {
  if (precision >= 0.75) return "strong";
  if (precision >= 0.45) return "moderate";
  return "tentative";
}

export type EffectMagnitude = "small" | "moderate" | "large";

export function getCohensHEffectMagnitude(cohensH: number): EffectMagnitude {
  const absoluteH = Math.abs(cohensH);
  if (absoluteH >= 0.8) return "large";
  if (absoluteH >= 0.5) return "moderate";
  return "small";
}

export type DeterministicComparisonInput = {
  groupAStoryIds: string[];
  groupBStoryIds: string[];
  sharedStoryIds: string[];
  overlapMode: "include_shared" | "exclude_shared";
  metadataMap: Map<string, StoryMetadata>;
  policies: ComparisonPolicy;
};

export type CategoryContrast = {
  questionId: string;
  questionText: string;
  category: string;
  
  groupACount: number;
  groupAAnswered: number;
  groupAPercentage: number;
  
  groupBCount: number;
  groupBAnswered: number;
  groupBPercentage: number;
  
  differencePercentagePoints: number; // A - B (positive means higher in A)
  absoluteDifference: number; // Math.abs(A - B)
  
  smoothedDifference?: number;
  precision?: number;
  coverage?: number;
  salienceScore?: number;
  cohensH?: number;

  // Concentration
  totalSelectedCategoryCount: number; // Unique participants with this category in A U B
  concentrationA: number;
  concentrationB: number;
  
  // Corpus Baseline
  corpusTotalCategoryCount: number; // Total participants with this category across entire project
  corpusConcentrationA: number; // count A / corpus total
  corpusConcentrationB: number; // count B / corpus total
  
  indicators?: ComparisonIndicator[];
  evidenceSource?: CategoricalEvidenceSource;
  sourceLabel?: string;
};

export type CategoricalComparisonResult = {
  questionId: string;
  questionText: string;
  contrasts: CategoryContrast[];
  totalAnsweredA: number;
  totalAnsweredB: number;
  corpusTotalAnswered: number;
  groupAShareOfCorpus: number;
  groupBShareOfCorpus: number;
  indicators: import('./indicatorUtils').ComparisonIndicator[];
};

export type FeelingGroup = "positive" | "neutral" | "negative" | "unassigned";

export function getFeelingGroup(
  story: Pick<StoryMetadata, "feeling" | "feelingSentiment">
): FeelingGroup {
  if (!story.feeling) return "unassigned";
  switch (story.feelingSentiment) {
    case "positive":
    case "neutral":
    case "negative":
      return story.feelingSentiment;
    default:
      return "unassigned";
  }
}

/**
 * Calculates deterministic categorical contrasts between Group A and Group B.
 */
export function calculateCategoricalDifferences(input: DeterministicComparisonInput): CategoricalComparisonResult[] {
  const {
    groupAStoryIds,
    groupBStoryIds,
    sharedStoryIds,
    overlapMode,
    metadataMap,
    policies
  } = input;

  // Filter out shared if overlapMode is exclude_shared
  const finalA = overlapMode === "exclude_shared" 
    ? groupAStoryIds.filter(id => !sharedStoryIds.includes(id)) 
    : groupAStoryIds;
    
  const finalB = overlapMode === "exclude_shared"
    ? groupBStoryIds.filter(id => !sharedStoryIds.includes(id))
    : groupBStoryIds;

  // Data structures to aggregate responses
  // Map<questionId, { questionText: string, answeredA: Set<string>, answeredB: Set<string>, answeredCorpus: Set<string>, categories: Map<category, { A: Set<string>, B: Set<string>, Corpus: Set<string> }> }>
  const questionsMap = new Map<string, {
    questionText: string;
    answeredA: Set<string>;
    answeredB: Set<string>;
    answeredCorpus: Set<string>;
    categories: Map<string, { A: Set<string>, B: Set<string>, Corpus: Set<string> }>;
  }>();

  // Helper to process a categorical field
  const processCategoricalField = (storyId: string, questionId: string, questionText: string, category: string, group: "A" | "B" | "Corpus") => {
    if (!questionsMap.has(questionId)) {
      questionsMap.set(questionId, {
        questionText,
        answeredA: new Set(),
        answeredB: new Set(),
        answeredCorpus: new Set(),
        categories: new Map()
      });
    }
    const qData = questionsMap.get(questionId)!;
    
    if (group === "A") qData.answeredA.add(storyId);
    if (group === "B") qData.answeredB.add(storyId);
    if (group === "Corpus") qData.answeredCorpus.add(storyId);

    if (!qData.categories.has(category)) {
      qData.categories.set(category, { A: new Set(), B: new Set(), Corpus: new Set() });
    }
    const catData = qData.categories.get(category)!;
    
    if (group === "A") catData.A.add(storyId);
    if (group === "B") catData.B.add(storyId);
    if (group === "Corpus") catData.Corpus.add(storyId);
  };

  // First, calculate corpus baseline
  metadataMap.forEach((meta, id) => {
    if (meta.participantResponses) {
      meta.participantResponses.forEach(pr => {
        if (pr.response !== null && pr.response !== undefined) {
          const items = Array.isArray(pr.response) ? pr.response : [pr.response];
          items.forEach(item => {
            const trimmed = String(item ?? '').trim();
            if (trimmed) {
              processCategoricalField(id, pr.question_id, pr.question_text, trimmed, "Corpus");
            }
          });
        }
      });
    }
    if (meta.feeling) {
      processCategoricalField(id, PARTICIPANT_FEELING_FIELD_ID, "Participant-selected feeling", meta.feeling.trim(), "Corpus");
      const fg = getFeelingGroup(meta);
      if (fg !== "unassigned") {
        processCategoricalField(id, FEELING_GROUP_FIELD_ID, "Feeling group", fg, "Corpus");
      }
    }
  });

  finalA.forEach(id => {
    const meta = metadataMap.get(id);
    if (!meta) return;
    
    if (meta.participantResponses) {
      meta.participantResponses.forEach(pr => {
        if (pr.response !== null && pr.response !== undefined) {
          const items = Array.isArray(pr.response) ? pr.response : [pr.response];
          items.forEach(item => {
            const trimmed = String(item ?? '').trim();
            if (trimmed) {
              processCategoricalField(id, pr.question_id, pr.question_text, trimmed, "A");
            }
          });
        }
      });
    }
    if (meta.feeling) {
      processCategoricalField(id, PARTICIPANT_FEELING_FIELD_ID, "Participant-selected feeling", meta.feeling.trim(), "A");
      const fg = getFeelingGroup(meta);
      if (fg !== "unassigned") {
        processCategoricalField(id, FEELING_GROUP_FIELD_ID, "Feeling group", fg, "A");
      }
    }
  });

  finalB.forEach(id => {
    const meta = metadataMap.get(id);
    if (!meta) return;
    
    if (meta.participantResponses) {
      meta.participantResponses.forEach(pr => {
        if (pr.response !== null && pr.response !== undefined) {
          const items = Array.isArray(pr.response) ? pr.response : [pr.response];
          items.forEach(item => {
            const trimmed = String(item ?? '').trim();
            if (trimmed) {
              processCategoricalField(id, pr.question_id, pr.question_text, trimmed, "B");
            }
          });
        }
      });
    }
    if (meta.feeling) {
      processCategoricalField(id, PARTICIPANT_FEELING_FIELD_ID, "Participant-selected feeling", meta.feeling.trim(), "B");
      const fg = getFeelingGroup(meta);
      if (fg !== "unassigned") {
        processCategoricalField(id, FEELING_GROUP_FIELD_ID, "Feeling group", fg, "B");
      }
    }
  });

  const results: CategoricalComparisonResult[] = [];

  // Calculate stats
  questionsMap.forEach((qData, qId) => {
    // Apply policy: enabled/restricted fields
    if (policies.enabledFieldIds && policies.enabledFieldIds.length > 0 && !policies.enabledFieldIds.includes(qId)) return;
    if (policies.restrictedFieldIds && policies.restrictedFieldIds.includes(qId)) return;

    const answeredA = qData.answeredA.size;
    const answeredB = qData.answeredB.size;
    const corpusTotalAnswered = qData.answeredCorpus.size;

    // Apply policy: minimum group answered (now handled via indicators if we want to show it, but for now we still drop if BOTH are 0)
    if (answeredA === 0 && answeredB === 0) return;
    
    // We get indicators using the newly shared logic
    const indicators = getIndicators(
       answeredA, answeredB,
       finalA.length, finalB.length,
       sharedStoryIds.length,
       true, // We assume contrasts are salient if they pass minimum difference
       { minimumGroupSize: 8, hardMinimum: policies.minimumGroupAnswered }
    );

    if (qId === FEELING_GROUP_FIELD_ID) {
      const feelingQ = questionsMap.get(PARTICIPANT_FEELING_FIELD_ID);
      if (feelingQ) {
        const hasSelectedFeelingA = feelingQ.answeredA.size;
        const hasValidGroupA = answeredA;
        const unassignedA = hasSelectedFeelingA - hasValidGroupA;
        
        const hasSelectedFeelingB = feelingQ.answeredB.size;
        const hasValidGroupB = answeredB;
        const unassignedB = hasSelectedFeelingB - hasValidGroupB;

        if (unassignedA > 0 || unassignedB > 0) {
          indicators.push({
            kind: "partial_ai_group_coverage",
            groupA: { hasSelectedFeeling: hasSelectedFeelingA, hasValidGroup: hasValidGroupA, unassigned: unassignedA },
            groupB: { hasSelectedFeeling: hasSelectedFeelingB, hasValidGroup: hasValidGroupB, unassigned: unassignedB }
          });
        }
      }
    }

    const contrasts: CategoryContrast[] = [];

    qData.categories.forEach((catData, category) => {
      const countA = catData.A.size;
      const countB = catData.B.size;
      const totalSelected = new Set([...Array.from(catData.A), ...Array.from(catData.B)]).size;

      // Apply policy: minimum category count in entire selection
      if (totalSelected < policies.minimumCategoryCount) return;

      const pctA = answeredA > 0 ? Math.round((countA / answeredA) * 100) : 0;
      const pctB = answeredB > 0 ? Math.round((countB / answeredB) * 100) : 0;

      const diff = pctA - pctB;
      const absDiff = Math.abs(diff);

      // Apply policy: minimum difference
      if (absDiff < policies.minimumDifferencePercentagePoints) return;

      const corpusTotal = catData.Corpus.size;

      const m = 10; // Prior strength
      const p0_A = (corpusTotalAnswered - answeredA) > 0 ? Math.max(0, corpusTotal - countA) / (corpusTotalAnswered - answeredA) : (corpusTotalAnswered > 0 ? corpusTotal / corpusTotalAnswered : 0);
      const smoothedPctA = answeredA > 0 ? (countA + m * p0_A) / (answeredA + m) : 0;
      
      const p0_B = (corpusTotalAnswered - answeredB) > 0 ? Math.max(0, corpusTotal - countB) / (corpusTotalAnswered - answeredB) : (corpusTotalAnswered > 0 ? corpusTotal / corpusTotalAnswered : 0);
      const smoothedPctB = answeredB > 0 ? (countB + m * p0_B) / (answeredB + m) : 0;
      
      const smoothedDifference = Math.abs(smoothedPctA - smoothedPctB);
      
      const minGroupN = Math.min(answeredA, answeredB);
      const precision = 1 - Math.exp(-minGroupN / 20);
      const coverage = corpusTotalAnswered > 0 ? Math.sqrt(Math.min(1, (answeredA + answeredB) / corpusTotalAnswered)) : 0;
      const salienceScore = 100 * smoothedDifference * precision * coverage;

      const pA_frac = answeredA > 0 ? countA / answeredA : 0;
      const pB_frac = answeredB > 0 ? countB / answeredB : 0;
      const cohensH = 2 * Math.abs(Math.asin(Math.sqrt(pA_frac)) - Math.asin(Math.sqrt(pB_frac)));

      const concA = totalSelected > 0 ? Math.round((countA / totalSelected) * 100) : 0;
      const concB = totalSelected > 0 ? Math.round((countB / totalSelected) * 100) : 0;

      const corpusConcA = corpusTotal > 0 ? Math.round((countA / corpusTotal) * 100) : 0;
      const corpusConcB = corpusTotal > 0 ? Math.round((countB / corpusTotal) * 100) : 0;

      const categoryIndicators: ComparisonIndicator[] = [];
      const rareThreshold = policies.rareBelowTotalCount ?? 5;
      if (totalSelected >= policies.minimumCategoryCount && totalSelected < rareThreshold) {
          categoryIndicators.push({
              kind: "rare_response",
              countA,
              countB,
              total: totalSelected,
              rareBelowTotalCount: rareThreshold
          });
      }

      let evidenceSource: CategoricalEvidenceSource = "form_question";
      let sourceLabel = "Form question";
      
      if (qId === PARTICIPANT_FEELING_FIELD_ID) {
        evidenceSource = "participant_selected_response";
        sourceLabel = "Participant-selected response";
      } else if (qId === FEELING_GROUP_FIELD_ID) {
        evidenceSource = "ai_derived_feeling_group";
        sourceLabel = "AI-grouped from participant-selected feelings";
      }

      contrasts.push({
        questionId: qId,
        questionText: qData.questionText,
        category,
        groupACount: countA,
        groupAAnswered: answeredA,
        groupAPercentage: pctA,
        groupBCount: countB,
        groupBAnswered: answeredB,
        groupBPercentage: pctB,
        differencePercentagePoints: diff,
        absoluteDifference: absDiff,
        smoothedDifference,
        precision,
        coverage,
        salienceScore,
        cohensH,
        totalSelectedCategoryCount: totalSelected,
        concentrationA: concA,
        concentrationB: concB,
        corpusTotalCategoryCount: corpusTotal,
        corpusConcentrationA: corpusConcA,
        corpusConcentrationB: corpusConcB,
        indicators: categoryIndicators,
        evidenceSource,
        sourceLabel
      });
    });

    if (contrasts.length > 0) {
      // Sort contrasts within this question: standard first (by abs difference desc), then rare (by abs diff desc)
      contrasts.sort((a, b) => {
        const aIsRare = a.indicators?.some(i => i.kind === 'rare_response');
        const bIsRare = b.indicators?.some(i => i.kind === 'rare_response');
        if (aIsRare && !bIsRare) return 1;
        if (!aIsRare && bIsRare) return -1;
        return (b.salienceScore ?? b.absoluteDifference) - (a.salienceScore ?? a.absoluteDifference);
      });
      
      results.push({
        questionId: qId,
        questionText: qData.questionText,
        contrasts,
        totalAnsweredA: answeredA,
        totalAnsweredB: answeredB,
        corpusTotalAnswered,
        groupAShareOfCorpus: corpusTotalAnswered > 0 ? Math.round((answeredA / corpusTotalAnswered) * 100) : 0,
        groupBShareOfCorpus: corpusTotalAnswered > 0 ? Math.round((answeredB / corpusTotalAnswered) * 100) : 0,
        indicators
      });
    }
  });

  // Sort overall results by the maximum contrast inside them
  results.sort((a, b) => {
    const maxA = a.contrasts[0]?.salienceScore ?? a.contrasts[0]?.absoluteDifference ?? 0;
    const maxB = b.contrasts[0]?.salienceScore ?? b.contrasts[0]?.absoluteDifference ?? 0;
    return maxB - maxA;
  });

  return results;
}

export type ConstituentTerm = {
  label: string;
  isCustom: boolean;
  groupACount: number;
  groupBCount: number;
  totalCount: number;
};

export type UnassignedTerm = {
  label: string;
  groupACount: number;
  groupBCount: number;
  totalCount: number;
};

export type FeelingComparisonSectionData = {
  groupedResults: CategoricalComparisonResult[];
  exactResults: CategoricalComparisonResult[];
  constituentTermsByGroup: Record<"positive" | "neutral" | "negative", ConstituentTerm[]>;
  unassignedTerms: UnassignedTerm[];
  coverage: {
    groupA: { hasSelectedFeeling: number; hasValidGroup: number; unassigned: number; };
    groupB: { hasSelectedFeeling: number; hasValidGroup: number; unassigned: number; };
  };
};

export function buildFeelingComparisonSection(
  results: CategoricalComparisonResult[],
  metadataMap: Map<string, StoryMetadata>,
  groupAStoryIds: string[],
  groupBStoryIds: string[],
  overlapMode: "include_shared" | "exclude_shared",
  sharedStoryIds: string[]
): FeelingComparisonSectionData {
  const finalA = overlapMode === "exclude_shared" 
    ? groupAStoryIds.filter(id => !sharedStoryIds.includes(id)) 
    : groupAStoryIds;
    
  const finalB = overlapMode === "exclude_shared"
    ? groupBStoryIds.filter(id => !sharedStoryIds.includes(id))
    : groupBStoryIds;

  const groupedResults = results.filter(r => r.questionId === FEELING_GROUP_FIELD_ID);
  const exactResults = results.filter(r => r.questionId === PARTICIPANT_FEELING_FIELD_ID);

  const constituentTermsByGroup: Record<"positive" | "neutral" | "negative", ConstituentTerm[]> = {
    positive: [],
    neutral: [],
    negative: []
  };
  const unassignedTerms: UnassignedTerm[] = [];

  // Track raw counts of exact feelings by feelingSentiment
  const exactFeelingCounts = new Map<string, { groupA: number; groupB: number; total: number; sentiment: string; }>();

  // Determine standard feelings vs custom by looking at what was submitted, 
  // actually in Cerne, standard feelings aren't strictly distinguishable purely from strings 
  // unless we pass a preset list. Since the prompt says "If a constituent exact label is custom, label it subtly: - Skeptical: 2 · Custom response",
  // we will consider a simple heuristic or leave it as false unless we know.
  // Wait, does Cerne have a standard feeling list? We don't have it here. We'll default to isCustom = false for now 
  // unless we can't map it. Actually, `feeling` field is just string. If we have to, we can pass it, but for now we'll set `isCustom` to false or true based on typical sentiment availability, or just false. We'll assume any feeling is potentially custom, but maybe the UI has a list of presets.
  // Actually, we don't have the preset list. We'll just set it to false for now.

  const processStory = (id: string, group: "A" | "B") => {
    const meta = metadataMap.get(id);
    if (!meta || !meta.feeling) return;
    const feeling = meta.feeling.trim();
    const sentiment = getFeelingGroup(meta);
    
    if (!exactFeelingCounts.has(feeling)) {
      exactFeelingCounts.set(feeling, { groupA: 0, groupB: 0, total: 0, sentiment });
    }
    const counts = exactFeelingCounts.get(feeling)!;
    if (group === "A") counts.groupA++;
    if (group === "B") counts.groupB++;
    counts.total++;
  };

  finalA.forEach(id => processStory(id, "A"));
  finalB.forEach(id => processStory(id, "B"));

  exactFeelingCounts.forEach((counts, label) => {
    if (counts.sentiment === "unassigned") {
      unassignedTerms.push({
        label,
        groupACount: counts.groupA,
        groupBCount: counts.groupB,
        totalCount: counts.total
      });
    } else {
      constituentTermsByGroup[counts.sentiment as "positive" | "neutral" | "negative"].push({
        label,
        isCustom: false, // In absence of preset list, we assume false. We could add logic if preset list is available.
        groupACount: counts.groupA,
        groupBCount: counts.groupB,
        totalCount: counts.total
      });
    }
  });

  // Sort constituents by totalCount desc
  const sortByTotal = (a: { totalCount: number }, b: { totalCount: number }) => b.totalCount - a.totalCount;
  constituentTermsByGroup.positive.sort(sortByTotal);
  constituentTermsByGroup.neutral.sort(sortByTotal);
  constituentTermsByGroup.negative.sort(sortByTotal);
  unassignedTerms.sort(sortByTotal);

  let coverage = {
    groupA: { hasSelectedFeeling: 0, hasValidGroup: 0, unassigned: 0 },
    groupB: { hasSelectedFeeling: 0, hasValidGroup: 0, unassigned: 0 }
  };

  if (groupedResults.length > 0) {
    const partialCoverageInd = groupedResults[0].indicators?.find(i => i.kind === "partial_ai_group_coverage");
    if (partialCoverageInd && partialCoverageInd.kind === "partial_ai_group_coverage") {
      coverage = {
        groupA: partialCoverageInd.groupA,
        groupB: partialCoverageInd.groupB
      };
    } else {
      // Manual fallback calculation
      const calcCoverage = (groupStoryIds: string[]) => {
        let hasSelectedFeeling = 0;
        let hasValidGroup = 0;
        groupStoryIds.forEach(id => {
          const meta = metadataMap.get(id);
          if (meta && meta.feeling) {
            hasSelectedFeeling++;
            if (getFeelingGroup(meta) !== "unassigned") hasValidGroup++;
          }
        });
        return { hasSelectedFeeling, hasValidGroup, unassigned: hasSelectedFeeling - hasValidGroup };
      };
      coverage = {
        groupA: calcCoverage(finalA),
        groupB: calcCoverage(finalB)
      };
    }
  }

  return {
    groupedResults,
    exactResults,
    constituentTermsByGroup,
    unassignedTerms,
    coverage
  };
}
