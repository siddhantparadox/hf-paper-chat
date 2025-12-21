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
    reasoning: v.optional(v.string()),
    ragUsed: v.optional(v.boolean()),
    ragEntryId: v.optional(v.string()),
    ragChunkCount: v.optional(v.number()),
    createdAt: v.string(),
  }).index("by_conversation", ["conversationId"]),

  paperRag: defineTable({
    paperId: v.string(),
    title: v.string(),
    pdfUrl: v.string(),
    status: v.string(), // "not_indexed" | "indexing" | "ready" | "failed"
    chunkCount: v.optional(v.number()),
    pageCount: v.optional(v.number()),
    embeddingModel: v.string(),
    embeddingDimensions: v.optional(v.number()),
    contentHash: v.optional(v.string()),
    entryId: v.optional(v.union(v.string(), v.null())),
    error: v.optional(v.union(v.string(), v.null())),
    lastIndexedAt: v.optional(v.string()),
    lastUsedAt: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_paper", ["paperId"])
    .index("by_status", ["status"]),
});

export default schema;
