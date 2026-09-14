import { createClient } from "@supabase/supabase-js";

// Prefer Vercel/Vite environment variables, but ignore blank values.
// The Ranger wall keeps its original public Supabase client config as a
// browser-safe fallback so a malformed deployment variable cannot blank-screen
// the app.
const FALLBACK_SUPABASE_URL = "https://vzbopyksyfognxfubncf.supabase.co";
const FALLBACK_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_-ouvsxvhv-n9Qz5xgbT6Lg_J-Vk6Dia";

const env = import.meta.env as Record<string, string | undefined>;

function firstNonEmpty(...values: Array<string | undefined>) {
  for (const value of values) {
    const cleaned = value?.trim();
    if (cleaned) return cleaned;
  }

  return "";
}

const supabaseUrl = firstNonEmpty(
  env.VITE_SUPABASE_URL,
  env.SUPABASE_URL,
  FALLBACK_SUPABASE_URL,
);

const supabaseKey = firstNonEmpty(
  env.VITE_SUPABASE_PUBLISHABLE_KEY,
  env.VITE_SUPABASE_ANON_KEY,
  env.SUPABASE_PUBLISHABLE_KEY,
  env.SUPABASE_ANON_KEY,
  FALLBACK_SUPABASE_PUBLISHABLE_KEY,
);

export const supabase = createClient(supabaseUrl, supabaseKey);
