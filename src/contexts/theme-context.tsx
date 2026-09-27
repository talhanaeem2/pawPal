import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark" | "system";

type ThemeContextValue = {
    theme: Theme;
    resolvedTheme: "light" | "dark";
    setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "pawpal-theme";

function getSystemTheme(): "light" | "dark" {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(resolved: "light" | "dark") {
    const html = document.documentElement;
    if (resolved === "dark") {
        html.classList.add("dark");
    } else {
        html.classList.remove("dark");
    }
    // Let the browser render native UI (date pickers, scrollbars) correctly
    html.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(() => {
        try {
            return (localStorage.getItem(STORAGE_KEY) as Theme) ?? "system";
        } catch {
            return "system";
        }
    });

    const resolvedTheme: "light" | "dark" =
        theme === "system" ? getSystemTheme() : theme;

    // Apply on mount and whenever theme changes
    useEffect(() => {
        applyTheme(resolvedTheme);
    }, [resolvedTheme]);

    // Track system preference changes when theme is "system"
    useEffect(() => {
        if (theme !== "system") return;

        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = () => applyTheme(mq.matches ? "dark" : "light");
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, [theme]);

    const setTheme = useCallback((next: Theme) => {
        setThemeState(next);
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch { }
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
    return ctx;
}