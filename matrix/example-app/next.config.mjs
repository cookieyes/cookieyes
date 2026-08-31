/** @type {import('next').NextConfig} */
export default {
  // Nothing needed. The SDK packages are installed from packed tarballs
  // (see matrix/scripts/pack-tarballs.mjs) exactly as a real consumer would
  // get them from npm — no symlink resolution quirks to work around, unlike
  // playground/next's `link:../../sdk/*` setup.
};
