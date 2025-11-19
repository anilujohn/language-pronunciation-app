import { z } from "zod";

// Schema for token usage tracking
export const tokenUsageSchema = z.object({
  textInputTokens: z.number().min(0),
  audioInputTokens: z.number().min(0),
  outputTokens: z.number().min(0),
  totalTokens: z.number().min(0),
});

// Schema for practice sentence generation
export const practiceSentenceSchema = z.object({
  originalScript: z.string().min(1, "Original script is required"),
  transliteration: z.string().min(1, "Transliteration is required"),
  tokenUsage: tokenUsageSchema.optional(),
});

// Schema for word score
export const wordScoreSchema = z.object({
  word: z.string().min(1),
  transliteration: z.string().min(1),
  score: z.number().min(0).max(100),
});

// Schema for pronunciation analysis result
export const pronunciationResultSchema = z.object({
  transcription: z.string().min(1, "Transcription is required"),
  wordScores: z.array(wordScoreSchema).min(1, "At least one word score is required"),
  simpleTips: z.array(z.string()).min(1, "At least one simple tip is required"),
  tokenUsage: tokenUsageSchema.optional(),
});

// Schema for Stage 1: Transcription result (new 2-stage architecture)
export const transcriptionResultSchema = z.object({
  transcription: z.string().min(1, "Transcription is required"),
  transcriptionTransliteration: z.string().min(1, "Transcription transliteration is required"),
});

// Schema for Stage 2: Pronunciation tips result (text-only, no audio)
export const wordTipSchema = z.object({
  word: z.string().min(1),
  transliteration: z.string().min(1),
  tip: z.string().min(1),
});

export const pronunciationTipsResultSchema = z.object({
  tips: z.array(wordTipSchema),
});

export type TokenUsage = z.infer<typeof tokenUsageSchema>;
export type PracticeSentence = z.infer<typeof practiceSentenceSchema>;
export type WordScore = z.infer<typeof wordScoreSchema>;
export type PronunciationResult = z.infer<typeof pronunciationResultSchema>;
export type TranscriptionResult = z.infer<typeof transcriptionResultSchema>;
export type WordTip = z.infer<typeof wordTipSchema>;
export type PronunciationTipsResult = z.infer<typeof pronunciationTipsResultSchema>;
