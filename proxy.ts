import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const updates = new Map<string, { value: string; options: CookieOptions }>();
  const refreshHeaders: Record<string, string> = {};

  if (url && key) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          for (const { name, value, options } of cookiesToSet) {
            request.cookies.set(name, value);
            updates.set(name, { value, options });
          }
          Object.assign(refreshHeaders, headers);
        },
      },
    });

    try {
      await supabase.auth.getClaims();
    } catch {
      // The staff layout independently checks access and fails closed.
    }
  }

  const response = NextResponse.next({ request });
  for (const [name, { value, options }] of updates) response.cookies.set(name, value, options);
  for (const [name, value] of Object.entries(refreshHeaders)) response.headers.set(name, value);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = { matcher: ["/staff/:path*"] };
