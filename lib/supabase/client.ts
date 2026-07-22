import { createBrowserClient } from "@supabase/ssr";

const ONE_YEAR = 60 * 60 * 24 * 365;
const REMEMBER_COOKIE = "lumera_remember_device";

function readRememberPreference(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .some((part) => part === `${REMEMBER_COOKIE}=1`);
}

export function setRememberPreference(remember: boolean) {
  if (typeof document === "undefined") return;

  if (remember) {
    document.cookie = `${REMEMBER_COOKIE}=1; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax; Secure`;
  } else {
    // Session cookie: removed automatically when the browser session ends.
    document.cookie = `${REMEMBER_COOKIE}=0; Path=/; SameSite=Lax; Secure`;
  }
}

export function createClient(rememberOverride?: boolean) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase environment variables.");
  }

  const remember = rememberOverride ?? readRememberPreference();

  return createBrowserClient(url, key, {
    cookieOptions: {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      ...(remember ? { maxAge: ONE_YEAR } : {}),
    },
  });
}
