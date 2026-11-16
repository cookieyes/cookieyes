import { version } from "vue";

const DOCS_URL = "https://github.com/cookieyes/cookieyes#compatibility";
const warned = new Set<string>();

/**
 * Newest Vue major this SDK's CI matrix has verified. Kept in sync with the peer matrix by a test
 * that fails when this constant and the matrix's highest pinned Vue major disagree.
 */
const HIGHEST_VERIFIED_VUE_MAJOR = 3;

/** Oldest Vue minor of major 3 this SDK declares support for; mirrors `peerDependencies: vue >=3.5.0`. */
const LOWEST_SUPPORTED_VUE_MINOR = 5;

/**
 * Dev-only: warns once per unique Vue version when the installed Vue is below the declared floor
 * or above the newest major the CI matrix has exercised. Package managers install a mismatched
 * peer regardless (`--legacy-peer-deps`, `--force`), and that developer would otherwise get
 * silence here and a confusing runtime failure later.
 *
 * The `typeof process === "undefined"` half of the guard matters: this SDK also ships to
 * consumers with no bundler define step for `process.env`, where the check itself would throw.
 */
export function warnOnUntestedVueVersion(): void {
  if (typeof process === "undefined" || process.env?.NODE_ENV === "production") return;
  if (typeof console === "undefined") return;
  const [majorText, minorText] = version.split(".");
  const major = Number.parseInt(majorText ?? "", 10);
  const minor = Number.parseInt(minorText ?? "", 10);
  if (!Number.isFinite(major) || !Number.isFinite(minor)) return;
  const tooOld = major < 3 || (major === 3 && minor < LOWEST_SUPPORTED_VUE_MINOR);
  const tooNew = major > HIGHEST_VERIFIED_VUE_MAJOR;
  if (!tooOld && !tooNew) return;
  if (warned.has(version)) return;
  warned.add(version);
  console.warn(
    tooOld
      ? `[cookieyes] You're running Vue ${version}, which is below this SDK's supported ` +
          `floor of Vue 3.${LOWEST_SUPPORTED_VUE_MINOR}.0. Your package manager installed it ` +
          `anyway. This combination is not tested and parts of the SDK may fail silently ` +
          `rather than error. See ${DOCS_URL} for the tested matrix.`
      : `[cookieyes] You're running Vue ${version}. This SDK's CI matrix has verified up ` +
          `through Vue ${HIGHEST_VERIFIED_VUE_MAJOR}.x. Newer majors likely work but haven't ` +
          `been verified yet. See ${DOCS_URL} for the tested matrix.`,
  );
}

declare const process: { env?: { NODE_ENV?: string } };
