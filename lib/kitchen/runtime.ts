import {
  Agent,
  SemanticEvent,
  SituationSpecification,
  createAgent,
  createHuman,
  defineRuntime,
  type SituationContext,
  type SituationHandler,
  type Tool,
} from "@mozaik-ai/core";

import { DemoInferenceRunner } from "@/lib/kitchen/demo-runner";
import { KitchenRuntimeState } from "@/lib/kitchen/state";
import type {
  KitchenOrder,
  KitchenSnapshot,
  RunMode,
  ScenarioId,
  StationId,
} from "@/lib/kitchen/types";

type SnapshotListener = (snapshot: KitchenSnapshot) => void;

const agentConfig: Record<
  StationId,
  { name: string; capability: string; events: string[]; instruction: string }
> = {
  prep: {
    name: "Prep Agent",
    capability: "cold-prep-and-rerouting",
    events: ["order.created", "equipment.failed", "allergy.reported"],
    instruction:
      "You own prep and emergency rerouting. Inspect the shared kitchen update, then call prep_update exactly once. Prefer safe, practical recovery over commentary.",
  },
  grill: {
    name: "Grill Agent",
    capability: "hot-line-cooking",
    events: ["order.created"],
    instruction:
      "You own the grill. Inspect the shared kitchen update, then call grill_update exactly once to publish your work.",
  },
  fryer: {
    name: "Fryer Agent",
    capability: "fryer-station-control",
    events: ["order.created", "equipment.failed"],
    instruction:
      "You own the fryer. Inspect the shared kitchen update, then call fryer_update exactly once. Never claim broken equipment is usable.",
  },
  pantry: {
    name: "Pantry Agent",
    capability: "inventory-and-allergen-checks",
    events: ["order.created", "equipment.failed", "allergy.reported"],
    instruction:
      "You own pantry, stock, and allergen checks. Inspect the shared kitchen update, then call pantry_update exactly once.",
  },
  expo: {
    name: "Expo Agent",
    capability: "table-safety-gate",
    events: ["order.created", "equipment.failed", "allergy.reported"],
    instruction:
      "You own final release. Inspect the shared kitchen update, then call expo_update exactly once. The deterministic safety gate has final authority.",
  },
};

class EventTypeSpecification extends SituationSpecification {
  constructor(private readonly acceptedTypes: readonly string[]) {
    super();
  }

  isSatisfiedBy({ event, participant }: SituationContext): boolean {
    return this.acceptedTypes.includes(event.type) && event.producerId !== participant.getId();
  }
}

class EveryEventSpecification extends SituationSpecification {
  isSatisfiedBy(): boolean {
    return true;
  }
}

function createOrder(): KitchenOrder {
  return {
    id: "DR-204",
    table: 12,
    label: "2 smash burgers, fries, chopped salad",
    status: "queued",
    promisedMinutes: 14,
    allergy: null,
    allergyCleared: true,
    components: [
      { id: "buns", name: "Toasted buns", station: "prep", ready: false },
      { id: "burgers", name: "Smash burgers", station: "grill", ready: false },
      { id: "fries", name: "House fries", station: "fryer", ready: false },
      { id: "salad", name: "Chopped salad", station: "pantry", ready: false },
    ],
  };
}

function setComponentReady(state: KitchenRuntimeState, id: string) {
  const component = state.orders[0]?.components.find((item) => item.id === id);
  if (component) component.ready = true;
  if (state.orders[0] && state.orders[0].status === "queued") state.orders[0].status = "cooking";
}

function refreshAllergyClearance(state: KitchenRuntimeState) {
  const order = state.orders[0];
  if (!order?.allergy) return;
  order.allergyCleared =
    state.handled.has("prep:allergy.reported") && state.handled.has("pantry:allergy.reported");
}

function runSafetyGate(state: KitchenRuntimeState) {
  const order = state.orders[0];
  if (!order) {
    state.safetyGate = { passed: false, reason: "No table is waiting." };
    return;
  }

  const missing = order.components.filter((component) => !component.ready);
  if (missing.length > 0) {
    state.safetyGate = {
      passed: false,
      reason: `Hold table 12. Waiting on ${missing.map((item) => item.name).join(", ")}.`,
    };
    order.status = "held";
    return;
  }

  if (order.allergy && !order.allergyCleared) {
    state.safetyGate = {
      passed: false,
      reason: `Hold table 12. ${order.allergy} safety checks are incomplete.`,
    };
    order.status = "held";
    return;
  }

  state.safetyGate = { passed: true, reason: "Every component and safety check passed." };
  order.status = "served";
}

