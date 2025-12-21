import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery, query } from "./_generated/server";
import { components, internal } from "./_generated/api";
import { RAG, type EntryId } from "@convex-dev/rag";
import type { EmbeddingModelV2 } from "@ai-sdk/provider";
import { createOpenAI } from "@ai-sdk/openai";

const EMBEDDING_MODEL = "qwen/qwen3-embedding-8b";
// Must match the embedding model's output dimension.
const EMBEDDING_DIMENSION = 1024;
const DEFAULT_SEARCH_LIMIT = 8;
const DEFAULT_VECTOR_SCORE_THRESHOLD = 0.25;
const STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

// Keep ids safe for namespace strings.
function paperNamespace(paperId: string) {
  const safe = paperId.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `paper/${safe}`;
}

function withEmbeddingDimensions(
  model: EmbeddingModelV2<string>,
  dimensions: number,
): EmbeddingModelV2<string> {
  return {
    ...model,
    async doEmbed(options) {
      const providerOptions = {
        ...options.providerOptions,
        openai: {
          ...(options.providerOptions?.openai ?? {}),
          dimensions,
        },
      };
      return model.doEmbed({ ...options, providerOptions });
    },
  };
}

const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY!,
  baseURL: "https://openrouter.ai/api/v1",
  headers: {
    "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER ?? "http://localhost:3000",
    "X-Title": process.env.OPENROUTER_APP_TITLE ?? "hf-paper-chat",
  },
});

const embeddingModel = withEmbeddingDimensions(
  openrouter.embedding(EMBEDDING_MODEL),
  EMBEDDING_DIMENSION,
);

const rag = new RAG(components.rag, {
  textEmbeddingModel: embeddingModel,
  embeddingDimension: EMBEDDING_DIMENSION,
});

export const getPaperRagStatus = query({
  args: { paperId: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("paperRag")
      .withIndex("by_paper", (q) => q.eq("paperId", args.paperId))
      .unique();
    return row ?? null;
  },
});

export const getPaperRagByPaperId = internalQuery({
  args: { paperId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("paperRag")
      .withIndex("by_paper", (q) => q.eq("paperId", args.paperId))
      .unique();
  },
});

export const insertPaperRagRow = internalMutation({
  args: {
    paperId: v.string(),
    title: v.string(),
    pdfUrl: v.string(),
    status: v.string(),
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
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("paperRag", args);
  },
});

export const patchPaperRagRow = internalMutation({
  args: {
    id: v.id("paperRag"),
    patch: v.object({
      title: v.optional(v.string()),
      pdfUrl: v.optional(v.string()),
      status: v.optional(v.string()),
      chunkCount: v.optional(v.number()),
      pageCount: v.optional(v.number()),
      embeddingModel: v.optional(v.string()),
      embeddingDimensions: v.optional(v.number()),
      contentHash: v.optional(v.string()),
      entryId: v.optional(v.union(v.string(), v.null())),
      error: v.optional(v.union(v.string(), v.null())),
      lastIndexedAt: v.optional(v.string()),
      lastUsedAt: v.optional(v.string()),
      updatedAt: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, args.patch);
  },
});

export const getReadyPaperRagPage = internalQuery({
  args: {
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("paperRag")
      .withIndex("by_status", (q) => q.eq("status", "ready"))
      .paginate({
        cursor: args.cursor ?? null,
        numItems: args.limit ?? 100,
      });
    return page;
  },
});

export const touchPaperRagUsage = internalMutation({
  args: { id: v.id("paperRag"), usedAt: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { lastUsedAt: args.usedAt, updatedAt: args.usedAt });
  },
});

