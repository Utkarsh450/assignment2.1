"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PlinkoBoard from "../components/PlinkoBoard";

export default function GamePage() {
  const [dropColumn, setDropColumn] = useState(6);
  const [bet, setBet] = useState(100);
  const [roundId, setRoundId] = useState<string | null>(null);
  const [binIndex, setBinIndex] = useState<number | null>(null);
  const [payout, setPayout] = useState<number | null>(null);
  const [path, setPath] = useState<("L" | "R")[]>([]);
  const [loading, setLoading] = useState(false);
  const [mute, setMute] = useState(false);
  const [tilt, setTilt] = useState(false);      // easter egg: 'T'
  const [showGrid, setShowGrid] = useState(false); // easter egg: 'G'

  const reducedMotion = usePrefersReducedMotion();

  const startRound = useCallback(async () => {
    try {
      setLoading(true);
      setPayout(null);
      setBinIndex(null);
      setPath([]);
      setRoundId(null);

      // 1) commit
      const commitRes = await fetch("/api/rounds/commit", { method: "POST" });
      const commit = await commitRes.json();
      setRoundId(commit.id);

      // 2) start with a random clientSeed (free-form)
      const seed = crypto.randomUUID();
      const startRes = await fetch(`/api/rounds/${commit.id}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientSeed: seed,
          betCents: bet * 100,
          dropColumn,
        }),
      });
      const result = await startRes.json();
      setBinIndex(result.binIndex);
      setPayout(result.payoutMultiplier);

      // 3) fetch full round to get pathJson for animation
      const roundRes = await fetch(`/api/rounds/${commit.id}`);
      const round = await roundRes.json();
      setPath(round.pathJson || []);
    } finally {
      setLoading(false);
    }
  }, [bet, dropColumn]);

  // keyboard accessibility: left/right to change drop column; space to drop; T/G for eggs
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") setDropColumn((c) => Math.max(0, c - 1));
      if (e.key === "ArrowRight") setDropColumn((c) => Math.min(12, c + 1));
      if (e.code === "Space") {
        e.preventDefault();
        if (!loading) startRound();
      }
      if (e.key.toLowerCase() === "t") setTilt((t) => !t);   // TILT mode
      if (e.key.toLowerCase() === "g") setShowGrid((g) => !g); // debug grid
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [loading, startRound]);

  const header = useMemo(
    () => (
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-3xl font-bold">🎯 Plinko — Provably Fair</h1>
        <p className="text-sm text-neutral-500">Keyboard: ← → adjust, Space drop · T = tilt · G = grid</p>
      </div>
    ),
    []
  );

  return (
    <main className="min-h-screen flex flex-col items-center gap-6 p-6">
      {header}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm">
          Bet:
          <input
            type="number"
            value={bet}
            min={1}
            onChange={(e) => setBet(Number(e.target.value))}
            className="ml-2 w-28 border px-3 py-2 rounded"
            aria-label="Bet amount"
          />
        </label>

        <label className="text-sm">
          Drop column:
          <input
            type="number"
            value={dropColumn}
            min={0}
            max={12}
            onChange={(e) => setDropColumn(Number(e.target.value))}
            className="ml-2 w-28 border px-3 py-2 rounded"
            aria-label="Drop column"
          />
        </label>

        <button
          onClick={startRound}
          className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? "Dropping..." : "Drop Ball"}
        </button>

        <button
          onClick={() => setMute((m) => !m)}
          className="px-4 py-2 rounded border"
          aria-pressed={mute}
          aria-label="Toggle sound"
        >
          {mute ? "🔇 Mute" : "🔊 Sound"}
        </button>

        <span className="text-sm text-neutral-500">
          {reducedMotion ? "Reduced motion ON" : "Motion ON"}
        </span>
      </div>

      {/* Board */}
      <PlinkoBoard
        rows={12}
        dropColumn={dropColumn}
        path={path as ("L" | "R")[]}
        onHitPeg={() => {}}
        onFinish={() => {}}
        reducedMotion={reducedMotion}
        mute={mute}
        tilt={tilt}
        showGrid={showGrid}
      />

      {/* Result */}
      <div className="text-center">
        {binIndex !== null && (
          <p className="text-lg">
            Landed bin: <b>{binIndex}</b> · Payout: <b>×{payout}</b>
          </p>
        )}
        {roundId && (
          <p className="text-xs text-neutral-500">
            roundId: {roundId}
          </p>
        )}
      </div>
    </main>
  );
}

function usePrefersReducedMotion() {
  const [pref, setPref] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPref(mq.matches);
    const handler = () => setPref(mq.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);
  return pref;
}
