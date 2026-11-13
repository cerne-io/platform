/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react"

export type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
    children: React.ReactNode
    defaultTheme?: Theme
    storageKey?: string
}

type ThemeProviderState = {
    theme: Theme
    setTheme: (theme: Theme) => void
    forcedTheme?: Theme
    setForcedTheme: (theme: Theme | undefined) => void
}

const initialState: ThemeProviderState = {
    theme: "system",
    setTheme: () => null,
    setForcedTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
    children,
    defaultTheme = "system",
    storageKey = "vite-ui-theme",
}: ThemeProviderProps) {
    const [theme, setTheme] = useState<Theme>(
        () => (typeof window !== 'undefined'
            ? localStorage.getItem(storageKey) as Theme
            : null) || defaultTheme
    )
    const [forcedTheme, setForcedTheme] = useState<Theme | undefined>()

    useEffect(() => {
        const root = window.document.documentElement

        // Remove both classes to start fresh
        root.classList.remove("light", "dark")

        if (forcedTheme) {
            root.classList.add(forcedTheme)
            return
        }

        if (theme === "system") {
            const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
                .matches
                ? "dark"
                : "light"

            root.classList.add(systemTheme)
            return
        }

        root.classList.add(theme)
    }, [theme, forcedTheme])

    useEffect(() => {
        // Enable smooth transitions only after the initial render to prevent paint thrashing
        const timer = setTimeout(() => {
            document.body.classList.add('theme-transition');
        }, 100);
        return () => clearTimeout(timer);
    }, []);


    const value = {
        theme,
        setTheme: (theme: Theme) => {
            localStorage.setItem(storageKey, theme)
            setTheme(theme)
        },
        forcedTheme,
        setForcedTheme
    }

    return (
        <ThemeProviderContext.Provider value={value}>
            {children}
        </ThemeProviderContext.Provider>
    )
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext)

    if (context === undefined)
        throw new Error("useTheme must be used within a ThemeProvider")

    return context
}
