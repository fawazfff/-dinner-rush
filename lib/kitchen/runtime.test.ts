import { afterEach, describe, expect, it, vi } from "vitest";

import { startKitchenRuntime } from "@/lib/kitchen/runtime";
import type { KitchenSnapshot } from "@/lib/kitchen/types";

describe("Dinner Rush Mozaik runtime", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs five station loops concurrently and serves only after safety checks", async () => {
    vi.useFakeTimers();
    const snapshots: KitchenSnapshot[] = [];
    const kitchen = startKitchenRuntime("full", (snapshot) => snapshots.push(snapshot));

    await vi.advanceTimersByTimeAsync(5_000);

    const final = snapshots.at(-1);
    expect(final?.status).toBe("complete");
    expect(final?.overlapPeak).toBeGreaterThanOrEqual(5);
    expect(final?.loops.length).toBeGreaterThan(5);
    expect(final?.safetyGate.passed).toBe(true);
    expect(final?.orders[0]?.status).toBe("served");
    expect(final?.orders[0]?.allergyCleared).toBe(true);
    expect(final?.equipment.fryerOnline).toBe(false);
    expect(final?.stations.find((station) => station.id === "fryer")?.status).toBe("blocked");

    kitchen.stop();
  });
});
