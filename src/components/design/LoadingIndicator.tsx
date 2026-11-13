
import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingIndicatorProps {
  message?: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ message = "Loading..." }) => {
  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-4 bg-white dark:bg-[#161B22] rounded-md border border-gray-200 dark:border-white/10">
      <Loader2 className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-spin" />
      <p className="text-gray-600 dark:text-gray-300">{message}</p>
    </div>
  );
};

export default LoadingIndicator;
