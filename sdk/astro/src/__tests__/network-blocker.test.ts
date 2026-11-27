// @vitest-environment jsdom
import { _clearNetworkBlockerInstaller, _hasNetworkBlockerInstaller } from "@cookieyes/core";
import { afterEach, describe, expect, it } from "vitest";

afterEach(() => _clearNetworkBlockerInstaller());

describe("client/network-blocker", () => {
  it("registers core's network blocker when the page entry imports it", async () => {
    expect(_hasNetworkBlockerInstaller()).toBe(false);
    await import("../client/network-blocker.js");
    expect(_hasNetworkBlockerInstaller()).toBe(true);
  });
});
