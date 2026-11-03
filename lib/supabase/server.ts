import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseConfig } from "./config";

export type StaffProfile = {
  user_id: string;
  display_name: string;
  role: "admin" | "staff";
  active: boolean;
};

export async function createSupabaseServerClient() {
  const { url, key } = supabaseConfig();
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies; a session-refresh proxy is required before production.
        }
      },
    },
  });
}

export async function getActiveStaff(): Promise<StaffProfile | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || typeof userId !== "string") return null;

  const { data: profile, error: profileError } = await supabase
    .from("staff_profiles")
    .select("user_id, display_name, role, active")
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();

  if (
    profileError || !profile || typeof profile.user_id !== "string" ||
    typeof profile.display_name !== "string" ||
    (profile.role !== "admin" && profile.role !== "staff") || profile.active !== true
  ) return null;
  return { user_id: profile.user_id, display_name: profile.display_name, role: profile.role, active: true };
}
