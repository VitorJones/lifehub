import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Usado apenas pelos comandos CLI do Prisma (prisma db push, migrate dev, etc.)
    // Em produção o banco é o Turso — use `npm run db:push:turso` para aplicar o schema.
    url: "file:./prisma/dev.db",
  },
});
