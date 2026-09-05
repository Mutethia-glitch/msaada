export type Lifecycle = "draft" | "pending_review" | "active" | "partially_fulfilled" | "fulfilled" | "closed";
export type Role = "user" | "moderator" | "admin";
const transitions: Record<Lifecycle, Lifecycle[]> = { draft: ["pending_review"], pending_review: ["active", "draft", "closed"], active: ["partially_fulfilled", "fulfilled", "closed"], partially_fulfilled: ["fulfilled", "closed"], fulfilled: ["closed"], closed: [] };
export function canTransitionLifecycle(from: Lifecycle, to: Lifecycle) { return from === to || transitions[from].includes(to); }
export function canModerate(role: Role) { return role === "moderator" || role === "admin"; }
export function canAdmin(role: Role) { return role === "admin"; }
