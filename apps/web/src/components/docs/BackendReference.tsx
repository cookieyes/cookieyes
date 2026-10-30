import type { TypeNode } from "fumadocs-ui/components/type-table";
import type { BackendReferenceData } from "@/lib/backend-reference-types";
import backendReference from "../../../.generated/backend-reference.json";
import { inlineCode } from "./inline-code";
import { PropsTable } from "./PropsTable";

const data = backendReference as BackendReferenceData;

/**
 * The `createConsentBackend()` options, from `.generated/backend-reference.json`
 * (written by `scripts/generate-backend-reference.mjs`, which fails the build when an
 * option and its prose disagree).
 */
export function BackendOptionsTable() {
  const type: Record<string, TypeNode> = Object.fromEntries(
    data.options.map((option) => [
      option.path,
      {
        type: option.type,
        required: option.required,
        default: option.default ?? undefined,
        description: inlineCode(option.description),
      },
    ]),
  );
  return <PropsTable type={type} />;
}

/** Every route of the consent backend contract, from `sdk/backend/openapi.json`. */
export function BackendEndpointsTable() {
  return (
    <div className="cy-doc-table-scroll">
      <table className="cy-doc-table">
        <thead>
          <tr>
            <th scope="col">Route</th>
            <th scope="col">Access</th>
            <th scope="col">What it does</th>
          </tr>
        </thead>
        <tbody>
          {data.endpoints.map((endpoint) => (
            <tr key={`${endpoint.method} ${endpoint.path}`}>
              <td>
                <code>
                  {endpoint.method} {endpoint.path}
                </code>
              </td>
              <td>{endpoint.access}</td>
              <td>
                {endpoint.summary}
                {endpoint.description ? <>. {inlineCode(endpoint.description)}</> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export interface BackendFieldsTableProps {
  /** `"payload"`: what the SDK sends. `"record"`: what the backend stores. */
  of: "payload" | "record";
}

/** The fields of the record the SDK sends, or of the row the backend stores. */
export function BackendFieldsTable({ of }: BackendFieldsTableProps) {
  const fields = of === "payload" ? data.payload : data.record;
  return (
    <div className="cy-doc-table-scroll">
      <table className="cy-doc-table">
        <thead>
          <tr>
            <th scope="col">Field</th>
            <th scope="col">Type</th>
            <th scope="col">Personal data</th>
            <th scope="col">Meaning</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => (
            <tr key={field.name}>
              <td>
                <code>{field.name}</code>
              </td>
              <td>
                <code>{field.type}</code>
              </td>
              <td>{field.personalData}</td>
              <td>{inlineCode(field.description)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
