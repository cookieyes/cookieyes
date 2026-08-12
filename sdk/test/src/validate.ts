/**
 * Reject a category id that isn't part of the taxonomy in effect.
 *
 * This is deliberately **stricter than production**: `updateCategory` silently
 * returns on an unknown id (`core/src/manager.ts`), which is the right call for a
 * live banner — a typo in a customer's config must never break a visitor's page.
 * In a test it's the opposite: a silent no-op turns a misspelling into an
 * assertion that passes for the wrong reason. Surfacing mistakes is the whole
 * job of a test double, so here it throws. Listed in the README's fidelity table.
 */
export function assertKnownCategory(id: string, valid: readonly string[]): void {
  if (valid.includes(id)) return;
  throw new Error(
    `[@cookieyes/test] Unknown consent category "${id}". ` +
      `Valid categories for this harness: ${valid.join(", ")}. ` +
      "Pass a `categories` option to createConsentTest() if you use a custom taxonomy.",
  );
}
