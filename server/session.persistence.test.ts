import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(role: "user" | "moderator" | "admin" = "admin") {
  const cleared: string[] = [];
  const user = {
    id: 42,
    openId: "session-persistence-test",
    email: "session-test@example.com",
    name: "Session Test",
    loginMethod: "email",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  } as NonNullable<TrpcContext["user"]>;
  const ctx = {
    user,
    req: { protocol: "https", headers: {} },
    res: { clearCookie: (name: string) => cleared.push(name) },
  } as unknown as TrpcContext;
  return { ctx, user, cleared };
}

describe("session persistence across public and admin routes", () => {
  it("keeps the authenticated identity available until explicit logout", async () => {
    const { ctx, user, cleared } = createContext("admin");
    const caller = appRouter.createCaller(ctx);

    expect(await caller.auth.me()).toEqual(user);
    await caller.needs.list();
    expect(await caller.auth.me()).toEqual(user);
    await caller.needs.pending();
    expect(await caller.auth.me()).toEqual(user);

    expect(cleared).toEqual([]);
    expect(await caller.auth.logout()).toEqual({ success: true });
    expect(cleared).toHaveLength(1);
  });

  it("does not grant moderation access to a normal user", async () => {
    const { ctx } = createContext("user");
    const caller = appRouter.createCaller(ctx);

    await expect(caller.needs.pending()).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Moderator access required",
    });
    await expect(caller.reports.list()).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  });
});

export {};
