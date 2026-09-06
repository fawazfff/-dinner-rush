import { z } from "zod";

import { startKitchenRuntime } from "@/lib/kitchen/runtime";
import type { KitchenStreamEvent } from "@/lib/kitchen/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const menuItemSchema = z.enum(["burger", "fries", "salad"]);

const bodySchema = z.object({
  scenario: z.enum(["rush", "fryer", "allergy", "full"]).default("full"),
  menu: z.array(menuItemSchema).min(1).max(3).default(["burger", "fries", "salad"]),
});

const componentIdsByMenuItem = {
  burger: ["buns", "burgers"],
  fries: ["fries"],
  salad: ["salad"],
} as const;

const menuLabels = {
  burger: "smash burger",
  fries: "house fries",
  salad: "chopped salad",
} as const;

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return Response.json({ error: "Choose at least one menu item and a valid kitchen scenario." }, { status: 400 });
  }

  const encoder = new TextEncoder();
  let stopRuntime: (() => void) | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const send = (event: KitchenStreamEvent) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        let firstSnapshot = true;
        const kitchen = startKitchenRuntime(parsed.data.scenario, (snapshot) => {
          if (firstSnapshot) {
            firstSnapshot = false;
            return;
          }
          send({ kind: snapshot.status === "complete" ? "complete" : "snapshot", snapshot });
          if (snapshot.status === "complete") {
            closed = true;
            controller.close();
          }
        });

        const order = kitchen.state.orders[0];
        if (order) {
          const selectedComponentIds = new Set(
            parsed.data.menu.flatMap((item) => [...componentIdsByMenuItem[item]]),
          );
          order.components = order.components.filter((component) => selectedComponentIds.has(component.id));
          order.label = parsed.data.menu.map((item) => menuLabels[item]).join(", ");
        }

        send({ kind: "snapshot", snapshot: kitchen.state.snapshot() });
        stopRuntime = kitchen.stop;
      } catch (error) {
        send({
          kind: "error",
          message: error instanceof Error ? error.message : "The kitchen could not start.",
        });
        closed = true;
        controller.close();
      }
    },
    cancel() {
      stopRuntime?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
