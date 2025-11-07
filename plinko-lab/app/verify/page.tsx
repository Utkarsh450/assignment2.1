"use client";

import { useState } from "react";

export default function VerifyPage() {
  const [serverSeed, setServerSeed] = useState("");
  const [clientSeed, setClientSeed] = useState("");
  const [nonce, setNonce] = useState("");
  const [dropColumn, setDropColumn] = useState<number>(6);
  const [roundId, setRoundId] = useState("");
  const [ver, setVer] = useState(null);
  const [round, setRound] = useState(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setVer(null);
    setRound(null);

    // fetch verifier
    const q = new URLSearchParams({
      serverSeed, clientSeed, nonce, dropColumn: String(dropColumn)
    }).toString();

    const verRes = await fetch(`/api/verify?${q}`);
    const verJson = await verRes.json();
    setVer(verJson);

    // optionally fetch stored round for comparison
    if (roundId) {
      const rRes = await fetch(`/api/rounds/${roundId}`);
      setRound(await rRes.json());
    }

    setLoading(false);
  }

  const match =
    ver && round &&
    ver.commitHex === round.commitHex &&
    ver.combinedSeed === round.combinedSeed &&
    ver.pegMapHash === round.pegMapHash &&
    ver.binIndex === round.binIndex &&
    round.rows === ver.rows;

  return (
    <div className="max-w-2xl mx-auto p-6 flex flex-col gap-6">
      <h1 className="text-2xl font-bold">🔎 Verify a Plinko Round</h1>

      <form onSubmit={onSubmit} className="grid gap-4">
        <input className="border p-2 rounded" placeholder="serverSeed (hex)" value={serverSeed} onChange={e=>setServerSeed(e.target.value)} />
        <input className="border p-2 rounded" placeholder="clientSeed" value={clientSeed} onChange={e=>setClientSeed(e.target.value)} />
        <input className="border p-2 rounded" placeholder="nonce" value={nonce} onChange={e=>setNonce(e.target.value)} />
        <div className="flex gap-3">
          <input
            type="number" min={0} max={12}
            className="border p-2 rounded w-32"
            placeholder="dropColumn"
            value={dropColumn}
            onChange={e=>setDropColumn(Number(e.target.value))}
          />
          <input className="border p-2 rounded flex-1" placeholder="(Optional) roundId to compare" value={roundId} onChange={e=>setRoundId(e.target.value)} />
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60" disabled={loading}>
          {loading ? "Verifying..." : "Verify"}
        </button>
      </form>

      {ver && (
        <div className="border rounded p-4">
          <h2 className="font-semibold mb-2">Computed</h2>
          <div className="text-sm break-words">
            <div><b>commitHex:</b> {ver.commitHex}</div>
            <div><b>combinedSeed:</b> {ver.combinedSeed}</div>
            <div><b>pegMapHash:</b> {ver.pegMapHash}</div>
            <div><b>binIndex:</b> {ver.binIndex}</div>
            <div><b>rows:</b> {ver.rows}</div>
          </div>
        </div>
      )}

      {round && (
        <div className="border rounded p-4">
          <h2 className="font-semibold mb-2">Stored Round</h2>
          {"error" in round ? (
            <div className="text-red-600">Round not found</div>
          ) : (
            <div className="text-sm break-words">
              <div><b>status:</b> {round.status}</div>
              <div><b>commitHex:</b> {round.commitHex}</div>
              <div><b>combinedSeed:</b> {round.combinedSeed}</div>
              <div><b>pegMapHash:</b> {round.pegMapHash}</div>
              <div><b>binIndex:</b> {round.binIndex}</div>
              <div><b>rows:</b> {round.rows}</div>
              <div><b>dropColumn:</b> {round.dropColumn}</div>
            </div>
          )}
        </div>
      )}

      {ver && round && (
        <div className={`p-3 rounded text-white ${match ? "bg-green-600" : "bg-red-600"}`}>
          {match ? "✅ Verified — all computed values match the stored round." : "❌ Not verified — mismatch detected."}
        </div>
      )}
    </div>
  );
}
