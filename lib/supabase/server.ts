import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const ONE_YEAR = 60 * 60 * 24 * 365;
const REMEMBER_COOKIE = "lumera_remember_device";

function sessionCookieOptions(remember: boolean) {
  return {
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    ...(remember ? { maxAge: ONE_YEAR } : {}),
  };
}

export async function createClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase environment variables.");
  }

  const remember = cookieStore.get(REMEMBER_COOKIE)?.value === "1";
  const baseOptions = sessionCookieOptions(remember);

  return createServerClient(url, key, {
    cookieOptions: baseOptions,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            const { maxAge: _maxAge, expires: _expires, ...safeOptions } = options;
            cookieStore.set(name, value, {
              ...safeOptions,
              ...baseOptions,
            });
          });
        } catch {
          // Cookie writes may be unavailable while rendering a Server Component.
        }
      },
    },
  });
}
