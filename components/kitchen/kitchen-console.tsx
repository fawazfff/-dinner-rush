"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ChefHat,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Download,
  Flame,
  PackageOpen,
  Play,
  RefreshCw,
  ShieldCheck,
  Soup,
  Sparkles,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { KitchenSnapshot, KitchenStreamEvent, ScenarioId, StationId } from "@/lib/kitchen/types";

type MenuItem = "burger" | "fries" | "salad";

const menuItems: { id: MenuItem; name: string; description: string; station: string }[] = [
  { id: "burger", name: "Smash Burger", description: "Toasted bun + grilled patties", station: "Prep + Grill" },
  { id: "fries", name: "House Fries", description: "Crisp fries from the hot line", station: "Fryer" },
  { id: "salad", name: "Chopped Salad", description: "Fresh cold-side salad", station: "Pantry" },
];

const scenarios: { id: ScenarioId; title: string; description: string }[] = [
  { id: "rush", title: "Normal dinner rush", description: "Let the AI kitchen handle a clean service." },
  { id: "fryer", title: "Fryer breaks", description: "See the kitchen recover while orders are moving." },
  { id: "allergy", title: "Late allergy note", description: "A safety update arrives after cooking starts." },
  { id: "full", title: "Everything goes wrong", description: "Fryer failure plus a late allergy during the rush." },
];

const stationIcons = { prep: ChefHat, grill: Flame, fryer: Soup, pantry: PackageOpen, expo: ShieldCheck } satisfies Record<StationId, typeof ChefHat>;

function humanStatus(status: string) {
  if (status === "thinking") return "Deciding";
  if (status === "working") return "Working";
  if (status === "blocked") return "Waiting";
  if (status === "ready") return "Done";
  return "Ready";
}

