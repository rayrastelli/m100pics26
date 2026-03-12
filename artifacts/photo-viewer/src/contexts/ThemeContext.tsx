import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

export type ThemeId =
  | "dark"
  | "light"
  | "ferrari"
  | "mclaren"
  | "mercedes"
  | "haas"
  | "aston-martin";

export interface ThemeMeta {
  id: ThemeId;
  label: string;
  swatch: string;
  swatchAlt?: string;
}

export const THEMES: ThemeMeta[] = [
  { id: "dark", label: "Dark", swatch: "#18181b" },
  { id: "light", label: "Light", swatch: "#f4f4f5", swatchAlt: "#27272a" },
  { id: "ferrari", label: "Ferrari", swatch: "#dc0000", swatchAlt: "#fff200" },
  { id: "mclaren", label: "McLaren", swatch: "#ff8000", swatchAlt: "#5cc8e8" },
  {
    id: "mercedes",
    label: "Mercedes",
    swatch: "#00d2be",
    swatchAlt: "#c1c2c3",
  },
  {
    id: "mercedeslight",
    label: "Mercedes Light",
    swatch: "#c1c2c3",
    swatchAlt: "#00d2be",
  },
  { id: "haas", label: "Haas", swatch: "#bb0000", swatchAlt: "#111111" },
  { id: "aston-martin", label: "Aston Martin", swatch: "#006f62" },
];

const STORAGE_KEY = "bandpics-theme";
const DEFAULT_THEME: ThemeId = "dark";

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    return saved && THEMES.find((t) => t.id === saved) ? saved : DEFAULT_THEME;
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = (id: ThemeId) => setThemeState(id);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
