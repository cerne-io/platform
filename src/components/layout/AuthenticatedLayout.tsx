import React, { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import PageLayout from "./PageLayout";
import { ContentLoader } from "@/components/ui/ContentLoader";

import { ProjectInitializer } from "./ProjectInitializer";

/**
 * A layout wrapper for workspace routes.
 * This persists the PageLayout (Sidebar) so it doesn't unmount/remount on navigation.
 */
const AuthenticatedLayout: React.FC = () => {
    const location = useLocation();

    // Determine if footer should be hidden based on current path
    const shouldHideFooter = location.pathname.startsWith('/design');

    return (
        <ProjectInitializer>
            <PageLayout hideFooter={shouldHideFooter}>
                <Suspense fallback={<ContentLoader />}>
                    <Outlet />
                </Suspense>
            </PageLayout>
        </ProjectInitializer>
    );
};

export default AuthenticatedLayout;
