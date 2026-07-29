"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { AppDataProvider } from "@/components/app-data-provider";
import type { ResolvedTheme, ThemePreference } from "@/lib/theme";

type ThemeContextValue = {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
  }, []);

  const value = useMemo(
    () => ({
      theme: "dark" as ThemePreference,
      resolvedTheme: "dark" as ResolvedTheme,
      setTheme: () => {},
    }),
    [],
  );

  return (
    <ThemeContext.Provider value={value}>
      <AppDataProvider>{children}</AppDataProvider>
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used within Providers");
  }

  return context;
}
