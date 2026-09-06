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
import type { KitchenOrder, KitchenSnapshot, RunMode, ScenarioId, StationId } from "@/lib/kitchen/types";

type SnapshotListener = (snapshot: KitchenSnapshot) => void;

type StationConfig = {
  name: string;
  capability: string;
  events: string[];
  actions: string[];
  instruction: string;
};

const agentConfig: Record<StationId, StationConfig> = {
  prep: {
    name: "Prep Agent",
    capability: "cold-prep-and-recovery",
    events: ["order.created", "equipment.failed", "allergy.reported"],
    actions: ["CONTINUE_PREP", "ASSIST_OVEN_REROUTE", "CLEAN_ALLERGY_ZONE", "HOLD"],
    instruction: "You are Prep. Read the newest shared kitchen state. Choose ONE legal action that best helps service without inventing resources. Explain why in plain English, then call prep_update exactly once.",
  },
  grill: {
    name: "Grill Agent",
    capability: "hot-line-cooking",
    events: ["order.created", "equipment.failed", "allergy.reported"],
    actions: ["COOK_BURGERS", "HOLD_GRILL", "PRIORITIZE_ORDER"],
    instruction: "You are Grill. Read the live shared state and choose ONE legal action. Optimize for safe, fast service. Explain the decision, then call grill_update exactly once.",
  },
  fryer: {
    name: "Fryer Agent",
    capability: "fryer-station-control",
    events: ["order.created", "equipment.failed"],
    actions: ["FRY_NOW", "REROUTE_TO_OVEN", "SWAP_FOR_SALAD", "WAIT_FOR_REPAIR"],
    instruction: "You are Fryer. Read equipment, inventory and the current order. If the fryer is broken you must not use it. Choose ONE legal recovery action and explain why, then call fryer_update exactly once.",
  },
  pantry: {
    name: "Pantry Agent",
    capability: "inventory-and-allergen-checks",
    events: ["order.created", "equipment.failed", "allergy.reported"],
    actions: ["MAKE_SALAD", "RESERVE_POTATOES", "VERIFY_ALLERGY", "HOLD_STOCK"],
    instruction: "You are Pantry. Read inventory, equipment and allergy state. Choose ONE legal action that protects stock and guest safety. Explain why, then call pantry_update exactly once.",
  },
  expo: {
    name: "Expo Agent",
    capability: "table-safety-gate",
    events: ["order.created", "equipment.failed", "allergy.reported", "station.updated"],
    actions: ["CHECK_AND_RELEASE", "HOLD_ORDER"],
    instruction: "You are Expo. You coordinate final release. Read the newest shared state and choose whether to CHECK_AND_RELEASE or HOLD_ORDER. You cannot bypass the deterministic safety gate. Explain why, then call expo_update exactly once.",
  },
};

class EventTypeSpecification extends SituationSpecification {
  constructor(private readonly acceptedTypes: readonly string[]) { super(); }
  isSatisfiedBy({ event, participant }: SituationContext): boolean {
    return this.acceptedTypes.includes(event.type) && event.producerId !== participant.getId();
  }
}

class EveryEventSpecification extends SituationSpecification {
  isSatisfiedBy(): boolean { return true; }
}

