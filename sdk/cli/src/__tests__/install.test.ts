import { beforeEach, describe, expect, it, vi } from "vitest";

const { execa } = vi.hoisted(() => ({ execa: vi.fn() }));
vi.mock("execa", () => ({ execa }));

import { installPackage } from "../utils/install.js";

beforeEach(() => {
  execa.mockReset();
  execa.mockResolvedValue(undefined);
});

describe("installPackage", () => {
  it("runs the pnpm add command in the target cwd", async () => {
    await installPackage("@cookieyes/react", "pnpm", "/tmp/app");
    expect(execa).toHaveBeenCalledWith("pnpm", ["add", "@cookieyes/react"], {
      cwd: "/tmp/app",
      stdio: "inherit",
    });
  });

  it("runs the npm install command for npm", async () => {
    await installPackage("@cookieyes/nextjs", "npm", "/tmp/app");
    expect(execa).toHaveBeenCalledWith("npm", ["install", "@cookieyes/nextjs"], {
      cwd: "/tmp/app",
      stdio: "inherit",
    });
  });
});
