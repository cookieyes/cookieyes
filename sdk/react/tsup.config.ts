import { readFile, writeFile } from "node:fs/promises";
import { defineConfig } from "tsup";

async function prependUseClient(...files: string[]) {
  for (const file of files) {
    const content = await readFile(file, "utf8");
    if (!content.startsWith('"use client"')) {
      await writeFile(file, `"use client";\n${content}`);
    }
  }
}

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
  external: ["react", "react-dom"],
  esbuildOptions(options) {
    options.jsx = "automatic";
  },
  async onSuccess() {
    await prependUseClient("dist/index.js", "dist/index.cjs");
  },
});
