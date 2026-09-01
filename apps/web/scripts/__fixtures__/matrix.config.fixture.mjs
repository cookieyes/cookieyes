// Test-only stand-in for `matrix/matrix.config.mjs` (owned by the DEVP-80 producer half, which is
// being built concurrently and doesn't exist in this checkout yet). Mirrors just enough of the
// real config's shape — see peer-dependency-matrix.md §5.1 — for
// `generate-peer-matrix-reference.mjs`'s combination-ID cross-check (§6.1 check 3) to be exercised
// against a fixture. Only `id` is read by the generator; the rest is included for realism/parity
// with the real file's documented shape.

/** @type {{ id: string, role: "floor"|"middle"|"newest", label: string }[]} */
export const combinations = [
  {
    id: "next-14.0.0-react-18.0.0",
    role: "floor",
    label: "Next 14.0.0 + React 18.0.0 (declared floor)",
  },
  {
    id: "next-15.5.4-react-18.3.1",
    role: "middle",
    label: "Next 15.5.4 + React 18.3.1",
  },
  {
    id: "next-16.3.0-react-19.2.8",
    role: "newest",
    label: "Next 16.3.0 + React 19.2.8 (matches apps/web today)",
  },
];
