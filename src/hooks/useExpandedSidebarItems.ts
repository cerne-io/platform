import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { STORAGE_KEYS } from "@/services/constants/storageKeys";
import { Project } from "@/types/project";

export const useExpandedSidebarItems = (activeProject: Project | null) => {
    const location = useLocation();
    const EXPANDED_ITEMS_KEY = STORAGE_KEYS.SIDEBAR_EXPANDED_ITEMS;

    const [expandedItems, setExpandedItems] = useState<string[]>(() => {
        try {
            if (typeof window === "undefined") return [];
            const saved = localStorage.getItem(EXPANDED_ITEMS_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    // Auto-expand if a child is active
    useEffect(() => {
        if (activeProject) {
            // Auto-expand Collect when visiting its routes
            const collectChildren = ["/collect", "/form", "/interviewer"];
            if (collectChildren.some(path => location.pathname.startsWith(path))) {
                setExpandedItems(prev => {
                    if (prev.includes("Collect")) return prev;
                    const newState = [...prev, "Collect"];
                    localStorage.setItem(EXPANDED_ITEMS_KEY, JSON.stringify(newState));
                    return newState;
                });
            }
        }
    }, [location.pathname, activeProject, EXPANDED_ITEMS_KEY]);

    const toggleExpand = (name: string) => {
        setExpandedItems(prev => {
            const newState = prev.includes(name)
                ? prev.filter(item => item !== name)
                : [...prev, name];
            localStorage.setItem(EXPANDED_ITEMS_KEY, JSON.stringify(newState));
            return newState;
        });
    };

    return { expandedItems, toggleExpand };
};
