import { useState, useCallback, useEffect } from 'react';
import { TriangleSelectionGroup, TriangleComparisonContext } from '../triangle/TriangleSelectionTypes';

export function useComparisonSelections(
    questionId: string | undefined, 
    projectId?: string, 
    initialContext?: TriangleComparisonContext | null,
    source: "triangle_selection" | "slider_selection" = "triangle_selection",
    secondaryQuestionId?: string
) {
    const [selectedStoryIds, setSelectedStoryIds] = useState<Set<string>>(new Set());
    const [groupA, setGroupA] = useState<TriangleSelectionGroup | null>(initialContext?.groups[0] || null);
    const [groupB, setGroupB] = useState<TriangleSelectionGroup | null>(initialContext?.groups[1] || null);
    const [isCompareDialogOpen, setIsCompareDialogOpen] = useState(!!initialContext);
    const [driftNotice, setDriftNotice] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (!initialContext) {
            setGroupA(null);
            setGroupB(null);
            setSelectedStoryIds(new Set());
            setIsCompareDialogOpen(false);
            setDriftNotice(undefined);
        }
    }, [questionId, projectId, initialContext]);

    useEffect(() => {
        if (initialContext) {
            setGroupA(initialContext.groups[0]);
            setGroupB(initialContext.groups[1]);
            setIsCompareDialogOpen(true);
        }
    }, [initialContext]);

    const handleClearSelection = useCallback(() => {
        setSelectedStoryIds(new Set());
    }, []);

    const handleSaveGroup = useCallback((groupId: 'A' | 'B') => {
        const storyIds = Array.from(selectedStoryIds);
        const newGroup: TriangleSelectionGroup = {
            id: groupId,
            storyIds,
            createdAt: new Date().toISOString(),
            selectionMethod: "drag_selection",
            questionId: String(questionId),
            projectId: projectId,
            selectionCount: storyIds.length
        };
        
        if (groupId === 'A') {
            setGroupA(newGroup);
        } else {
            setGroupB(newGroup);
        }
        
        handleClearSelection();
    }, [handleClearSelection, selectedStoryIds, questionId, projectId]);

    const handleClearGroup = useCallback((groupId: 'A' | 'B') => {
        if (groupId === 'A') {
            setGroupA(null);
        } else {
            setGroupB(null);
        }
    }, []);

    return {
        selectedStoryIds,
        setSelectedStoryIds,
        groupA,
        groupB,
        isCompareDialogOpen,
        setIsCompareDialogOpen,
        handleClearSelection,
        handleSaveGroup,
        handleClearGroup,
        driftNotice,
        setDriftNotice,
        activeComparisonContext: isCompareDialogOpen && groupA && groupB ? {
            source: initialContext?.source || source,
            questionId: String(questionId),
            secondaryQuestionId: initialContext?.secondaryQuestionId || secondaryQuestionId,
            groups: [groupA, groupB] as [TriangleSelectionGroup, TriangleSelectionGroup],
            sharedStoryIds: groupA.storyIds.filter(id => groupB.storyIds.includes(id)),
            savedComparisonId: initialContext?.savedComparisonId,
            savedComparisonTitle: initialContext?.savedComparisonTitle
        } as TriangleComparisonContext : null
    };
}
