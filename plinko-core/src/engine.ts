import { createHash } from "crypto";
import { XorShift32 } from "./prng";

export type PegMap = number[][];
export type PathStep = "L" | "R";

export type EngineResult = {
  pegMap: PegMap;
  pegMapHash: string;
  path: PathStep[];
  binIndex: number; // 0..rows
};

function round6(n: number) {
  return Math.round(n * 1e6) / 1e6;
}

/** Generate peg map using rng; leftBias in [0.4, 0.6], rounded to 6dp. */
export function generatePegMap(rows: number, rng: XorShift32): PegMap {
  const map: PegMap = [];
  for (let r = 0; r < rows; r++) {
    const row: number[] = [];
    for (let i = 0; i < r + 1; i++) {
      const leftBias = 0.5 + (rng.rand() - 0.5) * 0.2; // [0.4, 0.6]
      row.push(round6(leftBias));
    }
    map.push(row);
  }
  return map;
}

export function hashPegMap(pegMap: PegMap): string {
  const json = JSON.stringify(pegMap);
  return createHash("sha256").update(json).digest("hex");
}

/**
 * Simulate deterministic path. IMPORTANT: Use the SAME rng instance that generated the peg map
 * so the PRNG stream order is: all pegs first, then decisions.
 */
export function simulatePath(
  rows: number,
  dropColumn: number,
  pegMap: PegMap,
  rng: XorShift32
): EngineResult {
  let pos = 0; // number of Right moves so far
  const path: PathStep[] = [];
  const adj = (dropColumn - Math.floor(rows / 2)) * 0.01; // small bias adjustment

  for (let r = 0; r < rows; r++) {
    const idx = Math.min(pos, r); // peg under current path
    const baseBias = pegMap[r][idx];
    const biasPrime = Math.max(0, Math.min(1, baseBias + adj)); // clamp 0..1
    const rnd = rng.rand();
    if (rnd < biasPrime) {
      path.push("L");
    } else {
      path.push("R");
      pos += 1;
    }
  }

  const pegMapHash = hashPegMap(pegMap);
  return { pegMap: pegMap, pegMapHash, path, binIndex: pos };
}
