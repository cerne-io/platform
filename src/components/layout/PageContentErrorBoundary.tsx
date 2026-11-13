import React from "react";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { GlobalErrorBoundary } from "@/components/ui/global-error-boundary";
import { debugError } from "@/utils/debugLogger";

interface PageContentErrorBoundaryProps {
    children: React.ReactNode;
    componentName?: string;
    className?: string; // Kept for compatibility, applied to a div wrapper
}

/**
 * A wrapper that provides ErrorBoundary functionality WITHOUT the PageLayout.
 * Use this when the PageLayout is already provided by a parent route component (AuthenticatedLayout).
 */
const PageContentErrorBoundary: React.FC<PageContentErrorBoundaryProps> = ({
    children,
    componentName = "Page Content",
    className
}) => {
    return (
        <ErrorBoundary
            fallback={<GlobalErrorBoundary.Fallback />}
            showDetails={process.env.NODE_ENV !== 'production'}
            componentName={componentName}
            onError={(error) => {
                debugError(`Error in ${componentName}:`, error);
            }}
        >
            {className ? <div className={className}>{children}</div> : children}
        </ErrorBoundary>
    );
};

export default PageContentErrorBoundary;
