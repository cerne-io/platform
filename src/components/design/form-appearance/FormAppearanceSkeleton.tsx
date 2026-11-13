
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export const FormEditorSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 min-h-[480px]">
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-4 w-48" />
      </div>
      
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-4 w-48" />
      </div>
      
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full mt-2" />
        <Skeleton className="h-4 w-48" />
      </div>
      
      <div className="pt-4 flex gap-3">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
};

export const PreviewSkeleton: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="text-sm font-medium">Preview</div>
      <Card className="overflow-hidden border border-gray-200">
        <div className="p-6 flex flex-col items-center gap-6 bg-gray-50">
          <Skeleton className="h-12 w-24" />
          
          <div className="text-center space-y-2 w-full">
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </div>
          
          <div className="bg-white rounded-md p-4 w-full mt-4 border border-gray-200">
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
              <div className="pt-2">
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
