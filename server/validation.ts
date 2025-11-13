import { z } from "zod";

// Schema for practice sentence generation
export const practiceSentenceSchema = z.object({
  originalScript: z.string().min(1, "Original script is required"),
  transliteration: z.string().min(1, "Transliteration is required"),
});

// Schema for word score
export const wordScoreSchema = z.object({
  word: z.string().min(1),
  transliteration: z.string().min(1),
  score: z.number().min(0).max(100),
});

// Schema for pronunciation analysis result
export const pronunciationResultSchema = z.object({
  wordScores: z.array(wordScoreSchema).min(1, "At least one word score is required"),
  simpleTips: z.array(z.string()).min(1, "At least one simple tip is required"),
  detailedFeedback: z.array(z.string()).min(1, "At least one detailed feedback item is required"),
});

export type PracticeSentence = z.infer<typeof practiceSentenceSchema>;
export type WordScore = z.infer<typeof wordScoreSchema>;
export type PronunciationResult = z.infer<typeof pronunciationResultSchema>;
