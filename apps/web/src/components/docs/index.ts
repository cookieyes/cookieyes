/**
 * Docs-only MDX components, transcribed from the `docs.html` design prototype.
 * Registered globally for MDX in src/components/mdx.tsx, so pages use them without
 * importing. Anything reusable beyond /docs belongs in src/components instead.
 */
export { ArchArrow, ArchBox, ArchDiagram, ArchRow } from "./ArchDiagram";
export { ChangelogEntry, ChangelogOlderReveal } from "./Changelog";
export { CompareTable, Mark } from "./CompareTable";
export { ComponentPropsTable } from "./ComponentPropsTable";
export { ConfigNestedTable } from "./ConfigNestedTable";
export { ConfigOptionsTable } from "./ConfigOptionsTable";
export { CssVariableConsumers } from "./CssVariableConsumers";
export { CssVariableReferenceTable } from "./CssVariableReferenceTable";
export { HardcodedColorsTable } from "./HardcodedColorsTable";
export { HookCard } from "./HookCard";
export { OverviewHero } from "./OverviewHero";
export { PackageBadge } from "./PackageBadge";
export { ParamFlag } from "./ParamFlag";
export { PropsTable } from "./PropsTable";
export {
  ReleaseBadges,
  ReleaseInstall,
  ReleaseRule,
  ReleaseSource,
  ReleaseSummary,
} from "./ReleaseNotes";
export { TokenDefaultsBlock } from "./TokenDefaultsBlock";
