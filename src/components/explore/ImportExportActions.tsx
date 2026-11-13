import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { DownloadIcon } from "lucide-react";
import ImportButton from "./import/ImportButton";
import PrintButton from "./export/PrintButton";
import PrintableStoryCards from "./export/PrintableStoryCards";
import { useProject } from "@/contexts/ProjectContext";
import { Story } from "@/types/story";

interface ImportExportActionsProps {
  filteredStories: Story[];
  onImportSuccess: () => void;
  exportToCSV: (stories: Story[]) => void;
}

const ImportExportActions: React.FC<ImportExportActionsProps> = ({
  filteredStories,
  onImportSuccess,
  exportToCSV
}) => {
  const { activeProject, currentUserProjectRole } = useProject();
  const isOwner = currentUserProjectRole === 'owner';
  const printComponentRef = useRef<HTMLDivElement>(null);

  const handleExport = () => {
    exportToCSV(filteredStories);
  };

  if (!isOwner) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <div className="flex items-center gap-1">
        <ImportButton onImportSuccess={onImportSuccess} onSuccess={onImportSuccess} />
        <InfoTooltip contentKey="explore-import-csv" size={16} />
      </div>

      <PrintButton
        contentRef={printComponentRef}
        disabled={filteredStories.length === 0}
      />

      <Button
        variant="ghost"
        size="sm"
        onClick={handleExport}
        disabled={filteredStories.length === 0}
        className="gap-2 text-muted-foreground hover:text-foreground active:scale-95 transition-transform"
      >
        <DownloadIcon className="h-4 w-4 mr-1" />
        Export CSV
      </Button>

      <div style={{ display: "none" }}>
        <PrintableStoryCards
          ref={printComponentRef}
          stories={filteredStories}
          projectName={activeProject?.name}
        />
      </div>
    </div>
  );
};

export default ImportExportActions;