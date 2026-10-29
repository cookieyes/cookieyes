import { CONTRACT_VERSION, MAX_BODY_BYTES, PAYLOAD_FIELDS, RECORD_FIELDS } from "./contract.js";

type Json = Record<string, unknown>;

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const jsonBody = (schema: Json, description: string) => ({
  description,
  content: { "application/json": { schema } },
});
const error = (description: string) => jsonBody(ref("Error"), description);

function payloadSchema(): Json {
  const properties: Json = {};
  for (const f of PAYLOAD_FIELDS) {
    properties[f.name] = {
      type: f.type,
      description: f.description,
      "x-personal-data": f.personalData,
      ...(f.type === "object" ? { additionalProperties: { type: "boolean" } } : {}),
      ...(f.enum ? { enum: f.enum } : {}),
      ...(f.format ? { format: f.format } : {}),
      ...(f.maxLength ? { maxLength: f.maxLength } : {}),
    };
  }
  return {
    type: "object",
    description: `One consent decision, as the SDK sends it. At most ${MAX_BODY_BYTES} bytes. Unknown fields are ignored and never stored.`,
    required: PAYLOAD_FIELDS.filter((f) => f.required).map((f) => f.name),
    properties,
  };
}

function recordSchema(withIp: boolean): Json {
  const properties: Json = {};
  for (const f of RECORD_FIELDS) {
    if (f.name === "ip" && !withIp) continue;
    const list = f.name === "granted" || f.name === "denied";
    const nullable = ["region", "sdkVersion", "gpc", "ip"].includes(f.name);
    const base = f.name === "gpc" ? "boolean" : list ? "array" : "string";
    const values = PAYLOAD_FIELDS.find((p) => p.name === f.name)?.enum;
    properties[f.name] = {
      type: nullable ? [base, "null"] : base,
      description: f.description,
      "x-personal-data": f.personalData,
      ...(values ? { enum: values } : {}),
      ...(list ? { items: { type: "string" } } : {}),
      ...(f.name.endsWith("At") ? { format: "date-time" } : {}),
    };
  }
  return { type: "object", required: Object.keys(properties), properties };
}

const consentIdParam = {
  name: "consentId",
  in: "path",
  required: true,
  description: "The visitor's consent id, as in the records the SDK sends.",
  schema: { type: "string", maxLength: 128 },
};

/**
 * The contract as an OpenAPI 3.1 document. The committed `openapi.json` is this output,
 * and a test fails when the two differ. `basePath` fills in `servers` for the copy a
 * running backend serves.
 */
