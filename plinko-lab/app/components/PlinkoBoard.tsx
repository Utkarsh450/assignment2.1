"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type PlinkoBoardProps = {
  rows?: number;                 // default 12
  dropColumn: number;            // 0..12
  path: ("L" | "R")[];           // deterministic pathJson from backend
  onHitPeg?: (step: number) => void;
  onFinish?: (finalBin: number) => void;
  reducedMotion?: boolean;
  mute?: boolean;
  tilt?: boolean;                // easter egg: tilt effect
  showGrid?: boolean;            // easter egg: debug grid overlay
};

const TICK_MS = 500; // time per “row hop” (tuned to feel right)

export default function PlinkoBoard({
  rows = 12,
  dropColumn,
  path,
  onHitPeg,
  onFinish,
  reducedMotion = false,
  mute = false,
  tilt = false,
  showGrid = false,
}: PlinkoBoardProps) {
  // Layout constants
  const width = 480;
  const height = 640;
  const topPadding = 60;
  const pegGapX = width / (rows + 2);    // a bit of margin
  const pegGapY = (height - 160) / rows;

  // Precompute peg positions: row r has r+1 pegs
  const pegs = useMemo(() => {
    const list: { x: number; y: number }[][] = [];
    for (let r = 0; r < rows; r++) {
      const y = topPadding + r * pegGapY;
      const count = r + 1;
      const row: { x: number; y: number }[] = [];
      const rowWidth = count * pegGapX;
      const startX = (width - rowWidth) / 2 + pegGapX / 2;
      for (let i = 0; i < count; i++) {
        row.push({ x: startX + i * pegGapX, y });
      }
      list.push(row);
    }
    return list;
  }, [rows, pegGapX, pegGapY]);

  // Compute the *discrete* resting points the ball will visit per row
  // We follow the classic pos = number of Right moves so far.
  const waypoints = useMemo(() => {
    let pos = dropColumn; // start over top aligned with chosen column visually
    // We turn pos into screen X using the peg directly underneath on each row.
    const pts: { x: number; y: number }[] = [];

    for (let r = 0; r < rows; r++) {
      // Peg index used in description is min(pos, r). For animation,
      // we want the ball to arrive *above* that peg then shift a bit L/R into next column visually.
      const pegIdx = Math.min(pos, r);
      const peg = pegs[r][pegIdx];
      pts.push({ x: peg.x, y: peg.y - 10 }); // a tiny offset above peg for nicer feel

      // Advance pos if decision is R
      if (path[r] === "R") pos += 1;
    }

    // Final landing bin (pos)
    const bin = pos; // 0..rows
    const bins = rows + 1;
    const binWidth = width / bins;
    const binX = binWidth * bin + binWidth / 2;
    const binY = topPadding + rows * pegGapY + 40;

    pts.push({ x: binX, y: binY }); // final resting point
    return pts;
  }, [rows, dropColumn, path, pegs, pegGapY, width, topPadding]);

  // Simple confetti (emoji burst)
  const [confetti, setConfetti] = useState<{ id: number; x: number; y: number; vx: number; vy: number; life: number }[]>([]);

  // Sound refs
  const tickRef = useRef<HTMLAudioElement | null>(null);
  const winRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    tickRef.current = document.getElementById("tick-audio") as HTMLAudioElement | null;
    winRef.current = document.getElementById("win-audio") as HTMLAudioElement | null;
  }, []);

  // Ball animation state
  const [idx, setIdx] = useState(0);   // current target waypoint index
  const [pos, setPos] = useState<{ x: number; y: number }>(() => waypoints[0] ?? { x: width / 2, y: 0 });
  const rafRef = useRef<number>();

  // Reset when path changes
  useEffect(() => {
    setIdx(0);
    setPos(waypoints[0] ?? { x: width / 2, y: 0 });
  }, [waypoints]);

  useEffect(() => {
    if (!waypoints.length) return;

    let start = 0;
    let from = waypoints[0];
    let to = waypoints[0];
    let step = 0;

    const animate = (t: number) => {
      if (reducedMotion) {
        // snap per step in an interval
        if (step < waypoints.length - 1) {
          setPos(waypoints[step + 1]);
          setIdx(step + 1);
          if (onHitPeg && step < waypoints.length - 2) onHitPeg(step);
          step++;
          if (step < waypoints.length - 1) {
            setTimeout(() => {
              rafRef.current = requestAnimationFrame(animate);
            }, 60);
          } else {
            // finished
            onFinish?.(computeFinalBin());
            burstConfetti();
          }
        }
        return;
      }

      if (!start) start = t;
      const elapsed = t - start;

      const duration = TICK_MS;
      const k = Math.min(1, elapsed / duration);
      const ease = easeOutCubic(k);

      const x = from.x + (to.x - from.x) * ease;
      const y = from.y + (to.y - from.y) * ease;
      setPos({ x, y });

      if (k < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        // Arrived at waypoint
        if (!mute && tickRef.current && step < waypoints.length - 2) {
          tickRef.current.currentTime = 0;
          tickRef.current.play().catch(() => {});
        }
        if (onHitPeg && step < waypoints.length - 2) onHitPeg(step);

        step++;
        if (step >= waypoints.length - 1) {
          // Final point reached
          onFinish?.(computeFinalBin());
          if (!mute && winRef.current) {
            winRef.current.currentTime = 0;
            winRef.current.play().catch(() => {});
          }
          burstConfetti();
        } else {
          start = 0;
          from = to;
          to = waypoints[step + 1];
          rafRef.current = requestAnimationFrame(animate);
        }
      }
    };

    // Start with an initial delay so user can see ball appear
    from = waypoints[0];
    to = waypoints[1] ?? waypoints[0];
    step = 0;
    start = 0;
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [waypoints, reducedMotion, mute, onHitPeg, onFinish]);

  // Confetti burst
  function burstConfetti() {
    const center = waypoints[waypoints.length - 1] ?? { x: width / 2, y: height / 2 };
    const particles = Array.from({ length: 24 }).map((_, i) => {
      const a = (i / 24) * Math.PI * 2;
      const s = 2 + Math.random() * 2.5;
      return { id: Date.now() + i, x: center.x, y: center.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2, life: 60 + Math.random() * 20 };
    });
    setConfetti(particles);
  }

  // Confetti animation
  useEffect(() => {
    if (!confetti.length) return;
    const int = setInterval(() => {
      setConfetti((prev) =>
        prev
          .map((p) => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.15, life: p.life - 1 }))
          .filter((p) => p.life > 0 && p.y < height + 60)
      );
    }, 16);
    return () => clearInterval(int);
  }, [confetti.length]);

  function computeFinalBin() {
    // “pos” in engine terms is number of R moves, but we can compute from path:
    let pos = 0;
    for (const d of path) if (d === "R") pos++;
    return pos;
  }

  const ballStyle = tilt
    ? "transition-transform duration-200 will-change-transform"
    : "transition-transform duration-200";

  return (
    <div className="relative" style={{ width, height }}>
      {/* Audio tags (you can replace src with your own small wav/mp3) */}
      <audio id="tick-audio" src="./sounds/tick.wav" preload="auto" />
      <audio id="win-audio" src="/sounds/win.wav" preload="auto" />

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={`w-full h-full ${tilt ? "rotate-[-4deg] [filter:sepia(0.2)_contrast(1.1)_saturate(1.1)]" : ""}`}
        aria-label="Plinko board"
        role="img"
      >
        {/* bins */}
        <g>
          {Array.from({ length: rows + 1 }).map((_, i) => {
            const bins = rows + 1;
            const binWidth = width / bins;
            const x = i * binWidth;
            const y = topPadding + rows * pegGapY + 40;
            return (
              <rect key={i} x={x + 2} y={y} width={binWidth - 4} height={12} rx={6} className="fill-neutral-200" />
            );
          })}
        </g>

        {/* pegs */}
        <g>
          {pegs.map((row, r) =>
            row.map((p, i) => (
              <circle
                key={`p-${r}-${i}`}
                cx={p.x}
                cy={p.y}
                r={5}
                className="fill-neutral-400"
              />
            ))
          )}
        </g>

        {/* debug grid (easter egg 'G') */}
        {showGrid && (
          <g>
            {pegs.map((row, r) =>
              row.map((p, i) => (
                <text key={`t-${r}-${i}`} x={p.x + 8} y={p.y - 8} fontSize={10} className="fill-neutral-500">
                  {r},{i}
                </text>
              ))
            )}
          </g>
        )}

        {/* ball */}
        <g>
          <circle
            cx={pos.x}
            cy={pos.y}
            r={10}
            className={`fill-blue-500 drop-shadow-md ${ballStyle}`}
          />
        </g>

        {/* confetti (emoji) */}
        <g>
          {confetti.map((c) => (
            <text key={c.id} x={c.x} y={c.y} fontSize={14}>
              🎉
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
}

function easeOutCubic(k: number) {
  return 1 - Math.pow(1 - k, 3);
}
