import { sql } from "drizzle-orm";
import { pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type Language = "hindi" | "kannada";
export type AIModel = "gemini-2.5-pro" | "gemini-2.5-flash" | "gemini-2.5-flash-lite";

export interface PracticeSentence {
  id: string;
  language: Language;
  originalScript: string;
  transliteration: string;
  audioUrl?: string;
}

export interface WordScore {
  word: string;
  transliteration: string;
  score: number;
}

export interface PronunciationResult {
  overallScore: number;
  wordScores: WordScore[];
  feedback: string[];
}
