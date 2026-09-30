import { type ConsentRecordTarget, sendConsentRecord } from "./sync.js";
import type { ConsentPayload } from "./types.js";

/*
 * Consent records waiting for the server to confirm them, kept in localStorage.
 *
 * A record is saved before it is sent and removed only once the server confirms
 * it, so a failed send, a server that is down, or a tab closed mid-send are all
 * retried later. Sending one twice is safe: the server can drop a repeat by its
 * recordId.
 */

const STORAGE_KEY = "cookieyes-consent-records";
/** Limits on what is kept. Documented; keep the docs in step. */
export const MAX_KEPT_RECORDS = 10;
export const MAX_KEPT_AGE_MS = 7 * 24 * 60 * 60 * 1000;
/** Wait before each retry while the page stays open; the last one repeats. */
export const RETRY_DELAYS_MS = [10_000, 60_000, 300_000];

export type RecordQueue = {
  /** Keep the record, then try to send it. */
  send(record: ConsentPayload): void;
  /** Try to send every kept record. */
  flush(): Promise<void>;
};

function load(): ConsentPayload[] {
  try {
    const kept: ConsentPayload[] = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    const oldest = Date.now() - MAX_KEPT_AGE_MS;
    return kept
      .filter((record) => Date.parse(record.decidedAt ?? "") >= oldest)
      .slice(-MAX_KEPT_RECORDS);
  } catch {
    // Storage unavailable (private mode, blocked) or unreadable: nothing to retry.
    return [];
  }
}

/** Returns false when storage is full or unavailable. */
function save(records: ConsentPayload[]): boolean {
  try {
    if (records.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    else localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

const without = (records: ConsentPayload[], recordId: string | undefined) =>
  records.filter((record) => record.recordId !== recordId);

export function createRecordQueue(target: ConsentRecordTarget): RecordQueue {
  // Records being sent right now, so a retry never sends one twice at the same time.
  const sending = new Set<string | undefined>();
  let retries = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function scheduleRetry(): void {
    if (timer !== undefined) return;
    const delay = RETRY_DELAYS_MS[Math.min(retries, RETRY_DELAYS_MS.length - 1)] ?? 0;
    retries++;
    // A random spread, so visitors whose sends all failed don't all retry at once.
    timer = setTimeout(
      () => {
        timer = undefined;
        void flush();
      },
      delay * (0.5 + Math.random()),
    );
  }

  async function flush(): Promise<void> {
    let failed = false;
    // Write the list back as read, so records past the limits leave storage now,
    // not only at the next change.
    const kept = load();
    save(kept);
    // Every record gets its try, so one the server refuses can't hold up the rest.
    await Promise.all(
      kept.map(async (record) => {
        if (sending.has(record.recordId)) return;
        sending.add(record.recordId);
        if (await sendConsentRecord(target, record)) save(without(load(), record.recordId));
        else failed = true;
        sending.delete(record.recordId);
      }),
    );
    if (failed) scheduleRetry();
    else retries = 0;
  }

  // Optional call: some environments have a window without events.
  if (typeof window !== "undefined") window.addEventListener?.("online", () => void flush());

  return {
    send(record) {
      const kept = [...without(load(), record.recordId), record].slice(-MAX_KEPT_RECORDS);
      if (save(kept)) void flush();
      // Nowhere to keep it: send it once, as before, with no retry.
      else void sendConsentRecord(target, record);
    },
    flush,
  };
}
