import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Language } from "@shared/schema";

interface WordScore {
  word: string;
  transliteration: string;
  transcribedWord: string;
  score: number;
}

interface WordTip {
  word: string;
  transliteration: string;
  tip: string;
}

interface PronunciationResultsV2Props {
  wordScores: WordScore[];
  transcription: string;
  transcriptionTransliteration: string;
  overallScore: number;
  tips: WordTip[];
  language: Language;
}

function getScoreColor(score: number): string {
  if (score >= 90) return "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30";
  if (score >= 70) return "bg-green-500/15 text-green-600 dark:text-green-500 border-green-500/25";
  if (score >= 50) return "bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30";
  return "bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30";
}

function getOverallScoreColor(score: number): string {
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
  if (score >= 40) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
}

export default function PronunciationResultsV2({
  wordScores,
  transcription,
  transcriptionTransliteration,
  overallScore,
  tips,
  language
}: PronunciationResultsV2Props) {
  if (wordScores.length === 0) return null;

  const languageDisplay = language === "hindi" ? "Hindi" : "Kannada";

  // Separate regular words, missing words, and extra words
  const regularWords = wordScores.filter(ws => ws.word !== "(extra)" && ws.transcribedWord !== "(missing)");
  const missingWords = wordScores.filter(ws => ws.transcribedWord === "(missing)");
  const extraWords = wordScores.filter(ws => ws.word === "(extra)");

  return (
    <Card className="p-6" data-testid="card-results-v2">
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <span className="text-sm text-muted-foreground">Analysis for:</span>
        <Badge variant="secondary" className="text-sm">
          {languageDisplay}
        </Badge>
        <Badge variant="secondary" className="text-sm">
          Levenshtein + Flash-Lite
        </Badge>
      </div>

      {/* Overall Score */}
      <div className="mb-6 text-center">
        <h3 className="text-lg font-semibold mb-2">Overall Score</h3>
        <span className={`text-4xl font-bold ${getOverallScoreColor(overallScore)}`}>
          {overallScore}%
        </span>
      </div>

      {/* What you said */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-muted-foreground mb-2">What you said:</h4>
        <p className="text-base p-3 bg-muted/30 rounded">{transcriptionTransliteration}</p>
        <p className="text-xs text-muted-foreground mt-1 italic">{transcription}</p>
      </div>

      {/* Color-coded word scores */}
      <h3 className="text-lg font-semibold mb-4" data-testid="text-results-title">
        Word-by-Word Scores
      </h3>
      <div className="flex flex-wrap gap-3 mb-4">
        {regularWords.map((wordScore, index) => (
          <div key={index} className="flex flex-col items-center gap-2">
            <Badge
              variant="outline"
              className={`px-4 py-2 text-base ${getScoreColor(wordScore.score)}`}
              data-testid={`badge-word-${index}`}
              title={`Native script: ${wordScore.word}\nYou said: ${wordScore.transcribedWord}`}
            >
              {wordScore.transliteration}
            </Badge>
            <span
              className="text-sm text-muted-foreground"
              data-testid={`text-score-${index}`}
            >
              {wordScore.score}%
            </span>
          </div>
        ))}
      </div>

      {/* Missing words */}
      {missingWords.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
            Missing Words (not spoken):
          </h4>
          <div className="flex flex-wrap gap-2">
            {missingWords.map((ws, index) => (
              <Badge
                key={index}
                variant="outline"
                className="px-3 py-1 text-sm bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30"
              >
                {ws.transliteration}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Extra words */}
      {extraWords.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-yellow-600 dark:text-yellow-400 mb-2">
            Extra Words (not in reference):
          </h4>
          <div className="flex flex-wrap gap-2">
            {extraWords.map((ws, index) => (
              <Badge
                key={index}
                variant="outline"
                className="px-3 py-1 text-sm bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30"
              >
                {ws.transcribedWord}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Tips for improvement */}
      {tips && tips.length > 0 && (
        <div className="mt-6 pt-4 border-t">
          <h4 className="text-sm font-semibold mb-3">Tips to Improve:</h4>
          <ul className="space-y-3">
            {tips.map((tip, index) => (
              <li key={index} className="text-sm">
                <span className="font-medium text-primary">{tip.transliteration}:</span>
                <span className="text-muted-foreground ml-2">{tip.tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* No tips message when all words are good */}
      {(!tips || tips.length === 0) && (
        <div className="mt-6 pt-4 border-t">
          <p className="text-sm text-green-600 dark:text-green-400">
            Great job! All words pronounced well (70%+ accuracy).
          </p>
        </div>
      )}
    </Card>
  );
}
