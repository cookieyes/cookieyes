import type { ConfigGroupId, ConfigReferenceData } from "@/lib/config-reference-types";
import configReference from "../../../.generated/config-reference.json";
import { toTypeMap } from "./config-reference-render";
import { PropsTable } from "./PropsTable";

const data = configReference as ConfigReferenceData;

export interface ConfigOptionsTableProps {
  /** One of the five AC 1.5 groups: setup, appearance, language, storage, callbacks. */
  group: ConfigGroupId;
}

/**
 * Renders the generated `CookieYesConfig` options for one AC 1.5 group as a
 * `PropsTable`. Reads `.generated/config-reference.json`, written by
 * `scripts/generate-config-reference.mjs` as part of `apps/web`'s build chain
 * — see design §2.2 and §2.3.
 *
 * Throws at module-eval time (during `next build`) if the requested group has
 * zero options — belt-and-suspenders on top of the generator's own
 * fail-closed checks, catching a `group` typo in the MDX itself.
 */
export function ConfigOptionsTable({ group }: ConfigOptionsTableProps) {
  const options = data.groups[group];
  if (!options || options.length === 0) {
    throw new Error(
      `<ConfigOptionsTable group="${group}"> has zero options in the generated config reference. ` +
        `Check the group name against ConfigGroupId, or re-run generate-config-reference.mjs.`,
    );
  }
  return <PropsTable type={toTypeMap(options)} />;
}
