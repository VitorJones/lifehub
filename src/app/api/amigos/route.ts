import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const amigos = await prisma.amigo.findMany({
    orderBy: [{ favorito: "desc" }, { nome: "asc" }],
  });
  return NextResponse.json(amigos);
}

export async function POST(request: Request) {
  const body = await request.json();
  const amigo = await prisma.amigo.create({
    data: {
      nome:              body.nome,
      apelido:           body.apelido           ?? null,
      telefone:          body.telefone          ?? null,
      email:             body.email             ?? null,
      instagram:         body.instagram         ?? null,
      aniversario:       body.aniversario       ?? null,
      grupos:            body.grupos?.length    ? JSON.stringify(body.grupos) : null,
      notas:             body.notas             ?? null,
      cor:               body.cor               ?? "#a855f7",
      favorito:          body.favorito          ?? false,
      frequenciaContato: body.frequenciaContato ?? null,
    },
  });
  return NextResponse.json(amigo, { status: 201 });
}
