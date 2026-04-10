import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Produção: Turso. Dev: SQLite local em prisma/dev.db
    url: process.env.TURSO_DATABASE_URL ?? "file:./prisma/dev.db",
  },
});
