import { RuntimeState } from "@mozaik-ai/core";

import type {
  KitchenActivity,
  KitchenOrder,
  KitchenSnapshot,
  LoopSpan,
  RunMode,
  ScenarioId,
  StationId,
  StationState,
} from "@/lib/kitchen/types";

const stationNames: Record<StationId, string> = {
  prep: "Prep",
  grill: "Grill",
  fryer: "Fryer",
  pantry: "Pantry",
  expo: "Expo",
};

export class KitchenRuntimeState extends RuntimeState {
  readonly runId = crypto.randomUUID();
  readonly startedAt = Date.now();
  readonly stations = new Map<StationId, StationState>();
  readonly orders: KitchenOrder[] = [];
  readonly activities: KitchenActivity[] = [];
  readonly loops: LoopSpan[] = [];
  readonly handled = new Set<string>();
  readonly equipment = { fryerOnline: true };
  readonly inventory: Record<string, number> = {
    potatoes: 12,
    plantain: 10,
    chicken: 10,
    beef: 8,
    rice: 12,
    pasta: 8,
    vegetables: 14,
    bread: 10,
  };
  overlapPeak = 0;
  status: "idle" | "running" | "complete" = "idle";
  safetyGate = { passed: false, reason: "Waiting for a complete table." };

  constructor(
    readonly mode: RunMode,
    readonly model: string,
    readonly scenario: ScenarioId,
  ) {
    super();
    for (const id of ["prep", "grill", "fryer", "pantry", "expo"] as StationId[]) {
      this.stations.set(id, {
        id,
        name: stationNames[id],
        status: "idle",
        task: "Watching the kitchen",
        progress: 0,
        lastDecision: "Standing by",
      });
    }
  }

  record(type: string, actor: string, message: string, tone: KitchenActivity["tone"] = "neutral") {
    this.activities.unshift({ id: crypto.randomUUID(), at: Date.now(), type, actor, message, tone });
    this.activities.splice(80);
  }

  setStation(id: StationId, patch: Partial<StationState>) {
    const current = this.stations.get(id);
    if (current) this.stations.set(id, { ...current, ...patch });
  }

  openLoop(loopId: string, agentId: string, agentName: string, trigger: string) {
    if (this.loops.some((loop) => loop.loopId === loopId)) return;
    this.loops.push({ loopId, agentId, agentName, startedAt: Date.now(), finishedAt: null, trigger });
    this.updatePeak();
  }

  closeOldestLoop(agentId: string) {
    const loop = this.loops.find((item) => item.agentId === agentId && item.finishedAt === null);
    if (loop) loop.finishedAt = Date.now();
    this.updatePeak();
  }

  private updatePeak() {
    const points = this.loops.flatMap((loop) => [
      { at: loop.startedAt, delta: 1 },
      ...(loop.finishedAt ? [{ at: loop.finishedAt, delta: -1 }] : []),
    ]);
    points.sort((a, b) => a.at - b.at || b.delta - a.delta);
    let active = 0;
    for (const point of points) {
      active += point.delta;
      this.overlapPeak = Math.max(this.overlapPeak, active);
    }
  }

  snapshot(): KitchenSnapshot {
    return {
      runId: this.runId,
      mode: this.mode,
      model: this.model,
      scenario: this.scenario,
      startedAt: this.startedAt,
      now: Date.now(),
      status: this.status,
      stations: [...this.stations.values()],
      orders: structuredClone(this.orders),
      equipment: { ...this.equipment },
      inventory: { ...this.inventory },
      activities: [...this.activities],
      loops: this.loops.map((loop) => ({ ...loop })),
      overlapPeak: this.overlapPeak,
      safetyGate: { ...this.safetyGate },
    };
  }
}
