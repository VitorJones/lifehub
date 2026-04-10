import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/agua?data=yyyy-MM-dd  → hoje + últimos 7 dias
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const data = searchParams.get("data") ?? new Date().toISOString().slice(0, 10);

  // Gera as datas dos últimos 7 dias (inclusive hoje)
  const datas: Date[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(data + "T00:00:00.000Z");
    d.setUTCDate(d.getUTCDate() - i);
    datas.push(d);
  }

  const registros = await prisma.registroAgua.findMany({
    where: { data: { in: datas } },
  });

  const hoje = registros.find(
    (r) => r.data.toISOString().slice(0, 10) === data
  );

  const semana = datas.map((d) => {
    const ds  = d.toISOString().slice(0, 10);
    const reg = registros.find((r) => r.data.toISOString().slice(0, 10) === ds);
    return { data: ds, ml: reg?.ml ?? 0 };
  });

  return NextResponse.json({
    hoje:   { ml: hoje?.ml ?? 0, metaMl: hoje?.metaMl ?? 2000 },
    semana,
  });
}

// POST /api/agua  { data, ml, metaMl? }
export async function POST(request: Request) {
  const body   = await request.json();
  const data   = body.data as string;
  const ml     = Math.max(0, Number(body.ml));
  const metaMl = body.metaMl != null ? Number(body.metaMl) : undefined;

  const registro = await prisma.registroAgua.upsert({
    where:  { data: new Date(data + "T00:00:00.000Z") },
    update: { ml, ...(metaMl !== undefined && { metaMl }) },
    create: { data: new Date(data + "T00:00:00.000Z"), ml, metaMl: metaMl ?? 2000 },
  });

  return NextResponse.json(registro);
}
