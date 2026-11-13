import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProject } from '@/contexts/ProjectContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { debugLog, debugError } from '@/utils/debugLogger';
import { ContentLoader } from '@/components/ui/ContentLoader';
import { Project } from '@/types/project';

/**
 * A layout wrapper that intercepts ?projectId=... in the URL,
 * validates it against the user's projects, and sets the activeProject
 * in the context before rendering child routes. This fixes links from digest emails.
 */
export const ProjectInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [searchParams, setSearchParams] = useSearchParams();

    const { activeProject, setActiveProject } = useProject();
    const { user } = useAuth();
    const [isInitializing, setIsInitializing] = useState(false);

    const urlProjectId = searchParams.get('projectId');

    useEffect(() => {
        const initializeProjectFromUrl = async () => {
            // 1. If no projectId in URL, user not logged in, or we're copying a template, just proceed normally
            const action = searchParams.get('action');
            if (!urlProjectId || !user || action === 'copy-template') {
                return;
            }

            // 2. If the URL project ID is already the active project, clear the URL param
            if (activeProject?.id === urlProjectId) {
                debugLog('Project from URL is already active. Cleaning up URL.');
                searchParams.delete('projectId');
                setSearchParams(searchParams, { replace: true });
                return;
            }

            // 3. We have a new project ID in the URL, verify and load it
            setIsInitializing(true);
            debugLog('Intercepted projectId in URL, attempting to load:', urlProjectId);

            try {
                const { data: projectData, error } = await supabase
                    .from('projects')
                    .select('*')
                    .eq('id', urlProjectId)
                    .single();

                if (error) {
                    throw error;
                }

                if (projectData) {
                    const project = {
                        ...projectData,
                        user_role: 'owner'
                    } as Project;

                    debugLog('Successfully loaded project from URL:', project.name);
                    setActiveProject(project);

                    // Clear query param to leave a clean URL
                    searchParams.delete('projectId');
                    setSearchParams(searchParams, { replace: true });
                }
            } catch (err) {
                debugError('Failed to load project from URL:', err);
                // If the project doesn't exist or isn't accessible, strip the URL param anyway to prevent infinite loops
                searchParams.delete('projectId');
                setSearchParams(searchParams, { replace: true });
                // Optionally redirect to projects page if the requested project is invalid
                // navigate('/projects', { replace: true });
            } finally {
                setIsInitializing(false);
            }
        };

        void initializeProjectFromUrl();
    }, [urlProjectId, user, activeProject?.id, searchParams, setSearchParams, setActiveProject]);

    // Block rendering until the new project is set, otherwise components like Dashboard might flash empty state
    if (isInitializing) {
        return <ContentLoader />;
    }

    return <>{children}</>;
};
