import type {
  CategoryDef,
  ConsentBackend,
  ConsentCategory,
  ConsentEventListener,
  ConsentEventPayload,
  ConsentEventType,
  ConsentManager,
  ConsentPayload,
  ConsentSnapshot,
  ConsentStore,
  Regulation,
} from "@cookieyes/core";
import type { GoogleConsentUpdate } from "./google-consent.js";

/** The five ids `@cookieyes/core` ships when no custom taxonomy is configured. */
export type BuiltInCategoryId =
  | "necessary"
  | "functional"
  | "analytics"
  | "performance"
  | "advertisement";

/**
 * Core's `DEFAULT_CATEGORIES` restated as a literal tuple type.
 *
 * This is the default *type argument* of `createConsentTest` / `seedConsentCookie`,
 * and it has to be spelled out rather than written `readonly CategoryDef[]`:
 * `CategoryDef.id` is typed `ConsentCategory`, which absorbs any string, so a bare
 * `CategoryDef[]` default would collapse the id union to `string` and silently give
 * up all typo safety in the common case (no `categories` passed).
 *
 * Note this is *not* the default on {@link SeedOptions} / {@link ConsentTestOptions}
 * themselves — those stay permissive so an options object can be annotated with
 * either type and still hold any taxonomy. The narrow default only applies where
 * inference happens, which is the call itself.
 */
export type DefaultCategoryDefs = readonly [
  { readonly id: "necessary"; readonly required: true },
  { readonly id: "functional" },
  { readonly id: "analytics" },
  { readonly id: "performance" },
  { readonly id: "advertisement" },
];

/**
 * The category ids a harness accepts, derived from the taxonomy the caller
 * declared — a **closed** union, unlike core's `ConsentCategory` which
 * intentionally absorbs any string (`core/src/types.ts`). That openness is right
 * for production and useless for a test double, so the union is extracted here
 * from the *inferred literal* array instead.
 *
 * Because `CategoryDef.id` is itself `ConsentCategory`, a widening regression here
 * would be completely silent. `types.test.ts` pins the behaviour with
 * `@ts-expect-error` assertions that `pnpm typecheck` verifies.
 *
 * One deliberate escape hatch: a caller who annotates their taxonomy as
 * `CategoryDef[]` has already erased their own literals, so there is nothing left
 * to narrow to. Rather than guess wrong and reject their real ids, this falls back
 * to core's open `ConsentCategory` — compile-time checking is opted out of, and the
 * runtime check still catches typos.
 */
export type CategoryIdOf<C extends readonly CategoryDef[]> = [C[number]] extends [never]
  ? BuiltInCategoryId
  : string extends C[number]["id"]
    ? ConsentCategory
    : C[number]["id"] & string;

/** Options shared by {@link seedConsentCookie} and `createConsentTest`. */
export type SeedOptions<C extends readonly CategoryDef[] = readonly CategoryDef[]> = {
  /** Which regulation applies. Default `"GDPR"` — opt-in, the case most code branches on. */
  regulation?: Regulation | undefined;
  /** Your own taxonomy. Omit for core's built-in five. */
  categories?: C | undefined;
  /**
   * What the pretend visitor has already agreed to *before* the test starts.
   * Omit (or pass `{}`) for a brand-new visitor who hasn't acted yet. Any id
   * outside the taxonomy is a compile error and a runtime throw.
   */
  initialConsent?: Partial<Record<CategoryIdOf<C>, boolean>> | undefined;
  /** Fix the consent id for deterministic assertions. Default: core's real generator. */
  consentId?: string | undefined;
};

export type ConsentTestOptions<C extends readonly CategoryDef[] = readonly CategoryDef[]> =
  SeedOptions<C> & {
    /** Default `"cookie-only"`. `"self-hosted"` records payloads instead of sending them. */
    mode?: "cookie-only" | "self-hosted" | undefined;
    /**
     * Your own persistence adapter. It is **wrapped**, not replaced — the harness
     * records every payload and then calls yours, so `backendCalls()` works either
     * way and no real network request is ever made.
     */
    backend?: ConsentBackend | undefined;
    onConsentReady?: ((state: ConsentSnapshot) => void) | undefined;
    onConsentUpdate?: ((state: ConsentSnapshot) => void) | undefined;
    /**
     * Capture Google Consent Mode broadcasts, readable via `googleConsent()`.
     *
     * Off by default because it installs a minimal `window` — core's broadcast
     * no-ops without one. That also makes `payload.domain` the shim's hostname
     * instead of `"unknown"`; see the README's fidelity table.
     */
    googleConsentMode?: boolean | undefined;
  };

