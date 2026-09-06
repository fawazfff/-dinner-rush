"use client";

import Link from "next/link";
import {
  ArrowRight,
  Check,
  ChefHat,
  ChevronDown,
  Flame,
  Menu,
  MousePointer2,
  PackageOpen,
  Play,
  ShieldCheck,
  Soup,
  Sparkles,
  UtensilsCrossed,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion, useScroll, useSpring } from "motion/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

const faq = [
  ["Is Dinner Rush actually running AI agents?", "Yes. Starting a service sends your menu and scenario to the backend, where the Mozaik runtime starts independent kitchen agents that read shared state, choose constrained actions, and publish decisions back to the live UI."],
  ["Do all the kitchen workers run at the same time?", "They can. A single order or crisis can wake several stations at once. The technical proof panel inside the kitchen shows overlapping loop IDs and timings from the runtime."],
  ["What happens when something goes wrong?", "The agents see the new shared state and decide again. A fryer failure can cause rerouting, inventory checks, order holds, and safety checks while other work is still in progress."],
  ["Can the AI release unsafe food?", "No. Expo can recommend a release, but a deterministic safety gate has final authority. Missing dishes or incomplete allergy checks keep the order on hold."],
  ["Do I need an account?", "No. Pick a menu, choose a challenge, and start the service. The experience is designed to be understandable before you know anything about AI agents or Mozaik."],
  ["Can I see what happened after the run?", "Yes. Every run ends with the service result, a plain-English decision history, technical concurrency proof, and an exportable kitchen report."],
] as const;

function Navigation() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <a href="#main" className="fixed left-3 top-3 z-[80] -translate-y-20 rounded-full bg-black px-4 py-2 text-sm text-white transition-transform focus:translate-y-0">Skip to content</a>
      <header className="fixed inset-x-0 top-4 z-50 px-4">
        <nav className="mx-auto flex h-14 max-w-[760px] items-center justify-between rounded-full border border-black/10 bg-white/90 px-3 shadow-[0_12px_40px_rgba(0,0,0,.12)] backdrop-blur-xl sm:px-4">
          <Link href="/" className="flex items-center gap-2 text-sm font-black tracking-[-0.02em] text-black">
            <span className="grid size-9 place-items-center rounded-full bg-black text-white"><UtensilsCrossed className="size-4" /></span>
            Dinner Rush
          </Link>
          <div className="hidden items-center gap-5 md:flex">
            <a href="#how" className="text-xs font-semibold text-black/60 transition hover:text-black">How it works</a>
            <a href="#agents" className="text-xs font-semibold text-black/60 transition hover:text-black">AI kitchen</a>
            <a href="#faq" className="text-xs font-semibold text-black/60 transition hover:text-black">FAQ</a>
          </div>
          <Button asChild size="sm" className="hidden rounded-full bg-[#166534] text-white hover:bg-[#14532d] md:inline-flex"><Link href="/kitchen">Play now <ArrowRight /></Link></Button>
          <button type="button" aria-label="Toggle navigation" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="grid size-10 place-items-center rounded-full border border-black/10 text-black md:hidden">{open ? <X className="size-4" /> : <Menu className="size-4" />}</button>
        </nav>
        <AnimatePresence>
          {open ? <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mx-auto mt-2 max-w-[760px] rounded-[24px] border border-black/10 bg-white p-4 shadow-xl md:hidden"><div className="grid gap-2 text-sm font-semibold text-black"><a href="#how" onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 hover:bg-black/5">How it works</a><a href="#agents" onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 hover:bg-black/5">AI kitchen</a><a href="#faq" onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 hover:bg-black/5">FAQ</a><Button asChild className="mt-2 rounded-full bg-[#166534] text-white"><Link href="/kitchen">Start dinner rush</Link></Button></div></motion.div> : null}
        </AnimatePresence>
      </header>
    </>
  );
}