export const indexPaperFromChunks = action({
  args: {
    paperId: v.string(),
    title: v.string(),
    pdfUrl: v.string(),
    pageCount: v.optional(v.number()),
    chunks: v.array(v.string()),
    contentHash: v.optional(v.string()),
    force: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();

    const existing = await ctx.runQuery(internal.rag.getPaperRagByPaperId, {
      paperId: args.paperId,
    });

    if (existing?.status === "indexing") {
      return { ok: true as const, status: "indexing" as const, alreadyIndexed: true as const };
    }

    if (
      !args.force &&
      existing?.status === "ready" &&
      existing.contentHash &&
      args.contentHash &&
      existing.contentHash === args.contentHash &&
      existing.embeddingModel === EMBEDDING_MODEL &&
      existing.embeddingDimensions === EMBEDDING_DIMENSION
    ) {
      return { ok: true as const, status: "ready" as const, alreadyIndexed: true as const };
    }

    const chunksToIndex = args.chunks;
    const base = {
      paperId: args.paperId,
      title: args.title,
      pdfUrl: args.pdfUrl,
      chunkCount: chunksToIndex.length,
      pageCount: args.pageCount,
      embeddingModel: EMBEDDING_MODEL,
      embeddingDimensions: EMBEDDING_DIMENSION,
      contentHash: args.contentHash,
      updatedAt: now,
    };

    if (!chunksToIndex.length) {
      const error = "No PDF text extracted to index.";
      if (existing?._id) {
        await ctx.runMutation(internal.rag.patchPaperRagRow, {
          id: existing._id,
          patch: {
            ...base,
            status: "failed",
            error,
            updatedAt: now,
          },
        });
      } else {
        await ctx.runMutation(internal.rag.insertPaperRagRow, {
          ...base,
          status: "failed",
          error,
          createdAt: now,
          updatedAt: now,
        });
      }
      return { ok: false as const, status: "failed" as const, error };
    }

    let rowId = existing?._id;
    if (!rowId) {
      rowId = await ctx.runMutation(internal.rag.insertPaperRagRow, {
        ...base,
        status: "indexing",
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.runMutation(internal.rag.patchPaperRagRow, {
        id: rowId,
        patch: {
          ...base,
          status: "indexing",
          updatedAt: now,
        },
      });
    }

    try {
      const { entryId } = await rag.add(ctx, {
        namespace: paperNamespace(args.paperId),
        key: args.paperId,
        title: args.title,
        chunks: chunksToIndex,
      });

      const indexedAt = new Date().toISOString();
      await ctx.runMutation(internal.rag.patchPaperRagRow, {
        id: rowId,
        patch: {
          status: "ready",
          entryId,
          lastIndexedAt: indexedAt,
          updatedAt: indexedAt,
        },
      });

      return { ok: true as const, status: "ready" as const, alreadyIndexed: false as const };
    } catch (e: any) {
      await ctx.runMutation(internal.rag.patchPaperRagRow, {
        id: rowId,
        patch: {
          status: "failed",
          error: e?.message ?? String(e),
          updatedAt: new Date().toISOString(),
        },
      });
      return { ok: false as const, status: "failed" as const, error: e?.message ?? String(e) };
    }
  },
});

export const searchPaperRag = action({
  args: {
    paperId: v.string(),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { text, results, entries, usage } = await rag.search(ctx, {
      namespace: paperNamespace(args.paperId),
      query: args.query,
      limit: args.limit ?? DEFAULT_SEARCH_LIMIT,
      vectorScoreThreshold: DEFAULT_VECTOR_SCORE_THRESHOLD,
      chunkContext: { before: 1, after: 1 },
    });

    if (results.length > 0) {
      const existing = await ctx.runQuery(internal.rag.getPaperRagByPaperId, {
        paperId: args.paperId,
      });
      if (existing?._id) {
        await ctx.runMutation(internal.rag.touchPaperRagUsage, {
          id: existing._id,
          usedAt: new Date().toISOString(),
        });
      }
    }

    return { text, results, entries, usage };
  },
});

export const cleanupStalePaperRag = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const cutoff = now - STALE_AFTER_MS;

    let cursor: string | undefined;
    let scanned = 0;
    let cleaned = 0;

    while (true) {
      const page = await ctx.runQuery(internal.rag.getReadyPaperRagPage, {
        cursor,
        limit: 100,
      });
      for (const row of page.page) {
        scanned += 1;
        const lastUsedAt = row.lastUsedAt ?? row.lastIndexedAt ?? row.updatedAt;
        if (!lastUsedAt) continue;
        const lastUsedMs = Date.parse(lastUsedAt);
        if (Number.isNaN(lastUsedMs) || lastUsedMs > cutoff) continue;

        if (row.entryId) {
          try {
            await rag.delete(ctx, { entryId: row.entryId as EntryId });
          } catch (error) {
            console.warn("Failed to delete stale RAG entry:", error);
          }
        }

        await ctx.runMutation(internal.rag.patchPaperRagRow, {
          id: row._id,
          patch: {
            status: "not_indexed",
            entryId: null,
            chunkCount: 0,
            error: null,
            updatedAt: new Date().toISOString(),
          },
        });
        cleaned += 1;
      }

      if (page.isDone) break;
      cursor = page.continueCursor ?? undefined;
    }

    return { scanned, cleaned };
  },
});

export const deletePaperRagIndex = action({
  args: { paperId: v.string() },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const existing = await ctx.runQuery(internal.rag.getPaperRagByPaperId, {
      paperId: args.paperId,
    });

    if (!existing) {
      return { ok: true as const, status: "not_indexed" as const };
    }

    if (!existing.entryId) {
      await ctx.runMutation(internal.rag.patchPaperRagRow, {
        id: existing._id,
        patch: {
          status: "not_indexed",
          entryId: null,
          chunkCount: 0,
          error: null,
          updatedAt: now,
        },
      });
      return { ok: true as const, status: "not_indexed" as const };
    }

    const entryId = existing.entryId as EntryId;
    await rag.delete(ctx, { entryId });
    await ctx.runMutation(internal.rag.patchPaperRagRow, {
      id: existing._id,
      patch: {
        status: "not_indexed",
        entryId: null,
        chunkCount: 0,
        error: null,
        updatedAt: now,
      },
    });

    return { ok: true as const, status: "not_indexed" as const };
  },
});
