-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Evento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "dataInicio" DATETIME NOT NULL,
    "dataFim" DATETIME,
    "local" TEXT,
    "cor" TEXT NOT NULL DEFAULT '#3b82f6',
    "diaInteiro" BOOLEAN NOT NULL DEFAULT false,
    "lembrete" INTEGER,
    "tipo" TEXT NOT NULL DEFAULT 'evento',
    "recorrencia" TEXT,
    "diasRecorrencia" TEXT,
    "excecoes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Evento" ("cor", "createdAt", "dataFim", "dataInicio", "descricao", "diaInteiro", "id", "lembrete", "local", "recorrencia", "titulo", "updatedAt") SELECT "cor", "createdAt", "dataFim", "dataInicio", "descricao", "diaInteiro", "id", "lembrete", "local", "recorrencia", "titulo", "updatedAt" FROM "Evento";
DROP TABLE "Evento";
ALTER TABLE "new_Evento" RENAME TO "Evento";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
