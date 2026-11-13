import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Story } from '@/types/story';
import { TriangleComparisonContext } from './TriangleSelectionTypes';
import { 
    calculateCategoricalDifferences, 
    StoryMetadata, 
    ComparisonPolicy,
    CategoryContrast,
    CategoricalComparisonResult,
    buildFeelingComparisonSection,
    PARTICIPANT_FEELING_FIELD_ID,
    FEELING_GROUP_FIELD_ID,
    getFeelingGroup
} from '@/utils/math/comparisonUtils';
import { calculateContinuousDifferences } from '@/utils/math/continuousComparisonUtils';
import { FeelingComparisonSection } from './../comparisons/FeelingComparisonSection';
import { ContinuousFindingRow } from './../comparisons/ContinuousFindingRow';
import { ContrastEvidence } from './../comparisons/ContrastEvidence';
import StoryCard from '@/components/explore/StoryCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useCreateSavedComparison, useUpdateSavedComparison } from '@/hooks/comparisons/useSavedComparisons';
import { Loader2, Save, SaveAll } from 'lucide-react';
import { useProject } from '@/contexts/ProjectContext';

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface ComparisonWorkspaceDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    context: TriangleComparisonContext | null;
    stories: Story[];
    questionText: string;
    driftNotice?: string;
    isPublic?: boolean;
}

const DEFAULT_POLICY: ComparisonPolicy = {
    minimumGroupAnswered: 5,
    minimumCategoryCount: 2,
    minimumDifferencePercentagePoints: 5,
    rareBelowTotalCount: 5,
};

