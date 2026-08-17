import type { ConsentBackend, ConsentPayload, ConsentSnapshot } from "@cookieyes/core";
import type { RecordedConsentEvent } from "./types.js";

export type Recorder = {
  events: RecordedConsentEvent[];
  snapshots: ConsentSnapshot[];
  backendCalls: ConsentPayload[];
};

export function createRecorder(): Recorder {
  return { events: [], snapshots: [], backendCalls: [] };
}

/**
 * A `ConsentBackend` that captures what would have been sent instead of sending
 * it. The harness always installs one, so `mode: "self-hosted"` exercises core's
 * real persistence branch (`manager.ts` → `config.backend.persist`) with no
 * network call and no `fetch` stubbing on the consumer's side.
 *
 * A caller-supplied backend is **wrapped, not replaced** — recorded first, then
 * delegated — so `backendCalls()` works whether or not they brought their own.
 */
export function createRecordingBackend(
  recorder: Recorder,
  delegate: ConsentBackend | undefined,
): ConsentBackend {
  return {
    persist(payload: ConsentPayload): Promise<void> | void {
      // Copy the category map: the recorded payload must be a point-in-time
      // record, immune to whatever the next decision does.
      recorder.backendCalls.push({ ...payload, categories: { ...payload.categories } });
      return delegate?.persist(payload);
    },
  };
}
