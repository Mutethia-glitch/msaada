import { Link } from "wouter";

export default function SiteFooter() {
  return <footer className="site-footer"><div className="container site-footer-inner"><Link href="/" className="brand" aria-label="Msaada home"><span className="brand-mark">m</span><span>msaada</span></Link><nav className="site-footer-links" aria-label="Footer navigation"><Link href="/privacy">Privacy policy</Link><Link href="/terms">Terms and conditions</Link><Link href="/faq">FAQ</Link><Link href="/support">Support</Link></nav><p className="site-footer-copy">© {new Date().getFullYear()} Msaada. Need → Help → Impact.</p></div></footer>;
}
