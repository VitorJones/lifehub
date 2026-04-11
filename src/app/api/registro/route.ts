import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { nome, email, senha } = await req.json();

    if (!nome?.trim() || !email?.trim() || !senha?.trim()) {
      return NextResponse.json({ error: "Preencha todos os campos." }, { status: 400 });
    }

    if (senha.length < 6) {
      return NextResponse.json({ error: "A senha deve ter ao menos 6 caracteres." }, { status: 400 });
    }

    const existe = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existe) {
      return NextResponse.json({ error: "Este e-mail já está cadastrado." }, { status: 409 });
    }

    const senhaHash = await bcrypt.hash(senha, 12);

    await prisma.user.create({
      data: { nome: nome.trim(), email: email.toLowerCase().trim(), senhaHash },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
