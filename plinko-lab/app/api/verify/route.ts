import { NextResponse } from "next/server";
// use RELATIVE imports (we'll switch to @/ later)
import { commitHex, combinedSeedHex, seed32FromCombined } from "../../../lib/crypto";
import { XorShift32 } from "../../../lib/prng";
import { generatePegMap, simulatePath } from "../../../lib/engine";

const ROWS = 12;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const serverSeed = searchParams.get("serverSeed") ?? "";
  const clientSeed = searchParams.get("clientSeed") ?? "";
  const nonce = searchParams.get("nonce") ?? "";
  const dropColumnStr = searchParams.get("dropColumn");

  // basic validation
  if (!serverSeed || !clientSeed || !nonce || dropColumnStr == null) {
    return NextResponse.json(
      { error: "Missing query: serverSeed, clientSeed, nonce, dropColumn" },
      { status: 400 }
    );
  }

  const dropColumn = Number(dropColumnStr);
  if (!Number.isInteger(dropColumn) || dropColumn < 0 || dropColumn > 12) {
    return NextResponse.json({ error: "dropColumn must be 0..12" }, { status: 400 });
  }

  // recompute fairness pieces
  const commit = commitHex(serverSeed, nonce);
  const combined = combinedSeedHex(serverSeed, clientSeed, nonce);
  const seed32 = seed32FromCombined(combined);
  const rng = new XorShift32(seed32);

  // IMPORTANT: same RNG use-order as engine: first peg map, then decisions
  const pegMap = generatePegMap(ROWS, rng);
  const { binIndex, pegMapHash } = simulatePath(ROWS, dropColumn, pegMap, rng);

  return NextResponse.json({
    commitHex: commit,
    combinedSeed: combined,
    pegMapHash,
    binIndex,
    rows: ROWS,
  });
}
