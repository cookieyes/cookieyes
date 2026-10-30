import { _sameDecision, type ConsentStore, type StoredRecord } from "./store.js";

const byDecision = (a: StoredRecord, b: StoredRecord): number =>
  a.decidedAt.localeCompare(b.decidedAt) || a.receivedAt.localeCompare(b.receivedAt);

/**
 * A store that keeps records in this process's memory. For tests, demos and the
 * quickstart only: records are lost when the process stops, and each server instance
 * has its own copy.
 *
 * @example
 * const backend = createConsentBackend({ database: memoryStore(), trustedOrigins });
 */
export function memoryStore(): ConsentStore {
  const records = new Map<string, StoredRecord>();
  const forVisitor = (consentId: string) =>
    [...records.values()].filter((r) => r.consentId === consentId).sort(byDecision);

  return {
    async migrate() {
      return { applied: [], pending: [] };
    },
    async check() {
      return "current";
    },
    async save(record) {
      const existing = records.get(record.recordId);
      if (!existing) {
        records.set(record.recordId, { ...record });
        return "created";
      }
      return _sameDecision(existing, record) ? "replayed" : "conflict";
    },
    async current(consentId) {
      const found = forVisitor(consentId);
      return found[found.length - 1] ?? null;
    },
    async list(consentId) {
      return forVisitor(consentId);
    },
    async remove(consentId) {
      const found = forVisitor(consentId);
      for (const record of found) records.delete(record.recordId);
      return found.length;
    },
    async prune(receivedBefore) {
      const cutoff = receivedBefore.toISOString();
      let removed = 0;
      for (const [id, record] of records) {
        if (record.receivedAt < cutoff) {
          records.delete(id);
          removed++;
        }
      }
      return removed;
    },
  };
}
