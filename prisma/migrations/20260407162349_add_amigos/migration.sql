-- CreateTable
CREATE TABLE "Amigo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "apelido" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "instagram" TEXT,
    "aniversario" TEXT,
    "grupos" TEXT,
    "notas" TEXT,
    "cor" TEXT NOT NULL DEFAULT '#a855f7',
    "favorito" BOOLEAN NOT NULL DEFAULT false,
    "ultimoContato" DATETIME,
    "frequenciaContato" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
