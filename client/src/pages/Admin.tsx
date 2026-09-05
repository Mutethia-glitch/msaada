import { AlertTriangle, Check, ChevronRight, Flag, Grid2X2, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { useCallback, useEffect, useState } from "react";

type NeedRow = { need: { id: number; title: string; location: string; urgency: string }; category: { name: string } | null };
type Report = { id: number; category: string; details: string | null; status: string };

async function readEndpoint<T>(path: string): Promise<T> {
  const response = await fetch(path, { credentials: "include" });
  const body = await response.json();
  if (!response.ok || body?.[0]?.error) throw new Error(body?.[0]?.error?.message || "Unable to load moderation data.");
  return body?.[0]?.result?.data as T;
}

export default function Admin() {
  const { user, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const canModerate = user?.role === "admin" || user?.role === "moderator";
  const [pending, setPending] = useState<NeedRow[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [approvePending, setApprovePending] = useState<number | null>(null);

  const loadModeration = useCallback(async () => {
    if (!canModerate) return;
    setLoading(true); setError("");
    try {
      const pendingResult = await readEndpoint<NeedRow[]>("/api/trpc/needs.pending?batch=1&input=%7B%7D");
      setPending(pendingResult ?? []);
      if (user?.role === "admin") setReports((await readEndpoint<Report[]>("/api/trpc/reports.list?batch=1&input=%7B%7D")) ?? []);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to load moderation data."); }
    finally { setLoading(false); }
  }, [canModerate, user?.role]);

  useEffect(() => { void loadModeration(); }, [loadModeration]);

  const approve = async (needId: number) => {
    setApprovePending(needId); setError("");
    try {
      const response = await fetch("/api/trpc/needs.approve?batch=1", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify([{ json: { needId } }]) });
      const body = await response.json();
      if (!response.ok || body?.[0]?.error) throw new Error(body?.[0]?.error?.message || "Unable to approve this need.");
      await loadModeration();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to approve this need."); }
    finally { setApprovePending(null); }
  };

  if (authLoading || !user) return <div className="route-loading">Checking access…</div>;
  if (!canModerate) return <div className="route-loading">You do not have access to the moderation studio.</div>;

  return <div className="admin-page">
    <aside className="admin-sidebar"><Link href="/" className="admin-brand"><span className="brand-mark">m</span><strong>msaada</strong></Link><span className="admin-kicker">Moderation studio</span><nav><a className="active"><Grid2X2 size={16} /> Overview</a><a><ShieldCheck size={16} /> Needs</a><a><AlertTriangle size={16} /> Reports</a></nav></aside>
    <main className="admin-main"><header className="admin-topbar"><span className="admin-demo-pill">Database-backed workspace</span><Link href="/" className="button button-outline">View public site <ChevronRight size={15} /></Link></header>
      <div className="admin-content"><span className="section-kicker">Moderation workspace</span><h1>Review what needs<br /><em>attention.</em></h1><div className="admin-session-badge"><ShieldCheck size={15} /><span>Signed in as <strong>{user.name || user.email || "Msaada member"}</strong> · {user.role}</span></div>
        {error && <div className="form-errors" role="alert"><strong>{error}</strong></div>}
        <div className="admin-stats"><Stat label="Pending review" value={String(pending.length)} tone="ochre" /><Stat label="Open reports" value={String(reports.filter((report) => report.status === "open").length)} tone="terracotta" /><Stat label="Database status" value={error ? "Error" : loading ? "Loading" : "Ready"} tone="sage" /></div>
        <div className="admin-grid"><section className="admin-panel"><div className="panel-heading"><div><span className="section-kicker">Needs attention</span><h2>Pending review</h2></div></div>{loading ? <div className="panel-empty">Loading review queue…</div> : pending.length ? pending.map(({ need, category }) => <div className="moderation-row" key={need.id}><div className="moderation-thumb" /><div><strong>{need.title}</strong><p>{category?.name ?? "Uncategorized"} · {need.location}</p><small>Stored request · {need.urgency} urgency</small></div><button className="button button-outline" onClick={() => approve(need.id)} disabled={approvePending !== null}><Check size={14} /> {approvePending === need.id ? "Approving…" : "Approve"}</button></div>) : <div className="panel-empty">No needs are waiting for review.</div>}</section>
          <section className="admin-panel"><div className="panel-heading"><div><span className="section-kicker">Trust queue</span><h2>Reports</h2></div></div>{loading ? <div className="panel-empty">Loading reports…</div> : reports.length ? reports.map((report) => <div className="report-item" key={report.id}><Flag size={17} /><div><strong>{report.category.replaceAll("_", " ")}</strong><p>{report.details || "No additional details"}</p><small>{report.status}</small></div></div>) : <div className="panel-empty">No reports in the database.</div>}</section>
        </div>
      </div>
    </main>
  </div>;
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) { return <div className="admin-stat"><div className={`stat-icon ${tone}-bg`}><ShieldCheck size={18} /></div><span>{label}</span><strong>{value}</strong></div>; }
