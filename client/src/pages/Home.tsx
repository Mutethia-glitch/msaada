import { ArrowRight, Check, HeartHandshake, Leaf, Menu, MoveUpRight, ShieldCheck, Sparkles, Users, X } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
const formatKsh = (value: number) => `KSh ${new Intl.NumberFormat("en-KE").format(value)}`;

const nav = ["How it works", "Featured needs", "Trust & verification"];

function Brand() {
  return <Link href="/" className="brand" aria-label="Msaada home"><span className="brand-mark">m</span><span>msaada</span></Link>;
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const publicNeeds = trpc.needs.list.useQuery();
  return (
    <div className="site-shell">
      <header className="topbar container">
        <Brand />
        <nav className={`main-nav ${menuOpen ? "open" : ""}`} aria-label="Main navigation">
          {nav.map((item) => <a key={item} href={`#${item.toLowerCase().replaceAll(" ", "-").replace("&", "and")}`} onClick={() => setMenuOpen(false)}>{item}</a>)}
          <Link href="/discover" className="nav-link" onClick={() => setMenuOpen(false)}>Explore needs <ArrowRight size={15} /></Link>
        </nav>
        <div className="top-actions"><Link href="/dashboard" className="text-button">Sign in</Link><Link href="/create" className="button button-dark">Post a need <ArrowRight size={16} /></Link></div>
        <button className="menu-button" aria-label={menuOpen ? "Close menu" : "Open menu"} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
      </header>

      <main>
        <section className="hero container">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> A community of practical generosity</div>
            <h1>Help should reach <em>the right place.</em></h1>
            <p className="hero-lede">Msaada connects community needs with people who can help, then shows what happened next.</p>
            <div className="hero-actions"><Link href="/discover" className="button button-dark button-large">Find a way to help <ArrowRight size={18} /></Link><Link href="/create" className="button button-outline button-large">Post a need</Link></div>
            <div className="hero-note"><ShieldCheck size={17} /> Every need has a visible journey from request to outcome.</div>
          </div>
          <div className="hero-art" aria-label="Community impact illustration">
            <div className="organic organic-one" /><div className="organic organic-two" /><div className="organic organic-three" />
            <div className="hero-card card-float-one"><span className="mini-icon terracotta-bg"><HeartHandshake size={17} /></span><div><strong>Need met</strong><small>20 desks delivered</small></div><Check size={19} className="checkmark" /></div>
            <div className="hero-card card-float-two"><span className="mini-icon sage-bg"><Leaf size={17} /></span><div><strong>Impact reported</strong><small>42 students benefited</small></div></div>
            <div className="hero-stamp">need<br /><span>→</span><br />impact</div>
          </div>
        </section>

        <section className="ticker-band"><div className="ticker-inner"><span>NEED</span><i>→</i><span>HELP</span><i>→</i><span>IMPACT</span><span className="ticker-caption">A clearer way to show generosity</span><span>NEED</span><i>→</i><span>HELP</span></div></section>

        <section className="section container" id="how-it-works">
          <div className="section-intro"><div><span className="section-kicker">01 / The Msaada way</span><h2>Generosity is more<br /><em>than a transaction.</em></h2></div><p>Sometimes it is a desk. A ride. Four hours of your time. Msaada makes every form of help visible, structured, and connected to a real outcome.</p></div>
          <div className="process-grid">
            {[{ n: "01", title: "A need is shared", body: "Someone explains what their community needs, why it matters, and who will benefit.", icon: Sparkles, color: "terracotta" }, { n: "02", title: "People contribute", body: "Contribute money, items, skills, time, or logistics — whatever you can offer.", icon: Users, color: "ochre" }, { n: "03", title: "The outcome is reported", body: "The loop closes with progress updates, a timeline, and a clear impact summary.", icon: HeartHandshake, color: "sage" }].map((step) => { const Icon = step.icon; return <div className="process-card" key={step.n}><div className={`step-icon ${step.color}`}><Icon size={21} /></div><span className="step-number">{step.n}</span><h3>{step.title}</h3><p>{step.body}</p><a href="/discover">Learn more <MoveUpRight size={14} /></a></div>; })}
          </div>
        </section>

        <section className="section featured-section" id="featured-needs"><div className="container"><div className="section-heading-row"><div><span className="section-kicker">02 / Open needs</span><h2>Find a way to <em>show up.</em></h2></div><Link href="/discover" className="text-link">View all needs <ArrowRight size={17} /></Link></div><div className="need-grid">{publicNeeds.data?.slice(0, 3).map((row) => <NeedCard key={row.need.id} row={row} />)}</div></div></section>

        <section className="impact-section container"><div className="impact-panel"><div className="impact-copy"><span className="section-kicker light">03 / The loop closed</span><h2>Good help deserves<br /><em>a clear ending.</em></h2><p>Every fulfilled need becomes more than a number. It becomes a story of what changed, who was reached, and what comes next.</p><Link href="/needs/trees-rongai" className="button button-cream">See an impact story <ArrowRight size={17} /></Link></div><div className="impact-metrics"><div><strong>83</strong><span>needs fulfilled</span></div><div><strong>1,248</strong><span>people helped</span></div><div><strong>312h</strong><span>volunteer time</span></div></div><div className="impact-orb orb-one" /><div className="impact-orb orb-two" /></div></section>

        <section className="trust-section container" id="trust-and-verification"><div className="trust-visual"><div className="trust-circle"><ShieldCheck size={44} /><span>Trust<br />is a practice</span></div><div className="trust-chip"><span className="status-dot" /> Verified request</div></div><div className="trust-copy"><span className="section-kicker">04 / A more honest platform</span><h2>Clarity builds<br /><em>confidence.</em></h2><p>Verification on Msaada is deliberately specific. A badge tells you what has been reviewed — and what has not. Human moderation is required before a request becomes public, and verification never guarantees an outcome.</p><div className="trust-points"><div><Check size={16} /><span>Review status is always visible</span></div><div><Check size={16} /><span>Request status and review decisions are visible</span></div><div><Check size={16} /><span>Outcomes are reported by the need owner</span></div></div></div></section>

        <section className="cta-section container"><div><span className="section-kicker">Start where you are</span><h2>There is always<br /><em>a way to help.</em></h2></div><div className="cta-actions"><Link href="/discover" className="button button-dark button-large">Explore open needs <ArrowRight size={18} /></Link><Link href="/create" className="button button-outline button-large">Share a need</Link></div></section>
      </main>
      <footer className="footer container"><Brand /><p>Need → Help → Impact</p><span>Database-backed community requests</span></footer>
    </div>
  );
}

function NeedCard({ row }: { row: { need: { id: number; title: string; publicSummary: string | null; story: string; location: string; urgency: "low" | "medium" | "high"; verification: string; beneficiaryCount: number; goalAmount: number; lifecycle: string }; category: { name: string } | null } }) {
  const { need, category } = row; const progress = ["fulfilled", "closed"].includes(need.lifecycle) ? 100 : 0;
  return <Link href={`/needs/${need.id}`} className="need-card"><div className="need-image need-image-placeholder"><span className="badge badge-cream">{need.verification.replaceAll("_", " ")}</span><span className={`urgency urgency-${need.urgency}`}>{need.urgency} urgency</span></div><div className="need-card-body"><div className="need-meta"><span>{category?.name ?? "Community"}</span><span>{need.location}</span></div><h3>{need.title}</h3><p>{need.publicSummary ?? need.story}</p><div className="progress-label"><span>{progress}% fulfilled</span><span>{need.beneficiaryCount} beneficiaries</span></div><div className="progress-track"><div style={{ width: `${progress}%` }} /></div><div className="need-footer"><span>{formatKsh(need.goalAmount)} <small>goal</small></span><span>Open record <ArrowRight size={15} /></span></div></div></Link>;
}
