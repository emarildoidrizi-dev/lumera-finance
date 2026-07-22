"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{type:"error"|"success";text:string}|null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setMessage(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const fullName = String(form.get("fullName") ?? "").trim();
    const confirmPassword = String(form.get("confirmPassword") ?? "");
    if (mode === "register" && password !== confirmPassword) {
      setMessage({type:"error",text:"Passwords do not match."}); setLoading(false); return;
    }
    try {
      const supabase = createClient();
      if (mode === "register") {
        const redirectTo = `${window.location.origin}/auth/callback`;
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: redirectTo, data: { full_name: fullName } },
        });
        if (error) throw error;
        setMessage({type:"success",text:"Account created. Check your email to confirm your address."});
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/dashboard"); router.refresh();
      }
    } catch (error) {
      setMessage({type:"error",text:error instanceof Error ? error.message : "Something went wrong."});
    } finally { setLoading(false); }
  }

  return (
    <form className="form" onSubmit={submit}>
      {mode === "register" && <div className="field"><label>Full name</label><input className="input" name="fullName" required /></div>}
      <div className="field"><label>Email address</label><input className="input" name="email" type="email" autoComplete="email" required /></div>
      <div className="field"><label>Password</label><input className="input" name="password" type="password" minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} required /></div>
      {mode === "register" && <div className="field"><label>Confirm password</label><input className="input" name="confirmPassword" type="password" minLength={8} required /></div>}
      {message && <div className={`alert ${message.type === "error" ? "alert-error" : "alert-success"}`}>{message.text}</div>}
      <button className="btn btn-primary" disabled={loading} type="submit">{loading ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}</button>
      <p className="center muted">{mode === "login" ? <>New to Lumera? <Link href="/register"><strong>Create an account</strong></Link></> : <>Already registered? <Link href="/login"><strong>Log in</strong></Link></>}</p>
    </form>
  );
}
