
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

const FormSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 py-2">
      {/* Story question skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-32 w-full" />
      </div>
      
      {/* Title input skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      
      {/* Emotional response skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
      
      {/* Slider questions skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-5 w-48" />
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
      </div>
      
      {/* Submit button skeleton */}
      <div className="pt-4">
        <Skeleton className="h-10 w-32 mx-auto" />
      </div>
    </div>
  );
};

export default FormSkeleton;
