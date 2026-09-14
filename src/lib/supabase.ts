import { createClient } from "@supabase/supabase-js";

// Vite normally injects these at build time from Vercel. Keep the original
// Ranger project's public Supabase client values as a fallback so the wall
// cannot hard-crash if a deployment is built without env injection.
const FALLBACK_SUPABASE_URL = "https://vzbopyksyfognxfubncf.supabase.co";
const FALLBACK_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_-ouvsxvhv-n9Qz5xgbT6Lg_J-Vk6Dia";

const env = import.meta.env as Record<string, string | undefined>;

const supabaseUrl = (
  env.VITE_SUPABASE_URL ??
  env.SUPABASE_URL ??
  FALLBACK_SUPABASE_URL
).trim();

const supabaseKey = (
  env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  env.VITE_SUPABASE_ANON_KEY ??
  env.SUPABASE_PUBLISHABLE_KEY ??
  env.SUPABASE_ANON_KEY ??
  FALLBACK_SUPABASE_PUBLISHABLE_KEY
).trim();

export const supabase = createClient(supabaseUrl, supabaseKey);
