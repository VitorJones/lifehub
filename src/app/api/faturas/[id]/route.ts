import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { status } = await request.json();

  const fatura = await prisma.fatura.update({
    where: { id },
    data: { status },
    include: { cartao: true },
  });

  return NextResponse.json(fatura);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.fatura.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
