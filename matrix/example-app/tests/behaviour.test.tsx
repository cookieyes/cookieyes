// matrix/example-app/tests/behaviour.test.tsx
//
// Test B — ref forwarding is genuinely populated, on both React majors.
// Run with vitest + jsdom *inside the scratch project* (`pnpm --dir ...
// test:behaviour`), so it exercises this combination's actually-installed
// React/ReactDOM/@cookieyes/react/@cookieyes/test, never the repo's own
// copies. Targets exactly what `childRef()`/`composeRefs()` in Slot.tsx
// (sdk/react/src/primitives/Slot.tsx:30-34) exist to handle — populated
// `.current`, real DOM identity — never "didn't throw".
//
// See ai-context/designs/peer-dependency-matrix.md §5.4 (Test B).

import { Banner } from "@cookieyes/react";
import { createReactConsentTest, resetReactConsentTestState } from "@cookieyes/test/react";
import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, expect, test } from "vitest";

afterEach(resetReactConsentTestState);

test("Slot asChild forwards a real ref to the child DOM node", () => {
  createReactConsentTest();
  const childRef = createRef<HTMLButtonElement>();
  render(
    <Banner.AcceptAll asChild>
      <button type="button" ref={childRef} data-testid="accept-native">
        Accept
      </button>
    </Banner.AcceptAll>,
  );
  const node = screen.getByTestId("accept-native");
  expect(childRef.current).not.toBeNull();
  expect(childRef.current).toBeInstanceOf(HTMLButtonElement);
  expect(childRef.current).toBe(node); // identity — the same DOM node, not a stand-in
});

test("Slot asChild composes the outer ref with the child's own ref", () => {
  createReactConsentTest();
  const outerRef = createRef<HTMLButtonElement>();
  const innerRef = createRef<HTMLButtonElement>();
  render(
    <Banner.AcceptAll asChild ref={outerRef}>
      <button type="button" ref={innerRef} data-testid="accept-native-2">
        Accept
      </button>
    </Banner.AcceptAll>,
  );
  const node = screen.getByTestId("accept-native-2");
  expect(outerRef.current).toBe(node);
  expect(innerRef.current).toBe(node);
});
