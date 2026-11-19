import { describe, expect, it, vi } from "vitest";

const registerNetworkBlocker = vi.hoisted(() => vi.fn());
vi.mock("@cookieyes/core/network-blocker", () => ({ registerNetworkBlocker }));
vi.mock("nuxt/app", () => import("./stubs/nuxt-app.js"));

const { default: plugin } = await import("../runtime/network-blocker.js");

describe("the network blocker plugin", () => {
  it("registers the blocker, ordered just before the module's main plugin", () => {
    const definition = plugin as unknown as { order: number; setup(): void };
    expect(definition.order).toBeLessThan(-20);
    definition.setup();
    expect(registerNetworkBlocker).toHaveBeenCalledTimes(1);
  });
});
