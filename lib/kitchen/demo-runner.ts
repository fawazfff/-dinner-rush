import {
  FunctionCallItem,
  ModelMessageItem,
  SemanticEvent,
  type InferenceInput,
  type InferenceOutput,
  type InferenceRunner,
} from "@mozaik-ai/core";

const wait = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const delays: Record<string, number> = {
  prep_update: 720,
  grill_update: 980,
  fryer_update: 840,
  pantry_update: 640,
  expo_update: 1080,
};

function lastUserIndex(request: InferenceInput) {
  return request.context
    .getItems()
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.type === "message" && "role" in item && item.role === "user")
    .at(-1)?.index ?? -1;
}

export class DemoInferenceRunner implements InferenceRunner {
  async run(request: InferenceInput): Promise<InferenceOutput> {
    const items = request.context.getItems();
    const tool = request.tools?.[0];
    const recentItems = items.slice(lastUserIndex(request));
    const alreadyCalled = recentItems.some((item) => item.type === "function_call_output");

    if (tool && !alreadyCalled) {
      await wait(delays[tool.name] ?? 700);
      return {
        items: [
          FunctionCallItem.rehydrate({
            callId: crypto.randomUUID(),
            name: tool.name,
            args: JSON.stringify({
              reason: "I checked the newest kitchen state and chose the safest useful action.",
            }),
          }),
        ],
        tokenUsage: undefined,
        rowResponse: { provider: "deterministic-demo" },
      };
    }

    await wait(180);
    return {
      items: [ModelMessageItem.rehydrate({ text: "Station update published to shared state." })],
      tokenUsage: undefined,
      rowResponse: { provider: "deterministic-demo" },
    };
  }

  async *stream(request: InferenceInput): AsyncGenerator<SemanticEvent> {
    void request;
    return;
  }
}
