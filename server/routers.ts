import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createContribution, createNeedDraft, createReport, getDb, listContributionsForUser, listNeedsForUser, listPendingNeeds, listPublicNeeds, recordVerification } from "./db";
import { needCategories, needs } from "../drizzle/schema";

const moderatorProcedure = protectedProcedure.use(({ ctx, next }) => { if (ctx.user.role !== "admin" && ctx.user.role !== "moderator") throw new TRPCError({ code: "FORBIDDEN", message: "Moderator access required" }); return next(); });
const adminOnlyProcedure = protectedProcedure.use(({ ctx, next }) => { if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" }); return next(); });

export const appRouter = router({
  system: systemRouter,
  auth: router({ me: publicProcedure.query((opts) => opts.ctx.user), logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }) }),
  needs: router({
    list: publicProcedure.query(() => listPublicNeeds()),
    mine: protectedProcedure.query(({ ctx }) => listNeedsForUser(ctx.user.id)),
    pending: moderatorProcedure.query(() => listPendingNeeds()),
    createDraft: protectedProcedure.input(z.object({ title: z.string().min(3).max(180), story: z.string().min(20).max(10000), publicSummary: z.string().max(3000).optional(), location: z.string().min(2).max(120), urgency: z.enum(["low", "medium", "high"]), beneficiaryCount: z.number().int().min(0).max(100000), quantityLabel: z.string().max(180).optional(), goalAmount: z.number().int().min(0).max(100000000), categoryId: z.number().int().positive(), submitForReview: z.boolean().default(false) })).mutation(({ ctx, input }) => createNeedDraft({ ...input, creatorId: ctx.user.id, lifecycle: input.submitForReview ? "pending_review" : "draft", verification: "pending_review", aiAssisted: 0 })),
    submit: protectedProcedure.input(z.object({ needId: z.number().int().positive() })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); const result = await db.update(needs).set({ lifecycle: "pending_review", verification: "pending_review" }).where(eq(needs.id, input.needId)); return { success: Boolean(result), needId: input.needId, submittedBy: ctx.user.id }; }),
    approve: moderatorProcedure.input(z.object({ needId: z.number().int().positive(), notes: z.string().max(2000).optional() })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); await db.update(needs).set({ lifecycle: "active", verification: "verified" }).where(eq(needs.id, input.needId)); await recordVerification({ needId: input.needId, reviewerId: ctx.user.id, decision: "approved", notes: input.notes }); return { success: true }; }),
  }),
  contributions: router({ mine: protectedProcedure.query(({ ctx }) => listContributionsForUser(ctx.user.id)), pledge: protectedProcedure.input(z.object({ needId: z.number().int().positive(), type: z.enum(["money", "items", "skills", "time", "logistics", "professional_services"]), description: z.string().min(3).max(1000), amount: z.number().int().min(0).optional(), quantityLabel: z.string().max(160).optional() })).mutation(({ ctx, input }) => createContribution({ ...input, contributorId: ctx.user.id, status: "pledged" })),
  }),
  reports: router({ create: protectedProcedure.input(z.object({ needId: z.number().int().positive(), category: z.enum(["suspicious_request", "misleading_information", "duplicate", "inappropriate_content", "other"]), details: z.string().max(2000).optional() })).mutation(({ ctx, input }) => createReport({ ...input, reporterId: ctx.user.id, status: "open" })), list: adminOnlyProcedure.query(async () => { const db = await getDb(); if (!db) return []; return db.select().from((await import("../drizzle/schema")).reports); }) }),
  categories: router({ list: publicProcedure.query(async () => { const db = await getDb(); if (!db) return []; return db.select().from(needCategories); }) }),
});
export type AppRouter = typeof appRouter;
