import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: false,
  sourcemap: false,
  clean: true,
  treeshake: true,
  splitting: false,
  minify: false,
  target: "node18",
  banner: {
    js: "#!/usr/bin/env node",
  },
});
