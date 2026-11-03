"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient, getActiveStaff } from "@/lib/supabase/server";

type SignInState = { error: string };

const invalidLogin = "Unable to sign in. Check your details or contact your administrator.";

export async function signInStaff(_previousState: SignInState, formData: FormData): Promise<SignInState> {
  const emailValue = formData.get("email");
  const password = formData.get("password");
  if (typeof emailValue !== "string" || typeof password !== "string") return { error: invalidLogin };

  const email = emailValue.trim();
  if (!email || email.length > 254 || !password || password.length > 1024) return { error: invalidLogin };

  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>> | undefined;
  let signedIn = false;

  try {
    supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user || !data.session) return { error: invalidLogin };
    signedIn = true;

    const staff = await getActiveStaff();
    if (!staff || staff.user_id !== data.user.id || staff.active !== true || !["admin", "staff"].includes(staff.role)) {
      await supabase.auth.signOut({ scope: "local" });
      return { error: invalidLogin };
    }
  } catch {
    if (signedIn && supabase) await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    return { error: "Staff sign-in is unavailable right now. Please try again or contact your administrator." };
  }

  redirect("/staff");
}

export async function signOutStaff() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) throw new Error("Unable to sign out. Please try again.");
  redirect("/staff-login");
}
