import { createContext, useContext, useEffect, useState } from "react";
import { USER_ID } from "../lib/supabase";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState("dark");

  useEffect(() => {
    // Skip database call for now, just use default theme
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const setTheme = async (value) => {
    setThemeState(value);
    // Skip database save for now
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
