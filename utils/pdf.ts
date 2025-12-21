import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { defaultChunker } from "@convex-dev/rag";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = workerUrl;

export type ExtractedPdf = {
  pageTexts: string[];
  fullText: string;
};

const HEADER_FOOTER_LINE_COUNT = 2;
const HEADER_FOOTER_REPEAT_THRESHOLD = 0.6;

const DEFAULT_CHUNKER_OPTIONS = {
  delimiter: "\n\n",
  maxCharsSoftLimit: 4000,
  maxCharsHardLimit: 12000,
  minCharsSoftLimit: 600,
  minLines: 1,
};
const LARGE_CHUNKER_OPTIONS = {
  delimiter: "\n\n",
  maxCharsSoftLimit: 8000,
  maxCharsHardLimit: 20000,
  minCharsSoftLimit: 1200,
  minLines: 1,
};

function getConvexUrl() {
  const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
  if (!convexUrl) {
    throw new Error("Missing VITE_CONVEX_URL. Run `npx convex dev` to set it.");
  }
  return convexUrl.replace(/\/$/, "");
}

function toConvexSiteUrl(convexUrl: string) {
  try {
    const parsed = new URL(convexUrl);
    if (parsed.hostname.endsWith(".convex.cloud")) {
      parsed.hostname = parsed.hostname.replace(".convex.cloud", ".convex.site");
    }
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return convexUrl.replace(/\/$/, "");
  }
}

export function buildPdfProxyUrl(pdfUrl: string, convexUrl?: string) {
  const base = toConvexSiteUrl(convexUrl ?? getConvexUrl());
  return `${base}/pdf?url=${encodeURIComponent(pdfUrl)}`;
}

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function normalizeLineKey(line: string) {
  return normalizeWhitespace(line).toLowerCase();
}

function extractLinesFromItems(items: any[]) {
  const lines: string[] = [];
  let currentLine: string[] = [];
  let lastY: number | null = null;

  for (const item of items) {
    const text = typeof item?.str === "string" ? item.str : "";
    const hasEOL = Boolean(item?.hasEOL);
    const y = typeof item?.transform?.[5] === "number" ? item.transform[5] : null;

    if (lastY !== null && y !== null && Math.abs(y - lastY) > 2 && currentLine.length) {
      lines.push(currentLine.join(" "));
      currentLine = [];
    }

    if (text) {
      currentLine.push(text);
    }

    if (hasEOL) {
      if (currentLine.length) {
        lines.push(currentLine.join(" "));
        currentLine = [];
      } else {
        lines.push("");
      }
    }

    if (y !== null) {
      lastY = y;
    }
  }

  if (currentLine.length) {
    lines.push(currentLine.join(" "));
  }

  return lines;
}

function removeRepeatedHeadersFooters(pages: string[][]) {
  if (pages.length === 0) return pages;

  const headerCounts = new Map<string, number>();
  const footerCounts = new Map<string, number>();

  for (const lines of pages) {
    const meaningful = lines.filter((line) => line.trim());
    const header = meaningful.slice(0, HEADER_FOOTER_LINE_COUNT);
    const footer = meaningful.slice(-HEADER_FOOTER_LINE_COUNT);

    for (const line of header) {
      const key = normalizeLineKey(line);
      headerCounts.set(key, (headerCounts.get(key) ?? 0) + 1);
    }
    for (const line of footer) {
      const key = normalizeLineKey(line);
      footerCounts.set(key, (footerCounts.get(key) ?? 0) + 1);
    }
  }

  const minRepeats = Math.ceil(pages.length * HEADER_FOOTER_REPEAT_THRESHOLD);
  const headerToDrop = new Set(
    [...headerCounts.entries()]
      .filter(([, count]) => count >= minRepeats)
      .map(([line]) => line),
  );
  const footerToDrop = new Set(
    [...footerCounts.entries()]
      .filter(([, count]) => count >= minRepeats)
      .map(([line]) => line),
  );

  return pages.map((lines) => {
    const meaningful = lines.filter((line) => line.trim());
    const totalMeaningful = meaningful.length;
    let nonEmptyIndex = 0;
    const filtered: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        filtered.push(line);
        continue;
      }
      const key = normalizeLineKey(trimmed);
      const isHeaderSlot = nonEmptyIndex < HEADER_FOOTER_LINE_COUNT;
      const isFooterSlot = nonEmptyIndex >= totalMeaningful - HEADER_FOOTER_LINE_COUNT;
      nonEmptyIndex += 1;

      if ((isHeaderSlot && headerToDrop.has(key)) || (isFooterSlot && footerToDrop.has(key))) {
        continue;
      }
      filtered.push(line);
    }

    return filtered;
  });
}

function mergeHyphenatedLines(lines: string[]) {
  const merged: string[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = normalizeWhitespace(lines[i]);
    if (!line) {
      if (merged.length && merged[merged.length - 1] !== "") {
        merged.push("");
      }
      continue;
    }

    const next = lines[i + 1] ? normalizeWhitespace(lines[i + 1]) : "";
    if (line.endsWith("-") && next && /^[a-z]/.test(next)) {
      merged.push(`${line.slice(0, -1)}${next}`);
      i += 1;
      continue;
    }

    merged.push(line);
  }

  return merged;
}

function buildFullText(pageTexts: string[]) {
  return pageTexts
    .map((text, index) => {
      const marker = `[PAGE ${index + 1}]`;
      return text ? `${marker}\n${text}` : marker;
    })
    .join("\n\n");
}

export async function hashText(text: string) {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function extractPdfTextByPage(
  pdfUrl: string,
  opts?: { maxPages?: number },
): Promise<ExtractedPdf> {
  const maxPages = opts?.maxPages;
  const res = await fetch(pdfUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch PDF (${res.status})`);
  }
  const data = await res.arrayBuffer();

  const pdf = await (pdfjsLib as any).getDocument({ data }).promise;
  const pageCount = maxPages ? Math.min(pdf.numPages, maxPages) : pdf.numPages;
  const rawPages: string[][] = [];

  for (let pageNum = 1; pageNum <= pageCount; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const lines = extractLinesFromItems(content.items as any[]);
    rawPages.push(lines.map((line) => normalizeWhitespace(line)));
  }

  const cleanedPages = removeRepeatedHeadersFooters(rawPages).map(mergeHyphenatedLines);
  const pageTexts = cleanedPages.map((lines) => lines.join("\n"));

  return { pageTexts, fullText: buildFullText(pageTexts) };
}

export function chunkPdfText(
  fullText: string,
  opts?: {
    maxChunks?: number;
  },
) {
  if (!fullText.trim()) return [];

  const maxChunks = opts?.maxChunks ?? 600;
  let chunks = defaultChunker(fullText, DEFAULT_CHUNKER_OPTIONS);

  if (chunks.length > maxChunks) {
    chunks = defaultChunker(fullText, LARGE_CHUNKER_OPTIONS);
  }

  return chunks;
}
