import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey;

if (typeof supabaseUrl !== "string" || !supabaseUrl) {
  throw new Error("Missing Expo Supabase URL configuration.");
}

if (typeof supabaseAnonKey !== "string" || !supabaseAnonKey) {
  throw new Error("Missing Expo Supabase anonymous key configuration.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
