import { mergeConfig } from "vitest/config";
import { sharedTestConfig } from "../../vitest.shared.js";

// @cookieyes/nextjs's main entry is a pure re-export barrel; the smoke test
// imports it, executing every re-export, so the 80% gate holds and guards
// against the barrel silently dropping an export. The `server` and
// `styles-route` entries carry real code — `<CookieYesStyles />` and its route
// handler — tested with react-dom/server, which needs no DOM, so `node` stays.
export default mergeConfig(sharedTestConfig, {
  test: {
    environment: "node",
    include: ["src/__tests__/**/*.test.{ts,tsx}"],
  },
});
