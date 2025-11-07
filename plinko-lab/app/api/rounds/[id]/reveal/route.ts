    import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const round = await prisma.round.findUnique({ where: { id } });
  if (!round) return NextResponse.json({ error: "Round not found" }, { status: 404 });
  if (round.status !== "STARTED")
    return NextResponse.json({ error: "Round not STARTED" }, { status: 400 });
  if (!round.serverSeed)
    return NextResponse.json({ error: "Server seed missing" }, { status: 500 });

  await prisma.round.update({
    where: { id },
    data: { status: "REVEALED", revealedAt: new Date() },
  });

  // reveal serverSeed to client (as spec)
  return NextResponse.json({ serverSeed: round.serverSeed });
}
