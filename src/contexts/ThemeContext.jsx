import { createContext, useContext, useEffect, useState } from "react";
import { supabase, USER_ID } from "../lib/supabase";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState("dark");

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("user_preferences")
        .select("theme")
        .eq("user_id", USER_ID)
        .single();
      if (data?.theme) setThemeState(data.theme);
    }
    load();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const setTheme = async (value) => {
    setThemeState(value);
    await supabase
      .from("user_preferences")
      .upsert({ user_id: USER_ID, theme: value }, { onConflict: "user_id" });
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
