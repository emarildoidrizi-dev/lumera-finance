import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { Brand } from "@/components/Brand";

export default function RegisterPage() {
  return <main className="auth-shell">
    <section className="auth-art"><Brand/><div><div className="eyebrow">Begin your private workspace</div><h1>Financial confidence starts here.</h1><p style={{color:"#cbc6bd",fontSize:18,lineHeight:1.7}}>Create a secure account and bring your financial life into one elegant system.</p></div><p style={{color:"#8f8a82"}}>No advertising. No clutter.</p></section>
    <section className="auth-form-wrap"><div className="auth-card"><div className="eyebrow">Private membership</div><h2>Create account</h2><p className="muted">Use at least eight characters for your password.</p><AuthForm mode="register"/><p className="center"><Link href="/">← Back to homepage</Link></p></div></section>
  </main>;
}
