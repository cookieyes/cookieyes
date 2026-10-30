import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { createConsentBackend } from "../handler.js";
import { memoryStore } from "../memory.js";
import { toNodeHandler } from "../node.js";

let server: Server | undefined;
afterEach(() => new Promise<void>((done) => (server ? server.close(() => done()) : done())));

async function listen(handler: Parameters<typeof createServer>[1]): Promise<string> {
  const started = createServer(handler);
  server = started;
  await new Promise<void>((done) => started.listen(0, "127.0.0.1", done));
  return `http://127.0.0.1:${(started.address() as AddressInfo).port}`;
}

describe("toNodeHandler", () => {
  it("serves the backend from a node:http server, body and headers included", async () => {
    const database = memoryStore();
    const backend = createConsentBackend({
      basePath: "/api/consent",
      trustedOrigins: ["https://shop.example"],
      database,
    });
    const base = await listen(toNodeHandler(backend.handler));
    const response = await fetch(`${base}/api/consent`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://shop.example" },
      body: JSON.stringify({
        recordId: "v.1",
        consentId: "v",
        categories: { necessary: true },
        regulation: "GDPR",
        domain: "shop.example",
        decidedAt: "2026-01-01T00:00:00.000Z",
        taxonomyHash: "h",
        action: "accept_all",
        source: "banner",
      }),
    });
    expect(response.status).toBe(201);
    expect(response.headers.get("access-control-allow-origin")).toBe("https://shop.example");
    expect(await database.list("v")).toHaveLength(1);
    expect((await fetch(`${base}/api/consent/status`)).status).toBe(200);
  });

  it("uses Express's originalUrl, and passes repeated headers on", async () => {
    let seen: Request | undefined;
    const handler = toNodeHandler(async (request) => {
      seen = request;
      return new Response("ok");
    });
    const base = await listen((req, res) => {
      Object.assign(req, { originalUrl: `/mounted${req.url}` });
      void handler(req, res);
    });
    await fetch(`${base}/status`, { headers: { "x-forwarded-for": "1.1.1.1" } });
    expect(new URL(seen?.url ?? "").pathname).toBe("/mounted/status");
    expect(seen?.headers.get("x-forwarded-for")).toBe("1.1.1.1");
  });
});
