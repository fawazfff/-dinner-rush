"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
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
  Timer,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { KitchenSnapshot, KitchenStreamEvent, ScenarioId, StationId } from "@/lib/kitchen/types";

type MenuItem = "burger" | "fries" | "salad";

const menuItems: { id: MenuItem; name: string; description: string; station: string; icon: typeof ChefHat }[] = [
  { id: "burger", name: "Smash Burger", description: "Toasted bun with grilled patties", station: "Prep + Grill", icon: Flame },
  { id: "fries", name: "House Fries", description: "Crispy potato side", station: "Fryer", icon: Soup },
  { id: "salad", name: "Chopped Salad", description: "Fresh cold-side salad", station: "Pantry", icon: PackageOpen },
];

const scenarios: { id: ScenarioId; title: string; description: string; tag: string }[] = [
  { id: "rush", title: "Normal rush", description: "A clean dinner service with no surprise failure.", tag: "Easy" },
  { id: "fryer", title: "Fryer breaks", description: "The fryer dies while the kitchen is already cooking.", tag: "Medium" },
  { id: "allergy", title: "Late allergy", description: "Safety information arrives after cooking starts.", tag: "Medium" },
  { id: "full", title: "Everything goes wrong", description: "Fryer failure and a late allergy hit the same table.", tag: "Hard" },
];

const stationIcons = {
  prep: ChefHat,
  grill: Flame,
  fryer: Soup,
  pantry: PackageOpen,
  expo: ShieldCheck,
} satisfies Record<StationId, typeof ChefHat>;

function statusCopy(status: string) {
  if (status === "thinking") return "Thinking";
  if (status === "working") return "Working";
  if (status === "blocked") return "Holding";
  if (status === "ready") return "Done";
  return "Ready";
}

function AppShell({ children, service = false }: { children: React.ReactNode; service?: boolean }) {
  return (
    <main className="min-h-screen bg-[#f7fbff] text-[#0b1726]">
      <header className="sticky top-0 z-50 border-b border-black/5 bg-[#f7fbff]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-[-0.02em]">
            <span className="grid size-9 place-items-center rounded-full bg-[#0b1726] text-white"><Zap className="size-4" fill="currentColor" /></span>
            Dinner Rush
          </Link>
          <div className="hidden items-center gap-2 rounded-full border border-black/10 bg-white p-1.5 shadow-sm sm:flex">
            <Link href="/" className="rounded-full px-4 py-2 text-xs text-[#617083] hover:bg-[#eef6ff]">Home</Link>
            <Link href="/kitchen" className="rounded-full bg-[#0b1726] px-4 py-2 text-xs font-medium text-white">{service ? "Live kitchen" : "Build service"}</Link>
          </div>
          <span className="rounded-full border border-[#b7dfff] bg-white px-3 py-1.5 text-[10px] font-medium text-[#1268a8]">Powered by Mozaik</span>
        </div>
      </header>
      {children}
    </main>
  );
}

