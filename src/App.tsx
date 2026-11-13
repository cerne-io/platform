import React, { useEffect, lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProjectProvider } from "@/contexts/ProjectContext";
import { Toaster } from "@/components/ui/toaster";
import { PageLoader } from "@/components/ui/PageLoader";
import { GlobalErrorBoundary } from "@/components/ui/global-error-boundary";
import { withErrorBoundary } from "@/components/ui/error-boundary";
import { ThemeProvider } from "@/components/theme-provider";
import { PublicThemeEnforcer } from "@/components/routing/PublicThemeEnforcer";

import { LazyRoutes } from "@/config/routes";
import { preloadCriticalRoutes } from "@/config/routeConfig";

// Lazy-loaded app shell
const ProtectedRoute = lazy(() => import("@/components/auth/ProtectedRoute"));
const AuthenticatedLayout = lazy(() => import("@/components/layout/AuthenticatedLayout"));

// Heavy background utilities — defer until after first render
const DebugLoggerInitializer = lazy(() =>
  import("@/components/debug/DebugLoggerInitializer").then(m => ({ default: m.DebugLoggerInitializer }))
);

// Wrapped routes with localized error boundaries
const DashboardWithBoundary = withErrorBoundary(LazyRoutes.dashboard, { componentName: 'Dashboard' });
const PublicDashboardWithBoundary = withErrorBoundary(LazyRoutes.publicDashboard, { componentName: 'PublicDashboard' });
const DesignWithBoundary = withErrorBoundary(LazyRoutes.design, { componentName: 'Design', category: 'ai' });
const InterviewerWithBoundary = withErrorBoundary(LazyRoutes.interviewer, { componentName: 'Interviewer', category: 'ai' });

function App() {
  useEffect(() => {
    const path = window.location.pathname;

    // Immediately trigger i18n load on public interactive routes
    if (path.includes('/submit-story') || path.includes('/interview')) {
      void import("@/i18n");
    }

    const scheduleBackgroundScripts = () => {
      preloadCriticalRoutes();
      void import("@/i18n");
    };

    let handle: number;
    if ('requestIdleCallback' in window) {
      handle = window.requestIdleCallback(scheduleBackgroundScripts, { timeout: 10000 });
    } else {
      const timer = setTimeout(scheduleBackgroundScripts, 5000);
      return () => clearTimeout(timer);
    }
    return () => window.cancelIdleCallback(handle);
  }, []);

  return (
    <GlobalErrorBoundary.Wrapper>
      <Router>
        <AuthProvider>
          <Suspense fallback={null}>
            <DebugLoggerInitializer />
          </Suspense>

          <ProjectProvider>
            <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
              <PublicThemeEnforcer />
              <Toaster />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public routes */}
                  <Route path="/submit-story/:formId" element={<LazyRoutes.publicSubmission />} />
                  <Route path="/interview/:formId" element={<LazyRoutes.publicInterviewer />} />
                  <Route path="/public-dashboard/:token" element={<PublicDashboardWithBoundary />} />

                  {/* Protected workspace routes */}
                  <Route element={<ProtectedRoute />}>
                    <Route element={<AuthenticatedLayout />}>
                      <Route path="/" element={<Navigate to="/projects" replace />} />
                      <Route path="/projects" element={<LazyRoutes.projects />} />
                      <Route path="/design" element={<DesignWithBoundary />} />
                      <Route path="/collect" element={<LazyRoutes.collect />} />
                      <Route path="/form" element={<LazyRoutes.form />} />
                      <Route path="/interviewer/:projectId" element={<InterviewerWithBoundary />} />
                      <Route path="/explore" element={<LazyRoutes.explore />} />
                      <Route path="/dashboard" element={<DashboardWithBoundary />} />
                      <Route path="/settings" element={<LazyRoutes.settings />} />
                    </Route>
                  </Route>

                  <Route path="*" element={<LazyRoutes.notFound />} />
                </Routes>
              </Suspense>
            </ThemeProvider>
          </ProjectProvider>
        </AuthProvider>
      </Router>
    </GlobalErrorBoundary.Wrapper>
  );
}

export default App;
