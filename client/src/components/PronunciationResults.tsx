import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { WordScore, Language, AIModel } from "@shared/schema";

interface PronunciationResultsProps {
  wordScores: WordScore[];
  language: Language;
  model: AIModel;
}

function getScoreColor(score: number): string {
  if (score >= 90) return "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30";
  if (score >= 70) return "bg-green-500/15 text-green-600 dark:text-green-500 border-green-500/25";
  if (score >= 50) return "bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30";
  return "bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30";
}

export default function PronunciationResults({ wordScores, language, model }: PronunciationResultsProps) {
  if (wordScores.length === 0) return null;

  const languageDisplay = language === "hindi" ? "Hindi" : "Kannada";
  const modelDisplay = model.replace("gemini-", "Gemini ");

  return (
    <Card className="p-6" data-testid="card-results">
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <span className="text-sm text-muted-foreground">Analysis for:</span>
        <Badge variant="secondary" className="text-sm">
          {languageDisplay}
        </Badge>
        <Badge variant="secondary" className="text-sm">
          {modelDisplay}
        </Badge>
      </div>
      <h3 className="text-lg font-semibold mb-4" data-testid="text-results-title">
        Word Analysis
      </h3>
      <div className="flex flex-wrap gap-3">
        {wordScores.map((wordScore, index) => (
          <div key={index} className="flex flex-col items-center gap-2">
            <Badge 
              variant="outline" 
              className={`px-4 py-2 text-base ${getScoreColor(wordScore.score)}`}
              data-testid={`badge-word-${index}`}
            >
              {wordScore.word}
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
    </Card>
  );
}