function KitchenFloor({ snapshot }: { snapshot: KitchenSnapshot }) {
  return (
    <section className="rounded-[18px] border border-border bg-card p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div><p className="text-sm font-semibold">Your AI kitchen</p><p className="mt-1 text-xs text-muted-foreground">Every station can react at the same time.</p></div>
        <span className="rounded-full border border-primary/25 bg-primary/[0.08] px-3 py-1 text-[10px] font-medium text-primary">{snapshot.loops.filter((loop) => !loop.finishedAt).length} working now</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {snapshot.stations.map((station) => {
          const Icon = stationIcons[station.id];
          const active = station.status === "thinking" || station.status === "working";
          return (
            <motion.article key={station.id} layout className={cn("relative min-h-48 overflow-hidden rounded-[14px] border bg-[#12100e] p-4", station.status === "blocked" ? "border-destructive/50" : active ? "border-primary/50" : "border-border")}>
              {active ? <motion.div className="absolute inset-x-0 top-0 h-px bg-primary" animate={{ opacity: [0.25, 1, 0.25] }} transition={{ repeat: Infinity, duration: 1.2 }} /> : null}
              <div className="flex items-start justify-between"><span className="grid size-9 place-items-center rounded-[10px] bg-white/[0.05]"><Icon className="size-4" /></span><span className={cn("rounded-full px-2 py-1 text-[9px]", station.status === "blocked" ? "bg-destructive/10 text-destructive" : active ? "bg-primary/10 text-primary" : "bg-white/[0.05] text-muted-foreground")}>{humanStatus(station.status)}</span></div>
              <p className="mt-5 text-xs font-semibold">{station.name}</p>
              <p className="mt-2 min-h-10 text-sm leading-5">{station.task}</p>
              <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/[0.06]"><motion.div animate={{ width: `${station.progress}%` }} className={cn("h-full rounded-full", station.status === "blocked" ? "bg-destructive" : "bg-primary")} /></div>
              <p className="mt-3 text-[10px] leading-4 text-muted-foreground">{station.lastDecision}</p>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}

function ServiceResult({ snapshot, onAgain }: { snapshot: KitchenSnapshot; onAgain: () => void }) {
  const served = snapshot.orders.filter((order) => order.status === "served").length;
  const held = snapshot.orders.filter((order) => order.status === "held").length;
  const recovered = !snapshot.equipment.fryerOnline && snapshot.orders.some((order) => order.components.find((item) => item.id === "fries")?.ready);
  const report = [
    "DINNER RUSH - KITCHEN REPORT",
    `Result: ${snapshot.safetyGate.passed ? "Service completed safely" : "Service ended safely on hold"}`,
    `Orders served: ${served}`,
    `Orders held: ${held}`,
    `Peak simultaneous AI work: ${snapshot.overlapPeak}`,
    `Safety: ${snapshot.safetyGate.reason}`,
    "",
    "WHAT THE KITCHEN DID",
    ...snapshot.activities.slice().reverse().map((activity) => `${activity.actor}: ${activity.message}`),
  ].join("\n");

  const download = () => {
    const blob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `dinner-rush-${snapshot.runId}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="rounded-[20px] border border-primary/25 bg-primary/[0.05] p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-medium text-primary">DINNER SERVICE FINISHED</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">{snapshot.safetyGate.passed ? "Your kitchen handled the rush." : "Your kitchen chose safety over speed."}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{snapshot.safetyGate.reason}</p></div><span className="grid size-11 place-items-center rounded-full bg-primary text-primary-foreground"><Check /></span></div>
      <div className="mt-6 grid gap-2 sm:grid-cols-4">{[["Orders served", served], ["Orders held", held], ["Peak working together", `${snapshot.overlapPeak}×`], ["Crisis recovered", recovered ? "Yes" : snapshot.equipment.fryerOnline ? "No crisis" : "Safely held"]].map(([label, value]) => <div key={label} className="rounded-[12px] border border-border bg-background/50 p-4"><p className="text-xl font-semibold">{value}</p><p className="mt-1 text-[10px] text-muted-foreground">{label}</p></div>)}</div>
      <div className="mt-6 flex flex-wrap gap-2"><Button onClick={onAgain}><RefreshCw /> Run another service</Button><Button variant="outline" onClick={download}><Download /> Export kitchen report</Button></div>
    </motion.section>
  );
}

function HumanActivity({ snapshot }: { snapshot: KitchenSnapshot }) {
  return (
    <section className="rounded-[18px] border border-border bg-card">
      <div className="border-b border-border p-4"><h2 className="text-sm font-semibold">What the kitchen is doing</h2><p className="mt-1 text-xs text-muted-foreground">Plain-English decisions from each AI worker.</p></div>
      <div className="max-h-[420px] overflow-y-auto p-2">
        <AnimatePresence initial={false}>{snapshot.activities.slice(0, 12).map((activity) => <motion.div key={activity.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="border-b border-border/60 p-3 last:border-0"><div className="flex items-center gap-2"><span className={cn("size-1.5 rounded-full", activity.tone === "danger" ? "bg-destructive" : "bg-primary")} /><p className="text-[10px] font-medium text-muted-foreground">{activity.actor}</p></div><p className="mt-1.5 text-xs leading-5">{activity.message}</p></motion.div>)}</AnimatePresence>
      </div>
    </section>
  );
}

function TechnicalProof({ snapshot }: { snapshot: KitchenSnapshot }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-[18px] border border-border bg-card">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between gap-4 p-4 text-left"><div><p className="text-sm font-semibold">Technical proof</p><p className="mt-1 text-xs text-muted-foreground">For judges and developers: verify the agents really worked concurrently.</p></div>{open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}</button>
      {open ? <div className="border-t border-border p-4"><div className="mb-4 grid gap-2 sm:grid-cols-3">{[["Runtime", "Mozaik v4"], ["Peak overlap", `${snapshot.overlapPeak} loops`], ["Mode", snapshot.mode === "openai-live" ? snapshot.model : "Demo inference"]].map(([label, value]) => <div key={label} className="rounded-[10px] bg-white/[0.03] p-3"><p className="text-[9px] text-muted-foreground">{label}</p><p className="mt-1 font-mono text-xs">{value}</p></div>)}</div><div className="space-y-2">{snapshot.loops.slice(-12).map((loop) => <div key={loop.loopId} className="grid gap-1 rounded-[9px] border border-border p-3 text-[10px] sm:grid-cols-[120px_1fr_auto]"><span>{loop.agentName}</span><span className="truncate font-mono text-muted-foreground">{loop.loopId}</span><span className="text-primary">{loop.finishedAt ? `${loop.finishedAt - loop.startedAt}ms` : "running"}</span></div>)}</div></div> : null}
    </section>
  );
}

export function KitchenConsole() {
  const [step, setStep] = useState<"setup" | "service">("setup");
  const [selectedMenu, setSelectedMenu] = useState<MenuItem[]>(["burger", "fries"]);
  const [scenario, setScenario] = useState<ScenarioId>("full");
  const [snapshot, setSnapshot] = useState<KitchenSnapshot | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const toggleMenu = (item: MenuItem) => setSelectedMenu((current) => current.includes(item) ? (current.length === 1 ? current : current.filter((value) => value !== item)) : [...current, item]);

  const startService = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStep("service"); setRunning(true); setError(null); setSnapshot(null);
    try {
      const response = await fetch("/api/kitchen/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenario, menu: selectedMenu }), signal: controller.signal });
      if (!response.ok || !response.body) throw new Error("The kitchen could not start.");
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true }); const frames = buffer.split("\n\n"); buffer = frames.pop() ?? "";
        for (const frame of frames) { const data = frame.split("\n").find((line) => line.startsWith("data: "))?.slice(6); if (!data) continue; const event = JSON.parse(data) as KitchenStreamEvent; if (event.kind === "error") throw new Error(event.message); if (event.snapshot) setSnapshot(event.snapshot); if (event.kind === "complete") setRunning(false); }
      }
    } catch (caught) { if (caught instanceof DOMException && caught.name === "AbortError") return; setError(caught instanceof Error ? caught.message : "Dinner service stopped unexpectedly."); setRunning(false); }
  }, [scenario, selectedMenu]);

  const active = useMemo(() => snapshot?.loops.filter((loop) => !loop.finishedAt).length ?? 0, [snapshot]);

  if (step === "setup") return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border"><div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5"><Link href="/" className="flex items-center gap-2 text-sm font-bold tracking-[0.12em]"><Zap className="size-4 text-primary" fill="currentColor" /> DINNER RUSH</Link><span className="hidden text-xs text-muted-foreground sm:block">You run the restaurant. The AI runs the kitchen.</span></div></header>
      <div className="mx-auto max-w-5xl px-5 py-12 sm:py-16">
        <div className="max-w-2xl"><span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.06] px-3 py-1.5 text-[10px] text-primary"><Sparkles className="size-3" /> BUILD YOUR DINNER RUSH</span><h1 className="mt-5 text-4xl font-semibold tracking-[-0.05em] sm:text-6xl">What should your AI kitchen cook?</h1><p className="mt-4 text-base leading-7 text-muted-foreground">Pick a menu, choose what happens during service, then watch five AI kitchen workers coordinate in real time.</p></div>
        <section className="mt-10"><div className="mb-4"><p className="text-sm font-semibold">1. Pick your menu</p><p className="mt-1 text-xs text-muted-foreground">Choose one or more dishes.</p></div><div className="grid gap-3 md:grid-cols-3">{menuItems.map((item) => { const selected = selectedMenu.includes(item.id); return <button key={item.id} type="button" onClick={() => toggleMenu(item.id)} className={cn("rounded-[16px] border p-5 text-left transition", selected ? "border-primary bg-primary/[0.06]" : "border-border bg-card hover:border-white/20")}><div className="flex items-start justify-between"><ChefHat className={cn("size-5", selected ? "text-primary" : "text-muted-foreground")} />{selected ? <span className="grid size-5 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="size-3" /></span> : null}</div><h2 className="mt-8 text-base font-semibold">{item.name}</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">{item.description}</p><p className="mt-4 text-[10px] text-primary">{item.station}</p></button>; })}</div></section>
        <section className="mt-9"><div className="mb-4"><p className="text-sm font-semibold">2. Choose the challenge</p><p className="mt-1 text-xs text-muted-foreground">Give your kitchen an easy night or make things interesting.</p></div><div className="grid gap-2 sm:grid-cols-2">{scenarios.map((item) => <button key={item.id} type="button" onClick={() => setScenario(item.id)} className={cn("rounded-[14px] border p-4 text-left", scenario === item.id ? "border-primary bg-primary/[0.06]" : "border-border bg-card")}><div className="flex items-center justify-between"><p className="text-sm font-semibold">{item.title}</p>{scenario === item.id ? <Check className="size-4 text-primary" /> : null}</div><p className="mt-1.5 text-xs text-muted-foreground">{item.description}</p></button>)}</div></section>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6"><p className="text-xs text-muted-foreground">{selectedMenu.length} menu item{selectedMenu.length === 1 ? "" : "s"} selected · {scenarios.find((item) => item.id === scenario)?.title}</p><Button size="lg" onClick={() => void startService()}><Play /> Start dinner service</Button></div>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl"><div className="mx-auto flex min-h-16 max-w-[1500px] items-center justify-between gap-3 px-4 py-3 sm:px-6"><div className="flex items-center gap-3"><Button variant="ghost" size="icon" onClick={() => { abortRef.current?.abort(); setStep("setup"); setRunning(false); }}><ArrowLeft /></Button><div><p className="text-sm font-bold tracking-[0.1em]">DINNER RUSH</p><p className="text-[9px] text-muted-foreground">LIVE DINNER SERVICE</p></div></div><div className="flex items-center gap-2"><span className="rounded-full border border-border px-3 py-1.5 text-[10px] text-muted-foreground">{active} working now</span>{running ? <span className="flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.07] px-3 py-1.5 text-[10px] text-primary"><span className="size-1.5 animate-pulse rounded-full bg-primary" /> LIVE</span> : null}</div></div></header>
      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6">
        <div className="mb-6"><p className="text-xs text-primary">YOUR SERVICE IS RUNNING</p><h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">Watch your AI kitchen handle the rush.</h1><p className="mt-2 text-sm text-muted-foreground">The stations make decisions independently, share what changed, and adapt while other work is still happening.</p></div>
        {error ? <div className="mb-5 flex items-center gap-3 rounded-[12px] border border-destructive/40 bg-destructive/[0.07] p-4 text-sm"><CircleAlert className="size-4 text-destructive" />{error}<Button size="sm" variant="outline" className="ml-auto" onClick={() => void startService()}>Retry</Button></div> : null}
        {!snapshot ? <div className="grid min-h-[480px] place-items-center rounded-[18px] border border-border bg-card"><div className="text-center"><RefreshCw className="mx-auto size-5 animate-spin text-primary" /><p className="mt-4 text-sm font-semibold">Opening the kitchen...</p><p className="mt-2 text-xs text-muted-foreground">Five AI workers are getting your order.</p></div></div> : <div className="space-y-5"><KitchenFloor snapshot={snapshot} /><div className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]"><section className="rounded-[18px] border border-border bg-card p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-primary">TABLE {snapshot.orders[0]?.table ?? 12}</p><h2 className="mt-2 text-lg font-semibold">{snapshot.orders[0]?.label ?? "Your order"}</h2></div><span className="rounded-full border border-border px-3 py-1 text-[10px] capitalize text-muted-foreground">{snapshot.orders[0]?.status ?? "starting"}</span></div><div className="mt-5 grid gap-2 sm:grid-cols-2">{snapshot.orders[0]?.components.map((component) => <div key={component.id} className="flex items-center justify-between rounded-[10px] border border-border p-3"><span className="text-xs">{component.name}</span>{component.ready ? <Check className="size-4 text-primary" /> : <span className="size-2 animate-pulse rounded-full bg-white/25" />}</div>)}</div>{snapshot.orders[0]?.allergy ? <div className="mt-3 rounded-[10px] border border-destructive/35 bg-destructive/[0.05] p-3 text-xs"><CircleAlert className="mr-2 inline size-4 text-destructive" />{snapshot.orders[0].allergy}: {snapshot.orders[0].allergyCleared ? "safety checks complete" : "meal held until checks finish"}</div> : null}</section><HumanActivity snapshot={snapshot} /></div>{snapshot.status === "complete" ? <ServiceResult snapshot={snapshot} onAgain={() => { setStep("setup"); setSnapshot(null); }} /> : null}<TechnicalProof snapshot={snapshot} /></div>}
      </div>
    </main>
  );
}