function applyStationDecision(
  state: KitchenRuntimeState,
  station: StationId,
  trigger: string | undefined,
  reason: string,
) {
  if (station === "prep") {
    if (trigger === "equipment.failed" && !state.equipment.fryerOnline) {
      setComponentReady(state, "fries");
      state.setStation("prep", {
        status: "ready",
        progress: 100,
        task: "Oven fries recovered",
        lastDecision: "Moved fries to the convection oven",
      });
    } else if (trigger === "allergy.reported") {
      state.handled.add("prep:allergy.reported");
      refreshAllergyClearance(state);
      state.setStation("prep", {
        status: "ready",
        progress: 100,
        task: "Clean prep zone verified",
        lastDecision: "Rebuilt cold prep with clean tools",
      });
    } else {
      setComponentReady(state, "buns");
      state.setStation("prep", {
        status: "ready",
        progress: 100,
        task: "Buns toasted",
        lastDecision: "Cold line is ready for assembly",
      });
    }
  }

  if (station === "grill") {
    setComponentReady(state, "burgers");
    state.setStation("grill", {
      status: "ready",
      progress: 100,
      task: "Burgers at temperature",
      lastDecision: "Resting patties for final assembly",
    });
  }

  if (station === "fryer") {
    if (!state.equipment.fryerOnline) {
      state.setStation("fryer", {
        status: "blocked",
        progress: 32,
        task: "Fryer offline",
        lastDecision: "Stopped the basket and requested a reroute",
      });
    } else {
      setComponentReady(state, "fries");
      state.inventory.fries -= 1;
      state.setStation("fryer", {
        status: "ready",
        progress: 100,
        task: "Fries crisped",
        lastDecision: "Seasoned and moved fries to the pass",
      });
    }
  }

  if (station === "pantry") {
    if (trigger === "allergy.reported") {
      state.handled.add("pantry:allergy.reported");
      refreshAllergyClearance(state);
      state.setStation("pantry", {
        status: "ready",
        progress: 100,
        task: "Allergen stock checked",
        lastDecision: "Confirmed a sesame-free salad build",
      });
    } else {
      setComponentReady(state, "salad");
      state.inventory.salad -= 1;
      state.setStation("pantry", {
        status: "ready",
        progress: 100,
        task: "Salad dressed",
        lastDecision: state.equipment.fryerOnline
          ? "Cold items are ready"
          : "Reserved potatoes for oven recovery",
      });
    }
  }

  if (station === "expo") {
    runSafetyGate(state);
    state.setStation("expo", {
      status: state.safetyGate.passed ? "ready" : "blocked",
      progress: state.safetyGate.passed ? 100 : 58,
      task: state.safetyGate.passed ? "Table 12 released" : "Table 12 on safety hold",
      lastDecision: state.safetyGate.reason,
    });
  }

  state.record(
    "decision",
    agentConfig[station].name,
    `${state.stations.get(station)?.lastDecision}. ${reason}`,
    station === "expo" && !state.safetyGate.passed ? "danger" : "accent",
  );
}

