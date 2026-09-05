import { AlertTriangle, Check, ChevronRight, Flag, Grid2X2, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Admin() {
  const { user, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const canModerate = user?.role === "admin" || user?.role === "moderator";
  const pending = trpc.needs.pending.useQuery(undefined, { enabled: canModerate });
  const reports = trpc.reports.list.useQuery(undefined, { enabled: user?.role === "admin" });
  const approve = trpc.needs.approve.useMutation({ onSuccess: () => pending.refetch() });

  if (authLoading || !user) return <div className="route-loading">Checking access…</div>;
  if (!canModerate) return <div className="route-loading">You do not have access to the moderation studio.</div>;

  const status = pending.error?.data?.code === "UNAUTHORIZED" || pending.error?.data?.code === "FORBIDDEN"
    ? "Access denied"
    : pending.isError ? "Error" : "Ready";

  return <div className="admin-page">
    <aside className="admin-sidebar"><Link href="/" className="admin-brand"><span className="brand-mark">m</span><strong>msaada</strong></Link><span className="admin-kicker">Moderation studio</span><nav><a className="active"><Grid2X2 size={16} /> Overview</a><a><ShieldCheck size={16} /> Needs</a><a><AlertTriangle size={16} /> Reports</a></nav></aside>
    <main className="admin-main"><header className="admin-topbar"><span className="admin-demo-pill">Database-backed workspace</span><Link href="/" className="button button-outline">View public site <ChevronRight size={15} /></Link></header>
      <div className="admin-content"><span className="section-kicker">Moderation workspace</span><h1>Review what needs<br /><em>attention.</em></h1>
        <div className="admin-stats"><Stat label="Pending review" value={String(pending.data?.length ?? 0)} tone="ochre" /><Stat label="Open reports" value={String(reports.data?.filter((r) => r.status === "open").length ?? 0)} tone="terracotta" /><Stat label="Database status" value={status} tone="sage" /></div>
        <div className="admin-grid"><section className="admin-panel"><div className="panel-heading"><div><span className="section-kicker">Needs attention</span><h2>Pending review</h2></div></div>{pending.isLoading ? <div className="panel-empty">Loading review queue…</div> : pending.isError ? <div className="panel-empty">You do not have permission to view the review queue.</div> : pending.data?.length ? pending.data.map(({ need, category }) => <div className="moderation-row" key={need.id}><div className="moderation-thumb" /><div><strong>{need.title}</strong><p>{category?.name ?? "Uncategorized"} · {need.location}</p><small>Stored request · {need.urgency} urgency</small></div><button className="button button-outline" onClick={() => approve.mutate({ needId: need.id })} disabled={approve.isPending}><Check size={14} /> Approve</button></div>) : <div className="panel-empty">No needs are waiting for review.</div>}</section>
          <section className="admin-panel"><div className="panel-heading"><div><span className="section-kicker">Trust queue</span><h2>Reports</h2></div></div>{reports.isLoading ? <div className="panel-empty">Loading reports…</div> : reports.isError ? <div className="panel-empty">Only administrators can view reports.</div> : reports.data?.length ? reports.data.map((report) => <div className="report-item" key={report.id}><Flag size={17} /><div><strong>{report.category.replaceAll("_", " ")}</strong><p>{report.details || "No additional details"}</p><small>{report.status}</small></div></div>) : <div className="panel-empty">No reports in the database.</div>}</section>
        </div>
      </div>
    </main>
  </div>;
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) { return <div className="admin-stat"><div className={`stat-icon ${tone}-bg`}><ShieldCheck size={18} /></div><span>{label}</span><strong>{value}</strong></div>; }
