import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { Brand } from "@/components/Brand";

export default function LoginPage() {
  return <main className="auth-shell">
    <section className="auth-art"><Brand/><div><div className="eyebrow">Welcome back</div><h1>Return to clarity.</h1><p style={{color:"#cbc6bd",fontSize:18,lineHeight:1.7}}>Your financial command center is ready.</p></div><p style={{color:"#8f8a82"}}>Private by design.</p></section>
    <section className="auth-form-wrap"><div className="auth-card"><div className="eyebrow">Secure access</div><h2>Log in</h2><p className="muted">Enter your Ficonter account details.</p><AuthForm mode="login"/><p className="center"><Link href="/">← Back to homepage</Link></p></div></section>
  </main>;
}
