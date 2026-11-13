
import { forwardRef } from "react";

interface FileInputProps {
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  accept: string;
}

const FileInput = forwardRef<HTMLInputElement, FileInputProps>(
  ({ onFileChange, accept }, ref) => {
    return (
      <input
        type="file"
        ref={ref}
        onChange={onFileChange}
        accept={accept}
        className="hidden"
      />
    );
  }
);

FileInput.displayName = "FileInput";

export default FileInput;
