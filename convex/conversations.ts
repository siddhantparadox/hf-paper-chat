import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const listForUser = query({
  args: { userId: v.optional(v.string()) },
  handler: async (ctx, { userId }) => {
    if (!userId) return [];
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
    const conv = await ctx.db.get(conversationId);
    if (!conv) return null;
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .order("asc")
      .collect();
    return { conversation: conv, messages };
  },
});

export const getForUserAndPaper = query({
  args: { userId: v.string(), paperId: v.string() },
  handler: async (ctx, { userId, paperId }) => {
    return await ctx.db
      .query("conversations")
      .withIndex("by_paper", (q) => q.eq("paperId", paperId).eq("userId", userId))
      .order("desc")
      .first();
  },
});

export const create = mutation({
  args: {
    userId: v.optional(v.string()),
    paperId: v.string(),
    paperTitle: v.string(),
  },
  handler: async (ctx, { userId, paperId, paperTitle }) => {
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
