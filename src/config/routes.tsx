import { lazy, ComponentType, LazyExoticComponent } from 'react';
import { routeConfig } from './routeConfig';

// Helper to generate Lazy components
// We create a map of lazy components to use in App.tsx
export const LazyRoutes = Object.fromEntries(
    Object.entries(routeConfig).map(([key, config]) => [
        key,
        lazy(config.importFn as unknown as () => Promise<{ default: ComponentType }>)
    ])
) as unknown as Record<keyof typeof routeConfig, LazyExoticComponent<ComponentType>>;

