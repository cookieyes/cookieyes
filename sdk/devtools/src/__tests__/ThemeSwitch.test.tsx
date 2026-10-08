import { cleanup, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CookieYesDevtools } from "../devtools.js";
import { clearCookie, mountCookieOnly, teardown } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(() => {
  cleanup();
  teardown();
});

function root() {
  return document.querySelector('[data-cyd-part="root"]') as HTMLElement;
}
function part(name: string) {
  return document.querySelector(`[data-cyd-part="${name}"]`) as HTMLElement;
}

describe("devtools theme", () => {
  it("follows the system by default (no data-cyd-theme)", async () => {
    mountCookieOnly("GDPR");
    const user = userEvent.setup();
    render(<CookieYesDevtools />);
    await user.click(part("trigger"));
    expect(root().hasAttribute("data-cyd-theme")).toBe(false);
    expect(part("theme-system").getAttribute("aria-checked")).toBe("true");
  });

  it("applies the host's theme prop while the switch is on System", async () => {
    mountCookieOnly("GDPR");
    render(<CookieYesDevtools theme="dark" />);
    await userEvent.setup().click(part("trigger"));
    expect(root().getAttribute("data-cyd-theme")).toBe("dark");
  });

  it("a Light/Dark choice in the header wins over the prop and persists", async () => {
    mountCookieOnly("GDPR");
    const user = userEvent.setup();
    const { unmount } = render(<CookieYesDevtools theme="dark" />);
    await user.click(part("trigger"));
    await user.click(part("theme-light"));
    expect(root().getAttribute("data-cyd-theme")).toBe("light");
    expect(window.localStorage.getItem("cyd:theme")).toBe("light");
    unmount();

    render(<CookieYesDevtools theme="dark" />);
    expect(root().getAttribute("data-cyd-theme")).toBe("light");

    await user.click(part("theme-system"));
    expect(root().getAttribute("data-cyd-theme")).toBe("dark");
    expect(window.localStorage.getItem("cyd:theme")).toBeNull();
  });
});