function KitchenFloor({ snapshot }: { snapshot: KitchenSnapshot }) {
  return (
    <section className="rounded-[28px] border border-black/5 bg-white p-4 shadow-[0_24px_80px_rgba(15,88,145,0.08)] sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2e89c8]">Live kitchen floor</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Five workers, one changing kitchen.</h2>
          <p className="mt-1 text-sm text-[#6f7e90]">Every card updates from the backend while the service is running.</p>
        </div>
        <div className="flex gap-2">
          <span className="rounded-full bg-[#e7f6ff] px-3 py-2 text-xs font-medium text-[#1268a8]">{snapshot.loops.filter((loop) => !loop.finishedAt).length} active now</span>
          <span className="rounded-full bg-[#effbea] px-3 py-2 text-xs font-medium text-[#497c21]">Peak {snapshot.overlapPeak} together</span>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {snapshot.stations.map((station) => {
          const Icon = stationIcons[station.id];
          const active = station.status === "thinking" || station.status === "working";
          return (
            <motion.article
              key={station.id}
              layout
              className={cn(
                "relative min-h-56 overflow-hidden rounded-[22px] border p-4 transition-all",
                active ? "border-[#53aee7] bg-[#eaf7ff] shadow-[0_16px_40px_rgba(39,143,203,0.12)]" : station.status === "blocked" ? "border-[#ffb3a8] bg-[#fff1ee]" : "border-black/5 bg-[#f9fbfd]",
              )}
            >
              {active ? <motion.div className="absolute inset-x-0 top-0 h-1 bg-[#2e89c8]" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 0.9 }} /> : null}
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-2xl bg-white text-[#166fae] shadow-sm"><Icon className="size-4" /></span>
                <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-medium", active ? "bg-[#cceeff] text-[#0f649d]" : station.status === "blocked" ? "bg-[#ffe0da] text-[#a53d2a]" : "bg-white text-[#728093]")}>{statusCopy(station.status)}</span>
              </div>
              <p className="mt-6 text-sm font-semibold">{station.name}</p>
              <p className="mt-2 min-h-12 text-sm leading-5 text-[#405166]">{station.task}</p>
              {active ? <div className="mt-4 flex gap-1">{[0, 1, 2].map((i) => <motion.span key={i} className="size-1.5 rounded-full bg-[#2e89c8]" animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.12 }} />)}</div> : null}
              <p className="mt-4 border-t border-black/5 pt-3 text-[11px] leading-5 text-[#758398]">{station.lastDecision}</p>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}

function Activity({ snapshot }: { snapshot: KitchenSnapshot }) {
  return (
    <section className="rounded-[26px] border border-black/5 bg-white shadow-[0_20px_60px_rgba(15,88,145,0.06)]">
      <div className="border-b border-black/5 p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2e89c8]">Decision feed</p>
        <h2 className="mt-2 text-lg font-semibold">What the kitchen is deciding</h2>
      </div>
      <div className="max-h-[520px] overflow-y-auto p-2">
        <AnimatePresence initial={false}>
          {snapshot.activities.slice(0, 18).map((activity) => (
            <motion.div key={activity.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="rounded-2xl p-3 hover:bg-[#f6faff]">
              <div className="flex items-center gap-2">
                <span className={cn("size-2 rounded-full", activity.tone === "danger" ? "bg-[#ff7b66]" : "bg-[#66c463]")} />
                <span className="text-[10px] font-semibold text-[#6c7b8c]">{activity.actor}</span>
              </div>
              <p className="mt-1.5 text-xs leading-5 text-[#26384c]">{activity.message}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}

function TechnicalProof({ snapshot }: { snapshot: KitchenSnapshot }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-[26px] border border-black/5 bg-[#0d1c2b] text-white shadow-[0_20px_70px_rgba(12,31,49,0.18)]">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between p-5 text-left">
        <div><p className="text-xs font-semibold">Technical proof</p><p className="mt-1 text-xs text-white/55">For judges: inspect runtime mode, loop IDs and overlap.</p></div>
        {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>
      {open ? (
        <div className="border-t border-white/10 p-5">
          <div className="mb-4 grid gap-2 sm:grid-cols-3">
            {[["Execution", snapshot.mode === "openai-live" ? "Live model inference" : "Local demo inference"], ["Model", snapshot.model], ["Peak overlap", `${snapshot.overlapPeak} concurrent loops`]].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-white/[0.06] p-3"><p className="text-[9px] text-white/45">{label}</p><p className="mt-1 text-xs">{value}</p></div>
            ))}
          </div>
          <div className="space-y-2">
            {snapshot.loops.slice(-20).map((loop) => (
              <div key={loop.loopId} className="grid gap-1 rounded-xl border border-white/10 p-3 text-[10px] sm:grid-cols-[120px_1fr_auto]">
                <span>{loop.agentName}</span><span className="truncate font-mono text-white/45">{loop.loopId}</span><span className="text-[#8dd9ff]">{loop.finishedAt ? `${loop.finishedAt - loop.startedAt}ms` : "LIVE"}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Result({ snapshot, onAgain }: { snapshot: KitchenSnapshot; onAgain: () => void }) {
  const served = snapshot.orders.filter((order) => order.status === "served").length;
  const held = snapshot.orders.filter((order) => order.status === "held").length;
  const report = ["DINNER RUSH AGENT RUN", `Run: ${snapshot.runId}`, `Mode: ${snapshot.mode}`, `Model: ${snapshot.model}`, `Result: ${snapshot.safetyGate.reason}`, `Peak concurrent loops: ${snapshot.overlapPeak}`, "", "DECISION LOG", ...snapshot.activities.slice().reverse().map((activity) => `${activity.actor}: ${activity.message}`)].join("\n");
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
    <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-[30px] border border-[#a9dcff] bg-[#dff3ff] p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#247eba]">Service complete</p><h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{snapshot.safetyGate.passed ? "Dinner made it out safely." : "The kitchen chose safety over speed."}</h2><p className="mt-3 max-w-xl text-sm leading-6 text-[#536a7d]">{snapshot.safetyGate.reason}</p></div>
        <span className="grid size-12 place-items-center rounded-full bg-[#0d1c2b] text-white"><Check className="size-5" /></span>
      </div>
      <div className="mt-7 grid gap-3 sm:grid-cols-4">
        {[["Served", served], ["Held", held], ["Peak overlap", `${snapshot.overlapPeak}×`], ["Execution", snapshot.mode === "openai-live" ? "Live AI" : "Demo"]].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-white/75 p-4 shadow-sm"><p className="text-2xl font-semibold">{value}</p><p className="mt-1 text-[10px] font-medium text-[#75879a]">{label}</p></div>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={onAgain} className="rounded-full bg-[#0d1c2b] px-5 text-white hover:bg-[#1c3145]"><RefreshCw /> New service</Button>
        <Button variant="outline" onClick={download} className="rounded-full border-black/10 bg-white text-[#0d1c2b] hover:bg-white"><Download /> Export run</Button>
      </div>
    </motion.section>
  );
}

export function KitchenConsole() {
  const [step, setStep] = useState<"setup" | "service">("setup");
  const [selectedMenu, setSelectedMenu] = useState<MenuItem[]>(["burger", "fries", "salad"]);
  const [scenario, setScenario] = useState<ScenarioId>("full");
  const [snapshot, setSnapshot] = useState<KitchenSnapshot | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const toggle = (id: MenuItem) => setSelectedMenu((current) => current.includes(id) ? (current.length === 1 ? current : current.filter((item) => item !== id)) : [...current, id]);

  const start = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStep("service");
    setRunning(true);
    setError(null);
    setSnapshot(null);
    try {
      const response = await fetch("/api/kitchen/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenario, menu: selectedMenu }), signal: controller.signal });
      if (!response.ok || !response.body) throw new Error("The live kitchen backend did not start.");
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
  }, [scenario, selectedMenu]);

  const active = useMemo(() => snapshot?.loops.filter((loop) => !loop.finishedAt).length ?? 0, [snapshot]);

  if (step === "setup") {
    return (
      <AppShell>
        <section className="relative overflow-hidden bg-[#68b7e8]">
          <div className="absolute -left-24 top-20 size-72 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute -right-20 bottom-0 size-80 rounded-full bg-[#99dcff]/50 blur-3xl" />
          <div className="relative mx-auto grid max-w-[1280px] gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:py-20">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/75 px-4 py-2 text-xs font-medium shadow-sm"><Sparkles className="size-3.5" /> Build your service</span>
              <h1 className="mt-6 max-w-2xl text-[clamp(3.2rem,7vw,6.6rem)] font-semibold leading-[0.9] tracking-[-0.07em]">Build the menu.<br />Break the kitchen.</h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-[#17334b]/75 sm:text-lg">Choose what the restaurant is serving and what goes wrong. Then watch the kitchen workers react in real time.</p>
              <div className="mt-8 flex flex-wrap gap-3 text-xs text-[#26445c]">
                <span className="rounded-full bg-white/70 px-3 py-2">No account</span><span className="rounded-full bg-white/70 px-3 py-2">Live backend</span><span className="rounded-full bg-white/70 px-3 py-2">Exportable run</span>
              </div>
            </div>
            <div className="rounded-[34px] border border-white/60 bg-white/85 p-4 shadow-[0_30px_90px_rgba(28,102,151,0.2)] backdrop-blur sm:p-6">
              <div className="flex items-center justify-between border-b border-black/5 pb-4"><div><p className="text-sm font-semibold">Dinner Rush setup</p><p className="mt-1 text-xs text-[#6e7d8d]">2 quick choices, then the kitchen starts.</p></div><span className="rounded-full bg-[#e8f8df] px-3 py-1.5 text-[10px] font-semibold text-[#4e7b2e]">Ready</span></div>
              <div className="mt-5"><p className="text-xs font-semibold">1. Pick the order</p><div className="mt-3 grid gap-2 sm:grid-cols-3">{menuItems.map((item) => { const selected = selectedMenu.includes(item.id); const Icon = item.icon; return <button key={item.id} onClick={() => toggle(item.id)} className={cn("rounded-[20px] border p-4 text-left transition-all", selected ? "border-[#57ace0] bg-[#eaf7ff] shadow-sm" : "border-black/5 bg-[#f7f9fb] hover:border-[#b9dff5]")}><div className="flex items-center justify-between"><span className="grid size-9 place-items-center rounded-2xl bg-white text-[#1b78b4]"><Icon className="size-4" /></span>{selected ? <span className="grid size-6 place-items-center rounded-full bg-[#0d1c2b] text-white"><Check className="size-3" /></span> : null}</div><p className="mt-5 text-sm font-semibold">{item.name}</p><p className="mt-1 text-[11px] leading-4 text-[#758399]">{item.description}</p><p className="mt-3 text-[10px] font-medium text-[#2e89c8]">{item.station}</p></button>; })}</div></div>
              <div className="mt-6"><p className="text-xs font-semibold">2. Choose the chaos</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{scenarios.map((item) => <button key={item.id} onClick={() => setScenario(item.id)} className={cn("rounded-[18px] border p-4 text-left transition-all", scenario === item.id ? "border-[#0d1c2b] bg-[#0d1c2b] text-white" : "border-black/5 bg-[#f7f9fb] hover:border-[#b9dff5]")}><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">{item.title}</p><span className={cn("rounded-full px-2 py-1 text-[9px]", scenario === item.id ? "bg-white/10 text-white/70" : "bg-white text-[#758399]")}>{item.tag}</span></div><p className={cn("mt-1 text-[11px] leading-4", scenario === item.id ? "text-white/55" : "text-[#758399]")}>{item.description}</p></button>)}</div></div>
              <Button size="lg" onClick={() => void start()} className="mt-6 h-13 w-full rounded-full bg-[#b9f65e] text-[#102030] hover:bg-[#adf047]"><Play className="size-4" /> Start dinner service <ArrowRight className="size-4" /></Button>
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-[1280px] px-5 py-14 sm:px-8"><div className="grid gap-4 md:grid-cols-3">{[["Five kitchen workers", "Prep, Grill, Fryer, Pantry and Expo all react to the same changing state."], ["Real interruptions", "Equipment failures and allergy updates arrive while work is already happening."], ["Clear final result", "See whether the order was served, held, rerouted or blocked for safety."]].map(([title, copy], index) => <article key={title} className="rounded-[24px] border border-black/5 bg-white p-6 shadow-sm"><span className="text-xs font-semibold text-[#2e89c8]">0{index + 1}</span><h2 className="mt-7 text-lg font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-[#6f7e90]">{copy}</p></article>)}</div></section>
      </AppShell>
    );
  }

  return (
    <AppShell service>
      <section className="border-b border-black/5 bg-[#68b7e8]">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-5 py-6 sm:px-8">
          <div className="flex items-center gap-3"><button onClick={() => { abortRef.current?.abort(); setStep("setup"); setSnapshot(null); setRunning(false); }} className="grid size-10 place-items-center rounded-full bg-white/80 shadow-sm"><ArrowLeft className="size-4" /></button><div><p className="text-xs font-medium text-[#284860]">Dinner service</p><h1 className="text-2xl font-semibold tracking-[-0.04em]">The kitchen is live.</h1></div></div>
          <div className="flex gap-2"><span className="rounded-full bg-white/75 px-3 py-2 text-xs font-medium">{running ? `${active} workers active` : "Service finished"}</span>{snapshot ? <span className="rounded-full bg-[#0d1c2b] px-3 py-2 text-xs font-medium text-white">{snapshot.mode === "openai-live" ? "Live model" : "Demo mode"}</span> : null}</div>
        </div>
      </section>
      <div className="mx-auto max-w-[1440px] px-5 py-6 sm:px-8 sm:py-8">
        {error ? <div className="mb-5 flex items-center gap-3 rounded-[20px] border border-[#ffc2b8] bg-[#fff2ef] p-4 text-sm text-[#9b4536]"><CircleAlert className="size-4" />{error}<button className="ml-auto rounded-full bg-white px-3 py-1.5 text-xs font-medium" onClick={() => void start()}>Retry</button></div> : null}
        {!snapshot ? (
          <div className="grid min-h-[560px] place-items-center rounded-[30px] border border-black/5 bg-white shadow-[0_20px_80px_rgba(15,88,145,0.06)]"><div className="text-center"><span className="mx-auto grid size-16 place-items-center rounded-full bg-[#e5f5ff]"><RefreshCw className="size-6 animate-spin text-[#2e89c8]" /></span><h2 className="mt-5 text-xl font-semibold">Starting the kitchen</h2><p className="mt-2 text-sm text-[#748396]">The backend is creating five Mozaik workers and sharing the first order.</p></div></div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2e89c8]">Table {snapshot.orders[0]?.table ?? 12}</p><h2 className="mt-2 text-3xl font-semibold tracking-[-0.045em]">{snapshot.orders[0]?.label ?? "Dinner order"}</h2><p className="mt-2 text-sm text-[#6f7e90]">Watch what changes when the kitchen receives new information.</p></div><div className="flex gap-2"><div className="rounded-2xl bg-white px-4 py-3 shadow-sm"><p className="text-[9px] text-[#77869a]">Status</p><p className="mt-1 text-sm font-semibold capitalize">{snapshot.orders[0]?.status ?? "starting"}</p></div><div className="rounded-2xl bg-white px-4 py-3 shadow-sm"><p className="text-[9px] text-[#77869a]">Safety gate</p><p className="mt-1 text-sm font-semibold">{snapshot.safetyGate.passed ? "Passed" : "Checking"}</p></div></div></div>
            <KitchenFloor snapshot={snapshot} />
            {snapshot.status === "complete" ? <Result snapshot={snapshot} onAgain={() => { setStep("setup"); setSnapshot(null); }} /> : null}
            <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]"><Activity snapshot={snapshot} /><TechnicalProof snapshot={snapshot} /></div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
