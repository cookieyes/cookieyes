import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GatedScript } from "../controls/GatedScript.js";
import { clearCookie, mountOffline, teardown, uniqueScriptId } from "./test-utils.js";

beforeEach(() => {
  clearCookie();
  document.head.innerHTML = "";
});
afterEach(() => {
  cleanup();
  teardown();
});

describe("GatedScript", () => {
  it("renders nothing to the DOM tree", () => {
    mountOffline("GDPR");
    const id = uniqueScriptId();
    const { container } = render(
      <GatedScript id={id} src="https://cdn.example.com/x.js" category="analytics" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("does not inject the script while its category is denied", () => {
    mountOffline("GDPR"); // analytics denied by default
    const id = uniqueScriptId();
    render(<GatedScript id={id} src="https://cdn.example.com/y.js" category="analytics" />);
    expect(document.getElementById(id)).toBeNull();
  });

  it("injects the script once its category is consented", () => {
    const rt = mountOffline("GDPR");
    rt.manager.acceptAll(); // analytics granted
    const id = uniqueScriptId();
    render(<GatedScript id={id} src="https://cdn.example.com/z.js" category="analytics" />);
    const el = document.getElementById(id) as HTMLScriptElement | null;
    expect(el).not.toBeNull();
    expect(el?.src).toBe("https://cdn.example.com/z.js");
  });

  it("forwards the strategy and onLoad callback to the registry", () => {
    const rt = mountOffline("GDPR");
    rt.manager.acceptAll();
    const id = uniqueScriptId();
    const onLoad = vi.fn();
    render(
      <GatedScript
        id={id}
        src="https://cdn.example.com/w.js"
        category="analytics"
        strategy="lazyOnce"
        onLoad={onLoad}
      />,
    );
    document.getElementById(id)?.dispatchEvent(new Event("load"));
    expect(onLoad).toHaveBeenCalledTimes(1);
  });
});
