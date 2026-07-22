"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient, setRememberPreference } from "@/lib/supabase/client";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const fullName = String(form.get("fullName") ?? "").trim();
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    if (mode === "register" && password !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match." });
      setLoading(false);
      return;
    }

    try {
      if (mode === "login") {
        setRememberPreference(rememberMe);
      }

      const supabase = createClient(mode === "login" ? rememberMe : undefined);

      if (mode === "register") {
        const redirectTo = `${window.location.origin}/auth/callback`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectTo,
            data: { full_name: fullName },
          },
        });

        if (error) throw error;

        setMessage({
          type: "success",
          text: "Account created. Check your email to confirm your address.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        router.replace("/dashboard");
        router.refresh();
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Something went wrong.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      {mode === "register" && (
        <div className="field">
          <label>Full name</label>
          <input className="input" name="fullName" required />
        </div>
      )}

      <div className="field">
        <label>Email address</label>
        <input
          className="input"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>

      <div className="field">
        <label>Password</label>
        <input
          className="input"
          name="password"
          type="password"
          minLength={8}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
        />
      </div>

      {mode === "login" && (
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            cursor: "pointer",
            fontSize: 14,
            lineHeight: 1.45,
            color: "var(--muted, #756f67)",
          }}
        >
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
            style={{ width: 18, height: 18, marginTop: 1, accentColor: "#1f2326" }}
          />
          <span>
            <strong style={{ color: "var(--ink, #1f2326)" }}>
              Keep me signed in on this device
            </strong>
            <br />
            Use this only on a personal or trusted computer.
          </span>
        </label>
      )}

      {mode === "register" && (
        <div className="field">
          <label>Confirm password</label>
          <input
            className="input"
            name="confirmPassword"
            type="password"
            minLength={8}
            autoComplete="new-password"
            required
          />
        </div>
      )}

      {message && (
        <div
          className={`alert ${
            message.type === "error" ? "alert-error" : "alert-success"
          }`}
        >
          {message.text}
        </div>
      )}

      <button className="btn btn-primary" disabled={loading} type="submit">
        {loading ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
      </button>

      <p className="center muted">
        {mode === "login" ? (
          <>
            New to Lumera?{" "}
            <Link href="/register">
              <strong>Create an account</strong>
            </Link>
          </>
        ) : (
          <>
            Already registered?{" "}
            <Link href="/login">
              <strong>Log in</strong>
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
