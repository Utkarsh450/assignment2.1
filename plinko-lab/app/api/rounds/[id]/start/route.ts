import { NextRequest, NextResponse } from "next/server";
import { combinedSeedHex, seed32FromCombined } from "../../../../../lib/crypto";
import { XorShift32 } from "../../../../../lib/prng";
import { generatePegMap, simulatePath } from "../../../../../lib/engine";
import { prisma } from "../../../../../lib/prisma";

const ROWS = 12;

function payoutForBin(bin: number) {
  const center = 6;
  const dist = Math.abs(bin - center);
  const table = [5, 3, 2, 1.5, 1.2, 1.05, 1.0];
  return table[center - dist] ?? 1.0;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params; // 👈 IMPORTANT

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

    const { clientSeed, betCents, dropColumn } = body as {
      clientSeed?: string; betCents?: number; dropColumn?: number;
    };

    if (!clientSeed || typeof clientSeed !== "string")
      return NextResponse.json({ error: "clientSeed required" }, { status: 400 });
    if (!Number.isInteger(betCents) || betCents! < 0)
      return NextResponse.json({ error: "betCents must be non-negative int" }, { status: 400 });
    if (!Number.isInteger(dropColumn) || dropColumn! < 0 || dropColumn! > 12)
      return NextResponse.json({ error: "dropColumn must be 0..12" }, { status: 400 });

    const round = await prisma.round.findUnique({ where: { id } });
    if (!round) return NextResponse.json({ error: "Round not found" }, { status: 404 });
    if (round.status !== "CREATED")
      return NextResponse.json({ error: "Round already started or revealed" }, { status: 400 });
    if (!round.serverSeed)
      return NextResponse.json({ error: "Server seed missing" }, { status: 500 });

    const combined = combinedSeedHex(round.serverSeed, clientSeed, round.nonce);
    const seed32 = seed32FromCombined(combined);
    const rng = new XorShift32(seed32);

    const pegMap = generatePegMap(ROWS, rng);
    const { binIndex, path, pegMapHash } = simulatePath(ROWS, dropColumn!, pegMap, rng);

    const payoutMultiplier = payoutForBin(binIndex);

    await prisma.round.update({
      where: { id },
      data: {
        status: "STARTED",
        clientSeed,
        combinedSeed: combined,
        pegMapHash,
        rows: ROWS,
        dropColumn: dropColumn!,
        binIndex,
        payoutMultiplier,
        betCents: betCents!,
        pathJson: path
      },
    });

    return NextResponse.json({
      roundId: id,
      pegMapHash,
      rows: ROWS,
      binIndex,
      payoutMultiplier,
    });
  } catch (e) {
    return NextResponse.json({ error: true, message: String(e?.message ?? e) }, { status: 500 });
  }
}
