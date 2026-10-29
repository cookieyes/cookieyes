import { describe, expect, it } from "vitest";
import * as pkg from "../index.js";
import * as memory from "../memory.js";
import * as node from "../node.js";
import * as postgres from "../postgres.js";
import * as sqlite from "../sqlite.js";

/** Guards the public surface of every entry point. */
describe("@cookieyes/backend public exports", () => {
  it.each<[string, object, string[]]>([
    [
      "@cookieyes/backend",
      pkg,
      [
        "BACKEND_VERSION",
        "CONTRACT_VERSION",
        "MAX_BODY_BYTES",
        "PAYLOAD_FIELDS",
        "RECORD_FIELDS",
        "createConsentBackend",
      ],
    ],
    ["@cookieyes/backend/memory", memory, ["memoryStore"]],
    ["@cookieyes/backend/node", node, ["toNodeHandler"]],
    ["@cookieyes/backend/postgres", postgres, ["postgresStore"]],
    ["@cookieyes/backend/sqlite", sqlite, ["d1Store", "sqliteStore"]],
  ])("%s exports exactly the documented surface", (_name, entry, expected) => {
    expect(Object.keys(entry).sort()).toEqual(expected);
  });

  it("speaks the contract version the conformance suite checks", () => {
    expect(pkg.CONTRACT_VERSION).toBe(1);
  });
});
