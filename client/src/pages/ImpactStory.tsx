import { ArrowLeft, ArrowUpRight, CheckCircle2, Droplets, Users } from "lucide-react";
import { Link } from "wouter";

const sources = [
  { label: "Living on Earth / Pulitzer Center report on Kibera SODIS", href: "https://www.loe.org/shows/segmentprint.html?programID=09-P13-00033&segmentID=3" },
  { label: "Peer-reviewed KIDS evaluation in BMC Public Health", href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12570634/" },
];

export default function ImpactStory() {
  return <div className="app-page impact-story-page">
    <header className="app-header container"><Link href="/" className="brand"><span className="brand-mark">m</span><span>msaada</span></Link><Link href="/" className="exit-link"><ArrowLeft size={14} /> Back home</Link></header>
    <main className="container impact-story-main">
      <div className="story-kicker"><span className="section-kicker">Documented impact story</span><span className="story-location">Kibera · Nairobi, Kenya</span></div>
      <section className="story-hero"><div><h1>Clean water,<br /><em>closer to home.</em></h1><p className="story-lede">In Kibera, community-led safe-water and sanitation work has helped families move from contaminated water toward practical, affordable treatment and better hygiene.</p></div><div className="story-hero-art"><Droplets size={46} /><span>water<br />→ health</span></div></section>
      <section className="story-metrics"><div><strong>250,000</strong><span>residents reported using SODIS</span></div><div><strong>20%</strong><span>reported decrease in diarrheal cases</span></div><div><strong>2</strong><span>Kibera villages in the KIDS evaluation</span></div><div><strong>—</strong><span>volunteer hours not publicly reported</span></div></section>
      <section className="story-grid"><article><span className="section-kicker">The need</span><h2>Water access was also a health issue.</h2><p>Kibera’s water supply has been vulnerable to interruption, high prices, pipe breaks, and contamination. Shared sanitation facilities and open drainage added further risk for waterborne illness.</p><p>The work featured here combined a household-level solar treatment method known as <strong>SODIS</strong> with community education around safe water handling, hygiene, and sanitation.</p></article><aside className="story-callout"><CheckCircle2 size={22} /><div><strong>What was fulfilled</strong><p>Safe-water treatment education, household SODIS adoption, water-safety monitoring, hygiene and sanitation sensitization, and community water-management training.</p></div></aside></section>
      <section className="story-outcome"><span className="section-kicker light">What changed</span><h2>A practical intervention<br /><em>with a measurable signal.</em></h2><p>Living on Earth reported that Kenya Water for Health said 250,000 Kibera residents were using SODIS and that diarrheal cases had fallen by 20% since the program began in 2004. A later peer-reviewed evaluation of SHOFCO’s Kibera Investment for Delivery of Safe Water (KIDS) project found a 31% relative decline in diarrheal disease in intervention villages compared with comparison villages.</p></section>
      <section className="story-sources"><div><span className="section-kicker">Sources & limits</span><h2>Evidence should stay visible.</h2><p>This is an external case study, not a claim that Msaada delivered the project. The published sources report people reached and health outcomes, but do not publish a volunteer-hours total. Msaada therefore leaves that figure unreported.</p></div><div className="source-list">{sources.map(source => <a href={source.href} target="_blank" rel="noreferrer" key={source.href}>{source.label}<ArrowUpRight size={15} /></a>)}</div></section>
      <Link href="/discover" className="button button-dark story-cta"><Users size={16} /> Explore current community needs</Link>
    </main>
  </div>;
}
