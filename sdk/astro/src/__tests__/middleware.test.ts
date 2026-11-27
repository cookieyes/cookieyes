import { describe, expect, it } from "vitest";
import { onRequest } from "../middleware.js";

describe("onRequest", () => {
  it("is the handler built from the integration's virtual module", async () => {
    const locals = {} as { cookieyes?: { regulation: string } };
    const response = await onRequest(
      { request: new Request("https://example.com/"), locals, isPrerendered: false },
      async () =>
        new Response('<head><meta charset="utf-8"></head>', {
          headers: { "content-type": "text/html" },
        }),
    );
    expect(await response.text()).toContain("<script>/*head*/</script>");
    expect(locals.cookieyes?.regulation).toBe("GDPR");
  });
});
