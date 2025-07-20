import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

export const supabase = createClient(
  Constants.expoConfig?.extra?.supabaseUrl,
  Constants.expoConfig?.extra?.supabaseAnonKey
);
console.log("SUPABASE_URL:", Constants.expoConfig?.extra?.supabaseUrl);
console.log("supabaseAnonKey:", Constants.expoConfig?.extra?.supabaseAnonKey);
