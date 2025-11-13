import { Card } from "@/components/ui/card";
import type { Language } from "@shared/schema";

interface SentenceDisplayProps {
  language: Language;
  originalScript: string;
  transliteration: string;
}

export default function SentenceDisplay({ 
  language, 
  originalScript, 
  transliteration 
}: SentenceDisplayProps) {
  const fontFamily = language === "hindi" 
    ? "'Noto Sans Devanagari', sans-serif" 
    : "'Noto Sans Kannada', sans-serif";

  return (
    <Card className="p-8" data-testid="card-sentence">
      <div className="space-y-4">
        <div 
          className="text-3xl md:text-4xl font-semibold text-foreground leading-relaxed"
          style={{ fontFamily }}
          data-testid="text-original-script"
        >
          {originalScript}
        </div>
        <div 
          className="text-xl text-muted-foreground"
          data-testid="text-transliteration"
        >
          {transliteration}
        </div>
      </div>
    </Card>
  );
}
