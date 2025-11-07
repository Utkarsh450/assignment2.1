import { combinedSeedHex, seed32FromCombined } from "./crypto";
import { XorShift32 } from "./prng";
import { generatePegMap, simulatePath } from "./engine";

function approxEq(a: number, b: number, eps = 1e-6) {
  return Math.abs(a - b) < eps;
}

const rows = 12;
const serverSeed = "b2a5f3f32a4d9c6ee7a8c1d33456677890abcdeffedcba0987654321ffeeddcc";
const nonce = "42";
const clientSeed = "candidate-hello";

const combined = combinedSeedHex(serverSeed, clientSeed, nonce);
const seed = seed32FromCombined(combined);
const rng = new XorShift32(seed);

// 1) Peg map should match first rows in brief (rounded to 6dp)
const pegMap = generatePegMap(rows, rng);

// Expected from assignment (rounded to 6dp)
const exp = {
  r0: [0.422123],
  r1: [0.552503, 0.408786],
  r2: [0.491574, 0.46878, 0.43654],
};

// Assertions for first three rows
if (!approxEq(pegMap[0][0], exp.r0[0])) {
  throw new Error(`Row0[0] mismatch. got=${pegMap[0][0]} exp=${exp.r0[0]}`);
}

if (!approxEq(pegMap[1][0], exp.r1[0]) || !approxEq(pegMap[1][1], exp.r1[1])) {
  throw new Error(`Row1 mismatch. got=${pegMap[1]} exp=${exp.r1}`);
}

if (
  !approxEq(pegMap[2][0], exp.r2[0]) ||
  !approxEq(pegMap[2][1], exp.r2[1]) ||
  !approxEq(pegMap[2][2], exp.r2[2])
) {
  throw new Error(`Row2 mismatch. got=${pegMap[2]} exp=${exp.r2}`);
}

// 2) Continue SAME rng for decisions; center drop should land center bin (6)
const dropColumn = 6;
const { binIndex, path } = simulatePath(rows, dropColumn, pegMap, rng);

if (binIndex !== 6) {
  throw new Error(`binIndex mismatch. got=${binIndex} exp=6 (path=${path.join("")})`);
}

console.log("✅ Engine test passed:");
console.log(" - pegMap first rows match expected");
console.log(" - dropColumn=6 ⇒ binIndex=6");