export function startKitchenRuntime(
  scenario: ScenarioId,
  onSnapshot: SnapshotListener,
): { stop: () => void; state: KitchenRuntimeState } {
  const mode: RunMode = process.env.OPENAI_API_KEY ? "openai-live" : "mozaik-demo";
  const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";
  const state = new KitchenRuntimeState(mode, model, scenario);
  const runtime = defineRuntime<KitchenRuntimeState>();
  const runtimeService = runtime.initializeRuntime({
    state,
    ...(mode === "mozaik-demo"
      ? { inferenceRunnerConfig: { runner: new DemoInferenceRunner() } }
      : {}),
  });
  const timers: ReturnType<typeof setTimeout>[] = [];
  const pendingTriggers = new Map<StationId, string[]>();

  const emitSnapshot = () => onSnapshot(state.snapshot());

  const observerHandler: SituationHandler = {
    specification: new EveryEventSpecification(),
    processor: {
      apply({ event }) {
        const producer = runtimeService.getParticipant(event.producerId);
        const name = producer?.getManifest().name ?? "Kitchen";

        if (event.type === "message_received.started") {
          const payload = event.payload as { loopId?: string; message?: string };
          if (payload.loopId) {
            state.openLoop(payload.loopId, event.producerId, name, payload.message ?? "Kitchen update");
          }
          const station = [...state.stations.values()].find((item) => `${item.name} Agent` === name);
          if (station) state.setStation(station.id, { status: "thinking", task: "Reading shared state" });
        }

        if (event.type === "function_call.started") {
          state.record("tool", name, "Acting on the shared kitchen state");
        }

        if (event.type === "model.answer") {
          state.closeOldestLoop(event.producerId);
        }

        emitSnapshot();
      },
    },
  };

  const observer = createHuman({ name: "Live Concurrency Observer", capabilities: ["telemetry"], handlers: [observerHandler] });
  const dispatcher = createHuman({ name: "Dinner Rush", capabilities: ["scenario-events"], handlers: [] });
  runtime.join(observer);
  runtime.join(dispatcher);

  for (const station of ["prep", "grill", "fryer", "pantry", "expo"] as StationId[]) {
    let participantId = "";
    const tool: Tool = {
      type: "function",
      name: `${station}_update`,
      description: `Publish the ${station} station's safest next action into shared RuntimeState.`,
      parameters: {
        type: "object",
        properties: { reason: { type: "string" } },
        required: ["reason"],
        additionalProperties: false,
      },
      strict: true,
      async invoke(args: { reason: string }) {
        const trigger = pendingTriggers.get(station)?.shift();
        applyStationDecision(state, station, trigger, args.reason);
        runtime.sendEvent(
          SemanticEvent.create("station.updated", participantId, {
            station,
            snapshotVersion: Date.now(),
          }),
          participantId,
        );
        return { ok: true, station, safetyGate: state.safetyGate };
      },
    };

    const handler: SituationHandler = {
      specification: new EventTypeSpecification(agentConfig[station].events),
      processor: {
        apply({ event, participant }) {
          if (!(participant instanceof Agent)) return;
          const key = `${station}:${event.type}:${event.occurredAt.toISOString()}`;
          if (state.handled.has(key)) return;
          state.handled.add(key);
          state.handled.add(`${station}:${event.type}`);
          pendingTriggers.set(station, [...(pendingTriggers.get(station) ?? []), event.type]);
          state.setStation(station, {
            status: "thinking",
            task: `Reacting to ${event.type.replace(".", " ")}`,
            lastDecision: "Reading the newest shared state",
          });
          const sharedSummary = JSON.stringify({
            event: event.type,
            equipment: state.equipment,
            inventory: state.inventory,
            order: state.orders[0],
            safetyGate: state.safetyGate,
          });
          runtime.runLoop(participant.getId(), sharedSummary, {
            model,
            maxOutputTokens: 180,
            context: participant.getMemory().getContext(),
            tools: participant.getTools(),
          });
        },
      },
    };

    const agent = createAgent({
      name: agentConfig[station].name,
      capabilities: [agentConfig[station].capability],
      instruction: agentConfig[station].instruction,
      tools: [tool],
      handlers: [handler],
    });
    participantId = agent.getId();
    runtime.join(agent);
  }

  const publish = (type: string, payload: Record<string, unknown>) => {
    runtime.sendEvent(SemanticEvent.create(type, dispatcher.getId(), payload), dispatcher.getId());
  };

  state.status = "running";
  state.orders.push(createOrder());
  state.record("order", "Floor", "Table 12 fired four components at once", "accent");
  emitSnapshot();

  timers.push(
    setTimeout(() => publish("order.created", { orderId: "DR-204", table: 12 }), 120),
  );

  if (scenario === "fryer" || scenario === "full") {
    timers.push(
      setTimeout(() => {
        state.equipment.fryerOnline = false;
        const fries = state.orders[0]?.components.find((component) => component.id === "fries");
        if (fries) fries.ready = false;
        state.record("failure", "Fryer", "Oil temperature crashed during service", "danger");
        publish("equipment.failed", { station: "fryer", fault: "temperature-drop" });
      }, 620),
    );
  }

  if (scenario === "allergy" || scenario === "full") {
    timers.push(
      setTimeout(() => {
        const order = state.orders[0];
        if (order) {
          order.allergy = "Sesame allergy";
          order.allergyCleared = false;
          order.status = "held";
        }
        state.safetyGate = { passed: false, reason: "New allergy note requires two independent checks." };
        state.record("allergy", "Server", "Late sesame allergy added to table 12", "danger");
        publish("allergy.reported", { orderId: "DR-204", allergen: "sesame" });
      }, 1_480),
    );
  }

  const finishAfter = mode === "openai-live" ? 16_000 : 4_800;
  timers.push(
    setTimeout(() => {
      runSafetyGate(state);
      state.status = "complete";
      state.record(
        "complete",
        "Dinner Rush",
        state.safetyGate.passed
          ? `Table 12 served with ${state.overlapPeak} agent loops overlapping`
          : `Run ended safely on hold with ${state.overlapPeak} loops overlapping`,
        state.safetyGate.passed ? "accent" : "danger",
      );
      emitSnapshot();
    }, finishAfter),
  );

  return {
    state,
    stop: () => timers.forEach((timer) => clearTimeout(timer)),
  };
}
