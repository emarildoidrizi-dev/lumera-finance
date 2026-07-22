import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return response;

  const remember = request.cookies.get(REMEMBER_COOKIE)?.value === "1";
  const baseOptions = sessionCookieOptions(remember);

  const supabase = createServerClient(url, key, {
    cookieOptions: baseOptions,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headersToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

        response = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          const { maxAge: _maxAge, expires: _expires, ...safeOptions } = options;
          response.cookies.set(name, value, {
            ...safeOptions,
            ...baseOptions,
          });
        });

        headersToSet?.forEach(({ name, value }) => {
          response.headers.set(name, value);
        });
      },
    },
  });

  await supabase.auth.getClaims();
  response.headers.set("Cache-Control", "private, no-store");

  return response;
}
