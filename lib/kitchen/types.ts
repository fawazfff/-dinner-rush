export const stationIds = ["prep", "grill", "fryer", "pantry", "saute", "oven", "salad", "dessert", "drinks", "server"] as const;

export type StationId = (typeof stationIds)[number];
export type ScenarioId = "rush" | "fryer" | "allergy" | "full";
export type RunMode = "openai-live";
export type StationStatus = "idle" | "thinking" | "working" | "waiting" | "blocked" | "done";
export type OrderStatus = "queued" | "cooking" | "held" | "ready" | "served";

export interface StationState {
  id: StationId;
  name: string;
  status: StationStatus;
  task: string;
  progress: number;
  lastDecision: string | null;
  blockReason: string | null;
}

export interface OrderComponent {
  id: string;
  menuItemId: string;
  name: string;
  station: StationId;
  ready: boolean;
}

export interface KitchenOrder {
  id: string;
  table: number;
  label: string;
  status: OrderStatus;
  promisedMinutes: number;
  allergy: string | null;
  allergyCleared: boolean;
  components: OrderComponent[];
}

export interface KitchenActivity {
  id: string;
  at: number;
  type: string;
  actor: string;
  message: string;
  tone: "neutral" | "accent" | "danger";
}

export interface LoopSpan {
  loopId: string;
  agentId: string;
  agentName: string;
  startedAt: number;
  finishedAt: number | null;
  trigger: string;
}

export interface KitchenSnapshot {
  runId: string;
  mode: RunMode;
  model: string;
  scenario: ScenarioId;
  startedAt: number;
  now: number;
  status: "idle" | "running" | "complete";
  stations: StationState[];
  orders: KitchenOrder[];
  equipment: { fryerOnline: boolean; ovenOnline: boolean };
  inventory: Record<string, number>;
  activities: KitchenActivity[];
  loops: LoopSpan[];
  overlapPeak: number;
  safetyGate: { passed: boolean; reason: string };
}

export interface KitchenStreamEvent {
  kind: "snapshot" | "complete" | "error";
  snapshot?: KitchenSnapshot;
  message?: string;
}
