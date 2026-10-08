import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Deliberately empty — the delta must not depend on any build tuning that a
     real consumer would not have. See tools/size/README.md §"Identical apps". */
};

export default nextConfig;
