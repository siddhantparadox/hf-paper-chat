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

export const listForUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);
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
    return await ctx.db
      .query("conversations")
      .withIndex("by_paper", (q) => q.eq("paperId", paperId).eq("userId", userId))
      .order("desc")
      .first();
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
    for (const msg of messages) {
      await ctx.db.insert("messages", {
        conversationId,
        createdAt: now,
        ...msg,
      });
    }
    await ctx.db.patch(conversationId, { updatedAt: now });
  },
});
