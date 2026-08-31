import type { ComponentName, ComponentReferenceData } from "@/lib/component-reference-types";
import componentReference from "../../../.generated/component-reference.json";
import { toComponentTypeMap } from "./component-reference-render";
import { PropsTable } from "./PropsTable";

const data = componentReference as ComponentReferenceData;

export interface ComponentPropsTableProps {
  /** One of the six components with real props — see ComponentName in component-reference-types.ts. */
  component: ComponentName;
}

/**
 * Renders the generated props of one component as a `PropsTable`. Reads
 * `.generated/component-reference.json`, written by
 * `scripts/generate-component-reference.mjs` as part of `apps/web`'s build
 * chain — see design §2.2 and §2.6.
 *
 * Throws at module-eval time (during `next build`) if the requested
 * component has zero rows — belt-and-suspenders on top of the generator's
 * own fail-closed checks, catching a `component` typo in the MDX itself.
 */
export function ComponentPropsTable({ component }: ComponentPropsTableProps) {
  const options = data.components[component];
  if (!options || options.length === 0) {
    throw new Error(
      `<ComponentPropsTable component="${component}"> has zero props in the generated component ` +
        `reference. Check the component name against ComponentName, or re-run generate-component-reference.mjs.`,
    );
  }
  return <PropsTable type={toComponentTypeMap(options)} />;
}
