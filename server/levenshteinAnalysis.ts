import levenshtein from "fast-levenshtein";

// Normalize text for comparison (remove punctuation, lowercase, normalize whitespace, normalize Unicode)
function normalizeText(text: string): string {
  return text
    .normalize('NFC') // Normalize Unicode to composed form (fixes ज़ vs ज + ़ issues)
    .toLowerCase()
    .replace(/[।,\.!?;:\-]/g, " ") // Remove common punctuation
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

// Split text into words for both Hindi/Kannada and English
function splitIntoWords(text: string): string[] {
  return normalizeText(text)
    .split(/\s+/)
    .filter(word => word.length > 0);
}

// Calculate word-level similarity score based on character-level Levenshtein distance
function calculateWordSimilarity(word1: string, word2: string): number {
  const distance = levenshtein.get(word1, word2);
  const maxLength = Math.max(word1.length, word2.length);

  if (maxLength === 0) return 100;

  // Convert distance to a similarity score (0-100)
  const similarity = Math.max(0, (1 - distance / maxLength) * 100);
  return Math.round(similarity);
}

// Minimum similarity threshold - matches below this are considered "missing/extra"
// If best match is below 30%, the words are too different to be considered a valid match
const MIN_SIMILARITY_THRESHOLD = 30;

// Greedy Best-Match algorithm for word alignment
// This matches each reference word to its best available spoken word (regardless of position)
// Handles word reordering correctly by finding globally optimal matches
function alignWords(
  referenceWords: string[],
  spokenWords: string[]
): Array<{ refWord: string; spokenWord: string; similarity: number }> {
  const m = referenceWords.length;
  const n = spokenWords.length;

  // Edge case: if either is empty
  if (m === 0 && n === 0) return [];
  if (m === 0) {
    return spokenWords.map(w => ({ refWord: "(extra)", spokenWord: w, similarity: 0 }));
  }
  if (n === 0) {
    return referenceWords.map(w => ({ refWord: w, spokenWord: "(missing)", similarity: 0 }));
  }

  // Step 1: Build similarity matrix for all pairs
  const similarityMatrix: number[][] = [];
  for (let i = 0; i < m; i++) {
    similarityMatrix[i] = [];
    for (let j = 0; j < n; j++) {
      similarityMatrix[i][j] = calculateWordSimilarity(referenceWords[i], spokenWords[j]);
    }
  }

  // Step 2: Greedy matching - find best matches iteratively
  const matchedRef = new Set<number>();
  const matchedSpoken = new Set<number>();
  const matches: Array<{ refIdx: number; spokenIdx: number; similarity: number }> = [];

  // Find all potential matches and sort by similarity (highest first)
  const allPairs: Array<{ refIdx: number; spokenIdx: number; similarity: number }> = [];
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      allPairs.push({
        refIdx: i,
        spokenIdx: j,
        similarity: similarityMatrix[i][j]
      });
    }
  }

  // Sort by similarity descending
  allPairs.sort((a, b) => b.similarity - a.similarity);

  // Greedily select best matches, but only if similarity meets threshold
  for (const pair of allPairs) {
    if (!matchedRef.has(pair.refIdx) && !matchedSpoken.has(pair.spokenIdx)) {
      // Only accept matches above the minimum threshold
      if (pair.similarity >= MIN_SIMILARITY_THRESHOLD) {
        matches.push(pair);
        matchedRef.add(pair.refIdx);
        matchedSpoken.add(pair.spokenIdx);
      }
    }
  }

  // Step 3: Build final alignment in reference word order
  const alignment: Array<{ refWord: string; spokenWord: string; similarity: number }> = [];

  // First, add all reference words (matched or missing)
  for (let i = 0; i < m; i++) {
    const match = matches.find(m => m.refIdx === i);
    if (match) {
      alignment.push({
        refWord: referenceWords[i],
        spokenWord: spokenWords[match.spokenIdx],
        similarity: match.similarity
      });
    } else {
      alignment.push({
        refWord: referenceWords[i],
        spokenWord: "(missing)",
        similarity: 0
      });
    }
  }

  // Then, add extra spoken words (not matched to any reference)
  for (let j = 0; j < n; j++) {
    if (!matchedSpoken.has(j)) {
      alignment.push({
        refWord: "(extra)",
        spokenWord: spokenWords[j],
        similarity: 0
      });
    }
  }

  return alignment;
}

// Calculate Levenshtein scores from transcription (no API call, local computation only)
export function calculateLevenshteinScores(
  transcription: string,
  referenceText: string
): {
  transcription: string;
  wordScores: Array<{ word: string; transcribedWord: string; score: number }>;
  overallScore: number;
  method: string;
} {
  console.log(`📊 Calculating Levenshtein scores with sequence alignment (local computation)`);
  console.log(`📝 Reference: "${referenceText}"`);
  console.log(`📝 Transcription: "${transcription}"`);

  // Split both texts into words
  const referenceWords = splitIntoWords(referenceText);
  const transcribedWords = splitIntoWords(transcription);

  console.log(`📝 Reference words (${referenceWords.length}):`, referenceWords);
  console.log(`📝 Transcribed words (${transcribedWords.length}):`, transcribedWords);

  // Use sequence alignment to find optimal word-to-word mapping
  const alignment = alignWords(referenceWords, transcribedWords);

  console.log(`🔗 Alignment found (${alignment.length} pairs):`);
  alignment.forEach((a, i) => {
    console.log(`   ${i + 1}. "${a.refWord}" ↔ "${a.spokenWord}" (${a.similarity}%)`);
  });

  // Convert alignment to word scores
  const wordScores = alignment.map(a => ({
    word: a.refWord,
    transcribedWord: a.spokenWord,
    score: a.similarity
  }));

  // Calculate overall score
  const totalScore = wordScores.reduce((sum, ws) => sum + ws.score, 0);
  const overallScore = wordScores.length > 0
    ? Math.round(totalScore / wordScores.length)
    : 0;

  console.log(`✅ Levenshtein calculation complete`);
  console.log(`📊 Overall score: ${overallScore}%`);

  return {
    transcription,
    wordScores,
    overallScore,
    method: "Sequence Alignment (Levenshtein)"
  };
}
