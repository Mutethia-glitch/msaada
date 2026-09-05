import { FormEvent, useState } from "react";
import { ArrowRight, CheckCircle2, ChevronLeft } from "lucide-react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export default function SignIn() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(mode === "register" ? { name, email, password } : { email, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      await utils.auth.me.invalidate();
      const returnTo = new URLSearchParams(window.location.search).get("returnTo");
      navigate(returnTo?.startsWith("/") ? returnTo : "/dashboard");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-brand-wrap">
        <Link href="/" className="brand" aria-label="Msaada home"><span className="brand-mark">m</span><span>msaada</span></Link>
        <Link href="/" className="auth-back"><ChevronLeft size={15} /> Back home</Link>
      </div>
      <section className="auth-layout container">
        <div className="auth-intro">
          <span className="section-kicker">A community of practical generosity</span>
          <h1>{mode === "login" ? <>Welcome<br /><em>back.</em></> : <>Make an<br /><em>impact.</em></>}</h1>
          <p>Keep track of the needs you share, the help you offer, and the impact that follows.</p>
          <div className="auth-points"><span><CheckCircle2 size={17} /> Your account belongs to you</span><span><CheckCircle2 size={17} /> One place for every contribution</span></div>
        </div>
        <div className="auth-card">
          <div className="auth-card-heading"><span className="section-kicker">{mode === "login" ? "Member sign in" : "Join Msaada"}</span><h2>{mode === "login" ? "Sign in to Msaada" : "Create your account"}</h2><p>{mode === "login" ? "Use the email and password you chose when you joined." : "Start making community needs visible and actionable."}</p></div>
          <form onSubmit={submit} className="auth-form">
            {mode === "register" && <label>Full name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" autoComplete="name" required /></label>}
            <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required /></label>
            <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required /></label>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="button button-dark auth-submit" type="submit" disabled={pending}>{pending ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}<ArrowRight size={16} /></button>
          </form>
          <p className="auth-switch">{mode === "login" ? "New to Msaada?" : "Already have an account?"} <button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>{mode === "login" ? "Create an account" : "Sign in"}</button></p>
        </div>
      </section>
    </main>
  );
}
