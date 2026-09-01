import type { ConfigReferenceData, NestedConfigPath } from "@/lib/config-reference-types";
import configReference from "../../../.generated/config-reference.json";
import { toTypeMap } from "./config-reference-render";
import { PropsTable } from "./PropsTable";

const data = configReference as ConfigReferenceData;

export interface ConfigNestedTableProps {
  /** Which nested config object's direct fields to render. */
  path: NestedConfigPath;
}

/**
 * Renders the generated direct fields of one nested config object (`theme`,
 * `region`, `i18n`, or `networkBlocker`) as a `PropsTable` — same generator,
 * same sidecar mechanism as `ConfigOptionsTable`, reading the JSON's
 * `nested[path]` bucket instead of `groups[group]`. See design §2.4/§5.
 *
 * Throws at module-eval time (during `next build`) if the requested path has
 * zero fields — belt-and-suspenders on top of the generator's own
 * fail-closed checks, catching a `path` typo in the MDX itself.
 */
export function ConfigNestedTable({ path }: ConfigNestedTableProps) {
  const options = data.nested[path];
  if (!options || options.length === 0) {
    throw new Error(
      `<ConfigNestedTable path="${path}"> has zero fields in the generated config reference. ` +
        `Check the path against NestedConfigPath, or re-run generate-config-reference.mjs.`,
    );
  }
  return <PropsTable type={toTypeMap(options)} />;
}
