import { Agent, SemanticEvent, SituationSpecification, createAgent, createHuman, defineRuntime, type SituationContext, type SituationHandler, type Tool } from "@mozaik-ai/core";
import { KitchenRuntimeState } from "@/lib/kitchen/state";
import type { KitchenOrder, KitchenSnapshot, ScenarioId, StationId } from "@/lib/kitchen/types";

type SnapshotListener = (snapshot: KitchenSnapshot) => void;
type MenuId = "burger" | "fries" | "plantain" | "grilled-chicken" | "fried-chicken" | "jollof-rice" | "fried-rice" | "pasta" | "steak" | "fish" | "wings" | "salad" | "sandwich" | "yam-fries" | "vegetable-bowl";
type MenuDefinition = { name: string; components: { id: string; name: string; station: Exclude<StationId, "expo"> }[] };

const menu: Record<MenuId, MenuDefinition> = {
  burger: { name: "Smash Burger", components: [{ id: "burger-prep", name: "Burger prep", station: "prep" }, { id: "burger-grill", name: "Grilled patties", station: "grill" }] },
  fries: { name: "House Fries", components: [{ id: "fries", name: "House fries", station: "fryer" }] },
  plantain: { name: "Fried Plantain", components: [{ id: "plantain", name: "Fried plantain", station: "fryer" }] },
  "grilled-chicken": { name: "Grilled Chicken", components: [{ id: "chicken-prep", name: "Seasoned chicken", station: "prep" }, { id: "chicken-grill", name: "Grilled chicken", station: "grill" }] },
  "fried-chicken": { name: "Fried Chicken", components: [{ id: "fried-chicken-prep", name: "Breaded chicken", station: "prep" }, { id: "fried-chicken", name: "Fried chicken", station: "fryer" }] },
  "jollof-rice": { name: "Jollof Rice", components: [{ id: "jollof", name: "Jollof rice", station: "pantry" }] },
  "fried-rice": { name: "Fried Rice", components: [{ id: "fried-rice", name: "Fried rice", station: "pantry" }] },
  pasta: { name: "Creamy Pasta", components: [{ id: "pasta", name: "Creamy pasta", station: "pantry" }] },
  steak: { name: "Grilled Steak", components: [{ id: "steak-prep", name: "Steak prep", station: "prep" }, { id: "steak", name: "Grilled steak", station: "grill" }] },
  fish: { name: "Grilled Fish", components: [{ id: "fish-prep", name: "Fish prep", station: "prep" }, { id: "fish", name: "Grilled fish", station: "grill" }] },
  wings: { name: "Crispy Wings", components: [{ id: "wings-prep", name: "Wing prep", station: "prep" }, { id: "wings", name: "Crispy wings", station: "fryer" }] },
  salad: { name: "Chopped Salad", components: [{ id: "salad", name: "Chopped salad", station: "pantry" }] },
  sandwich: { name: "Club Sandwich", components: [{ id: "sandwich-prep", name: "Sandwich prep", station: "prep" }, { id: "sandwich", name: "Club sandwich", station: "pantry" }] },
  "yam-fries": { name: "Yam Fries", components: [{ id: "yam-fries", name: "Yam fries", station: "fryer" }] },
  "vegetable-bowl": { name: "Vegetable Bowl", components: [{ id: "veg-prep", name: "Vegetable prep", station: "prep" }, { id: "vegetable-bowl", name: "Vegetable bowl", station: "pantry" }] },
};

const descriptions: Record<StationId, string> = {
  prep: "Cleaning, chopping, seasoning, breading and allergy-safe preparation.",
  grill: "Grilling burgers, chicken, steak and fish on the hot line.",
  fryer: "Frying fries, plantain, chicken, wings and yam while watching fryer health.",
  pantry: "Assembling rice, pasta, salads, sandwiches and vegetables while checking stock and allergens.",
  expo: "Watching every station and releasing the table only after food and safety checks are complete.",
};

class EventSpec extends SituationSpecification {
  constructor(private readonly types: readonly string[]) { super(); }
  isSatisfiedBy({ event, participant }: SituationContext) { return this.types.includes(event.type) && event.producerId !== participant.getId(); }
}
class AllEvents extends SituationSpecification { isSatisfiedBy() { return true; } }

function buildOrder(selected: readonly MenuId[]): KitchenOrder {
  return {
    id: `DR-${Math.floor(100 + Math.random() * 900)}`,
    table: Math.floor(1 + Math.random() * 20),
    label: selected.map((id) => menu[id].name).join(", "),
    status: "queued",
    promisedMinutes: 18,
    allergy: null,
    allergyCleared: true,
    components: selected.flatMap((menuItemId) => menu[menuItemId].components.map((part) => ({ ...part, menuItemId, ready: false }))),
  };
}

