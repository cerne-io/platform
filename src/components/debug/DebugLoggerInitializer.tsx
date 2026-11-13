import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { setDebugUserRole } from "@/utils/debugLogger";

/**
 * Component to sync user role with the debug logger utility
 * This allows debugLog to work without calling hooks directly
 */
export const DebugLoggerInitializer = () => {
    const isSuper = Boolean(useAuth().user);

    useEffect(() => {
        setDebugUserRole(isSuper);
    }, [isSuper]);

    return null;
};
