import { remarkNpm } from "fumadocs-core/mdx-plugins";
import { defineConfig } from "fumadocs-mdx/config";

/**
 * Global MDX options for the docs collection.
 *
 * `remarkNpm` turns a ```npm fence into a package-manager tabbed group, deriving the
 * pnpm/yarn/bun forms from the npm command via npm-to-yarn — so the four variants can
 * never drift from each other the way four hand-typed blocks would.
 *
 * Registered here rather than on the collection: per fumadocs-mdx's own types, a
 * collection-level `mdxOptions` REPLACES the default plugin set, which would silently
 * drop rehype-code, remark-heading and the rest.
 *
 * Not passing `persist`: remarkNpm accepts `persist: { id }` and emits `groupId`/`persist`
 * onto CodeBlockTabs, but fumadocs-ui 16's Tabs no longer implements either prop (verified:
 * `TabsProps` declares neither, and neither tabs.js nor codeblock.js contains the string).
 * Radix drops them silently, so passing it buys nothing — each block stands alone, which is
 * what the design specified.
 */
export default defineConfig({
  mdxOptions: {
    remarkPlugins: (v) => [remarkNpm, ...v],
    /**
     * Shiki themes for code blocks.
     *
     * The design's syntax palette (docs.html:219-221 dark, :344-346 light) is GitHub's
     * *default* themes, not the legacy ones fumadocs-core falls back to
     * (`github-light`/`github-dark`, see its `defaultThemes`). Every dark colour the
     * design lists — #FF7B72, #A5D6FF, #D2A8FF, #E3B341, #79C0FF, #7EE787 — is a
     * verbatim `github-dark-default` value, and the light set likewise matches
     * `github-light-default`. Naming the themes here is therefore the whole change; no
     * custom theme and no per-scope CSS is needed.
     *
     * `defaultColor: false` is repeated deliberately. fumadocs-core's
     * `transformDefaultThemes` returns these options untouched once `themes` is present,
     * so the default's own `defaultColor: false` is NOT merged in. Dropping it would
     * make Shiki emit resolved colours instead of the paired
     * `--shiki-light`/`--shiki-dark` custom properties the theme switcher depends on.
     *
     * One knowing divergence: the design paints class/type `#8A5C00` in light mode where
     * `github-light-default` uses `#953800`. Accepted rather than overridden — a hand-kept
     * rule on top of Shiki's scope mapping would be fragile across languages and upgrades.
     */
    rehypeCodeOptions: {
      themes: {
        light: "github-light-default",
        dark: "github-dark-default",
      },
      defaultColor: false,
    },
  },
});
