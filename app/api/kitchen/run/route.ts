import { z } from "zod";

import { startKitchenRuntime } from "@/lib/kitchen/runtime";
import type { KitchenStreamEvent } from "@/lib/kitchen/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const bodySchema = z.object({
  scenario: z.enum(["rush", "fryer", "allergy", "full"]).default("full"),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return Response.json({ error: "Unknown kitchen scenario." }, { status: 400 });
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
        const kitchen = startKitchenRuntime(parsed.data.scenario, (snapshot) => {
          send({ kind: snapshot.status === "complete" ? "complete" : "snapshot", snapshot });
          if (snapshot.status === "complete") {
            closed = true;
            controller.close();
          }
        });
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
