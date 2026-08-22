"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { MotionConfig } from "framer-motion";
import { SupportDialog } from "@/components/support-dialog";
import { THEME_STORAGE_KEY, type ResolvedTheme, type ThemePreference } from "@/lib/theme";

type ThemeContextValue = {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function Providers({ children }: { children: ReactNode }) {
  const [theme, setThemePreference] = useState<ThemePreference>("dark");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark");

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    const nextTheme: ThemePreference = stored === "light" || stored === "dark" || stored === "system" ? stored : "dark";
    const resolve = (value: ThemePreference): ResolvedTheme => value === "system" ? (media.matches ? "dark" : "light") : value;
    const apply = (value: ThemePreference) => {
      const resolved = resolve(value);
      setThemePreference(value);
      setResolvedTheme(resolved);
      document.documentElement.setAttribute("data-theme", resolved);
    };

    apply(nextTheme);
    const onChange = () => {
      if (nextTheme === "system") apply("system");
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const setTheme = (nextTheme: ThemePreference) => {
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    const resolved = nextTheme === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : nextTheme;
    setThemePreference(nextTheme);
    setResolvedTheme(resolved);
    document.documentElement.setAttribute("data-theme", resolved);
  };

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
    }),
    [resolvedTheme, theme],
  );

  return (
    <MotionConfig reducedMotion="user">
      <ThemeContext.Provider value={value}>
        {children}
        <SupportDialog />
      </ThemeContext.Provider>
    </MotionConfig>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used within Providers");
  }

  return context;
}
