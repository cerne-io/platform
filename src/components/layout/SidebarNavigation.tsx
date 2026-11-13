import {
  FolderKanban,
  Paintbrush,
  Search,
  BarChart2,
  Package,
  FileText,
  UserCheck,
  Settings,
} from "lucide-react";
import {
  TooltipProvider
} from "@/components/ui/tooltip";
import { useExpandedSidebarItems } from "@/hooks/useExpandedSidebarItems";
import { NavigationItem } from "@/utils/navigation";
import { Project } from "@/types/project";
import { User } from "@/types/user";
import { SidebarNavItem } from "./SidebarNavItem";

interface SidebarNavigationProps {
  collapsed: boolean;
  activeProject: Project | null;
  user: User | null;
  onLinkClick?: () => void;
}

export const SidebarNavigation = ({ collapsed, activeProject, user, onLinkClick }: SidebarNavigationProps) => {
  const { expandedItems, toggleExpand } = useExpandedSidebarItems(activeProject);

  const baseNavigation: NavigationItem[] = [
    ...(user
      ? [
          { name: "Projects", href: "/projects", icon: <FolderKanban size={collapsed ? 24 : 20} />, dataTour: "sidebar-nav-projects" },
          { name: "Settings", href: "/settings", icon: <Settings size={collapsed ? 24 : 20} />, dataTour: "sidebar-nav-settings" },
        ]
      : []),
  ];

  const projectNavigation: NavigationItem[] = activeProject
    ? [
      { name: "Design", href: "/design", icon: <Paintbrush size={collapsed ? 24 : 20} />, dataTour: "sidebar-nav-design" },
      {
        name: "Collect",
        href: "/collect",
        icon: <Package size={collapsed ? 24 : 20} />,
        dataTour: "sidebar-nav-collect",
        children: [
          { name: "Form", href: "/form", icon: <FileText size={collapsed ? 24 : 20} />, dataTour: "sidebar-nav-collect-form" },
          { name: "Interviewer", href: `/interviewer/${activeProject.id}`, icon: <UserCheck size={collapsed ? 24 : 20} />, dataTour: "sidebar-nav-collect-interviewer" },
        ]
      },
      { name: "Explore", href: "/explore", icon: <Search size={collapsed ? 24 : 20} />, dataTour: "sidebar-nav-explore" },
      { name: "Dashboard", href: "/dashboard", icon: <BarChart2 size={collapsed ? 24 : 20} />, dataTour: "sidebar-nav-dashboard" },
    ]
    : [];

  const navigation = [...baseNavigation, ...projectNavigation];

  return (
    <TooltipProvider>
      <div className="flex flex-col justify-between h-full">
        <div>
          <ul className="space-y-1 px-2">
            {navigation.map((item: NavigationItem) => (
              <li key={item.name}>
                <SidebarNavItem
                  item={item}
                  collapsed={collapsed}
                  expandedItems={expandedItems}
                  toggleExpand={toggleExpand}
                  onLinkClick={onLinkClick}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </TooltipProvider>
  );
};
