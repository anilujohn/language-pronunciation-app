import { defineConfig } from "drizzle-kit";

// Database is optional - app currently uses in-memory storage (MemStorage)
// Only needed if you want to use persistent PostgreSQL storage
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://localhost:5432/pronunciation_app";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: DATABASE_URL,
  },
});
