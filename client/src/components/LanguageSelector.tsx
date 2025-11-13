import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Language } from "@shared/schema";

interface LanguageSelectorProps {
  language: Language;
  onLanguageChange: (language: Language) => void;
}

export default function LanguageSelector({ language, onLanguageChange }: LanguageSelectorProps) {
  return (
    <Tabs value={language} onValueChange={(value) => onLanguageChange(value as Language)}>
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="hindi" data-testid="tab-hindi">
          Hindi
        </TabsTrigger>
        <TabsTrigger value="kannada" data-testid="tab-kannada">
          Kannada
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
