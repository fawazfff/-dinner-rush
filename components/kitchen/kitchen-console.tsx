"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ChefHat,
  CircleAlert,
  Flame,
  PackageOpen,
  Play,
  Radio,
  RefreshCw,
  ShieldCheck,
  Soup,
  TimerReset,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { KitchenSnapshot, KitchenStreamEvent, ScenarioId, StationId } from "@/lib/kitchen/types";

const scenarios: { id: ScenarioId; label: string }[] = [
  { id: "full", label: "Full rush" },
  { id: "fryer", label: "Fryer failure" },
  { id: "allergy", label: "Late allergy" },
  { id: "rush", label: "Clean service" },
];

const stationIcons = {
  prep: ChefHat,
  grill: Flame,
  fryer: Soup,
  pantry: PackageOpen,
  expo: ShieldCheck,
} satisfies Record<StationId, typeof ChefHat>;

function elapsed(at: number, startedAt: number) {
  return `${((at - startedAt) / 1000).toFixed(1)}s`;
}

function StatusDot({ status }: { status: string }) {
  const active = status === "thinking" || status === "working";
  return (
    <span className="relative flex size-2">
      {active ? <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" /> : null}
      <span className={cn("relative inline-flex size-2 rounded-full", status === "blocked" ? "bg-destructive" : status === "idle" ? "bg-white/25" : "bg-primary")} />
    </span>
  );
}

function StationFloor({ snapshot }: { snapshot: KitchenSnapshot }) {
  return (
    <section className="rounded-[14px] border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground">LIVE KITCHEN FLOOR</h2>
        <span className="font-mono text-[10px] text-primary">SHARED STATE v{snapshot.activities.length}</span>
      </div>
      <div className="kitchen-grid grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5">
        {snapshot.stations.map((station) => {
          const Icon = stationIcons[station.id];
          return (
            <motion.article key={station.id} layout className={cn("min-h-48 rounded-[12px] border bg-[#12100e] p-4 transition-colors", station.status === "blocked" ? "border-destructive/55" : station.status !== "idle" ? "border-primary/35" : "border-border")}>
              <div className="flex items-start justify-between">
                <span className="grid size-9 place-items-center rounded-[9px] bg-white/[0.04] text-muted-foreground"><Icon className="size-4" /></span>
                <StatusDot status={station.status} />
              </div>
              <p className="mt-6 font-mono text-[10px] tracking-[0.12em] text-muted-foreground">{station.name.toUpperCase()}</p>
              <p className="mt-2 min-h-10 text-sm font-semibold leading-5">{station.task}</p>
              <div className="mt-5 h-1 overflow-hidden rounded-full bg-white/[0.06]"><motion.div animate={{ width: `${station.progress}%` }} className={cn("h-full rounded-full", station.status === "blocked" ? "bg-destructive" : "bg-primary")} /></div>
              <p className="mt-3 text-[10px] leading-4 text-muted-foreground">{station.lastDecision}</p>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}

function OrderBoard({ snapshot }: { snapshot: KitchenSnapshot }) {
  const order = snapshot.orders[0];
  if (!order) return <div className="rounded-[14px] border border-border bg-card p-6 text-sm text-muted-foreground">Waiting for the first ticket.</div>;

  return (
    <section className="rounded-[14px] border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="font-mono text-[10px] tracking-[0.16em] text-primary">TABLE {order.table} · {order.id}</p><h2 className="mt-2 text-lg font-semibold">{order.label}</h2></div>
        <div className={cn("rounded-full border px-3 py-1 font-mono text-[9px] uppercase", order.status === "served" ? "border-primary/40 bg-primary/10 text-primary" : order.status === "held" ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-border text-muted-foreground")}>{order.status}</div>
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {order.components.map((component) => (
          <div key={component.id} className="flex items-center justify-between rounded-[9px] border border-border bg-white/[0.02] px-3 py-2.5">
            <span className="text-xs">{component.name}</span>
            {component.ready ? <CheckCircle2 className="size-4 text-primary" /> : <TimerReset className="size-4 text-muted-foreground" />}
          </div>
        ))}
      </div>
      {order.allergy ? <div className="mt-3 flex items-center gap-2 rounded-[9px] border border-destructive/35 bg-destructive/[0.06] px-3 py-2.5 text-xs"><CircleAlert className="size-4 text-destructive" /> {order.allergy} · {order.allergyCleared ? "two checks cleared" : "checks pending"}</div> : null}
    </section>
  );
}

function ConcurrencyTimeline({ snapshot }: { snapshot: KitchenSnapshot }) {
  const duration = Math.max(2_000, snapshot.now - snapshot.startedAt);
  const loops = snapshot.loops.slice(-15);
  return (
    <section className="overflow-hidden rounded-[14px] border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div><h2 className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground">MOZAIK LOOP OVERLAP</h2><p className="mt-1 text-[10px] text-muted-foreground">Bars come from runtime start and answer events.</p></div>
        <div className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-[10px] text-primary">PEAK {snapshot.overlapPeak}× CONCURRENT</div>
      </div>
      <div className="overflow-x-auto p-4">
        <div className="min-w-[620px] space-y-2">
          {loops.length === 0 ? <p className="py-8 text-center text-xs text-muted-foreground">Agent loops will appear here when the ticket fires.</p> : loops.map((loop) => {
            const left = ((loop.startedAt - snapshot.startedAt) / duration) * 100;
            const end = loop.finishedAt ?? snapshot.now;
            const width = Math.max(2, ((end - loop.startedAt) / duration) * 100);
            return (
              <div key={loop.loopId} className="grid grid-cols-[92px_1fr_54px] items-center gap-3">
                <span className="truncate font-mono text-[9px] text-muted-foreground">{loop.agentName.replace(" Agent", "").toUpperCase()}</span>
                <div className="relative h-5 rounded-[6px] bg-white/[0.035]">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(width, 100 - left)}%` }} className="absolute top-1 h-3 rounded-[4px] bg-primary" style={{ left: `${Math.min(left, 98)}%` }} title={loop.loopId} />
                </div>
                <span className="font-mono text-[9px] text-muted-foreground">{elapsed(end, loop.startedAt)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ActivityRail({ snapshot }: { snapshot: KitchenSnapshot }) {
  return (
    <aside className="rounded-[14px] border border-border bg-card xl:min-h-[560px]">
      <div className="flex items-center justify-between border-b border-border px-4 py-3"><h2 className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground">SEMANTIC EVENT RAIL</h2><Radio className="size-3.5 text-primary" /></div>
      <div className="max-h-[510px] overflow-y-auto p-2">
        <AnimatePresence initial={false}>
          {snapshot.activities.slice(0, 14).map((activity) => (
            <motion.div key={activity.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="border-b border-border/60 px-3 py-3 last:border-0">
              <div className="flex items-center justify-between gap-3"><p className={cn("font-mono text-[9px] uppercase", activity.tone === "danger" ? "text-destructive" : activity.tone === "accent" ? "text-primary" : "text-muted-foreground")}>{activity.actor}</p><time className="font-mono text-[8px] text-muted-foreground">+{elapsed(activity.at, snapshot.startedAt)}</time></div>
              <p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">{activity.message}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </aside>
  );
}

export function KitchenConsole() {
  const [snapshot, setSnapshot] = useState<KitchenSnapshot | null>(null);
  const [scenario, setScenario] = useState<ScenarioId>("full");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const startedRef = useRef(false);

  const startScenario = useCallback(async (selected: ScenarioId) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setScenario(selected);
    setRunning(true);
    setError(null);
    setSnapshot(null);

    try {
      const response = await fetch("/api/kitchen/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: selected }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) throw new Error("The kitchen runtime did not start.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          const data = frame.split("\n").find((line) => line.startsWith("data: "))?.slice(6);
          if (!data) continue;
          const event = JSON.parse(data) as KitchenStreamEvent;
          if (event.kind === "error") throw new Error(event.message);
          if (event.snapshot) setSnapshot(event.snapshot);
          if (event.kind === "complete") setRunning(false);
        }
      }
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setError(caught instanceof Error ? caught.message : "Dinner service stopped unexpectedly.");
      setRunning(false);
    }
  }, []);

  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      void startScenario("full");
    }
    return () => abortRef.current?.abort();
  }, [startScenario]);

  const activeLoops = useMemo(() => snapshot?.loops.filter((loop) => loop.finishedAt === null).length ?? 0, [snapshot]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon"><Link href="/" aria-label="Back to home"><ArrowLeft /></Link></Button>
            <div><div className="flex items-center gap-2 text-sm font-bold tracking-[0.12em]"><Zap className="size-4 text-primary" fill="currentColor" /> DINNER RUSH</div><p className="mt-0.5 font-mono text-[9px] text-muted-foreground">MOZAIK CONCURRENT KITCHEN</p></div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="hidden rounded-full border border-border px-3 py-1.5 font-mono text-[9px] text-muted-foreground sm:block">{snapshot?.mode === "openai-live" ? `${snapshot.model} · LIVE` : "MOZAIK DEMO RUNNER"}</div>
            <select value={scenario} onChange={(event) => setScenario(event.target.value as ScenarioId)} disabled={running} aria-label="Select scenario" className="h-9 rounded-[9px] border border-border bg-secondary px-3 text-xs outline-none focus:ring-2 focus:ring-ring/50">
              {scenarios.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
            <Button size="sm" onClick={() => void startScenario(scenario)} disabled={running}>{running ? <RefreshCw className="animate-spin" /> : <Play />} {running ? "Agents running" : "Run again"}</Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div><p className="font-mono text-[10px] tracking-[0.16em] text-primary">DINNER SERVICE · TABLE 12</p><h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">One kitchen, thinking at the same time.</h1></div>
          <div className="flex gap-2 font-mono text-[9px]">
            <span className="rounded-full border border-border px-3 py-1.5 text-muted-foreground">ACTIVE {activeLoops}</span>
            <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-primary">PEAK {snapshot?.overlapPeak ?? 0}×</span>
          </div>
        </div>

        {error ? <div role="alert" className="mb-5 flex items-center gap-3 rounded-[12px] border border-destructive/40 bg-destructive/[0.07] p-4 text-sm"><CircleAlert className="size-4 text-destructive" />{error}<Button variant="outline" size="sm" className="ml-auto" onClick={() => void startScenario(scenario)}>Retry</Button></div> : null}

        {!snapshot ? (
          <div className="grid min-h-[560px] place-items-center rounded-[14px] border border-border bg-card"><div className="text-center"><RefreshCw className="mx-auto size-5 animate-spin text-primary" /><p className="mt-4 text-sm font-semibold">Joining five Mozaik participants</p><p className="mt-2 text-xs text-muted-foreground">The first ticket will fan out in a moment.</p></div></div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
            <div className="space-y-4"><StationFloor snapshot={snapshot} /><div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]"><OrderBoard snapshot={snapshot} /><section className={cn("rounded-[14px] border p-5", snapshot.safetyGate.passed ? "border-primary/35 bg-primary/[0.06]" : "border-destructive/35 bg-destructive/[0.05]")}><div className="flex items-start gap-3">{snapshot.safetyGate.passed ? <ShieldCheck className="mt-0.5 size-5 text-primary" /> : <CircleAlert className="mt-0.5 size-5 text-destructive" />}<div><p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground">DETERMINISTIC SAFETY GATE</p><h2 className="mt-2 text-sm font-semibold">{snapshot.safetyGate.passed ? "Release approved" : "Release blocked"}</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">{snapshot.safetyGate.reason}</p></div></div></section></div><ConcurrencyTimeline snapshot={snapshot} /></div>
            <ActivityRail snapshot={snapshot} />
          </div>
        )}
      </div>
    </main>
  );
}
