import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

// Hardcoded user ID until auth is wired up
export const USER_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