function remaining(state: KitchenRuntimeState, station: StationId) {
  return state.orders[0]?.components.filter((item) => item.station === station && !item.ready) ?? [];
}

function safetyGate(state: KitchenRuntimeState) {
  const order = state.orders[0];
  if (!order) return;
  const missing = order.components.filter((item) => !item.ready);
  if (missing.length) {
    order.status = "held";
    state.safetyGate = { passed: false, reason: `Expo is holding Table ${order.table}. Still waiting for ${missing.map((item) => item.name).join(", ")}.` };
  } else if (order.allergy && !order.allergyCleared) {
    order.status = "held";
    state.safetyGate = { passed: false, reason: `Expo is holding Table ${order.table}. The ${order.allergy} verification is incomplete.` };
  } else {
    order.status = "served";
    state.safetyGate = { passed: true, reason: `Table ${order.table} passed the deterministic safety gate. Every selected component is ready.` };
  }
}

export function startKitchenRuntime(scenario: ScenarioId, selectedMenu: readonly string[], onSnapshot: SnapshotListener) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is required. Scripted demo mode has been removed.");
  const selected = selectedMenu.filter((id): id is MenuId => id in menu);
  if (!selected.length) throw new Error("Select at least one valid menu item.");

  const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";
  const state = new KitchenRuntimeState("openai-live", model, scenario);
  const runtime = defineRuntime<KitchenRuntimeState>();
  const service = runtime.initializeRuntime({ state });
  const timers: ReturnType<typeof setTimeout>[] = [];
  let completionScheduled = false;
  const emit = () => onSnapshot(state.snapshot());

  const maybeFinish = () => {
    if (state.status !== "running" || completionScheduled) return;
    safetyGate(state);
    if (!state.safetyGate.passed) return;
    completionScheduled = true;
    timers.push(setTimeout(() => {
      safetyGate(state);
      if (!state.safetyGate.passed) { completionScheduled = false; emit(); return; }
      state.status = "complete";
      state.record("complete", "Expo / Safety Agent", state.safetyGate.reason, "accent");
      emit();
    }, 900));
  };

  const observer = createHuman({
    name: "Live Kitchen Observer",
    capabilities: ["runtime-telemetry"],
    handlers: [{
      specification: new AllEvents(),
      processor: {
        apply({ event }) {
          const participant = service.getParticipant(event.producerId);
          const name = participant?.getManifest().name ?? "Kitchen";
          if (event.type === "message_received.started") {
            const payload = event.payload as { loopId?: string; message?: string };
            if (payload.loopId) state.openLoop(payload.loopId, event.producerId, name, payload.message ?? "live event");
          }
          if (event.type === "function_call.started") state.record("tool", name, "Selected a tool action and started applying it to shared kitchen state.", "accent");
          if (event.type === "model.answer") state.closeOldestLoop(event.producerId);
          emit();
        },
      },
    }],
  });

  const dispatcher = createHuman({ name: "Restaurant Floor", capabilities: ["live-orders"], handlers: [] });
  runtime.join(observer);
  runtime.join(dispatcher);

  const events: Record<StationId, string[]> = {
    prep: ["order.created", "equipment.failed", "allergy.reported", "station.completed"],
    grill: ["order.created", "equipment.failed", "station.completed"],
    fryer: ["order.created", "equipment.failed", "station.completed"],
    pantry: ["order.created", "equipment.failed", "allergy.reported", "station.completed"],
    expo: ["order.created", "equipment.failed", "allergy.reported", "station.completed"],
  };

  for (const station of ["prep", "grill", "fryer", "pantry", "expo"] as StationId[]) {
    let agentId = "";
    const tool: Tool = {
      type: "function",
      name: `${station}_decision`,
      description: `Apply ${station}'s live decision to shared kitchen state.`,
      parameters: {
        type: "object",
        properties: {
          decision: { type: "string" },
          completeComponentIds: { type: "array", items: { type: "string" } },
          hold: { type: "boolean" },
        },
        required: ["decision", "completeComponentIds", "hold"],
        additionalProperties: false,
      },
      strict: true,
      async invoke(args: { decision: string; completeComponentIds: string[]; hold: boolean }) {
        const allowed = new Set(remaining(state, station).map((item) => item.id));
        if (station !== "expo") {
          for (const id of args.completeComponentIds) {
            if (!allowed.has(id)) continue;
            const component = state.orders[0]?.components.find((item) => item.id === id);
            if (component) component.ready = true;
          }
        }
        if (station === "prep" && state.orders[0]?.allergy && !args.hold) state.handled.add("prep:allergy");
        if (station === "pantry" && state.orders[0]?.allergy && !args.hold) state.handled.add("pantry:allergy");
        if (state.orders[0]?.allergy) state.orders[0].allergyCleared = state.handled.has("prep:allergy") && state.handled.has("pantry:allergy");

        if (station === "expo") safetyGate(state);
        else if (state.orders[0]?.status === "queued" || state.orders[0]?.status === "held") state.orders[0].status = "cooking";

        const left = remaining(state, station);
        state.setStation(station, {
          status: args.hold ? "blocked" : left.length ? "working" : "ready",
          progress: args.hold ? 35 : left.length ? 65 : 100,
          task: args.hold ? "Holding and replanning" : left.length ? `Still working on ${left.map((item) => item.name).join(", ")}` : station === "expo" ? "Safety check complete" : "Station work complete",
          lastDecision: args.decision,
        });
        state.record("decision", `${state.stations.get(station)?.name} Agent`, args.decision, args.hold ? "danger" : "accent");
        runtime.sendEvent(SemanticEvent.create("station.completed", agentId, { station, decision: args.decision, completed: args.completeComponentIds }), agentId);
        emit();
        if (station === "expo") maybeFinish();
        return { accepted: true, remaining: left.map((item) => item.id), safetyGate: state.safetyGate };
      },
    };

    const handler: SituationHandler = {
      specification: new EventSpec(events[station]),
      processor: {
        apply({ event, participant }) {
          if (!(participant instanceof Agent) || state.status !== "running") return;
          const key = `${station}:${event.occurredAt.toISOString()}:${event.type}:${event.producerId}`;
          if (state.handled.has(key)) return;
          state.handled.add(key);
          const work = remaining(state, station);
          if (station !== "expo" && !work.length && !(event.type === "allergy.reported" && (station === "prep" || station === "pantry"))) return;
          if (event.type === "station.completed" && event.producerId === participant.getId()) return;

          state.setStation(station, { status: "thinking", progress: 15, task: `Reading shared state after ${event.type.replaceAll(".", " ")}`, lastDecision: "Deciding from live kitchen state" });
          state.record("thinking", `${state.stations.get(station)?.name} Agent`, `Woke up because ${event.type.replaceAll(".", " ")}.`);
          const prompt = JSON.stringify({
            role: descriptions[station],
            trigger: event.type,
            rule: station === "expo"
              ? "Never mark food complete. Inspect shared state, then use the tool to run the safety gate. Hold if anything is incomplete."
              : "Only complete component IDs assigned to your station. If equipment prevents the work, hold and explain. React to other station updates only when they change your plan.",
            stationWork: work,
            order: state.orders[0],
            equipment: state.equipment,
            inventory: state.inventory,
            otherStations: [...state.stations.values()].filter((item) => item.id !== station),
            recentDecisions: state.activities.slice(0, 10).map((item) => ({ actor: item.actor, message: item.message })),
          });
          void runtime.runLoop(participant.getId(), prompt, { model, maxOutputTokens: 280, context: participant.getMemory().getContext(), tools: participant.getTools() });
          emit();
        },
      },
    };

    const agent = createAgent({
      name: `${state.stations.get(station)?.name} Agent`,
      capabilities: [descriptions[station]],
      instruction: `You are the ${station} worker in a live restaurant. ${descriptions[station]} Read shared state, make a concise operational decision, then call ${station}_decision exactly once. Never claim work outside your station.`,
      tools: [tool],
      handlers: [handler],
    });
    agentId = agent.getId();
    runtime.join(agent);
  }

  const publish = (type: string, payload: Record<string, unknown>) => runtime.sendEvent(SemanticEvent.create(type, dispatcher.getId(), payload), dispatcher.getId());
  state.status = "running";
  state.orders.push(buildOrder(selected));
  state.record("order", "Restaurant Floor", `Table ${state.orders[0].table} ordered ${state.orders[0].label}. Relevant Mozaik agents were notified together.`, "accent");
  emit();
  timers.push(setTimeout(() => publish("order.created", { orderId: state.orders[0].id, menu: selected }), 250));

  if (scenario === "fryer" || scenario === "full") {
    timers.push(setTimeout(() => {
      if (state.status !== "running") return;
      state.equipment.fryerOnline = false;
      state.record("failure", "Kitchen Event", "The fryer lost temperature while service was already running. Relevant agents received the event.", "danger");
      publish("equipment.failed", { station: "fryer", fault: "temperature-drop" });
      emit();
    }, 6500));
  }

  if (scenario === "allergy" || scenario === "full") {
    timers.push(setTimeout(() => {
      if (state.status !== "running") return;
      state.orders[0].allergy = "sesame allergy";
      state.orders[0].allergyCleared = false;
      state.record("allergy", "Server Event", "A late sesame allergy was added while the order was in progress.", "danger");
      publish("allergy.reported", { orderId: state.orders[0].id, allergen: "sesame" });
      emit();
    }, scenario === "full" ? 10500 : 6500));
  }

  return { state, stop: () => timers.forEach(clearTimeout) };
}