/** A consent event as recorded by the harness, tagged with which signal it was. */
export type RecordedConsentEvent = ConsentEventPayload & { type: ConsentEventType };

export type HarnessSnapshot<Id extends string> = ConsentSnapshot & {
  /** Consent in effect — what a real decision committed. Gate your code on this. */
  committed: Record<Id, boolean>;
  /** Working values, including uncommitted `toggle()` calls. Drives checkboxes. */
  live: Record<Id, boolean>;
};

/**
 * Everything a harness does regardless of which engine backs it.
 *
 * Both `createConsentTest` (core) and `createReactConsentTest`
 * (`@cookieyes/test/react`) return this exact surface, so a test reads the same
 * either way and neither entry point can grow behaviour the other lacks.
 */
export type ConsentTestBase<Id extends string> = {
  /** The real `ConsentManager` from `@cookieyes/core` — an escape hatch, not a copy. */
  readonly manager: ConsentManager;
  /** The taxonomy ids in effect, in order. */
  readonly categories: readonly Id[];

  /** True when `id` is *committed*-granted (a saved decision, not a pending toggle). */
  has(id: Id): boolean;
  /** Everything a test might assert on, with committed and live values split out. */
  snapshot(): HarnessSnapshot<Id>;

  /** Grant `id` and commit immediately. */
  grant(id: Id): void;
  /** Deny `id` and commit immediately. Required categories stay on, as in production. */
  deny(id: Id): void;
  /** Set `id` and commit immediately. */
  set(id: Id, value: boolean): void;
  acceptAll(): void;
  rejectAll(): void;
  /** Withdraw every non-required category at once. Alias of {@link rejectAll}. */
  withdrawAll(): void;
  acceptOnly(ids: readonly Id[]): void;

  /** Change the working value **without** committing — models a dialog checkbox. */
  toggle(id: Id, value: boolean): void;
  /** Commit whatever `toggle()` left pending. */
  save(): void;

  /** Core's real event subscription, including the `isInitial` replay. */
  on(
    type: ConsentEventType,
    listener: ConsentEventListener,
    options?: { category?: Id },
  ): () => void;
  /** Core's real snapshot subscription (fires on toggles too). */
  subscribe(listener: (state: ConsentSnapshot) => void): () => void;
  /** Resolves once `onConsentReady` has fired — production's single microtask. */
  whenReady(): Promise<void>;

  /**
   * Every `save`/`change` event caused by a real decision, in order. The one-off
   * `isInitial` replay is excluded — attach {@link on} to observe that.
   */
  events(type?: ConsentEventType): RecordedConsentEvent[];
  /** Every snapshot core pushed to subscribers, in order. */
  snapshots(): ConsentSnapshot[];
  /** Payloads that *would* have been POSTed, captured rather than sent. */
  backendCalls(): ConsentPayload[];
  /**
   * Google Consent Mode broadcasts, oldest first — including the one core emits
   * at load. Requires `googleConsentMode: true`; throws otherwise rather than
   * returning an empty array that reads like "nothing was broadcast".
   */
  googleConsent(): GoogleConsentUpdate[];

  /** Back to a brand-new visitor, keeping this harness alive. */
  resetVisitor(): void;
  /** Tear everything down: runtime, registries, cookie, and the document shim. */
  teardown(): void;
};

/** A harness over `@cookieyes/core`'s runtime. See `createConsentTest`. */
export type ConsentTest<Id extends string> = ConsentTestBase<Id> & {
  /** The real `ConsentStore` from `@cookieyes/core`. */
  readonly store: ConsentStore;
};
