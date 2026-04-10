/**
 * Aplica todas as migrations do Prisma no banco Turso.
 *
 * Uso:
 *   TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=eyJ... node scripts/turso-push.mjs
 *
 * Ou com as variáveis já no .env.local:
 *   npx dotenv -e .env.local -- node scripts/turso-push.mjs
 *
 * No Windows (PowerShell):
 *   $env:TURSO_DATABASE_URL="libsql://..."; $env:TURSO_AUTH_TOKEN="eyJ..."; node scripts/turso-push.mjs
 */

import { createClient } from "@libsql/client";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error("❌  TURSO_DATABASE_URL não definida.");
  process.exit(1);
}

const client = createClient({ url, authToken });

const migrationsDir = "./prisma/migrations";

const migrationFiles = readdirSync(migrationsDir)
  .sort()
  .map((dir) => join(migrationsDir, dir, "migration.sql"))
  .filter((f) => existsSync(f));

if (migrationFiles.length === 0) {
  console.error("❌  Nenhum arquivo de migration encontrado em", migrationsDir);
  process.exit(1);
}

console.log(`🚀  Aplicando ${migrationFiles.length} migration(s) no Turso (${url})\n`);

for (const file of migrationFiles) {
  const sql = readFileSync(file, "utf8");
  // Divide em statements individuais (ignora linhas de comentário e vazias)
  const statements = sql
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith("--") && s !== "");

  process.stdout.write(`  📄  ${file} … `);
  try {
    for (const stmt of statements) {
      await client.execute(stmt);
    }
    console.log("✅");
  } catch (err) {
    // Ignora erros de "tabela já existe" (idempotente)
    if (err.message?.includes("already exists")) {
      console.log("⚠️  já existe (ignorado)");
    } else {
      console.error("\n❌  Erro:", err.message);
      process.exit(1);
    }
  }
}

console.log("\n✅  Schema aplicado com sucesso no Turso!");
client.close?.();
