import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body   = await request.json();

  const amigo = await prisma.amigo.update({
    where: { id },
    data: {
      nome:              body.nome,
      apelido:           body.apelido           ?? null,
      telefone:          body.telefone          ?? null,
      email:             body.email             ?? null,
      instagram:         body.instagram         ?? null,
      aniversario:       body.aniversario       ?? null,
      grupos:            body.grupos?.length    ? JSON.stringify(body.grupos) : null,
      notas:             body.notas             ?? null,
      cor:               body.cor,
      favorito:          body.favorito          ?? false,
      frequenciaContato: body.frequenciaContato ?? null,
      ultimoContato:     body.ultimoContato     ? new Date(body.ultimoContato) : undefined,
    },
  });
  return NextResponse.json(amigo);
}

/** PATCH — registra um contato agora (atualiza ultimoContato para hoje) */
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const amigo = await prisma.amigo.update({
    where: { id },
    data: { ultimoContato: new Date() },
  });
  return NextResponse.json(amigo);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.amigo.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
