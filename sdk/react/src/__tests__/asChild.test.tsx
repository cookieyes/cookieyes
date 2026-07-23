import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Banner } from "../primitives/Banner.js";
import { clearCookie, mountCookieOnly, teardown } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(() => {
  cleanup();
  teardown();
});

describe("asChild — swap in your own element", () => {
  it("renders the developer's element instead of our button, with our part merged", () => {
    mountCookieOnly("GDPR");
    render(
      <Banner.Root>
        <Banner.AcceptAll asChild>
          <a href="#accept" data-testid="my-accept">
            Accept
          </a>
        </Banner.AcceptAll>
      </Banner.Root>,
    );

    const el = document.querySelector('[data-testid="my-accept"]');
    expect(el?.tagName).toBe("A"); // our <button> was not rendered
    expect(el?.getAttribute("data-cy-part")).toBe("accept-all"); // our behaviour merged on
  });

  it("runs both the child's handler and our consent action on click", () => {
    const rt = mountCookieOnly("GDPR");
    const childClick = vi.fn();
    render(
      <Banner.Root>
        <Banner.AcceptAll asChild>
          <button type="button" data-testid="my-accept" onClick={childClick}>
            Accept
          </button>
        </Banner.AcceptAll>
      </Banner.Root>,
    );

    const el = document.querySelector('[data-testid="my-accept"]');
    expect(el).toBeTruthy();
    if (el) act(() => fireEvent.click(el));

    expect(childClick).toHaveBeenCalledTimes(1); // child handler ran
    expect(rt.getSnapshot().hasActed).toBe(true); // our acceptAll ran too
    expect(rt.getSnapshot().committedCategories.analytics).toBe(true);
  });

  it("merges className onto the swapped element without dropping the child's own", () => {
    mountCookieOnly("GDPR");
    render(
      <Banner.Root>
        <Banner.RejectAll asChild>
          <button type="button" className="mine" data-testid="my-reject">
            Reject
          </button>
        </Banner.RejectAll>
      </Banner.Root>,
    );

    const el = document.querySelector('[data-testid="my-reject"]');
    expect(el?.classList.contains("mine")).toBe(true);
    expect(el?.getAttribute("data-cy-part")).toBe("reject-all");
  });

  it("forwards a ref to the developer's element", () => {
    mountCookieOnly("GDPR");
    let node: HTMLElement | null = null;
    render(
      <Banner.Root>
        <Banner.AcceptAll
          asChild
          ref={(n) => {
            node = n;
          }}
        >
          <a href="#a" data-testid="my-accept">
            Accept
          </a>
        </Banner.AcceptAll>
      </Banner.Root>,
    );
    expect(node).not.toBeNull();
    expect((node as unknown as HTMLElement).tagName).toBe("A");
  });
});
