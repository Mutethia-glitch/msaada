import { Bell, CheckCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type NotificationItem = { id: number; title: string; body: string; readAt: string | null; createdAt: string };

export default function NotificationBell() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const response = await fetch("/api/notifications", { credentials: "include", cache: "no-store" });
      if (!response.ok) return;
      const body = await response.json();
      setItems(Array.isArray(body?.notifications) ? body.notifications : []);
    } catch { /* Keep the bell usable if a background refresh is interrupted. */ }
  };

  useEffect(() => {
    void load();
    const timer = window.setInterval(load, 5000);
    const close = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => { window.clearInterval(timer); document.removeEventListener("mousedown", close); };
  }, []);

  const unread = items.filter((item) => !item.readAt).length;
  const markRead = async (id?: number) => {
    setLoading(true);
    try {
      await fetch("/api/notifications/read", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(id ? { id } : { all: true }) });
      setItems((current) => current.map((item) => id && item.id !== id ? item : { ...item, readAt: new Date().toISOString() }));
    } finally { setLoading(false); }
  };

  return <div className="notification-wrap" ref={ref}>
    <button className="notification-button" aria-label={unread ? `${unread} unread notifications` : "Notifications"} onClick={() => setOpen((value) => !value)}>
      <Bell size={18} />{unread > 0 && <span className="notification-badge">{unread > 99 ? "99+" : unread}</span>}
    </button>
    {open && <div className="notification-popover" role="dialog" aria-label="Notifications">
      <div className="notification-heading"><strong>Notifications</strong>{items.length > 0 && <button onClick={() => void markRead()} disabled={loading}><CheckCheck size={14} /> Read all</button>}</div>
      {items.length ? items.map((item) => <button className={`notification-item ${item.readAt ? "read" : "unread"}`} key={item.id} onClick={() => !item.readAt && void markRead(item.id)}><strong>{item.title}</strong><span>{item.body}</span><small>{new Date(item.createdAt).toLocaleString()}</small></button>) : <p className="notification-empty">You’re all caught up.</p>}
    </div>}
  </div>;
}
