/**
 * Shapes for the generated `@cookieyes/backend` reference.
 *
 * `BackendSidecarEntry` is written by hand in
 * `content/shared/self-host/backend-options.sidecar.ts`: the description and default
 * the compiler cannot supply. `scripts/generate-backend-reference.mjs` joins it with
 * the option names and types it extracts from `ConsentBackendOptions`, and reads the
 * endpoints and fields from `sdk/backend/openapi.json`, which a test in that package
 * keeps equal to the source.
 */
export type BackendSidecarEntry = {
  /** `"trustedOrigins"`, or a nested field such as `"ipAddress.store"`. */
  path: string;
  description: string;
  /** Display string. `null` when there is no default. */
  default: string | null;
  /** `backend/handler.ts:123`, where the default is applied. Required when `default` is set. */
  defaultLocation: string | null;
};

export type BackendOption = BackendSidecarEntry & { type: string; required: boolean };

export type BackendEndpoint = {
  method: string;
  path: string;
  access: "Public" | "Owner key";
  summary: string;
  description: string;
};

export type BackendField = {
  name: string;
  type: string;
  required: boolean;
  personalData: string;
  description: string;
};

export type BackendReferenceData = {
  contract: string;
  options: BackendOption[];
  endpoints: BackendEndpoint[];
  payload: BackendField[];
  record: BackendField[];
};
