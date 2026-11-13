import { ComponentType } from 'react';

export type ImportComponent = () => Promise<{ default: ComponentType }>;

export interface RouteConfig {
    path: string;
    importFn: ImportComponent;
}

// Map of route keys to their config
// This allows us to look up import functions by path or key
export const routeConfig = {
    // Public App Logic
    publicSubmission: { path: '/submit-story/:formId', importFn: () => import('@/pages/PublicSubmission') },
    publicInterviewer: { path: '/interview/:formId', importFn: () => import('@/pages/PublicInterviewer') },
    publicDashboard: { path: '/public-dashboard/:token', importFn: () => import('@/pages/PublicDashboard') },

    // Workspace / App
    projects: { path: '/projects', importFn: () => import('@/pages/Projects') },
    design: { path: '/design', importFn: () => import('@/pages/Design') },
    collect: { path: '/collect', importFn: () => import('@/pages/Collect') },
    form: { path: '/form', importFn: () => import('@/pages/Form') },
    interviewer: { path: '/interviewer/:projectId', importFn: () => import('@/pages/Interviewer') },
    explore: { path: '/explore', importFn: () => import('@/pages/Explore') },
    dashboard: { path: '/dashboard', importFn: () => import('@/pages/Dashboard') },
    settings: { path: '/settings', importFn: () => import('@/pages/Settings') },

    // Fallback
    notFound: { path: '*', importFn: () => import('@/pages/NotFound') },
} as const;

/**
 * Preloads the component for a given route path or key.
 */
export const preloadRoute = (pathOrKey: string) => {
    // 1. Try to find by key (e.g., 'dashboard')
    if (pathOrKey in routeConfig) {
        const config = routeConfig[pathOrKey as keyof typeof routeConfig];
        void config.importFn();
        return;
    }

    // 2. Try to find by path (e.g., '/dashboard')
    const entry = Object.values(routeConfig).find(c => c.path === pathOrKey);
    if (entry) {
        void entry.importFn();
    }
};

/**
 * Preloads a specific list of routes, often used for critical path prewarming.
 */
export const preloadCriticalRoutes = () => {
    // Preload lightweight app routes only — exclude heavy chart-heavy pages (dashboard)
    // These are the pages most likely visited right after login
    const criticalKeys: (keyof typeof routeConfig)[] = [
        'projects',
        'collect',
        'form',
        'explore',
    ];

    criticalKeys.forEach(key => {
        void routeConfig[key].importFn();
    });
};
