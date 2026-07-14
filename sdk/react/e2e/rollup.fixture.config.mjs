import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import replace from "@rollup/plugin-replace";
import esbuild from "rollup-plugin-esbuild";

// A fully self-contained bundle (react + react-dom + this package's own
// source, nothing external) for the CSP e2e fixture — Story 5's "real,
// strict security policy" check needs a real browser loading real code,
// which the jsdom-based unit tests can't provide.
export default {
  input: "e2e/fixture/main.tsx",
  output: {
    file: "e2e/fixture-dist/bundle.js",
    format: "iife",
    sourcemap: false,
  },
  plugins: [
    // react/react-dom read process.env.NODE_ENV at runtime; there's no
    // Node "process" in the browser, so it has to be replaced at build time
    // (the same thing every real bundler does for a browser build).
    replace({ preventAssignment: true, "process.env.NODE_ENV": JSON.stringify("production") }),
    nodeResolve({ extensions: [".ts", ".tsx", ".mjs", ".js", ".json"] }),
    commonjs(),
    esbuild({ target: "es2020", jsx: "automatic", sourceMap: false }),
  ],
};
