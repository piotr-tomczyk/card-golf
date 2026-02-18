"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  shape: "rect" | "circle" | "suit";
  suit?: string;
  size: number;
  alpha: number;
  alphaDecay: number;
  wobble: number;
  wobbleSpeed: number;
}

const COLORS = [
  "#F59E0B",
  "#FCD34D",
  "#FFFFFF",
  "#86EFAC",
  "#4ADE80",
  "#FCA5A5",
  "#93C5FD",
  "#C4B5FD",
  "#FDE68A",
];

const SUITS = ["♠", "♥", "♦", "♣"];

function createBurst(
  x: number,
  y: number,
  count: number,
  spreadAngle: number,
  spread: number,
): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = spreadAngle + (Math.random() - 0.5) * spread;
    const speed = 5 + Math.random() * 14;
    const roll = Math.random();
    const shape: Particle["shape"] =
      roll < 0.45 ? "rect" : roll < 0.75 ? "circle" : "suit";

    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.25,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
      shape,
      suit: shape === "suit" ? SUITS[Math.floor(Math.random() * SUITS.length)] : undefined,
      size:
        shape === "rect"
          ? 9 + Math.random() * 7
          : shape === "circle"
            ? 4 + Math.random() * 5
            : 13 + Math.random() * 9,
      alpha: 1,
      alphaDecay: 0.003 + Math.random() * 0.004,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.05 + Math.random() * 0.05,
    });
  }
  return particles;
}

interface ConfettiProps {
  active: boolean;
}

export function Confetti({ active }: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    let running = false;
    const particles: Particle[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const GRAVITY = 0.22;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]!;
        p.vy += GRAVITY;
        p.vx *= 0.995;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.wobble += p.wobbleSpeed;
        p.alpha -= p.alphaDecay;

        if (p.alpha <= 0.01 || p.y > canvas.height + 60) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;

        if (p.shape === "rect") {
          const w = p.size;
          const h = p.size * 0.55 + Math.sin(p.wobble) * 1.5;
          ctx.fillRect(-w / 2, -h / 2, w, h);
          ctx.strokeStyle = "rgba(255,255,255,0.3)";
          ctx.lineWidth = 0.8;
          ctx.strokeRect(-w / 2, -h / 2, w, h);
        } else if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.4)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2 - 1.5, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          const isRed = p.suit === "♥" || p.suit === "♦";
          ctx.fillStyle = isRed ? "#F87171" : "#FFFFFF";
          ctx.font = `bold ${Math.round(p.size)}px Georgia, serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.shadowColor = "rgba(0,0,0,0.4)";
          ctx.shadowBlur = 3;
          ctx.fillText(p.suit!, 0, 0);
        }

        ctx.restore();
      }

      if (particles.length > 0) {
        rafId = requestAnimationFrame(animate);
      } else {
        running = false;
      }
    };

    const addBurst = (burst: Particle[]) => {
      particles.push(...burst);
      // Only start the loop if it isn't already running
      if (!running) {
        running = true;
        rafId = requestAnimationFrame(animate);
      }
    };

    const t1 = setTimeout(() => {
      const w = canvas.width;
      const h = canvas.height;
      addBurst([
        ...createBurst(w * 0.05, h * 0.95, 75, -Math.PI * 0.7, Math.PI * 0.55),
        ...createBurst(w * 0.95, h * 0.95, 75, -Math.PI * 0.3, Math.PI * 0.55),
      ]);
    }, 200);

    const t2 = setTimeout(() => {
      const w = canvas.width;
      const h = canvas.height;
      addBurst(createBurst(w * 0.5, h * 0.85, 60, -Math.PI / 2, Math.PI * 0.8));
    }, 900);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-50"
      aria-hidden="true"
    />
  );
}
