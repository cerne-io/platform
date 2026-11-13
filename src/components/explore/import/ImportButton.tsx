
import { useRef } from "react";
import FileInput from "./FileInput";
import ImportButtonUI from "./ImportButtonUI";
import { useStoryImport } from "@/hooks/useStoryImport";

interface ImportButtonProps {
  onSuccess?: () => void;
  onImportSuccess?: () => void;
}

const ImportButton = ({ onSuccess, onImportSuccess }: ImportButtonProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isImporting, validateProject, importFile } = useStoryImport(onSuccess || onImportSuccess || (() => {}));

  const handleImportClick = () => {
    if (validateProject()) {
      fileInputRef.current?.click();
    }
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    await importFile(file);
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <ImportButtonUI 
        onClick={handleImportClick}
        isLoading={isImporting}
      />
      <FileInput
        ref={fileInputRef}
        onFileChange={(e) => void handleFileChange(e)}
        accept=".csv"
      />
    </>
  );
};

export default ImportButton;
