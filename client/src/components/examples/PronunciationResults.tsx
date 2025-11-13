import PronunciationResults from '../PronunciationResults';

export default function PronunciationResultsExample() {
  const mockWordScores = [
    { word: "नमस्ते", transliteration: "Namaste", score: 95 },
    { word: "आप", transliteration: "aap", score: 88 },
    { word: "कैसे", transliteration: "kaise", score: 72 },
    { word: "हैं", transliteration: "hain", score: 45 },
  ];

  return <PronunciationResults wordScores={mockWordScores} />;
}
