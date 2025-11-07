import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { commitHex } from "@/lib/crypto";
import { randomBytes } from "crypto";

function randHex(bytes = 32) {
  return randomBytes(bytes).toString("hex");
}

export async function POST() {
  const serverSeed = randHex(32);
  const nonce = String(Math.floor(Math.random() * 1_000_000_000));
  const commit = commitHex(serverSeed, nonce);

  const round = await prisma.round.create({
    data: {
      status: "CREATED",
      nonce,
      commitHex: commit,
      serverSeed,     // keep secret; we won't return it yet
      clientSeed: "",
      combinedSeed: "",
      pegMapHash: "",
      rows: 12,
      dropColumn: 0,
      binIndex: 0,
      payoutMultiplier: 0,
      betCents: 0,
      pathJson: [],
    },
    select: { id: true, nonce: true, commitHex: true },
  });

  return NextResponse.json(round);
}
