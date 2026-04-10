/*
  Warnings:

  - You are about to drop the column `copos` on the `RegistroAgua` table. All the data in the column will be lost.
  - You are about to drop the column `meta` on the `RegistroAgua` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RegistroAgua" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "data" DATETIME NOT NULL,
    "ml" INTEGER NOT NULL DEFAULT 0,
    "metaMl" INTEGER NOT NULL DEFAULT 2000,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_RegistroAgua" ("createdAt", "data", "id", "updatedAt") SELECT "createdAt", "data", "id", "updatedAt" FROM "RegistroAgua";
DROP TABLE "RegistroAgua";
ALTER TABLE "new_RegistroAgua" RENAME TO "RegistroAgua";
CREATE UNIQUE INDEX "RegistroAgua_data_key" ON "RegistroAgua"("data");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
