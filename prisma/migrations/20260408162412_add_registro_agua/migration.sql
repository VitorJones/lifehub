-- CreateTable
CREATE TABLE "RegistroAgua" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "data" DATETIME NOT NULL,
    "copos" INTEGER NOT NULL DEFAULT 0,
    "meta" INTEGER NOT NULL DEFAULT 8,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "RegistroAgua_data_key" ON "RegistroAgua"("data");
