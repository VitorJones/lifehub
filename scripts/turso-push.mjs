/**
 * Aplica o schema completo do Prisma no banco Turso.
 *
 * Uso (PowerShell):
 *   $env:TURSO_DATABASE_URL="libsql://..."; $env:TURSO_AUTH_TOKEN="eyJ..."; npm run db:push:turso
 *
 * Uso (bash):
 *   TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=eyJ... npm run db:push:turso
 */

import { createClient } from "@libsql/client";
import { spawnSync } from "child_process";

const url       = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error("TURSO_DATABASE_URL nao definida.");
  process.exit(1);
}

// ── 1. Gera o SQL completo ────────────────────────────────────────────────────
console.log("Gerando SQL via prisma migrate diff...");

const result = spawnSync(
  "npx",
  [
    "prisma", "migrate", "diff",
    "--from-empty",
    "--to-schema", "prisma/schema.prisma",
    "--script",
  ],
  { encoding: "utf8", shell: true }
);

if (result.error) {
  console.error("Erro ao executar prisma migrate diff:", result.error.message);
  process.exit(1);
}

if (result.status !== 0) {
  console.error("prisma migrate diff falhou (exit", result.status + "):");
  console.error(result.stderr || result.stdout);
  process.exit(1);
}

// stdout contem o SQL; stderr contem mensagens do CLI (ex: "Loaded Prisma config")
const sql = result.stdout.trim();

if (!sql) {
  console.log("Nenhum SQL gerado. Verifique o schema.");
  process.exit(1);
}

console.log("SQL gerado (" + sql.length + " chars).\n");

// ── 2. Divide em statements individuais ──────────────────────────────────────
// Separa por ";\n" e descarta comentarios e linhas vazias
const statements = sql
  .split(/;\s*\r?\n/)
  .map((s) => s.replace(/--[^\n]*/g, "").trim())  // remove comentarios inline
  .filter((s) => s.length > 0);

// ── 3. Executa no Turso ───────────────────────────────────────────────────────
console.log("Conectando ao Turso (" + url + ")...");
const client = createClient({ url, authToken });

console.log("Executando " + statements.length + " statement(s)...\n");

let ok   = 0;
let skip = 0;

for (const stmt of statements) {
  try {
    await client.execute(stmt);
    ok++;
  } catch (err) {
    if (err.message && err.message.includes("already exists")) {
      skip++;
    } else {
      console.error("Erro no statement:\n" + stmt + "\n\nMensagem: " + err.message);
      client.close?.();
      process.exit(1);
    }
  }
}

client.close?.();
console.log("\nConcluido — " + ok + " executado(s), " + skip + " ignorado(s) (ja existiam).");
