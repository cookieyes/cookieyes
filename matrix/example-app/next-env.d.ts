/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.
//
// Deliberately does NOT import "./.next/types/routes.d.ts" /
// "./.next/types/root-params.d.ts" the way a freshly-built app's next-env.d.ts
// would: run-combination.mjs runs `tsc --noEmit` *before* `next build`
// (§5.6 — a genuine per-leg typecheck, not just "the build didn't error"), so
// `.next/types/**` doesn't exist yet at that point. Those imports are only
// needed for the (unused here) typedRoutes feature; omitting them keeps the
// standalone typecheck step working identically across Next 14/15/16.