function createOrder(): KitchenOrder {
  return {
    id: "DR-204",
    table: 12,
    label: "smash burger, house fries, chopped salad",
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

function component(state: KitchenRuntimeState, id: string) {
  return state.orders[0]?.components.find((item) => item.id === id);
}

function setReady(state: KitchenRuntimeState, id: string) {
  const item = component(state, id);
  if (item) item.ready = true;
  if (state.orders[0] && state.orders[0].status === "queued") state.orders[0].status = "cooking";
}

function refreshAllergyClearance(state: KitchenRuntimeState) {
  const order = state.orders[0];
  if (!order?.allergy) return;
  order.allergyCleared = state.handled.has("prep:allergy-clear") && state.handled.has("pantry:allergy-clear");
}

function runSafetyGate(state: KitchenRuntimeState) {
  const order = state.orders[0];
  if (!order) {
    state.safetyGate = { passed: false, reason: "No order is waiting." };
    return;
  }
  const missing = order.components.filter((item) => !item.ready);
  if (missing.length) {
    state.safetyGate = { passed: false, reason: `Holding Table ${order.table}. Still waiting on ${missing.map((item) => item.name).join(", ")}.` };
    order.status = "held";
    return;
  }
  if (order.allergy && !order.allergyCleared) {
    state.safetyGate = { passed: false, reason: `Holding Table ${order.table}. ${order.allergy} checks are not complete.` };
    order.status = "held";
    return;
  }
  state.safetyGate = { passed: true, reason: "Every selected dish is ready and all safety checks passed." };
  order.status = "served";
}

function applyDecision(state: KitchenRuntimeState, station: StationId, trigger: string | undefined, action: string, reason: string) {
  const order = state.orders[0];

  if (station === "prep") {
    if (action === "CLEAN_ALLERGY_ZONE" && order?.allergy) {
      state.handled.add("prep:allergy-clear");
      refreshAllergyClearance(state);
      state.setStation("prep", { status: "ready", progress: 100, task: "Clean allergy-safe prep zone", lastDecision: "Rebuilt the prep area with clean tools" });
    } else if (action === "ASSIST_OVEN_REROUTE" && !state.equipment.fryerOnline && component(state, "fries")) {
      setReady(state, "fries");
      state.setStation("prep", { status: "ready", progress: 100, task: "Recovered fries in the oven", lastDecision: "Took over the failed fryer component using the oven" });
    } else if (action === "HOLD") {
      state.setStation("prep", { status: "blocked", progress: 45, task: "Prep paused", lastDecision: "Held prep until the shared plan is safe" });
    } else {
      setReady(state, "buns");
      state.setStation("prep", { status: "ready", progress: 100, task: component(state, "buns") ? "Burger prep ready" : "Prep support complete", lastDecision: component(state, "buns") ? "Toasted and staged the burger buns" : "No prep component was required" });
    }
  }

  if (station === "grill") {
    if (action === "HOLD_GRILL") {
      state.setStation("grill", { status: "blocked", progress: 35, task: "Grill held", lastDecision: "Paused hot-line work while the kitchen replans" });
    } else {
      setReady(state, "burgers");
      state.setStation("grill", { status: "ready", progress: 100, task: component(state, "burgers") ? "Burger component ready" : "Grill checked", lastDecision: component(state, "burgers") ? "Cooked the selected burger component" : "No grill component was required" });
    }
  }

  if (station === "fryer") {
    const fries = component(state, "fries");
    if (!fries) {
      state.setStation("fryer", { status: "ready", progress: 100, task: "No fryer item selected", lastDecision: "Stayed available for the rest of the kitchen" });
    } else if (action === "FRY_NOW" && state.equipment.fryerOnline) {
      setReady(state, "fries");
      state.inventory.fries = Math.max(0, state.inventory.fries - 1);
      state.setStation("fryer", { status: "ready", progress: 100, task: "Fries ready", lastDecision: "Used the working fryer for the selected fries" });
    } else if (action === "REROUTE_TO_OVEN" && !state.equipment.fryerOnline && state.inventory.potatoes > 0) {
      setReady(state, "fries");
      state.inventory.potatoes -= 1;
      fries.name = "Oven-roasted potato fries";
      state.setStation("fryer", { status: "ready", progress: 100, task: "Fries rerouted", lastDecision: "Moved the potato portion to the oven because the fryer is offline" });
    } else if (action === "SWAP_FOR_SALAD" && state.inventory.salad > 0) {
      setReady(state, "fries");
      state.inventory.salad -= 1;
      fries.name = "Salad replacement";
      state.setStation("fryer", { status: "ready", progress: 100, task: "Side swapped", lastDecision: "Replaced fries with salad using available stock" });
    } else {
      state.setStation("fryer", { status: "blocked", progress: 30, task: "Fryer unavailable", lastDecision: "Waited because the chosen action could not be completed safely" });
    }
  }

  if (station === "pantry") {
    if (action === "VERIFY_ALLERGY" && order?.allergy) {
      state.handled.add("pantry:allergy-clear");
      refreshAllergyClearance(state);
      state.setStation("pantry", { status: "ready", progress: 100, task: "Allergy stock verified", lastDecision: `Checked ingredients against ${order.allergy}` });
    } else if (action === "RESERVE_POTATOES" && state.inventory.potatoes > 0) {
      state.setStation("pantry", { status: "ready", progress: 100, task: "Potatoes reserved", lastDecision: "Reserved emergency potato stock for fryer recovery" });
    } else if (action === "HOLD_STOCK") {
      state.setStation("pantry", { status: "blocked", progress: 50, task: "Stock held", lastDecision: "Protected limited inventory until the plan is clear" });
    } else {
      setReady(state, "salad");
      if (component(state, "salad")) state.inventory.salad = Math.max(0, state.inventory.salad - 1);
      state.setStation("pantry", { status: "ready", progress: 100, task: component(state, "salad") ? "Salad ready" : "Pantry checked", lastDecision: component(state, "salad") ? "Built the selected cold-side salad" : "No pantry dish was required" });
    }
  }

  if (station === "expo") {
    if (action === "HOLD_ORDER") {
      if (order) order.status = "held";
      state.safetyGate = { passed: false, reason: `Expo chose to hold Table ${order?.table ?? 12} while the kitchen is still changing.` };
    } else {
      runSafetyGate(state);
    }
    state.setStation("expo", { status: state.safetyGate.passed ? "ready" : "blocked", progress: state.safetyGate.passed ? 100 : 60, task: state.safetyGate.passed ? "Order released" : "Order on hold", lastDecision: state.safetyGate.reason });
  }

  state.record("decision", agentConfig[station].name, `${action.replaceAll("_", " ")}: ${reason}`, station === "expo" && !state.safetyGate.passed ? "danger" : "accent");
}

export function startKitchenRuntime(scenario: ScenarioId, onSnapshot: SnapshotListener): { stop: () => void; state: KitchenRuntimeState } {
  const mode: RunMode = process.env.OPENAI_API_KEY ? "openai-live" : "mozaik-demo";
  const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";
  const state = new KitchenRuntimeState(mode, model, scenario);
  const runtime = defineRuntime<KitchenRuntimeState>();
  const runtimeService = runtime.initializeRuntime({ state, ...(mode === "mozaik-demo" ? { inferenceRunnerConfig: { runner: new DemoInferenceRunner() } } : {}) });
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
          if (payload.loopId) state.openLoop(payload.loopId, event.producerId, name, payload.message ?? "Kitchen update");
          const station = [...state.stations.values()].find((item) => `${item.name} Agent` === name);
          if (station) state.setStation(station.id, { status: "thinking", task: "Reading the live kitchen and deciding" });
        }
        if (event.type === "function_call.started") state.record("tool", name, "Decision made. Applying it to the shared kitchen.");
        if (event.type === "model.answer") state.closeOldestLoop(event.producerId);
        emitSnapshot();
      },
    },
  };

  const observer = createHuman({ name: "Live Kitchen Observer", capabilities: ["telemetry"], handlers: [observerHandler] });
  const dispatcher = createHuman({ name: "Dinner Rush", capabilities: ["scenario-events"], handlers: [] });
  runtime.join(observer);
  runtime.join(dispatcher);

  for (const station of ["prep", "grill", "fryer", "pantry", "expo"] as StationId[]) {
    let participantId = "";
    const tool: Tool = {
      type: "function",
      name: `${station}_update`,
      description: `Choose and publish the ${station} station's next action from the live shared kitchen state.`,
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: agentConfig[station].actions },
          reason: { type: "string", description: "Short plain-English reason grounded only in the provided kitchen state." },
        },
        required: ["action", "reason"],
        additionalProperties: false,
      },
      strict: true,
      async invoke(args: { action: string; reason: string }) {
        const trigger = pendingTriggers.get(station)?.shift();
        applyDecision(state, station, trigger, args.action, args.reason);
        runtime.sendEvent(SemanticEvent.create("station.updated", participantId, { station, action: args.action, snapshotVersion: Date.now() }), participantId);
        return { ok: true, station, action: args.action, safetyGate: state.safetyGate };
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
          pendingTriggers.set(station, [...(pendingTriggers.get(station) ?? []), event.type]);
          state.setStation(station, { status: "thinking", task: `Deciding after ${event.type.replaceAll(".", " ")}`, lastDecision: "Reading the newest shared state" });
          state.record("thinking", agentConfig[station].name, `Started a new decision because ${event.type.replaceAll(".", " ")}.`);
          const sharedSummary = JSON.stringify({
            trigger: event.type,
            legalActions: agentConfig[station].actions,
            equipment: state.equipment,
            inventory: state.inventory,
            order: state.orders[0],
            safetyGate: state.safetyGate,
            recentDecisions: state.activities.slice(0, 5).map((item) => ({ actor: item.actor, message: item.message })),
          });
          void runtime.runLoop(participant.getId(), sharedSummary, { model, maxOutputTokens: 220, context: participant.getMemory().getContext(), tools: participant.getTools() });
          emitSnapshot();
        },
      },
    };

    const agent = createAgent({ name: agentConfig[station].name, capabilities: [agentConfig[station].capability], instruction: agentConfig[station].instruction, tools: [tool], handlers: [handler] });
    participantId = agent.getId();
    runtime.join(agent);
  }

  const publish = (type: string, payload: Record<string, unknown>) => runtime.sendEvent(SemanticEvent.create(type, dispatcher.getId(), payload), dispatcher.getId());

  state.status = "running";
  state.orders.push(createOrder());
  state.record("order", "Front of house", "A new table order hit every relevant kitchen station at once.", "accent");
  emitSnapshot();
  timers.push(setTimeout(() => publish("order.created", { orderId: "DR-204", table: 12 }), 180));

  if (scenario === "fryer" || scenario === "full") {
    timers.push(setTimeout(() => {
      state.equipment.fryerOnline = false;
      const fries = component(state, "fries");
      if (fries) fries.ready = false;
      state.record("failure", "Kitchen", "The fryer temperature crashed while the agents were already working.", "danger");
      publish("equipment.failed", { station: "fryer", fault: "temperature-drop" });
    }, mode === "openai-live" ? 2200 : 900));
  }

  if (scenario === "allergy" || scenario === "full") {
    timers.push(setTimeout(() => {
      const order = state.orders[0];
      if (order) { order.allergy = "Sesame allergy"; order.allergyCleared = false; order.status = "held"; }
      state.safetyGate = { passed: false, reason: "A late sesame allergy requires independent Prep and Pantry checks." };
      state.record("allergy", "Server", "A sesame allergy note arrived after cooking had already started.", "danger");
      publish("allergy.reported", { orderId: "DR-204", allergen: "sesame" });
    }, mode === "openai-live" ? 5200 : 1900));
  }

  const finishAfter = mode === "openai-live" ? 22000 : 7000;
  timers.push(setTimeout(() => {
    runSafetyGate(state);
    state.status = "complete";
    state.record("complete", "Dinner Rush", state.safetyGate.passed ? `Service completed after ${state.overlapPeak} AI loops overlapped.` : `Service ended safely on hold after ${state.overlapPeak} AI loops overlapped.`, state.safetyGate.passed ? "accent" : "danger");
    emitSnapshot();
  }, finishAfter));

  return { state, stop: () => timers.forEach((timer) => clearTimeout(timer)) };
}
