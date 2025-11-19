import type { AIModel } from "@shared/schema";

// Gemini API Pricing (as of latest pricing from https://ai.google.dev/gemini-api/docs/pricing)
// Prices are per 1 million tokens (Paid Tier)
const PRICING = {
  "gemini-2.5-pro": {
    textInput: 1.25, // $ per 1M tokens (prompts <= 200k tokens)
    audioInput: 1.25, // $ per 1M tokens (no separate audio pricing listed, using text rate)
    output: 10.00, // $ per 1M tokens (prompts <= 200k tokens)
  },
  "gemini-2.5-flash": {
    textInput: 0.30, // $ per 1M tokens (text/image/video)
    audioInput: 1.00, // $ per 1M tokens (audio)
    output: 2.50, // $ per 1M tokens
  },
  "gemini-2.5-flash-lite": {
    textInput: 0.10, // $ per 1M tokens (text/image/video)
    audioInput: 0.30, // $ per 1M tokens (audio)
    output: 0.40, // $ per 1M tokens
  },
} as const;

export interface TokenUsage {
  textInputTokens: number;
  audioInputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface TokenCost {
  textInputCost: number;
  audioInputCost: number;
  outputCost: number;
  totalCost: number;
}

export function calculateTokenCost(
  tokenUsage: TokenUsage,
  model: AIModel
): TokenCost {
  const pricing = PRICING[model];

  // Convert tokens to cost (pricing is per 1M tokens)
  const textInputCost = (tokenUsage.textInputTokens / 1_000_000) * pricing.textInput;
  const audioInputCost = (tokenUsage.audioInputTokens / 1_000_000) * pricing.audioInput;
  const outputCost = (tokenUsage.outputTokens / 1_000_000) * pricing.output;
  const totalCost = textInputCost + audioInputCost + outputCost;

  return {
    textInputCost,
    audioInputCost,
    outputCost,
    totalCost,
  };
}

export function formatCost(cost: number): string {
  // Always show in dollars with appropriate precision
  if (cost < 0.000001) {
    return `$${cost.toFixed(8)}`; // Very tiny amounts (< $0.000001)
  } else if (cost < 0.01) {
    return `$${cost.toFixed(6)}`; // Small amounts (< $0.01)
  } else {
    return `$${cost.toFixed(4)}`; // Regular amounts
  }
}

// Exchange rate: 1 USD = 100 INR
const USD_TO_INR = 100;

export function formatCostWithRupees(cost: number): string {
  const rupees = cost * USD_TO_INR;
  const usdFormatted = formatCost(cost);

  // Format rupees with appropriate precision
  let rupeesFormatted: string;
  if (rupees < 0.00001) {
    rupeesFormatted = `₹${rupees.toFixed(6)}`;
  } else if (rupees < 1) {
    rupeesFormatted = `₹${rupees.toFixed(4)}`;
  } else {
    rupeesFormatted = `₹${rupees.toFixed(2)}`;
  }

  return `${usdFormatted} (${rupeesFormatted})`;
}

export function getPricePerMillionTokens(model: AIModel, tokenType: 'textInput' | 'audioInput' | 'output'): number {
  return PRICING[model][tokenType];
}
