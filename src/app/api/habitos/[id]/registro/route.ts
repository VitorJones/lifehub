import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: habitoId } = await params;
  const body = await request.json();

  // Store date as UTC midnight to avoid timezone drift
  const data = new Date(body.data + "T00:00:00.000Z");
  const concluido = body.concluido ?? true;

  const registro = await prisma.registroHabito.upsert({
    where: { habitoId_data: { habitoId, data } },
    create: { habitoId, data, concluido },
    update: { concluido },
  });

  return NextResponse.json(registro);
}
