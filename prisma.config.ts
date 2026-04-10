import { defineConfig } from "prisma/config";

function datasourceUrl(): string {
  if (process.env.TURSO_DATABASE_URL) {
    // Para prisma db push / migrate: precisa do authToken embutido na URL
    const url = new URL(process.env.TURSO_DATABASE_URL);
    if (process.env.TURSO_AUTH_TOKEN) {
      url.searchParams.set("authToken", process.env.TURSO_AUTH_TOKEN);
    }
    return url.toString();
  }
  // Dev local: SQLite
  return "file:./prisma/dev.db";
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: datasourceUrl(),
  },
});
