"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const ACCENT = new THREE.Color("#14e8f5");
const ACCENT_SOFT = new THREE.Color("#0bb1c1");

function Core() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.y += dt * 0.18;
    ref.current.rotation.x += dt * 0.06;
  });
  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[1.05, 1]} />
      <meshBasicMaterial
        color={ACCENT}
        wireframe
        transparent
        opacity={0.55}
      />
    </mesh>
  );
}

function CoreGlow() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    const s = 1 + Math.sin(t * 1.2) * 0.04;
    ref.current.scale.setScalar(s);
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.78, 32, 32]} />
      <meshBasicMaterial color={ACCENT} transparent opacity={0.08} />
    </mesh>
  );
}

interface SatelliteProps {
  radius: number;
  speed: number;
  phase: number;
  tilt: number;
  size: number;
  color: THREE.Color;
}

function Satellite({ radius, speed, phase, tilt, size, color }: SatelliteProps) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() * speed + phase;
    ref.current.position.set(
      Math.cos(t) * radius,
      Math.sin(t * 1.3 + tilt) * radius * 0.35,
      Math.sin(t) * radius,
    );
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[size, 14, 14]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

function Satellites() {
  const config = useMemo<SatelliteProps[]>(
    () => [
      { radius: 1.7, speed: 0.55, phase: 0, tilt: 0.2, size: 0.075, color: ACCENT },
      { radius: 1.85, speed: 0.42, phase: 2.1, tilt: 1.1, size: 0.06, color: ACCENT_SOFT },
      { radius: 1.95, speed: 0.36, phase: 4.4, tilt: -0.4, size: 0.07, color: ACCENT },
      { radius: 2.1, speed: 0.28, phase: 1.2, tilt: 0.7, size: 0.05, color: ACCENT_SOFT },
    ],
    [],
  );
  return (
    <>
      {config.map((c) => (
        <Satellite key={`${c.radius}-${c.phase}`} {...c} />
      ))}
    </>
  );
}

function Scene() {
  return (
    <>
      <CoreGlow />
      <Core />
      <Satellites />
    </>
  );
}

export default function AgentNetwork() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 4.6], fov: 45 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      frameloop="always"
      style={{ background: "transparent" }}
    >
      <Scene />
    </Canvas>
  );
}