const ContrastRow = ({ 
    contrast, 
    diff, 
    isSelected, 
    onSelect, 
    groupAName,
    groupBName
}: { 
    contrast: CategoryContrast, 
    diff: CategoricalComparisonResult, 
    isSelected: boolean, 
    onSelect: () => void,
    groupAName: string,
    groupBName: string
}) => {
    const [showInfo, setShowInfo] = useState(false);

    const isInsufficient = diff.indicators?.some(i => i.kind === 'insufficient_responses') ?? false;

    const isGroupAHigher = contrast.differencePercentagePoints > 0;
    const dominantGroup = isGroupAHigher ? groupAName : groupBName;
    const dominantConcentration = isGroupAHigher ? contrast.corpusConcentrationA : contrast.corpusConcentrationB;
    const dominantShareOfCorpus = isGroupAHigher ? diff.groupAShareOfCorpus : diff.groupBShareOfCorpus;

    const derivedDifference = dominantConcentration - dominantShareOfCorpus;
    const absDerivedDifference = Math.abs(derivedDifference);

    return (
        <div 
            onClick={onSelect}
            className={`
                p-3 rounded-lg border cursor-pointer transition-colors
                ${isSelected 
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30' 
                    : 'border-border bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                }
                ${isInsufficient ? 'opacity-60' : ''}
            `}
        >
            <div className="font-medium text-sm mb-2">
                {diff.questionId === PARTICIPANT_FEELING_FIELD_ID ? contrast.category.charAt(0).toUpperCase() + contrast.category.slice(1) : contrast.category}
            </div>
            
            <div className="space-y-1.5 text-sm">
                <div className="text-muted-foreground mb-1 text-xs">
                    {diff.questionId === PARTICIPANT_FEELING_FIELD_ID 
                        ? 'Of stories with a participant-selected feeling' 
                        : `Of respondents who answered "${diff.questionText}"`}
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{groupAName}:</span>
                    <span>{contrast.groupACount} of {contrast.groupAAnswered} {diff.questionId === PARTICIPANT_FEELING_FIELD_ID ? 'stories' : `selected "${contrast.category}"`} ({contrast.groupAPercentage}%)</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{groupBName}:</span>
                    <span>{contrast.groupBCount} of {contrast.groupBAnswered} {diff.questionId === PARTICIPANT_FEELING_FIELD_ID ? 'stories' : `selected "${contrast.category}"`} ({contrast.groupBPercentage}%)</span>
                </div>
                
                {!isInsufficient && (
                    <div className="pt-1 mt-1 border-t border-border flex justify-between items-start text-xs">
                        <span className="font-medium mt-0.5">Difference:</span>
                        <div className="flex flex-col items-end gap-2 text-right">
                            <div className="flex items-center gap-1.5">
                                <span className={isGroupAHigher ? "text-indigo-600 dark:text-indigo-400 font-medium" : "text-emerald-600 dark:text-emerald-400 font-medium"}>
                                    {contrast.absoluteDifference} percentage points higher in {dominantGroup}
                                </span>
                                <ContrastEvidence
                                    absoluteDifference={contrast.absoluteDifference}
                                    smoothedDifference={contrast.smoothedDifference ?? 0}
                                    precision={contrast.precision ?? 0}
                                    coverage={contrast.coverage ?? 0}
                                    cohensH={contrast.cohensH ?? 0}
                                    groupATotal={contrast.groupAAnswered}
                                    groupBTotal={contrast.groupBAnswered}
                                    corpusTotal={diff.corpusTotalAnswered}
                                />
                            </div>
                            {contrast.indicators?.some(i => i.kind === 'rare_response') && (
                                <span className="text-amber-600 dark:text-amber-500 font-medium mt-1">Rare response · {contrast.totalSelectedCategoryCount} selected stories</span>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-3 text-xs text-muted-foreground bg-slate-50 dark:bg-slate-950 p-3 rounded space-y-2">
                <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 space-y-1">
                        <div className="font-semibold text-slate-700 dark:text-slate-300">Within {groupAName} and {groupBName}</div>
                        <div>
                            {diff.questionId === PARTICIPANT_FEELING_FIELD_ID ? (
                                isGroupAHigher 
                                    ? `${contrast.groupACount} of ${contrast.totalSelectedCategoryCount} stories with the participant-selected feeling "${contrast.category.charAt(0).toUpperCase() + contrast.category.slice(1)}" are in ${groupAName} (${contrast.concentrationA}%).`
                                    : `${contrast.groupBCount} of ${contrast.totalSelectedCategoryCount} stories with the participant-selected feeling "${contrast.category.charAt(0).toUpperCase() + contrast.category.slice(1)}" are in ${groupBName} (${contrast.concentrationB}%).`
                            ) : (
                                isGroupAHigher 
                                    ? `${contrast.groupACount} of ${contrast.totalSelectedCategoryCount} "${contrast.category}" respondents are in ${groupAName} (${contrast.concentrationA}%).`
                                    : `${contrast.groupBCount} of ${contrast.totalSelectedCategoryCount} "${contrast.category}" respondents are in ${groupBName} (${contrast.concentrationB}%).`
                            )}
                        </div>
                    </div>
                    <button 
                        onClick={(e) => { e.stopPropagation(); setShowInfo(!showInfo); }}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 flex items-center gap-1 mt-1"
                        aria-label={`Show details for "${contrast.category}"`}
                        title={`Details for "${contrast.category}"`}
                    >
                        {showInfo ? '- details' : '+ details'}
                    </button>
                </div>
                {showInfo && (
                    <div className="text-slate-600 dark:text-slate-400 pt-3 mt-3 border-t border-slate-200 dark:border-slate-800 space-y-3 cursor-default" onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-1">
                            <div className="font-semibold text-slate-700 dark:text-slate-300">Across all respondents</div>
                            <div>
                                {isGroupAHigher
                                    ? `${contrast.groupACount} of ${contrast.corpusTotalCategoryCount} "${contrast.category}" respondents are in ${groupAName} (${contrast.corpusConcentrationA}%).`
                                    : `${contrast.groupBCount} of ${contrast.corpusTotalCategoryCount} "${contrast.category}" respondents are in ${groupBName} (${contrast.corpusConcentrationB}%).`
                                }
                            </div>
                            <div>{contrast.corpusTotalCategoryCount - contrast.totalSelectedCategoryCount} "{contrast.category}" respondents are outside {groupAName} and {groupBName}.</div>
                        </div>

                        {absDerivedDifference >= 15 && !isInsufficient && (
                            <div className="space-y-1 pt-2">
                                <div className="font-semibold text-slate-700 dark:text-slate-300">How unusual is this?</div>
                                <div>
                                    {dominantGroup} contains {dominantShareOfCorpus}% of respondents who answered &ldquo;{diff.questionText}&rdquo; but {dominantConcentration}% of "{contrast.category}" respondents.
                                </div>
                                <div className="mt-1 text-indigo-700 dark:text-indigo-400 font-medium">
                                    That is a {absDerivedDifference} percentage-point difference.
                                </div>
                            </div>
                        )}
                        
                        {contrast.indicators?.some(i => i.kind === 'rare_response') && (
                            <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
                                <div className="font-semibold text-amber-700 dark:text-amber-500">Why "Rare response"?</div>
                                <div>
                                    Only {contrast.totalSelectedCategoryCount} stories in the selected groups included &ldquo;{contrast.category}&rdquo; as their response:
                                    <ul className="list-disc ml-4 mt-1">
                                        <li>{groupAName}: {contrast.groupACount} of {contrast.groupAAnswered} respondents ({contrast.groupAPercentage}%)</li>
                                        <li>{groupBName}: {contrast.groupBCount} of {contrast.groupBAnswered} respondents ({contrast.groupBPercentage}%)</li>
                                    </ul>
                                    The observed {contrast.absoluteDifference}-percentage-point difference can change substantially if one or two additional stories select this response. Treat this as a minority perspective to inspect, rather than a stable group-level pattern.
                                </div>
                            </div>
                        )}
                        
                        {diff.indicators?.some(i => i.kind === 'early_signal') && (
                            <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
                                <div className="font-semibold text-amber-700 dark:text-amber-500">Why "Early signal"?</div>
                                <div>
                                    {(() => {
                                        const ind = diff.indicators.find(i => i.kind === 'early_signal') as Extract<typeof diff.indicators[number], { kind: 'early_signal' }>;
                                        return `A visible response pattern meets this workspace's comparison threshold, but one selected group has fewer than ${ind.minimumGroupSize} valid responses. Inspect the linked stories before treating it as a stable group-level pattern.`;
                                    })()}
                                </div>
                            </div>
                        )}

                        {diff.indicators?.some(i => i.kind === 'partial_coverage') && (
                            <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
                                <div className="font-semibold text-amber-700 dark:text-amber-500">Why "Partial response coverage"?</div>
                                <div>
                                    {(() => {
                                        const ind = diff.indicators.find(i => i.kind === 'partial_coverage') as Extract<typeof diff.indicators[number], { kind: 'partial_coverage' }>;
                                        if (ind.isSevere) {
                                            return `Only ${ind.validA} of ${ind.totalA} ${groupAName} stories and ${ind.validB} of ${ind.totalB} ${groupBName} stories included a valid response. Treat this comparison as describing a partial subset.`;
                                        }
                                        return `${ind.validA} of ${ind.totalA} ${groupAName} stories and ${ind.validB} of ${ind.totalB} ${groupBName} stories included a valid response. This finding describes only the stories with responses to this question.`;
                                    })()}
                                </div>
                            </div>
                        )}

                        {diff.indicators?.some(i => i.kind === 'groups_overlap') && (
                            <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
                                <div className="font-semibold text-amber-700 dark:text-amber-500">Why "Groups overlap"?</div>
                                <div>
                                    {(() => {
                                        const ind = diff.indicators.find(i => i.kind === 'groups_overlap') as Extract<typeof diff.indicators[number], { kind: 'groups_overlap' }>;
                                        return `${ind.sharedStoryCount} ${ind.sharedStoryCount === 1 ? 'story appears' : 'stories appear'} in both ${groupAName} and ${groupBName}. They contribute to both group summaries, so this is not a comparison of mutually exclusive sets.`;
                                    })()}
                                </div>
                            </div>
                        )}

                        {diff.indicators?.some(i => i.kind === 'insufficient_responses') && (
                            <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
                                <div className="font-semibold text-slate-700 dark:text-slate-300">Why "Insufficient responses"?</div>
                                <div>
                                    {(() => {
                                        const ind = diff.indicators.find(i => i.kind === 'insufficient_responses') as Extract<typeof diff.indicators[number], { kind: 'insufficient_responses' }>;
                                        return `One or both groups have fewer than ${ind.hardMinimum} valid responses (the statistical minimum). We cannot confidently rank or compare typical positions.`;
                                    })()}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export const ComparisonWorkspaceDialog: React.FC<ComparisonWorkspaceDialogProps> = ({
    isOpen,
    onOpenChange,
    context,
    stories,
    questionText,
    driftNotice,
    isPublic
}) => {
    const isReadOnly = isPublic === true;
    const [overlapMode, setOverlapMode] = useState<"include_shared" | "exclude_shared">("include_shared");
    const [selectedContrast, setSelectedContrast] = useState<{ questionId: string, category: string } | null>(null);
    const [selectedContinuous, setSelectedContinuous] = useState<{ kind: "slider" | "triangle", questionId: number | string } | null>(null);
    const [groupAName, setGroupAName] = useState(context?.groups[0].triangleQuestionLabel || "Group A");
    const [groupBName, setGroupBName] = useState(context?.groups[1].triangleQuestionLabel || "Group B");
    
    // Save state
    const [comparisonTitle, setComparisonTitle] = useState(context?.savedComparisonTitle || "Untitled Comparison");
    const { activeProject } = useProject();
    const createMutation = useCreateSavedComparison();
    const updateMutation = useUpdateSavedComparison();
    
    // Derived state
    const isSaved = !!context?.savedComparisonId;
    const isSaving = createMutation.isPending || updateMutation.isPending;

    // Compute metadata map from stories
    const metadataMap = useMemo(() => {
        const map = new Map<string, StoryMetadata>();
        stories.forEach(s => {
            map.set(String(s.id), {
                participantResponses: s.participantResponses,
                sliderResponses: s.sliderResponses,
                triangleResponses: s.triangleResponses,
                feeling: s.feeling,
                feelingSentiment: s.feelingSentiment
            });
        });
        return map;
    }, [stories]);

    const handleSave = async (isNew: boolean = false) => {
        if (isReadOnly || !context || !activeProject) return;

        const payload = {
            project_id: activeProject.id,
            name: comparisonTitle,
            analysis_type: context.source === 'triangle_selection' ? 'triangle' : 'slider',
            primary_question_id: context.questionId,
            secondary_question_id: context.secondaryQuestionId || null,
            question_label: questionText,
            group_a_name: groupAName,
            group_b_name: groupBName,
            group_a_story_ids: context.groups[0].storyIds,
            group_b_story_ids: context.groups[1].storyIds,
            source_snapshot: {
                groupACountAtSave: context.groups[0].storyIds.length,
                groupBCountAtSave: context.groups[1].storyIds.length,
                sharedCountAtSave: context.sharedStoryIds.length,
            },
            comparison_engine_version: 'v1'
        };

        try {
            if (isSaved && !isNew) {
                await updateMutation.mutateAsync({ id: context.savedComparisonId!, updates: payload });
            } else {
                const res = await createMutation.mutateAsync(payload);
                // Update context in place so it feels "saved"
                context.savedComparisonId = res.id;
                context.savedComparisonTitle = res.name;
            }
        } catch (_err) {
            // Error handled by hook toast
        }
    };

    // Calculate contrasts
    const differences = useMemo(() => {
        if (!context) return [];
        
        return calculateCategoricalDifferences({
            groupAStoryIds: context.groups[0].storyIds,
            groupBStoryIds: context.groups[1].storyIds,
            sharedStoryIds: context.sharedStoryIds,
            overlapMode,
            metadataMap,
            policies: DEFAULT_POLICY
        });
    }, [context, overlapMode, metadataMap]);

    const feelingData = useMemo(() => {
        if (!context) return null;
        return buildFeelingComparisonSection(
            differences,
            metadataMap,
            context.groups[0].storyIds,
            context.groups[1].storyIds,
            overlapMode,
            context.sharedStoryIds
        );
    }, [differences, metadataMap, context, overlapMode]);

    const normalCategoricalDifferences = useMemo(() => {
        return differences.filter(d => 
            d.questionId !== FEELING_GROUP_FIELD_ID && 
            d.questionId !== PARTICIPANT_FEELING_FIELD_ID
        );
    }, [differences]);

    const continuousDifferences = useMemo(() => {
        if (!context) return { sliders: [], triangles: [] };
        
        return calculateContinuousDifferences({
            groupAStoryIds: context.groups[0].storyIds,
            groupBStoryIds: context.groups[1].storyIds,
            sharedStoryIds: context.sharedStoryIds,
            overlapMode,
            metadataMap,
            policies: DEFAULT_POLICY
        });
    }, [context, overlapMode, metadataMap]);

    const groupA = context?.groups[0];
    const groupB = context?.groups[1];
    const sharedCount = context?.sharedStoryIds.length || 0;

    // Optimization: Create a lookup map for stories to reduce time complexity from O(N*M) to O(N+M)
    const storiesMap = useMemo(() => {
        const map = new Map<string, Story>();
        for (const story of stories) {
            map.set(String(story.id), story);
        }
        return map;
    }, [stories]);

    // Filter stories for Section 3 based on active contrast filter
    const displayStoriesA = useMemo(() => {
        if (!groupA || !context) return [];
        let ids = groupA.storyIds;
        if (overlapMode === "exclude_shared") {
            ids = ids.filter(id => !context.sharedStoryIds.includes(id));
        }
        
        let filtered = ids.map(id => storiesMap.get(id)).filter(Boolean) as Story[];
        
        if (selectedContrast) {
            filtered = filtered.filter(s => {
                if (selectedContrast.questionId === PARTICIPANT_FEELING_FIELD_ID) {
                    return s.feeling?.trim() === selectedContrast.category;
                }
                if (selectedContrast.questionId === FEELING_GROUP_FIELD_ID) {
                    const fg = getFeelingGroup({ feeling: s.feeling, feelingSentiment: s.feelingSentiment });
                    return s.feeling && fg === selectedContrast.category;
                }
                const pr = s.participantResponses?.find(r => String(r.question_id) === String(selectedContrast.questionId));
                return pr && pr.response === selectedContrast.category;
            });
        }
        
        if (selectedContinuous) {
            filtered = filtered.filter(s => {
                if (selectedContinuous.kind === "slider") {
                    return s.sliderResponses?.some(r => String(r.question_id) === String(selectedContinuous.questionId) && r.response_type === "answered");
                }
                if (selectedContinuous.kind === "triangle") {
                    return s.triangleResponses?.some(r => String(r.question_id) === String(selectedContinuous.questionId) && r.response_type === "answered");
                }
                return true;
            });

            if (selectedContinuous.kind === "slider") {
                filtered.sort((a, b) => {
                    const valA = a.sliderResponses?.find(r => String(r.question_id) === String(selectedContinuous.questionId))?.value ?? 50;
                    const valB = b.sliderResponses?.find(r => String(r.question_id) === String(selectedContinuous.questionId))?.value ?? 50;
                    return valA - valB;
                });
            }
        }
        
        return filtered;
    }, [groupA, context, overlapMode, selectedContrast, selectedContinuous, storiesMap]);

    const displayStoriesB = useMemo(() => {
        if (!groupB || !context) return [];
        let ids = groupB.storyIds;
        if (overlapMode === "exclude_shared") {
            ids = ids.filter(id => !context.sharedStoryIds.includes(id));
        }
        
        let filtered = ids.map(id => storiesMap.get(id)).filter(Boolean) as Story[];
        
        if (selectedContrast) {
            filtered = filtered.filter(s => {
                if (selectedContrast.questionId === PARTICIPANT_FEELING_FIELD_ID) {
                    return s.feeling?.trim() === selectedContrast.category;
                }
                if (selectedContrast.questionId === FEELING_GROUP_FIELD_ID) {
                    const fg = getFeelingGroup({ feeling: s.feeling, feelingSentiment: s.feelingSentiment });
                    return s.feeling && fg === selectedContrast.category;
                }
                const pr = s.participantResponses?.find(r => String(r.question_id) === String(selectedContrast.questionId));
                return pr && pr.response === selectedContrast.category;
            });
        }

        if (selectedContinuous) {
            filtered = filtered.filter(s => {
                if (selectedContinuous.kind === "slider") {
                    return s.sliderResponses?.some(r => String(r.question_id) === String(selectedContinuous.questionId) && r.response_type === "answered");
                }
                if (selectedContinuous.kind === "triangle") {
                    return s.triangleResponses?.some(r => String(r.question_id) === String(selectedContinuous.questionId) && r.response_type === "answered");
                }
                return true;
            });

            if (selectedContinuous.kind === "slider") {
                filtered.sort((a, b) => {
                    const valA = a.sliderResponses?.find(r => String(r.question_id) === String(selectedContinuous.questionId))?.value ?? 50;
                    const valB = b.sliderResponses?.find(r => String(r.question_id) === String(selectedContinuous.questionId))?.value ?? 50;
                    return valA - valB;
                });
            }
        }
        return filtered;
    }, [groupB, context, overlapMode, selectedContrast, selectedContinuous, storiesMap]);

    if (!context || !groupA || !groupB) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent aria-describedby={undefined} className="max-w-[95vw] w-full h-[90vh] max-h-[90vh] flex flex-col p-0 overflow-hidden bg-slate-50 dark:bg-slate-950">
                {driftNotice && (
                    <div className="bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-400 border-b border-amber-200 dark:border-amber-800 px-6 py-2 text-sm flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold">Notice:</span> {driftNotice}
                        </div>
                    </div>
                )}
                <DialogHeader className="px-6 py-4 border-b border-border bg-white dark:bg-slate-900 shrink-0 flex flex-row items-start justify-between">
                    <DialogTitle className="sr-only">Comparison Workspace</DialogTitle>
                    <div>
                        {isReadOnly ? (
                            <div className="flex min-w-0 items-center gap-3">
                                <span className="block w-[400px] truncate text-xl font-semibold">
                                    {comparisonTitle}
                                </span>
                                {isSaved && (
                                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">Saved View</Badge>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <input 
                                    type="text"
                                    value={comparisonTitle}
                                    onChange={(e) => setComparisonTitle(e.target.value)}
                                    className="text-xl font-semibold bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none px-1 -ml-1 transition-colors w-[400px]"
                                    placeholder="Untitled Comparison"
                                />
                                {isSaved ? (
                                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">Saved</Badge>
                                ) : (
                                    <Badge variant="outline" className="text-slate-500">Unsaved</Badge>
                                )}
                            </div>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                            Selected from: <span className="font-medium text-foreground">{questionText}</span>
                        </p>
                    </div>
                    {!isReadOnly && (
                        <div className="flex items-center gap-2 mr-8">
                            {isSaved && (
                                <Button variant="outline" size="sm" onClick={() => void handleSave(true)} disabled={isSaving}>
                                    Save as new
                                </Button>
                            )}
                            <Button size="sm" onClick={() => void handleSave(false)} disabled={isSaving} className="gap-2">
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : (isSaved ? <SaveAll className="w-4 h-4" /> : <Save className="w-4 h-4" />)}
                                {isSaved ? 'Update saved comparison' : 'Save comparison'}
                            </Button>
                        </div>
                    )}
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                    {/* LEFT PANEL: Context & Contrasts */}
                    <div className="w-full lg:w-[500px] xl:w-[550px] shrink-0 border-r border-border bg-white dark:bg-slate-900 flex flex-col overflow-hidden">
                        
                        {/* Section 1: Context */}
                        <div className="p-5 border-b border-border">
                            <div className="flex items-center justify-between mb-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-indigo-500" />
                                        <input type="text" value={groupAName} onChange={(e) => setGroupAName(e.target.value)} className="font-medium bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none w-32 px-1 py-0.5 -ml-1 rounded transition-colors" />
                                        <span className="text-sm text-muted-foreground">· {groupA.storyIds.length} stories</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                        <input type="text" value={groupBName} onChange={(e) => setGroupBName(e.target.value)} className="font-medium bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:outline-none w-32 px-1 py-0.5 -ml-1 rounded transition-colors" />
                                        <span className="text-sm text-muted-foreground">· {groupB.storyIds.length} stories</span>
                                    </div>
                                </div>
                            </div>

                            {sharedCount > 0 && (
                                <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800/50 p-3 rounded-lg">
                                    <span className="text-sm font-medium">{sharedCount} stories are in both selections</span>
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="overlap-mode" className="text-xs text-muted-foreground">Exclude shared</Label>
                                        <Switch 
                                            id="overlap-mode" 
                                            checked={overlapMode === "exclude_shared"}
                                            onCheckedChange={(c) => setOverlapMode(c ? "exclude_shared" : "include_shared")}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Section 2: Contrasts */}
                        <ScrollArea className="flex-1">
                            <div className="p-5 space-y-6">
                                <div>
                                    <h3 className="text-base font-semibold mb-1">Differences to inspect</h3>
                                    <p className="text-xs text-muted-foreground mb-4">
                                        Based on participant-provided responses. These describe the selections; they do not explain them.
                                    </p>
                                </div>

                                {selectedContrast && (
                                    <div className="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 p-3 rounded-lg flex items-center justify-between mb-4 border border-indigo-100 dark:border-indigo-900/50">
                                        <div className="text-sm font-medium">
                                            Filtered by: {selectedContrast.category}
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={() => setSelectedContrast(null)} className="h-6 px-2">Clear</Button>
                                    </div>
                                )}
                                {selectedContinuous && (
                                    <div className="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 p-3 rounded-lg flex items-center justify-between mb-4 border border-indigo-100 dark:border-indigo-900/50">
                                        <div className="text-sm font-medium">
                                            Filtered by: {selectedContinuous.kind} responses
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={() => setSelectedContinuous(null)} className="h-6 px-2">Clear</Button>
                                    </div>
                                )}

                                {(continuousDifferences.sliders.length > 0 || continuousDifferences.triangles.length > 0) && (
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-bold tracking-wider text-slate-500 uppercase">Continuous Interpretations</h4>
                                        <div className="space-y-3">
                                            {continuousDifferences.sliders.map(slider => (
                                                <ContinuousFindingRow 
                                                    key={`slider-${slider.questionId}`}
                                                    finding={slider}
                                                    groupAName={groupAName}
                                                    groupBName={groupBName}
                                                    groupATotal={groupA.storyIds.length}
                                                    groupBTotal={groupB.storyIds.length}
                                                    isSelected={selectedContinuous?.kind === 'slider' && String(selectedContinuous?.questionId) === String(slider.questionId)}
                                                    onSelect={() => {
                                                        setSelectedContrast(null);
                                                        setSelectedContinuous(prev => 
                                                            (prev?.kind === 'slider' && String(prev.questionId) === String(slider.questionId)) ? null : { kind: 'slider', questionId: slider.questionId }
                                                        );
                                                    }}
                                                />
                                            ))}
                                            {continuousDifferences.triangles.map(triangle => (
                                                <ContinuousFindingRow 
                                                    key={`triangle-${triangle.questionId}`}
                                                    finding={triangle}
                                                    groupAName={groupAName}
                                                    groupBName={groupBName}
                                                    groupATotal={groupA.storyIds.length}
                                                    groupBTotal={groupB.storyIds.length}
                                                    isSelected={selectedContinuous?.kind === 'triangle' && String(selectedContinuous?.questionId) === String(triangle.questionId)}
                                                    onSelect={() => {
                                                        setSelectedContrast(null);
                                                        setSelectedContinuous(prev => 
                                                            (prev?.kind === 'triangle' && String(prev.questionId) === String(triangle.questionId)) ? null : { kind: 'triangle', questionId: triangle.questionId }
                                                        );
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {feelingData && (
                                    <div className="mt-8 mb-8">
                                        <FeelingComparisonSection 
                                            data={feelingData}
                                            groupALabel={groupAName}
                                            groupBLabel={groupBName}
                                            selectedContrast={selectedContrast}
                                            onSelectFinding={(questionId, category) => {
                                                setSelectedContinuous(null);
                                                if (selectedContrast?.questionId === questionId && selectedContrast.category === category) {
                                                    setSelectedContrast(null);
                                                } else {
                                                    setSelectedContrast({ questionId, category });
                                                }
                                            }}
                                            renderContrastRow={(contrast, diff, isSelected, onSelect) => (
                                                <ContrastRow 
                                                    key={contrast.category}
                                                    contrast={contrast}
                                                    diff={diff}
                                                    isSelected={isSelected}
                                                    groupAName={groupAName}
                                                    groupBName={groupBName}
                                                    onSelect={onSelect}
                                                />
                                            )}
                                        />
                                    </div>
                                )}

                                <div className="space-y-4 mt-8">
                                    <h4 className="text-sm font-bold tracking-wider text-slate-500 uppercase">Categorical Responses</h4>
                                    
                                    {normalCategoricalDifferences.length === 0 ? (
                                        <div className="text-center py-4 text-sm text-muted-foreground">
                                            No significant categorical differences found between these groups.
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {normalCategoricalDifferences.map(diff => (
                                                <div key={diff.questionId} className="space-y-3">
                                                    <div className="space-y-1">
                                                        <h4 className={`text-sm font-semibold text-slate-700 dark:text-slate-300 ${diff.indicators?.some(i => i.kind === 'insufficient_responses') ? 'opacity-60' : ''}`}>
                                                            {diff.questionText}
                                                        </h4>
                                                        {diff.indicators && diff.indicators.length > 0 && (
                                                            <div className={`text-xs text-muted-foreground ${diff.indicators.some(i => i.kind === 'insufficient_responses') ? 'opacity-60' : ''}`}>
                                                                {diff.indicators.some(i => i.kind === 'insufficient_responses') && <span className="text-slate-500 font-medium mr-2">Insufficient responses</span>}
                                                                {!diff.indicators.some(i => i.kind === 'insufficient_responses') && (() => {
                                                                    const isEarlySignal = diff.indicators.some(i => i.kind === 'early_signal');
                                                                    const hasPartialCoverage = diff.indicators.some(i => i.kind === 'partial_coverage');
                                                                    const hasOverlap = diff.indicators.some(i => i.kind === 'groups_overlap');

                                                                    const primaryIndicator = isEarlySignal ? 'early_signal' : null;
                                                                    const secondaryIndicator = hasPartialCoverage ? 'partial_coverage' : (hasOverlap ? 'groups_overlap' : null);
                                                                    const displayIndicators = [primaryIndicator, secondaryIndicator].filter(Boolean) as string[];

                                                                    return displayIndicators.map(kind => {
                                                                        let text = "";
                                                                        let colorClass = "text-amber-600 dark:text-amber-500";
                                                                        
                                                                        if (kind === 'early_signal') {
                                                                            text = "Early signal";
                                                                        }
                                                                        else if (kind === 'partial_coverage') {
                                                                            const ind = diff.indicators!.find(i => i.kind === 'partial_coverage') as Extract<typeof diff.indicators[number], { kind: 'partial_coverage' }>;
                                                                            if (ind.isSevere) {
                                                                                text = "Limited response coverage";
                                                                                colorClass = "text-red-600 dark:text-red-500";
                                                                            }
                                                                            else if (ind.group === 'both') text = "Partial coverage in both groups";
                                                                            else text = `Partial coverage in ${ind.group === 'A' ? groupAName : groupBName}`;
                                                                        }
                                                                        else if (kind === 'groups_overlap') {
                                                                            const ind = diff.indicators!.find(i => i.kind === 'groups_overlap') as Extract<typeof diff.indicators[number], { kind: 'groups_overlap' }>;
                                                                            if (ind.isSubstantial) text = "Substantial group overlap";
                                                                            else text = "Groups overlap";
                                                                        }
                                                                        
                                                                        return <span key={kind} className={`${colorClass} font-medium mr-2`}>{text}</span>;
                                                                    });
                                                                })()}
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="space-y-3">
                                                        {diff.contrasts.map(contrast => {
                                                            const isSelected = selectedContrast?.questionId === diff.questionId && selectedContrast?.category === contrast.category;
                                                            
                                                            return (
                                                                <ContrastRow 
                                                                    key={contrast.category}
                                                                    contrast={contrast}
                                                                    diff={diff}
                                                                    isSelected={isSelected}
                                                                    groupAName={groupAName}
                                                                    groupBName={groupBName}
                                                                    onSelect={() => {
                                                                        setSelectedContinuous(null);
                                                                        setSelectedContrast(isSelected ? null : { questionId: diff.questionId, category: contrast.category });
                                                                    }}
                                                                />
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </ScrollArea>
                    </div>

                    {/* RIGHT PANEL: Stories to Inspect */}
                    <div className="flex-1 bg-slate-50 dark:bg-slate-950 flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-border bg-white dark:bg-slate-900 shrink-0">
                            <h3 className="text-base font-semibold">Stories to inspect</h3>
                        </div>
                        
                        <div className="flex-1 overflow-hidden grid grid-cols-2 gap-px bg-border">
                            {/* Group A Stories */}
                            <div className="bg-slate-50 dark:bg-slate-950 overflow-hidden flex flex-col">
                                <div className="p-3 border-b border-border bg-white/50 dark:bg-slate-900/50 shrink-0 flex items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
                                    <span className="font-medium text-sm text-indigo-700 dark:text-indigo-400">{groupAName}</span>
                                    <Badge variant="secondary">{displayStoriesA.length} stories</Badge>
                                </div>
                                <ScrollArea className="flex-1 p-4">
                                    <div className="space-y-4">
                                        {displayStoriesA.map(story => {
                                            const sliderVal = selectedContinuous?.kind === 'slider' 
                                                ? story.sliderResponses?.find(r => String(r.question_id) === String(selectedContinuous.questionId))?.value
                                                : undefined;
                                                
                                            return (
                                                <div key={story.id} className="relative">
                                                    <StoryCard story={story} view="list" isPublic={isPublic} />
                                                    {sliderVal !== undefined && sliderVal !== null && (
                                                        <div className="absolute top-2 left-2 -mt-3 -ml-2 bg-indigo-600 text-white dark:bg-indigo-500 text-xs font-bold px-2 py-0.5 rounded-md shadow-md z-10 border border-indigo-700 dark:border-indigo-400">
                                                            Score: {sliderVal}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        {displayStoriesA.length === 0 && (
                                            <p className="text-sm text-muted-foreground text-center py-8">No stories match this filter in {groupAName}.</p>
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>
                            
                            {/* Group B Stories */}
                            <div className="bg-slate-50 dark:bg-slate-950 overflow-hidden flex flex-col">
                                <div className="p-3 border-b border-border bg-white/50 dark:bg-slate-900/50 shrink-0 flex items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
                                    <span className="font-medium text-sm text-emerald-700 dark:text-emerald-400">{groupBName}</span>
                                    <Badge variant="secondary">{displayStoriesB.length} stories</Badge>
                                </div>
                                <ScrollArea className="flex-1 p-4">
                                    <div className="space-y-4">
                                        {displayStoriesB.map(story => {
                                            const sliderVal = selectedContinuous?.kind === 'slider' 
                                                ? story.sliderResponses?.find(r => String(r.question_id) === String(selectedContinuous.questionId))?.value
                                                : undefined;
                                                
                                            return (
                                                <div key={story.id} className="relative">
                                                    <StoryCard story={story} view="list" isPublic={isPublic} />
                                                    {sliderVal !== undefined && sliderVal !== null && (
                                                        <div className="absolute top-2 left-2 -mt-3 -ml-2 bg-emerald-600 text-white dark:bg-emerald-500 text-xs font-bold px-2 py-0.5 rounded-md shadow-md z-10 border border-emerald-700 dark:border-emerald-400">
                                                            Score: {sliderVal}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        {displayStoriesB.length === 0 && (
                                            <p className="text-sm text-muted-foreground text-center py-8">No stories match this filter in {groupBName}.</p>
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
