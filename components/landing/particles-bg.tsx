"use client";

import { useEffect, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { ISourceOptions } from "@tsparticles/engine";

const OPTIONS: ISourceOptions = {
  fullScreen: { enable: false },
  background: { color: { value: "transparent" } },
  fpsLimit: 60,
  detectRetina: true,
  pauseOnBlur: true,
  pauseOnOutsideViewport: true,
  particles: {
    number: { value: 60, density: { enable: true, width: 1600, height: 900 } },
    color: { value: ["#14e8f5", "#0ed4e4", "#7adfe9"] },
    shape: { type: "circle" },
    opacity: {
      value: { min: 0.08, max: 0.32 },
      animation: { enable: true, speed: 0.4, sync: false },
    },
    size: { value: { min: 0.6, max: 1.6 } },
    move: {
      enable: true,
      speed: 0.25,
      direction: "none",
      random: true,
      straight: false,
      outModes: { default: "out" },
    },
    links: {
      enable: true,
      distance: 130,
      color: "#14e8f5",
      opacity: 0.08,
      width: 1,
    },
  },
  interactivity: {
    events: {
      onHover: { enable: true, mode: "grab" },
      resize: { enable: true },
    },
    modes: {
      grab: { distance: 140, links: { opacity: 0.18 } },
    },
  },
};

export default function ParticlesBg() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) return null;

  return (
    <Particles
      id="landing-particles"
      options={OPTIONS}
      className="absolute inset-0 -z-10 [&>canvas]:!h-full [&>canvas]:!w-full"
    />
  );
}