export function buildOpenApi(basePath?: string): Json {
  const save = {
    summary: "Save a consent decision",
    description:
      "Stores the decision once per `recordId`. Sending it again is safe and answers 200. Only trusted origins may call it from a browser.",
    requestBody: { required: true, ...jsonBody(ref("ConsentPayload"), "The decision.") },
    responses: {
      "201": jsonBody(ref("SaveResult"), "Stored."),
      "200": jsonBody(ref("SaveResult"), "Already stored; nothing changed."),
      "400": error("The body is not JSON."),
      "403": error("The request came from an origin that is not trusted."),
      "409": error("This `recordId` is already stored with a different decision."),
      "413": error(`The body is larger than ${MAX_BODY_BYTES} bytes.`),
      "415": error("The body is not sent as application/json."),
      "422": error("The body does not match the contract."),
      "429": error("Too many requests; retry after the Retry-After seconds."),
    },
  };
  const owner = [{ ownerKey: [] }];
  return {
    openapi: "3.1.0",
    info: {
      title: "CookieYes consent backend",
      version: String(CONTRACT_VERSION),
      description:
        "The HTTP contract between the CookieYes SDK and a server that stores consent records. Any server that passes the conformance suite in @cookieyes/test/backend is compatible.",
      license: { name: "MIT", identifier: "MIT" },
    },
    ...(basePath === undefined ? {} : { servers: [{ url: basePath || "/" }] }),
    paths: {
      "/": { post: { operationId: "saveConsent", ...save } },
      "/consents/{consentId}/current": {
        get: {
          operationId: "currentConsent",
          summary: "Read a visitor's latest decision",
          description:
            "Public, like the save route, and can be turned off with `readBack: false`. Never includes the IP address.",
          parameters: [consentIdParam],
          responses: {
            "200": jsonBody(
              { type: "object", required: ["record"], properties: { record: ref("PublicRecord") } },
              "The latest decision.",
            ),
            "404": error("No decision is stored for this visitor."),
          },
        },
      },
      "/consents/{consentId}": {
        get: {
          operationId: "listConsents",
          summary: "Every record for one visitor",
          description:
            "For answering a request to see one's data. Send `Accept: text/csv`, or `?format=csv`, for a spreadsheet.",
          security: owner,
          parameters: [consentIdParam],
          responses: {
            "200": {
              description: "Oldest first.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["records"],
                    properties: { records: { type: "array", items: ref("StoredRecord") } },
                  },
                },
                "text/csv": { schema: { type: "string" } },
              },
            },
            "401": error("The owner key is missing or wrong."),
          },
        },
        delete: {
          operationId: "deleteConsents",
          summary: "Delete every record for one visitor",
          description: "Real deletion: nothing is kept or flagged.",
          security: owner,
          parameters: [consentIdParam],
          responses: {
            "200": jsonBody(ref("Deleted"), "How many records were deleted."),
            "401": error("The owner key is missing or wrong."),
          },
        },
      },
      "/prune": {
        post: {
          operationId: "pruneConsents",
          summary: "Delete records older than the retention period",
          security: owner,
          responses: {
            "200": jsonBody(ref("Deleted"), "How many records were deleted."),
            "401": error("The owner key is missing or wrong."),
          },
        },
      },
      "/status": {
        get: {
          operationId: "status",
          summary: "Check the server is live and its database ready",
          responses: {
            "200": jsonBody(ref("Status"), "Ready."),
            "503": jsonBody(ref("Status"), "The database is unreachable or needs migrating."),
          },
        },
      },
      "/openapi.json": {
        get: {
          operationId: "openapi",
          summary: "This document",
          responses: { "200": { description: "The contract." } },
        },
      },
      "/docs": {
        get: {
          operationId: "docs",
          summary: "This document as a web page",
          responses: { "200": { description: "HTML." } },
        },
      },
    },
    components: {
      securitySchemes: {
        ownerKey: {
          type: "http",
          scheme: "bearer",
          description:
            "One of the `apiKeys` the server is configured with. Never send it from a browser.",
        },
      },
      schemas: {
        ConsentPayload: payloadSchema(),
        StoredRecord: recordSchema(true),
        PublicRecord: recordSchema(false),
        SaveResult: {
          type: "object",
          required: ["recordId", "result"],
          properties: {
            recordId: { type: "string" },
            result: { type: "string", enum: ["created", "replayed"] },
          },
        },
        Deleted: {
          type: "object",
          required: ["deleted"],
          properties: { deleted: { type: "integer", minimum: 0 } },
        },
        Status: {
          type: "object",
          required: ["status", "version", "contract", "time", "database", "schema", "caller"],
          properties: {
            status: { type: "string", enum: ["ok", "unavailable"] },
            version: { type: "string" },
            contract: { type: "integer" },
            time: { type: "string", format: "date-time" },
            database: { type: "string", enum: ["ok", "unreachable"] },
            schema: { type: "string", enum: ["current", "pending", "unknown"] },
            caller: {
              type: "object",
              properties: {
                region: { type: ["string", "null"] },
                language: { type: ["string", "null"] },
              },
            },
          },
        },
        Error: {
          type: "object",
          required: ["error"],
          properties: {
            error: {
              type: "object",
              required: ["code", "message"],
              properties: { code: { type: "string" }, message: { type: "string" } },
            },
          },
        },
      },
    },
  };
}
