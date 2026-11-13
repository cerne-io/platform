import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTheme } from "@/components/theme-provider";

export function PublicThemeEnforcer() {
    const { pathname } = useLocation();
    const { setForcedTheme } = useTheme();

    useEffect(() => {
        const isPublic = pathname.startsWith('/submit-story/') ||
            pathname.startsWith('/interview/') ||
            pathname.startsWith('/public-dashboard/');

        if (isPublic) {
            setForcedTheme('light');
        } else {
            setForcedTheme(undefined);
        }
    }, [pathname, setForcedTheme]);

    return null;
}
