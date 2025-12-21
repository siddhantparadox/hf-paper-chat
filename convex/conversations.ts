import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

async function requireUserId(ctx: { auth: any }) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new Error("Not authenticated");
  }
  return userId;
}

async function findLastUserMessageAt(ctx: any, conversationId: any): Promise<string | null> {
  const recent = await ctx.db
    .query("messages")
    .withIndex("by_conversation", (q: any) => q.eq("conversationId", conversationId))
    .order("desc")
    .take(50);
  const lastUser = recent.find((msg: any) => msg.role === "user");
  return lastUser ? lastUser.createdAt : null;
}

export const listForUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const started = await ctx.db
      .query("conversations")
      .withIndex("by_user_lastUserMessageAt", (q) =>
        q.eq("userId", userId).gt("lastUserMessageAt", undefined),
      )
      .order("desc")
      .take(50);

    const missingLastUserMessageAt = await ctx.db
      .query("conversations")
      .withIndex("by_user_lastUserMessageAt", (q) =>
        q.eq("userId", userId).eq("lastUserMessageAt", undefined),
      )
      .order("desc")
      .take(50);

    const backfilled = [];
    for (const conv of missingLastUserMessageAt) {
      const lastUserMessageAt = await findLastUserMessageAt(ctx, conv._id);
      if (!lastUserMessageAt) continue;
      backfilled.push({
        _id: conv._id,
        paperId: conv.paperId,
        paperTitle: conv.paperTitle,
        lastUserMessageAt,
      });
    }

    const normalized = started.map((conv) => ({
      _id: conv._id,
      paperId: conv.paperId,
      paperTitle: conv.paperTitle,
      lastUserMessageAt: conv.lastUserMessageAt!,
    }));

    return [...normalized, ...backfilled]
      .sort((a, b) => b.lastUserMessageAt.localeCompare(a.lastUserMessageAt))
      .slice(0, 50);
  },
});

export const getWithMessages = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const userId = await requireUserId(ctx);
    const conv = await ctx.db.get(conversationId);
    if (!conv) return null;
    if (conv.userId !== userId) return null;
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .order("asc")
      .collect();
    return { conversation: conv, messages };
  },
});

export const getForUserAndPaper = query({
  args: { paperId: v.string() },
  handler: async (ctx, { paperId }) => {
    const userId = await requireUserId(ctx);
    const candidates = await ctx.db
      .query("conversations")
      .withIndex("by_paper", (q) => q.eq("paperId", paperId).eq("userId", userId))
      .order("desc")
      .take(10);

    let best: any = null;
    let bestLastUserMessageAt: string | null = null;
    for (const conv of candidates) {
      const lastUserMessageAt = conv.lastUserMessageAt ?? (await findLastUserMessageAt(ctx, conv._id));
      if (!lastUserMessageAt) continue;
      if (!bestLastUserMessageAt || lastUserMessageAt > bestLastUserMessageAt) {
        best = conv;
        bestLastUserMessageAt = lastUserMessageAt;
      }
    }

    return best;
  },
});

export const create = mutation({
  args: {
    paperId: v.string(),
    paperTitle: v.string(),
  },
  handler: async (ctx, { paperId, paperTitle }) => {
    const userId = await requireUserId(ctx);
    const now = new Date().toISOString();
    const conversationId = await ctx.db.insert("conversations", {
      userId,
      paperId,
      paperTitle,
      createdAt: now,
      updatedAt: now,
    });
    return conversationId;
  },
});

export const appendMessages = mutation({
  args: {
    conversationId: v.id("conversations"),
    messages: v.array(
      v.object({
        role: v.string(),
        content: v.string(),
        reasoning: v.optional(v.string()),
        ragUsed: v.optional(v.boolean()),
        ragEntryId: v.optional(v.string()),
        ragChunkCount: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, { conversationId, messages }) => {
    const userId = await requireUserId(ctx);
    const conv = await ctx.db.get(conversationId);
    if (!conv) {
      throw new Error("Conversation not found");
    }
    if (conv.userId !== userId) {
      throw new Error("Not authorized");
    }

    const now = new Date().toISOString();
    const hasUserMessage = messages.some((msg) => msg.role === "user");
    for (const msg of messages) {
      await ctx.db.insert("messages", {
        conversationId,
        createdAt: now,
        ...msg,
      });
    }
    if (hasUserMessage) {
      await ctx.db.patch(conversationId, { updatedAt: now, lastUserMessageAt: now });
    }
  },
});
