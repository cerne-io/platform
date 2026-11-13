import { useProject } from "@/contexts/ProjectContext";
import ImportExportActions from "./ImportExportActions";
import { Story } from "@/types/story";

interface ExploreHeaderProps {
  filteredStories: Story[];
  onImportSuccess: () => void;
  exportToCSV: (stories: Story[]) => void;
}

const ExploreHeader = ({
  filteredStories,
  onImportSuccess,
  exportToCSV
}: ExploreHeaderProps) => {
  const {
    activeProject
  } = useProject();

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-3">
        <div className="space-y-1">
          <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-[-0.03em] text-foreground [text-wrap:balance]">
            Explore Narratives
          </h1>
          {activeProject && (
            <p className="text-sm text-muted-foreground">
              Project: <span className="font-medium text-foreground">{activeProject.name}</span>
            </p>
          )}
        </div>
        <ImportExportActions
          filteredStories={filteredStories}
          onImportSuccess={onImportSuccess}
          exportToCSV={exportToCSV}
        />
      </div>

      <p className="text-sm sm:text-base text-muted-foreground max-w-3xl leading-relaxed [text-wrap:pretty]">
        Browse through collected narratives to discover patterns, insights, and shared experiences.
        Use the search and filters to find entries relevant to your interests.
      </p>
    </div>
  );
};

export default ExploreHeader;