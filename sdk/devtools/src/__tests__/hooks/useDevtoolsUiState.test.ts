import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useDevtoolsUiState } from "../../hooks/useDevtoolsUiState.js";

afterEach(() => {
  try {
    window.localStorage.clear();
  } catch {
    // ignore
  }
});

describe("useDevtoolsUiState", () => {
  it("starts closed on the given default tab/position when nothing is stored", () => {
    const { result } = renderHook(() => useDevtoolsUiState("bottom-right"));
    expect(result.current.state).toEqual({
      open: false,
      activeTab: "consent",
      position: "bottom-right",
    });
  });

  it("persists open/activeTab/position to localStorage", () => {
    const { result } = renderHook(() => useDevtoolsUiState("bottom-right"));
    act(() => result.current.toggleOpen());
    act(() => result.current.setActiveTab("region"));
    act(() => result.current.setPosition("top-left"));

    const stored = JSON.parse(window.localStorage.getItem("cyd:ui") ?? "{}");
    expect(stored).toEqual({ open: true, activeTab: "region", position: "top-left" });
  });

  it("rehydrates from localStorage on a fresh mount", () => {
    window.localStorage.setItem(
      "cyd:ui",
      JSON.stringify({ open: true, activeTab: "gcm", position: "top-right" }),
    );
    const { result } = renderHook(() => useDevtoolsUiState("bottom-right"));
    expect(result.current.state).toEqual({ open: true, activeTab: "gcm", position: "top-right" });
  });

  it("the position prop is a default, not a floor — a stored position wins", () => {
    window.localStorage.setItem(
      "cyd:ui",
      JSON.stringify({ open: false, activeTab: "consent", position: "top-left" }),
    );
    const { result } = renderHook(() => useDevtoolsUiState("bottom-right"));
    expect(result.current.state.position).toBe("top-left");
  });

  it("ignores corrupt stored JSON rather than throwing", () => {
    window.localStorage.setItem("cyd:ui", "{not json");
    const { result } = renderHook(() => useDevtoolsUiState("bottom-right"));
    expect(result.current.state.position).toBe("bottom-right");
  });
});
