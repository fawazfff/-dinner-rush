import { afterEach, describe, expect, it, vi } from "vitest";

import { startKitchenRuntime } from "@/lib/kitchen/runtime";
import type { KitchenSnapshot } from "@/lib/kitchen/types";

describe("Dinner Rush live Mozaik runtime", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("requires a real OpenAI key instead of silently falling back to a scripted demo", () => {
    vi.stubEnv("OPENAI_API_KEY", "");

    expect(() =>
      startKitchenRuntime("rush", ["burger", "fries"], (_snapshot: KitchenSnapshot) => undefined),
    ).toThrow("OPENAI_API_KEY is required");
  });

  it("rejects an empty or invalid menu before starting service", () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");

    expect(() =>
      startKitchenRuntime("rush", ["not-a-menu-item"], (_snapshot: KitchenSnapshot) => undefined),
    ).toThrow("Select at least one valid menu item");
  });
});
