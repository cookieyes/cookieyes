import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  tsconfig: "./tsconfig.build.json",
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  minify: false,
  target: "es2020",
});
