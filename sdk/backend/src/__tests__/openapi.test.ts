import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PAYLOAD_FIELDS, RECORD_FIELDS } from "../contract.js";
import { buildOpenApi } from "../openapi.js";

const COMMITTED = new URL("../../openapi.json", import.meta.url);

describe("buildOpenApi", () => {
  // The committed file is what the docs site and other implementers read. Compared
  // parsed, not as text, because Biome reformats it. After a contract change:
  // `UPDATE_OPENAPI=1 pnpm --filter @cookieyes/backend test`, then `pnpm lint:fix`.
  it("matches the committed openapi.json", () => {
    if (process.env.UPDATE_OPENAPI === "1") {
      writeFileSync(COMMITTED, `${JSON.stringify(buildOpenApi(), null, 2)}\n`);
    }
    expect(JSON.parse(readFileSync(COMMITTED, "utf8"))).toEqual(buildOpenApi());
  });

  it("describes every payload field and every stored column, with what is personal data", () => {
    const schemas = (
      buildOpenApi() as {
        components: {
          schemas: Record<string, { properties: Record<string, Record<string, unknown>> }>;
        };
      }
    ).components.schemas;
    for (const field of PAYLOAD_FIELDS) {
      expect(schemas.ConsentPayload?.properties[field.name]?.["x-personal-data"]).toBe(
        field.personalData,
      );
    }
    expect(Object.keys(schemas.StoredRecord?.properties ?? {})).toEqual(
      RECORD_FIELDS.map((f) => f.name),
    );
    expect(Object.keys(schemas.PublicRecord?.properties ?? {})).not.toContain("ip");
  });

  it("names the base path as the server only when one is given", () => {
    expect(buildOpenApi()).not.toHaveProperty("servers");
    expect(buildOpenApi("")).toHaveProperty("servers", [{ url: "/" }]);
  });
});
