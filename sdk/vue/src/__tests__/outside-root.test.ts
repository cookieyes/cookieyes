import { afterEach, describe, expect, it } from "vitest";
import { type Component, defineComponent, h } from "vue";
import { OptOut } from "../primitives/OptOut.js";
import { Preferences } from "../primitives/Preferences.js";
import { cookieOnly, mountWith, unmountAll } from "./test-utils.js";

afterEach(unmountAll);

const PREFERENCES_MESSAGE =
  "[cookieyes] Preferences.* sub-components must be rendered inside <Preferences.Root>.";
const OPT_OUT_MESSAGE =
  "[cookieyes] OptOut.* sub-components must be rendered inside <OptOut.Root>.";

function alone(part: Component, props: Record<string, unknown> = {}): Component {
  return defineComponent({ render: () => h(part, props) });
}

describe("Preferences parts outside Preferences.Root", () => {
  const parts = {
    Title: alone(Preferences.Title),
  };

  it.each(Object.entries(parts))("%s throws the message that names the fix", (_name, part) => {
    expect(() => mountWith(cookieOnly(), part)).toThrow(PREFERENCES_MESSAGE);
  });
});

describe("OptOut parts outside OptOut.Root", () => {
  const parts = {
    Title: alone(OptOut.Title),
    Checkbox: alone(OptOut.Checkbox),
    Save: alone(OptOut.Save),
    Buttons: alone(OptOut.Buttons),
    Success: alone(OptOut.Success),
  };

  it.each(Object.entries(parts))("%s throws the message that names the fix", (_name, part) => {
    expect(() => mountWith(cookieOnly(), part)).toThrow(OPT_OUT_MESSAGE);
  });
});
