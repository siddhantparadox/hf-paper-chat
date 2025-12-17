import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

const schema = defineSchema({
  ...authTables,
  conversations: defineTable({
    userId: v.string(),
    paperId: v.string(),
    paperTitle: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
    lastUserMessageAt: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_lastUserMessageAt", ["userId", "lastUserMessageAt"])
    .index("by_paper", ["paperId", "userId"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    role: v.string(), // "user" | "assistant" | "system"
    content: v.string(),
    createdAt: v.string(),
  }).index("by_conversation", ["conversationId"]),
});

export default schema;
