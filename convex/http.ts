import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

const ALLOWED_PDF_HOSTS = new Set(["arxiv.org", "www.arxiv.org", "export.arxiv.org"]);
const MAX_PDF_BYTES = 20 * 1024 * 1024;

function withCorsHeaders(headers?: Headers) {
  const next = new Headers(headers);
  next.set("Access-Control-Allow-Origin", "*");
  next.set("Access-Control-Allow-Methods", "GET,OPTIONS");
  next.set("Access-Control-Allow-Headers", "Content-Type,Range");
  next.set("Access-Control-Expose-Headers", "Accept-Ranges, Content-Range, Content-Length, Content-Type");
  return next;
}

http.route({
  path: "/pdf",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: withCorsHeaders(),
    });
  }),
});

http.route({
  path: "/pdf",
  method: "GET",
  handler: httpAction(async (_ctx, req) => {
    const url = new URL(req.url);
    const target = url.searchParams.get("url");
    if (!target) {
      return new Response("Missing url parameter.", { status: 400, headers: withCorsHeaders() });
    }

    let targetUrl: URL;
    try {
      targetUrl = new URL(target);
    } catch {
      return new Response("Invalid url parameter.", { status: 400, headers: withCorsHeaders() });
    }

    if (!ALLOWED_PDF_HOSTS.has(targetUrl.hostname)) {
      return new Response("Host not allowed.", { status: 400, headers: withCorsHeaders() });
    }

    const rangeHeader = req.headers.get("range");
    const upstream = await fetch(targetUrl.toString(), {
      headers: {
        ...(rangeHeader ? { Range: rangeHeader } : {}),
        "Accept-Encoding": "identity",
      },
    });
    if (!upstream.ok || !upstream.body) {
      return new Response(`Failed to fetch PDF (${upstream.status}).`, {
        status: 502,
        headers: withCorsHeaders(),
      });
    }

    const headers = withCorsHeaders(upstream.headers);
    if (!headers.get("Content-Type")) {
      headers.set("Content-Type", "application/pdf");
    }
    if (!headers.get("Accept-Ranges")) {
      headers.set("Accept-Ranges", "bytes");
    }

    const contentLength = headers.get("Content-Length");
    if (contentLength && Number(contentLength) > MAX_PDF_BYTES) {
      return new Response("PDF response too large. Enable range requests.", {
        status: 413,
        headers: withCorsHeaders(),
      });
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  }),
});

export default http;
