"use client";

import Link from "next/link";
import { ArrowRight, Check, Menu, Radio, X, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

const stations = ["PREP", "GRILL", "FRYER", "PANTRY", "EXPO"];

function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const links = [
    ["#how-it-works", "How it works"],
    ["#agents", "Agent activity"],
    ["#architecture", "Architecture"],
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.07] bg-background/85 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5 text-sm font-bold tracking-[0.12em]">
          <span className="grid size-7 place-items-center rounded-[8px] bg-primary text-primary-foreground"><Zap className="size-4" fill="currentColor" /></span>
          DINNER RUSH
        </Link>
        <div className="hidden items-center gap-7 md:flex">
          {links.map(([href, label]) => <a key={href} href={href} className="text-xs text-muted-foreground transition-colors hover:text-foreground">{label}</a>)}
        </div>
        <Button asChild size="sm" className="hidden md:inline-flex"><Link href="/kitchen">Open live kitchen <ArrowRight /></Link></Button>
        <button type="button" className="grid size-10 place-items-center rounded-[10px] border border-border md:hidden" aria-label="Toggle navigation" aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen((open) => !open)}>
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </nav>
      <AnimatePresence>
        {mobileMenuOpen ? (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="border-t border-border bg-background p-5 md:hidden">
            <div className="flex flex-col gap-4">
              {links.map(([href, label]) => <a key={href} href={href} onClick={() => setMobileMenuOpen(false)} className="text-sm text-muted-foreground">{label}</a>)}
              <Button asChild><Link href="/kitchen">Open live kitchen</Link></Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}

function KitchenPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[660px] overflow-hidden rounded-[18px] border border-white/10 bg-[#12100e] shadow-2xl shadow-black/50">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground"><Radio className="size-3 text-primary" /> LIVE SERVICE · 19:42</div>
        <div className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 font-mono text-[9px] text-primary">5 LOOPS ACTIVE</div>
      </div>
      <div className="grid gap-px bg-border md:grid-cols-[1fr_1.2fr]">
        <div className="bg-[#12100e] p-4">
          <p className="mb-3 font-mono text-[9px] tracking-[0.16em] text-muted-foreground">KITCHEN FLOOR</p>
          <div className="grid grid-cols-2 gap-2">
            {stations.map((station, index) => (
              <div key={station} className={`min-h-20 rounded-[10px] border p-3 ${index === 2 ? "border-primary/50 bg-primary/[0.08]" : "border-border bg-white/[0.02]"}`}>
                <div className="mb-4 flex items-center justify-between font-mono text-[9px]"><span>{station}</span><span className={`size-1.5 rounded-full ${index === 2 ? "bg-primary" : "bg-[#c9c0b6]"}`} /></div>
                <p className="text-[10px] leading-4 text-muted-foreground">{index === 2 ? "Rerouting fries" : "Working table 12"}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-[#12100e] p-4">
          <div className="mb-3 flex items-center justify-between"><p className="font-mono text-[9px] tracking-[0.16em] text-muted-foreground">CONCURRENCY PROOF</p><span className="font-mono text-[9px] text-primary">PEAK 5×</span></div>
          <div className="space-y-3 pt-2">
            {stations.map((station, index) => (
              <div key={station} className="grid grid-cols-[48px_1fr] items-center gap-3">
                <span className="font-mono text-[8px] text-muted-foreground">{station}</span>
                <div className="h-2 rounded-full bg-white/[0.05]"><motion.div initial={{ width: 0 }} animate={{ width: `${72 - index * 5}%` }} transition={{ duration: 0.7, delay: 0.12 + index * 0.07 }} className="h-full rounded-full bg-primary" style={{ marginLeft: `${index * 4}%` }} /></div>
              </div>
            ))}
          </div>
          <div className="mt-7 rounded-[10px] border border-primary/25 bg-primary/[0.06] p-3">
            <div className="flex gap-2"><Check className="mt-0.5 size-3.5 text-primary" /><div><p className="text-[10px] font-semibold">Safety gate passed</p><p className="mt-1 text-[9px] leading-4 text-muted-foreground">All components and allergy checks agree.</p></div></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DinnerRushLanding() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <Navigation />
      <section className="relative mx-auto grid min-h-[760px] max-w-[1440px] items-center gap-12 px-5 pb-16 pt-28 sm:px-8 lg:grid-cols-[0.78fr_1.22fr] lg:gap-10 lg:pt-20">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.06] px-3 py-1.5 font-mono text-[10px] tracking-[0.12em] text-primary">BUILT ON MOZAIK V4</div>
          <h1 className="max-w-[650px] text-[clamp(3.1rem,6vw,6.6rem)] font-semibold leading-[0.91] tracking-[-0.065em]">Five agents. <span className="text-primary">One kitchen.</span></h1>
          <p className="mt-7 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">Watch AI stations adapt together when dinner service goes sideways.</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg"><Link href="/kitchen">Start dinner rush <ArrowRight /></Link></Button>
            <a href="#how-it-works" className="px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground">See how it works</a>
          </div>
          <div className="mt-12 grid max-w-lg grid-cols-3 border-y border-border py-5">
            {[["5", "agents"], ["1", "shared state"], ["0", "central schedulers"]].map(([value, label]) => <div key={label}><p className="font-mono text-xl text-foreground">{value}</p><p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p></div>)}
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.65, delay: 0.12 }}><KitchenPreview /></motion.div>
      </section>

      <section id="how-it-works" className="border-y border-border bg-[#100e0c]">
        <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[0.7fr_1.3fr]">
          <div><p className="font-mono text-[10px] tracking-[0.16em] text-primary">NOT A PIPELINE</p><h2 className="mt-4 max-w-md text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">The kitchen changes while agents are still thinking.</h2></div>
          <div id="agents" className="grid gap-px overflow-hidden rounded-[14px] border border-border bg-border sm:grid-cols-3">
            {[["01", "Fan out", "One order wakes every relevant station at the same time."], ["02", "Share state", "Each decision changes the same typed RuntimeState."], ["03", "Adapt live", "Failures and allergies trigger new overlapping loops."]].map(([number, title, copy]) => <article key={number} className="bg-card p-6"><span className="font-mono text-[10px] text-primary">{number}</span><h3 className="mt-8 text-sm font-semibold">{title}</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">{copy}</p></article>)}
          </div>
        </div>
      </section>

      <section id="architecture" className="mx-auto flex max-w-[1440px] flex-col gap-8 px-5 py-20 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="font-mono text-[10px] tracking-[0.16em] text-primary">THE POINT IS CONCURRENCY</p><h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Mozaik is the runtime, not a badge in the footer.</h2></div>
        <Button asChild size="lg"><Link href="/kitchen">Run the live simulation <ArrowRight /></Link></Button>
      </section>
    </main>
  );
}
