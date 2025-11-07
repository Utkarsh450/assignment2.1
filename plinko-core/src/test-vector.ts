import { commitHex, combinedSeedHex, seed32FromCombined } from "./crypto";
import { XorShift32 } from "./prng";

const rows = 12;
const serverSeed = "b2a5f3f32a4d9c6ee7a8c1d33456677890abcdeffedcba0987654321ffeeddcc";
const nonce = "42";
const clientSeed = "candidate-hello";

const expectedCommit = "bb9acdc67f3f18f3345236a01f0e5072596657a9005c7d8a22cff061451a6b34";
const expectedCombined = "e1dddf77de27d395ea2be2ed49aa2a59bd6bf12ee8d350c16c008abd406c07e0";
const expectedFirst5 = [0.1106166649, 0.7625129214, 0.0439292176, 0.4578678815, 0.3438999297];

function approxEq(a: number, b: number, eps = 1e-9) {
  return Math.abs(a - b) < eps;
}

const commit = commitHex(serverSeed, nonce);
const combined = combinedSeedHex(serverSeed, clientSeed, nonce);

if (commit !== expectedCommit) throw new Error(`commitHex mismatch\n got: ${commit}\nexp: ${expectedCommit}`);
if (combined !== expectedCombined) throw new Error(`combinedSeed mismatch\n got: ${combined}\nexp: ${expectedCombined}`);

const seed = seed32FromCombined(combined);
const rng = new XorShift32(seed);

const first5 = Array.from({ length: 5 }, () => rng.rand());
first5.forEach((v, i) => {
  const exp = expectedFirst5[i]!;
  if (!approxEq(v, exp, 1e-9)) {
    throw new Error(`PRNG #${i + 1} mismatch\n got: ${v}\nexp: ${exp}`);
  }
});


console.log("✅ Test vector matched:");
console.table([
  { key: "commitHex", value: commit },
  { key: "combinedSeed", value: combined },
  { key: "seed32 (uint32)", value: seed },
  ...first5.map((v, i) => ({ key: `rand[${i}]`, value: v })),
]);
