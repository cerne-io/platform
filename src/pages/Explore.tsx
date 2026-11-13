
import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import SearchFilter from "@/components/explore/SearchFilter";
import ExploreHeader from "@/components/explore/ExploreHeader";
import StoriesContent from "@/components/explore/StoriesContent";
import StoryDialog from "@/components/explore/StoryDialog";
import { useStoriesQuery } from "@/hooks/queries/useStoriesQuery";
import { Story } from "@/types/story";
import {
  getFeelingColor,
  formatDate
} from "@/utils/story/formattingUtils";
import {
  convertStoriesToCSV,
  downloadCSV
} from "@/utils/story/csvExportUtils";
import { useProject } from "@/contexts/ProjectContext";
import { useToast } from "@/hooks/toast";

const STORIES_PER_PAGE = 6;

const Explore = () => {
  const { activeProject } = useProject();
  const { data: stories = [], isLoading, refetch } = useStoriesQuery();
  const [searchParams, setSearchParams] = useSearchParams();

  // Derived state from URL params
  const searchTerm = searchParams.get("q") || "";
  const view = (searchParams.get("view") as "grid" | "list") || "grid";
  // Fix: explicitly type the filter or fallback to 'all'
  const validFilters = ["all", "positive", "neutral", "negative", "saved"];
  const paramFilter = searchParams.get("filter");
  const filter = (validFilters.includes(paramFilter || "") ? paramFilter : "all") as "all" | "positive" | "neutral" | "negative" | "saved";

  // Story ID for deep linking
  const deepLinkStoryId = searchParams.get("storyId");

  const [currentPage, setCurrentPage] = useState(1);
  const [savedStoryIds, setSavedStoryIds] = useState<Record<string | number, boolean>>(() => {
    try {
      const saved = localStorage.getItem('savedStories');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Listen for cross-component saves in the same tab
  useEffect(() => {
    const handleStorageUpdate = () => {
      try {
        const saved = localStorage.getItem('savedStories');
        if (saved) setSavedStoryIds(JSON.parse(saved));
      } catch (error) {
        console.error("Failed to parse saved stories", error);
      }
    };
    window.addEventListener('savedStoriesUpdated', handleStorageUpdate);
    return () => window.removeEventListener('savedStoriesUpdated', handleStorageUpdate);
  }, []);

  const { toast } = useToast();

  // Handle toggling save state
  const handleToggleSave = useCallback((storyId: number | string, isSaved: boolean) => {
    setSavedStoryIds(prev => {
      const updated = { ...prev };
      if (isSaved) {
        updated[storyId] = true;
      } else {
        delete updated[storyId];
      }

      // Save to localStorage
      localStorage.setItem('savedStories', JSON.stringify(updated));
      // Notify other components
      window.dispatchEvent(new Event('savedStoriesUpdated'));
      
      return updated;
    });

    // If we're on the saved filter and unsaving a story, refresh the filtered list
    if (filter === "saved") {
      setCurrentPage(1);
    }
  }, [filter]);

  // Add isSaved property to stories and filter - memoize this operation
  const filteredStories = useMemo(() => {
    const result = [];
    const lowerSearchTerm = searchTerm ? searchTerm.toLowerCase() : "";

    for (let i = 0; i < stories.length; i++) {
      const story = stories[i];
      let matchesSearch = true;

      if (searchTerm) {
        matchesSearch = story.title.toLowerCase().includes(lowerSearchTerm) ||
          story.text.toLowerCase().includes(lowerSearchTerm);
      }

      if (!matchesSearch) continue;

      const isSaved = !!savedStoryIds[story.id];
      let matchesFilter = true;
      
      if (filter === "positive") {
        matchesFilter = story.feelingSentiment === "positive";
      } else if (filter === "neutral") {
        matchesFilter = story.feelingSentiment === "neutral";
      } else if (filter === "negative") {
        matchesFilter = story.feelingSentiment === "negative";
      } else if (filter === "saved") {
        matchesFilter = isSaved;
      }

      if (matchesFilter) {
        result.push({ ...story, isSaved });
      }
    }

    return result;
  }, [stories, searchTerm, filter, savedStoryIds]);

  // Calculate pagination values - memoize
  const { totalPages, paginatedStories } = useMemo(() => {
    const total = Math.ceil(filteredStories.length / STORIES_PER_PAGE);
    const paginated = filteredStories.slice(
      (currentPage - 1) * STORIES_PER_PAGE,
      currentPage * STORIES_PER_PAGE
    );

    return {
      totalPages: total,
      paginatedStories: paginated
    };
  }, [filteredStories, currentPage]);

  // Filter change handler
  const handleFilterChange = useCallback((newFilter: "all" | "positive" | "neutral" | "negative" | "saved") => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (newFilter === "all") {
        newParams.delete("filter");
      } else {
        newParams.set("filter", newFilter);
      }
      return newParams;
    });
    setCurrentPage(1);
  }, [setSearchParams]);

  // Search change handler
  const handleSearchChange = useCallback((newSearchTerm: string) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (newSearchTerm) {
        newParams.set("q", newSearchTerm);
      } else {
        newParams.delete("q");
      }
      return newParams;
    });
    setCurrentPage(1);
  }, [setSearchParams]);

  // View change handler
  const handleViewChange = useCallback((newView: "grid" | "list") => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set("view", newView);
      return newParams;
    });
  }, [setSearchParams]);

  // Import success handler
  const handleImportSuccess = useCallback(() => {
    void refetch();
    toast({
      title: "Stories imported",
      description: "Your stories have been imported and the list has been updated.",
    });
  }, [refetch, toast]);

  // Story delete handler
  const handleStoryDelete = useCallback(async () => {
    await refetch();
    toast({
      title: "Stories updated",
      description: "The story list has been refreshed after deletion.",
    });

    // Adjust the current page if we're on the last page and it becomes empty
    if (paginatedStories.length === 1 && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  }, [refetch, toast, paginatedStories.length, currentPage]);

  // CSV export handler
  const exportToCSV = useCallback((stories: Story[]) => {
    // Cast to unknown[] as the CSV utility handles the object structure
    const csvContent = convertStoriesToCSV(stories as unknown as Record<string, unknown>[]);
    const fileName = `cerne-stories-${activeProject?.name || 'project'}-${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(csvContent, fileName);
  }, [activeProject?.name]);

  // Find the deep-linked story if ID exists
  const deepLinkedStory = useMemo(() => {
    if (!deepLinkStoryId) return null;
    return stories.find(s => String(s.id) === deepLinkStoryId);
  }, [deepLinkStoryId, stories]);

  // Handler to close deep linked story
  const handleCloseDeepLink = useCallback(() => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.delete("storyId");
      return newParams;
    });
  }, [setSearchParams]);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
      <ExploreHeader
        filteredStories={filteredStories}
        onImportSuccess={handleImportSuccess}
        exportToCSV={exportToCSV}
      />

      <SearchFilter
        searchTerm={searchTerm}
        setSearchTerm={handleSearchChange}
        view={view}
        setView={handleViewChange}
        filter={filter}
        setFilter={handleFilterChange}
      />

      <StoriesContent
        isLoading={isLoading}
        filteredStories={filteredStories}
        paginatedStories={paginatedStories}
        allStoriesEmpty={stories.length === 0}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        view={view}
        projectName={activeProject?.name}
        getFeelingColor={getFeelingColor}
        formatDate={formatDate}
        onStoryDelete={() => void handleStoryDelete()}
        onToggleSave={handleToggleSave}
      />

      {/* Global Story Dialog for Deep Linking */}
      {deepLinkedStory && (
        <StoryDialog
          story={deepLinkedStory}
          isOpen={!!deepLinkedStory}
          onClose={handleCloseDeepLink}
        />
      )}
    </div>
  );
};

export default Explore;
