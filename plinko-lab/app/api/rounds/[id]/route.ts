import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params; // 👈
  const round = await prisma.round.findUnique({ where: { id } });
  if (!round) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(round);
}
