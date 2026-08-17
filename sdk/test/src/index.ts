export { coreVersionWarning, SUPPORTED_CORE_RANGE } from "./core-version.js";
export type { GoogleConsentUpdate } from "./google-consent.js";
export { createConsentTest } from "./harness.js";
export { resetConsentTestState } from "./reset.js";
export { seedConsentCookie } from "./seed.js";
export type {
  BuiltInCategoryId,
  CategoryIdOf,
  ConsentTest,
  ConsentTestBase,
  ConsentTestOptions,
  DefaultCategoryDefs,
  HarnessSnapshot,
  RecordedConsentEvent,
  SeedOptions,
} from "./types.js";
