
import { useAuth } from "@/contexts/AuthContext";
import { User as CustomUser } from "@/types/user";
import { useProject } from "@/contexts/ProjectContext";


import { SidebarHeader } from "./SidebarHeader";
import { ProjectDisplay } from "./ProjectDisplay";
import { SidebarNavigation } from "./SidebarNavigation";
import { SidebarUserSection } from "./sidebar/SidebarUserSection";

interface SidebarContentProps {
    collapsed: boolean;
    toggleSidebar?: () => void;
    isMobile?: boolean;
    onLinkClick?: () => void;
}

export const SidebarContent = ({
    collapsed,
    toggleSidebar,
    isMobile = false,
    onLinkClick
}: SidebarContentProps) => {
    const { user } = useAuth();

    const { activeProject } = useProject();

    // If mobile, checking "collapsed" might be different or unused, 
    // but we can pass collapsed={false} from parent.

    return (
        <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground relative overflow-x-hidden">
            {/* Header - render conditionally or modify for mobile? 
          For now, keep it. On mobile, toggleSidebar might close the sheet or be undefined.
          If toggleSidebar is undefined, maybe hide the button in SidebarHeader?
          SidebarHeader expects toggleSidebar to be a function. 
          Let's provide a no-op if undefined, or handle it in SidebarHeader.
       */}
            {/* 
         On mobile, we might not want the "SidebarHeader" with the collapse button.
         Or we might just want the Logo part.
         For now, reusing SidebarHeader.
      */}
            <SidebarHeader
                collapsed={collapsed}
                toggleSidebar={toggleSidebar || (() => { })}
                isMobile={isMobile}
            />

            {/* Project display */}
            <ProjectDisplay activeProject={activeProject} collapsed={collapsed} />

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto py-4 flex flex-col overflow-x-hidden">
                <SidebarNavigation
                    collapsed={collapsed}
                    activeProject={activeProject}
                    user={(user as unknown as CustomUser) ?? null}
                    onLinkClick={onLinkClick}
                />
            </div>

            {/* User section */}
            <SidebarUserSection collapsed={collapsed} onLinkClick={onLinkClick} />
        </div>
    );
};
