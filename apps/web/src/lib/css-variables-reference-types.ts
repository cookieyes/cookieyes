/**
 * Shared shapes for the generated CSS variables reference.
 *
 * `CssVariableSidecarEntry` and `HardcodedColorSidecarEntry` are authored by
 * hand in `content/docs/styling/css-variables.sidecar.ts` — they supply the
 * things a mechanical walk of `tokens.ts`/`cookieyes.css` cannot: plain-language
 * names, and (for the two JS-computed tokens only) the `derivedFrom` fact a JS
 * computation can't be discovered by parsing CSS. `TokenEntry`/`HardcodedEntry`
 * are what `scripts/generate-css-variables-reference.mjs` writes into
 * `.generated/css-variables-reference.json` after joining every sidecar entry
 * against the structural facts (defaults, consumers, aliases) it extracted from
 * `sdk/react/src/styles/tokens.ts` and `sdk/react/src/styles/cookieyes.css`.
 *
 * Importing this file from both the sidecar and the generator means a
 * malformed sidecar entry is a red squiggle in the editor, not just a build
 * failure. See ai-context/designs/css-variables-reference.md §2.3 and §7.
 */

export type TokenType = "color" | "dimension" | "fontFamily";

export type CssVariableSidecarEntry = {
  name: string; // "--cy-primary"
  configKey: string | null; // "primaryColor" | null for derived tokens
  type: TokenType;
  description: string;
  /** Only for JS-computed (not CSS-alias) tokens — cannot be discovered by parsing CSS. */
  derivedFrom: string | null; // "--cy-primary" for --cy-on-primary, etc.
};

export type HardcodedColorSidecarEntry = {
  selector: string; // ".cy-dialog-overlay" — must exist verbatim in cookieyes.css
  property: string; // "background"
  value: string; // "rgba(0, 0, 0, 0.4)" — validated against the live block, not the line number
  line: number; // informational only, for humans; never used to validate
  plainLanguageName: string; // "the dimmed backdrop behind the dialog"
  overrideSelector: string; // "[data-cy-part=\"overlay\"][data-cy-part]"
  overrideNote: string;
  followUpCandidate?: boolean | undefined;
};

export type ConsumerRef = { selector: string; property: string; media: string | null };
export type AliasRef = {
  fromToken: string;
  toToken: string;
  isExpression: boolean;
  transform: string | null;
};

export type TokenEntry = CssVariableSidecarEntry & {
  defaultLight: string;
  defaultDark: string | null; // null = unchanged from light
  darkDefaultable: boolean;
  consumers: ConsumerRef[];
  /** Aliases this token's own :root value contains (e.g. --cy-focus → --cy-primary). */
  aliasOf: AliasRef | null;
  /** Aliases pointing AT this token (e.g. --cy-primary is aliased by --cy-focus, --cy-primary-hover). */
  aliasedBy: string[];
};

export type HardcodedEntry = HardcodedColorSidecarEntry;

export type CssVariablesReferenceData = {
  tokens: TokenEntry[]; // exactly 12, ThemeVars declaration order
  hardcoded: HardcodedEntry[]; // exactly 17
  defaultsBlocks: { light: string; dark: string }; // pre-rendered CSS text for TokenDefaultsBlock
};
