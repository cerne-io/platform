import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { FolderHeart, Clock, ChevronRight } from 'lucide-react';
import { useSavedComparisonsQuery, SavedComparisonRow } from '@/hooks/comparisons/useSavedComparisons';
import { useProject } from '@/contexts/ProjectContext';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SavedComparisonsDrawerProps {
    projectId?: string;
    publicComparisons?: SavedComparisonRow[];
    isPublic?: boolean;
}

export const SavedComparisonsDrawer = ({
    projectId,
    publicComparisons = [],
    isPublic = false,
}: SavedComparisonsDrawerProps) => {
    const { activeProject } = useProject();
    const effectiveProjectId = projectId ?? activeProject?.id;

    const { data: queriedComparisons = [], isLoading } = useSavedComparisonsQuery(
        isPublic ? undefined : effectiveProjectId
    );
    
    const [searchParams, setSearchParams] = useSearchParams();
    const [isOpen, setIsOpen] = React.useState(false);

    const comparisons = isPublic ? publicComparisons : queriedComparisons;

    const handleOpenComparison = (id: string) => {
        // Set the loadComparison query param
        const newParams = new URLSearchParams(searchParams);
        newParams.set('loadComparison', id);
        

        newParams.set('t', Date.now().toString());

        setSearchParams(newParams);
        setIsOpen(false);
    };

    if (!isPublic && !effectiveProjectId) return null;

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2 dark:text-white dark:border-white/20 dark:hover:bg-white/5">
                    <FolderHeart className="h-4 w-4 text-indigo-500" />
                    Saved Comparisons {comparisons.length > 0 && `(${comparisons.length})`}
                </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:max-w-[500px] flex flex-col p-0">
                <SheetHeader className="p-6 border-b border-border bg-slate-50 dark:bg-slate-900 shrink-0">
                    <SheetTitle>Saved Comparisons</SheetTitle>
                    <SheetDescription>
                        Access your saved analytical views and observations.
                    </SheetDescription>
                </SheetHeader>
                
                <ScrollArea className="flex-1 p-6">
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading...</div>
                    ) : comparisons.length === 0 ? (
                        <div className="text-center py-8">
                            <FolderHeart className="h-12 w-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                            <p className="text-muted-foreground">You don't have any saved comparisons yet.</p>
                            <p className="text-sm text-muted-foreground mt-1">Select stories in the charts and click 'Compare' to save one.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {comparisons.map((c) => {
                                const snapshot = c.source_snapshot as Record<string, number> | null;
                                const groupA = c.group_a_name || 'Group A';
                                const groupB = c.group_b_name || 'Group B';
                                
                                return (
                                    <div 
                                        key={c.id} 
                                        className="group rounded-lg border border-border bg-white dark:bg-slate-900 p-4 hover:border-indigo-500 hover:shadow-sm transition-all cursor-pointer"
                                        onClick={() => handleOpenComparison(c.id)}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1">
                                                <h4 className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                    {c.name}
                                                </h4>
                                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <span className="capitalize">{c.analysis_type}</span>
                                                    <span>·</span>
                                                    <span>{c.question_label}</span>
                                                </p>
                                            </div>
                                            <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-indigo-500" />
                                        </div>
                                        
                                        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[80px]" title={groupA}>{groupA}</span>
                                                <span>({snapshot?.groupACountAtSave || c.group_a_story_ids.length})</span>
                                                <span className="mx-1">vs</span>
                                                <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[80px]" title={groupB}>{groupB}</span>
                                                <span>({snapshot?.groupBCountAtSave || c.group_b_story_ids.length})</span>
                                            </div>
                                            <div className="flex items-center gap-1" title={new Date(c.updated_at).toLocaleString()}>
                                                <Clock className="h-3 w-3" />
                                                <span>{formatDistanceToNow(new Date(c.updated_at))} ago</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
};
