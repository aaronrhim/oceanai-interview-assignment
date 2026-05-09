"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { cn } from "@/lib/cn";

const ParticlesBg = dynamic(() => import("./particles-bg"), { ssr: false });
const AgentNetwork = dynamic(() => import("./agent-network"), { ssr: false });

interface Props {
  liveLLM: boolean;
}

export function LandingShell({ liveLLM }: Props) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [pending, startTransition] = useTransition();
  const [mountedFx, setMountedFx] = useState(false);

  // Defer heavy FX one frame past mount so the first paint is the static hero.
  useEffect(() => {
    const id = requestAnimationFrame(() => setMountedFx(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // GSAP hero timeline. Honors prefers-reduced-motion by skipping the animation.
  useEffect(() => {
    if (!containerRef.current) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".hero-brand", { opacity: 0, y: -8, duration: 0.5 })
        .from(".hero-eyebrow", { opacity: 0, y: 10, duration: 0.5 }, "-=0.25")
        .from(".hero-title", { opacity: 0, y: 18, duration: 0.7 }, "-=0.3")
        .from(".hero-sub", { opacity: 0, y: 12, duration: 0.5 }, "-=0.4")
        .from(
          ".hero-pipeline > *",
          { opacity: 0, y: 8, duration: 0.45, stagger: 0.08 },
          "-=0.3",
        )
        .from(".hero-cta", { opacity: 0, y: 8, duration: 0.5 }, "-=0.2")
        .from(".hero-skip", { opacity: 0, duration: 0.4 }, "-=0.3")
        .from(".hero-stats > *", { opacity: 0, y: 6, duration: 0.4, stagger: 0.06 }, "-=0.3");
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const goDashboard = (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.preventDefault();
    const navigate = () => startTransition(() => router.push("/dashboard"));
    if (
      typeof document !== "undefined" &&
      typeof (document as Document & { startViewTransition?: unknown })
        .startViewTransition === "function"
    ) {
      (document as Document & {
        startViewTransition: (cb: () => void | Promise<void>) => unknown;
      }).startViewTransition(navigate);
    } else {
      navigate();
    }
  };

  return (
    <div ref={containerRef} className="relative min-h-dvh overflow-hidden">
      {/* Ambient FX layer — lazy, pointer-events disabled so they don't steal focus */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        {mountedFx && <ParticlesBg />}
      </div>

      {/* 3D orb — absolute, behind the text, large and atmospheric */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-1/2 top-1/2 -z-10",
          "h-[680px] w-[680px] -translate-x-1/2 -translate-y-[58%]",
          "[mask-image:radial-gradient(circle_at_center,black_55%,transparent_75%)]",
          "opacity-80",
        )}
      >
        {mountedFx && <AgentNetwork />}
      </div>

      {/* Header strip */}
      <header className="relative z-10 mx-auto max-w-[1400px] px-6 pt-6">
        <div className="hero-brand flex items-center gap-2.5">
          <Logo />
          <div className="leading-none">
            <div className="text-fg-0 text-sm font-medium tracking-tight">OceanX AI</div>
            <div className="text-fg-3 text-[10px] uppercase tracking-widest mt-1">
              Agent Pipeline · Demo
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 mx-auto flex min-h-[calc(100dvh-72px)] max-w-[900px] flex-col items-center justify-center gap-7 px-6 text-center">
        <div className="hero-eyebrow inline-flex items-center gap-2 rounded-full border border-[color:var(--color-line-strong)] bg-bg-1/40 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-fg-2 backdrop-blur-md">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              liveLLM ? "bg-accent-0 pulse-ring" : "bg-fg-3",
            )}
          />
          {liveLLM ? "Live Anthropic" : "Heuristic fallback"} · Sonnet 4.6 + Opus 4.7
        </div>

        <h1 className="hero-title text-balance text-[clamp(48px,9vw,120px)] font-semibold leading-[0.95] tracking-tight text-fg-0">
          Agents that{" "}
          <span className="bg-gradient-to-br from-accent-0 to-[color:var(--color-human)] bg-clip-text text-transparent">
            run the desk
          </span>
        </h1>

        <p className="hero-sub max-w-[640px] text-balance text-[17px] leading-relaxed text-fg-2">
          Trade finance, automated end-to-end. Humans keep the relationships and the
          capital decisions — agents do everything else, supervised in real time.
        </p>

        <div className="hero-pipeline flex flex-wrap items-center justify-center gap-2 font-mono text-xs uppercase tracking-widest text-fg-3">
          <Pill>Lead Capture</Pill>
          <Arrow />
          <Pill>Underwriting</Pill>
          <Arrow />
          <Pill>Contract</Pill>
          <span className="mx-2 text-fg-3/60">+</span>
          <Pill accent>Master Supervisor</Pill>
        </div>

        <div className="hero-cta flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={goDashboard}
            disabled={pending}
            className={cn(
              "group relative inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-medium transition-colors",
              "bg-accent-0 text-bg-0 hover:bg-accent-1",
              "shadow-[0_0_60px_-12px_var(--color-accent-glow)]",
              "disabled:cursor-wait disabled:opacity-70",
            )}
          >
            <PlayIcon />
            {pending ? "Loading dashboard…" : "Run the demo"}
            <span
              aria-hidden
              className="ml-1 transition-transform duration-300 group-hover:translate-x-0.5"
            >
              →
            </span>
          </button>
        </div>

        <Link
          href="/dashboard"
          prefetch
          className="hero-skip text-xs text-fg-3 underline-offset-4 hover:text-fg-1 hover:underline"
        >
          Skip animation · open dashboard directly →
        </Link>

        <div className="hero-stats mt-2 grid w-full max-w-[640px] grid-cols-3 gap-2 pt-6">
          <Stat label="workers" value="3" />
          <Stat label="supervisor" value="Opus 4.7" />
          <Stat label="connectors" value="7 mocked" />
        </div>
      </main>

      {/* Bottom hairline */}
      <div className="hairline absolute inset-x-10 bottom-6 z-10 opacity-50" />
    </div>
  );
}

function Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="11" stroke="var(--color-accent-0)" strokeWidth="1.4" />
      <path
        d="M3 14c3-2 6-2 9 0s6 2 9 0"
        stroke="var(--color-accent-0)"
        strokeWidth="1.4"
        fill="none"
      />
      <circle cx="12" cy="12" r="2.2" fill="var(--color-accent-0)" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden
      className="-ml-0.5"
    >
      <path d="M4.5 3.2v9.6L13 8 4.5 3.2z" />
    </svg>
  );
}

function Pill({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-1",
        accent
          ? "border-accent-0/40 bg-accent-0/10 text-accent-0"
          : "border-[color:var(--color-line)] bg-bg-1/40 text-fg-2",
      )}
    >
      {children}
    </span>
  );
}

function Arrow() {
  return <span className="text-fg-3/60">→</span>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-xl px-3 py-2 text-left">
      <div className="text-[10px] uppercase tracking-widest text-fg-3">{label}</div>
      <div className="mt-0.5 font-mono text-sm text-fg-0">{value}</div>
    </div>
  );
}
