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
import { DEFAULT_USABILITY_PREFERENCES, USABILITY_STORAGE_KEY, parseUsabilityPreferences, serializeUsabilityPreferences, type UsabilityPreferences } from "@/lib/usability-preferences";
import { flushOfflineSyncQueue } from "@/lib/offline-sync-queue";

type ThemeContextValue = {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
type UsabilityContextValue = UsabilityPreferences & { setEasyMode: (value: boolean) => void; setTutorialSeen: (value: boolean) => void };
const UsabilityContext = createContext<UsabilityContextValue | null>(null);

export function Providers({ children }: { children: ReactNode }) {
  const [theme, setThemePreference] = useState<ThemePreference>("dark");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark");
  const [usability, setUsability] = useState<UsabilityPreferences>(DEFAULT_USABILITY_PREFERENCES);

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

  useEffect(() => {
    const stored = parseUsabilityPreferences(window.localStorage.getItem(USABILITY_STORAGE_KEY));
    const apply = () => {
      setUsability(stored);
      document.documentElement.toggleAttribute("data-easy-mode", stored.easyMode);
    };
    const timeout = window.setTimeout(apply, 0);
    const flush = () => { void flushOfflineSyncQueue(window.localStorage); };
    window.addEventListener("online", flush);
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js");
    if (navigator.onLine) flush();
    return () => { window.clearTimeout(timeout); window.removeEventListener("online", flush); };
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
  const usabilityValue = useMemo<UsabilityContextValue>(() => ({
    ...usability,
    setEasyMode: (easyMode) => updateUsability({ ...usability, easyMode }),
    setTutorialSeen: (tutorialSeen) => updateUsability({ ...usability, tutorialSeen }),
  }), [usability]);

  function updateUsability(next: UsabilityPreferences) {
    setUsability(next);
    window.localStorage.setItem(USABILITY_STORAGE_KEY, serializeUsabilityPreferences(next));
    document.documentElement.toggleAttribute("data-easy-mode", next.easyMode);
  }

  return (
    <MotionConfig reducedMotion="user">
      <ThemeContext.Provider value={value}>
        <UsabilityContext.Provider value={usabilityValue}>
          {children}
          <SupportDialog />
        </UsabilityContext.Provider>
      </ThemeContext.Provider>
    </MotionConfig>
  );
}

export function useUsability() {
  const context = useContext(UsabilityContext);
  if (!context) throw new Error("useUsability must be used within Providers");
  return context;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used within Providers");
  }

  return context;
}