function FloatingKitchen() {
  const cards = [
    { name: "Prep", task: "Rerouting fries", icon: ChefHat, rotate: -8, x: "-34%", y: "5%" },
    { name: "Grill", task: "Cooking burgers", icon: Flame, rotate: 4, x: "-5%", y: "-8%" },
    { name: "Pantry", task: "Checking sesame", icon: PackageOpen, rotate: 7, x: "29%", y: "5%" },
  ] as const;
  return (
    <div className="relative mx-auto mt-8 h-[330px] w-full max-w-[760px] sm:h-[390px]">
      <div className="absolute inset-x-[7%] bottom-0 top-[13%] rounded-[34px] border border-black/10 bg-white/88 shadow-[0_30px_80px_rgba(0,0,0,.18)] backdrop-blur">
        <div className="flex items-center justify-between border-b border-black/8 px-5 py-4"><div className="flex items-center gap-2 text-xs font-bold text-black"><span className="size-2 animate-pulse rounded-full bg-[#16a34a]" /> LIVE SERVICE</div><span className="rounded-full bg-black px-3 py-1 text-[10px] font-bold text-white">3 AI workers active</span></div>
        <div className="grid gap-3 p-5 sm:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-[24px] bg-[#f5e7c5] p-5 text-black"><p className="text-[11px] font-bold uppercase tracking-[.16em] text-black/45">Table 12</p><h3 className="mt-2 text-2xl font-black tracking-[-.04em]">2 burgers + fries</h3><div className="mt-6 space-y-2"><div className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3 text-sm"><span>Burgers</span><Check className="size-4 text-[#166534]" /></div><div className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3 text-sm"><span>Fries</span><span className="text-xs font-bold text-[#b45309]">rerouting</span></div></div></div>
          <div className="rounded-[24px] bg-black p-5 text-white"><p className="text-[11px] font-bold uppercase tracking-[.16em] text-white/45">Kitchen decision</p><div className="mt-5 flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#1d4ed8]"><Soup className="size-5" /></span><div><p className="text-sm font-bold">Fryer failed</p><p className="mt-1 text-xs leading-5 text-white/60">Prep and Pantry are checking the safest replacement while Expo holds the order.</p></div></div><div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10"><motion.div className="h-full rounded-full bg-[#60a5fa]" initial={{ width: "8%" }} animate={{ width: ["8%", "76%", "48%", "88%"] }} transition={{ duration: 5, repeat: Infinity }} /></div></div>
        </div>
      </div>
      {cards.map(({ name, task, icon: Icon, rotate, x, y }, index) => <motion.div key={name} className="absolute left-1/2 top-0 w-[170px] rounded-[20px] border border-black/10 bg-white p-4 text-black shadow-[0_18px_50px_rgba(0,0,0,.16)] sm:w-[190px]" style={{ translateX: x, translateY: y, rotate }} animate={{ y: [0, -8, 0] }} transition={{ duration: 3.3 + index * .5, repeat: Infinity, ease: "easeInOut" }}><div className="flex items-center justify-between"><span className="grid size-9 place-items-center rounded-xl bg-[#dbeafe]"><Icon className="size-4 text-[#1d4ed8]" /></span><span className="size-2 animate-pulse rounded-full bg-[#16a34a]" /></div><p className="mt-5 text-sm font-black">{name}</p><p className="mt-1 text-xs text-black/50">{task}</p></motion.div>)}
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return <div className="border-b border-black/10"><button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between gap-5 py-5 text-left"><span className="text-base font-bold text-black sm:text-lg">{q}</span><ChevronDown className={`size-5 shrink-0 text-black transition ${open ? "rotate-180" : ""}`} /></button><AnimatePresence initial={false}>{open ? <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><p className="max-w-3xl pb-5 text-sm leading-7 text-black/60">{a}</p></motion.div> : null}</AnimatePresence></div>;
}

export default function DinnerRushLanding() {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: .2 });
  return (
    <main id="main" className="min-h-screen overflow-hidden bg-[#f7f7f2] text-black">
      <motion.div className="fixed inset-x-0 top-0 z-[70] h-1 origin-left bg-black" style={{ scaleX: progress }} />
      <Navigation />

      <section className="relative min-h-[820px] overflow-hidden bg-[#67afe0] px-5 pb-16 pt-32 sm:px-8">
        <div className="pointer-events-none absolute -left-32 top-36 size-80 rounded-full bg-white/20 blur-3xl" /><div className="pointer-events-none absolute -right-28 top-32 size-96 rounded-full bg-white/25 blur-3xl" />
        <div className="mx-auto max-w-[1180px] text-center">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/90 px-4 py-2 text-xs font-bold shadow-sm"><span className="size-2 rounded-full bg-[#16a34a]" /> Interactive AI kitchen</motion.div>
          <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .08 }} className="mx-auto mt-7 max-w-[950px] text-[clamp(3.7rem,8vw,7.4rem)] font-black leading-[.86] tracking-[-.075em]">Break the kitchen.<br /><span className="text-white/75">Watch AI save dinner.</span></motion.h1>
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .16 }} className="mx-auto mt-7 max-w-[620px] text-base font-medium leading-7 text-black/65 sm:text-lg">Pick the food. Start service. Throw a real problem at the kitchen and watch five AI workers make decisions together in real time.</motion.p>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .24 }} className="mt-8 flex flex-wrap justify-center gap-3"><Button asChild size="lg" className="rounded-full bg-[#166534] px-7 text-white shadow-lg hover:bg-[#14532d]"><Link href="/kitchen">Build your menu <ArrowRight /></Link></Button><a href="#how" className="inline-flex items-center rounded-full border border-black/10 bg-white/80 px-6 py-3 text-sm font-bold text-black transition hover:bg-white">See how it works</a></motion.div>
          <FloatingKitchen />
        </div>
      </section>

      <section id="how" className="px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-[1180px]"><div className="max-w-2xl"><p className="text-xs font-black uppercase tracking-[.18em] text-[#1d4ed8]">How it works</p><h2 className="mt-4 text-4xl font-black tracking-[-.055em] sm:text-6xl">Three clicks and your kitchen is alive.</h2><p className="mt-5 max-w-xl text-base leading-7 text-black/55">No AI knowledge required. Dinner Rush explains everything as a restaurant problem first.</p></div><div className="mt-12 grid gap-4 md:grid-cols-3">{[["01", "Build the menu", "Choose burgers, fries, salad, or a mix. Your choices change what each station has to do.", MousePointer2], ["02", "Choose the chaos", "Run a clean service, break the fryer, add an allergy late, or stack both problems together.", Zap], ["03", "Watch decisions happen", "See agents start thinking, make choices, change shared state, and react to each other while service is still moving.", Play]].map(([num, title, copy, Icon]) => <article key={String(num)} className="group rounded-[28px] border border-black/10 bg-white p-7 shadow-[0_16px_50px_rgba(0,0,0,.04)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(0,0,0,.08)]"><div className="flex items-center justify-between"><span className="text-xs font-black text-black/35">{String(num)}</span><span className="grid size-11 place-items-center rounded-2xl bg-[#dbeafe] text-[#1d4ed8]"><Icon className="size-5" /></span></div><h3 className="mt-14 text-2xl font-black tracking-[-.04em]">{String(title)}</h3><p className="mt-3 text-sm leading-7 text-black/55">{String(copy)}</p></article>)}</div></div>
      </section>

      <section id="agents" className="bg-[#0b0b0b] px-5 py-24 text-white sm:px-8">
        <div className="mx-auto max-w-[1180px]"><div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-end"><div><p className="text-xs font-black uppercase tracking-[.18em] text-[#60a5fa]">The AI kitchen</p><h2 className="mt-4 text-4xl font-black tracking-[-.055em] sm:text-6xl">Five workers. One shared reality.</h2></div><p className="max-w-xl text-base leading-7 text-white/50">Prep, Grill, Fryer, Pantry and Expo are separate Mozaik agents. They see the same changing kitchen state, wake up on relevant events, and can overlap instead of waiting in a fixed pipeline.</p></div><div className="mt-12 grid gap-3 md:grid-cols-5">{[["Prep", ChefHat, "Prep + recovery"], ["Grill", Flame, "Hot line"], ["Fryer", Soup, "Equipment decisions"], ["Pantry", PackageOpen, "Stock + allergy"], ["Expo", ShieldCheck, "Final safety gate"]].map(([name, Icon, copy]) => <div key={String(name)} className="rounded-[24px] border border-white/10 bg-white/[.04] p-5"><span className="grid size-10 place-items-center rounded-2xl bg-white/10"><Icon className="size-5 text-[#60a5fa]" /></span><p className="mt-12 text-lg font-black">{String(name)}</p><p className="mt-1 text-xs leading-5 text-white/40">{String(copy)}</p></div>)}</div><div className="mt-5 rounded-[30px] bg-[#c8ff4d] p-7 text-black sm:p-9"><div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center"><div><p className="text-xs font-black uppercase tracking-[.16em]">The important part</p><h3 className="mt-3 text-3xl font-black tracking-[-.05em]">The model can suggest. Safety code decides.</h3><p className="mt-3 max-w-2xl text-sm leading-7 text-black/60">Even if an agent wants to release an order, deterministic checks block it when a dish is missing or an allergy check is incomplete.</p></div><span className="grid size-16 place-items-center rounded-full bg-black text-white"><ShieldCheck className="size-7" /></span></div></div></div>
      </section>

      <section className="px-5 py-24 sm:px-8"><div className="mx-auto grid max-w-[1180px] gap-6 lg:grid-cols-2 lg:items-center"><div><p className="text-xs font-black uppercase tracking-[.18em] text-[#1d4ed8]">After service</p><h2 className="mt-4 text-4xl font-black tracking-[-.055em] sm:text-6xl">A result normal people can understand.</h2><p className="mt-5 max-w-xl text-base leading-7 text-black/55">See what was served, what got delayed, what the agents changed, and why. Then export the run or open Technical Proof for the Mozaik details.</p><Button asChild size="lg" className="mt-7 rounded-full bg-black px-7 text-white hover:bg-black/85"><Link href="/kitchen">Run a live service <ArrowRight /></Link></Button></div><div className="rounded-[32px] border border-black/10 bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,.08)] sm:p-8"><div className="flex items-start justify-between"><div><p className="text-xs font-black uppercase tracking-[.16em] text-[#166534]">Service complete</p><h3 className="mt-2 text-2xl font-black">Your kitchen handled the rush.</h3></div><span className="grid size-12 place-items-center rounded-full bg-[#166534] text-white"><Check /></span></div><div className="mt-8 grid grid-cols-2 gap-3">{[["Orders served", "8"], ["Unsafe meals", "0"], ["Crisis reroutes", "3"], ["Peak AI overlap", "5×"]].map(([label, value]) => <div key={label} className="rounded-[20px] bg-[#f5f5ef] p-5"><p className="text-3xl font-black tracking-[-.05em]">{value}</p><p className="mt-1 text-xs text-black/45">{label}</p></div>)}</div><div className="mt-4 rounded-[20px] bg-[#dbeafe] p-5"><p className="text-xs font-black text-[#1d4ed8]">WHY TABLE 12 WAS HELD</p><p className="mt-2 text-sm leading-6 text-black/65">Expo waited until Prep and Pantry independently cleared the late sesame allergy.</p></div></div></div></section>

      <section id="faq" className="border-t border-black/10 bg-white px-5 py-24 sm:px-8"><div className="mx-auto max-w-[900px]"><div className="text-center"><p className="text-xs font-black uppercase tracking-[.18em] text-[#1d4ed8]">FAQ</p><h2 className="mt-4 text-4xl font-black tracking-[-.055em] sm:text-6xl">Things you probably want to know.</h2></div><div className="mt-12 border-t border-black/10">{faq.map(([q, a]) => <FaqItem key={q} q={q} a={a} />)}</div></div></section>

      <section className="px-5 py-24 sm:px-8"><div className="mx-auto max-w-[1180px] overflow-hidden rounded-[36px] bg-[#67afe0] p-8 text-center sm:p-14"><Sparkles className="mx-auto size-7" /><h2 className="mx-auto mt-5 max-w-3xl text-4xl font-black tracking-[-.06em] sm:text-6xl">Build the menu. Break the kitchen. See what the agents do.</h2><p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-black/60">The quickest way to understand Dinner Rush is to run it.</p><Button asChild size="lg" className="mt-7 rounded-full bg-[#166534] px-8 text-white hover:bg-[#14532d]"><Link href="/kitchen">Start dinner rush <ArrowRight /></Link></Button></div></section>

      <footer className="border-t border-black/10 px-5 py-8 sm:px-8"><div className="mx-auto flex max-w-[1180px] flex-col gap-4 text-xs text-black/45 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2 font-bold text-black"><UtensilsCrossed className="size-4" /> Dinner Rush</div><div className="flex flex-wrap gap-5"><a href="#how" className="hover:text-black">How it works</a><a href="#agents" className="hover:text-black">AI kitchen</a><a href="#faq" className="hover:text-black">FAQ</a><Link href="/kitchen" className="hover:text-black">Live demo</Link></div><p>Last updated Sep 6, 2026</p></div></footer>
    </main>
  );
}
