import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

const ALLOWED_PDF_HOSTS = new Set(["arxiv.org", "www.arxiv.org", "export.arxiv.org"]);

http.route({
  path: "/pdf",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
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
      return new Response("Missing url parameter.", { status: 400 });
    }

    let targetUrl: URL;
    try {
      targetUrl = new URL(target);
    } catch {
      return new Response("Invalid url parameter.", { status: 400 });
    }

    if (!ALLOWED_PDF_HOSTS.has(targetUrl.hostname)) {
      return new Response("Host not allowed.", { status: 400 });
    }

    const upstream = await fetch(targetUrl.toString());
    if (!upstream.ok || !upstream.body) {
      return new Response(`Failed to fetch PDF (${upstream.status}).`, { status: 502 });
    }

    const headers = new Headers(upstream.headers);
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET,OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type");
    if (!headers.get("Content-Type")) {
      headers.set("Content-Type", "application/pdf");
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  }),
});

export default http;
