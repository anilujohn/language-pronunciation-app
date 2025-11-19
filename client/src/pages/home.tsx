import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import LanguageSelector from "@/components/LanguageSelector";
import SentenceDisplay from "@/components/SentenceDisplay";
import AudioControls from "@/components/AudioControls";
import PronunciationResultsV2 from "@/components/PronunciationResultsV2";
import CostBreakdown from "@/components/CostBreakdown";
import LoadingSpinner from "@/components/LoadingSpinner";
import TokenUsageDisplay from "@/components/TokenUsageDisplay";
import { useToast } from "@/hooks/use-toast";
import type { Language } from "@shared/schema";
import type { TokenUsage } from "@/lib/tokenCost";
import { RefreshCw } from "lucide-react";
import { AudioRecorder } from "@/lib/audioRecorder";
import { SpeechSynthesizer } from "@/lib/speechSynthesis";

interface PracticeSentence {
  originalScript: string;
  transliteration: string;
  tokenUsage?: TokenUsage;
}

// New 2-stage analysis result structure
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

interface StageCost {
  name: string;
  tokenUsage: TokenUsage;
}

interface AnalysisResult {
  transcription: string;
  transcriptionTransliteration: string;
  wordScores: WordScore[];
  overallScore: number;
  tips: WordTip[];
  timing: {
    stage1: number;
    stage2: number;
    stage3: number;
    total: number;
  };
  costBreakdown: {
    stage1: StageCost;
    stage2: StageCost;
    stage3: StageCost;
    total: TokenUsage;
  };
}

export default function Home() {
  const [language, setLanguage] = useState<Language>("hindi");
  const [currentSentence, setCurrentSentence] = useState<PracticeSentence | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingSentence, setIsLoadingSentence] = useState(false);

  // Analysis result (new 2-stage architecture)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const audioRecorder = useRef<AudioRecorder>(new AudioRecorder());
  const speechSynth = useRef<SpeechSynthesizer>(new SpeechSynthesizer());
  const { toast } = useToast();

  // Load initial sentence
  useEffect(() => {
    loadNewSentence();
  }, []);

  const loadNewSentence = async (languageToUse?: Language) => {
    const targetLanguage = languageToUse || language;
    console.log("🔵 USER ACTION: Loading new sentence", { language: targetLanguage });
    setIsLoadingSentence(true);
    setAnalysisResult(null);

    try {
      console.log("📤 Sending request to /api/sentences/generate", { language: targetLanguage });
      const response = await fetch("/api/sentences/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: targetLanguage, model: "gemini-2.5-flash-lite" }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate sentence");
      }

      const sentence = await response.json();
      console.log("✅ Sentence loaded successfully", {
        originalScript: sentence.originalScript?.substring(0, 30) + "...",
        transliteration: sentence.transliteration?.substring(0, 30) + "..."
      });
      setCurrentSentence(sentence);
    } catch (error) {
      console.error("❌ Error loading sentence:", error);
      
      // Provide fallback sentence so UI isn't stuck
      const fallbackSentences = {
        hindi: {
          originalScript: "मैं हर सुबह बाजार जाता हूं और ताजी सब्जियां खरीदता हूं। मुझे फल भी बहुत पसंद हैं।",
          transliteration: "Main har subah bazaar jaata hoon aur taazi sabziyan khareedta hoon. Mujhe phal bhi bahut pasand hain.",
        },
        kannada: {
          originalScript: "ನಾನು ಪ್ರತಿದಿನ ಬೆಳಿಗ್ಗೆ ಮಾರುಕಟ್ಟೆಗೆ ಹೋಗುತ್ತೇನೆ ಮತ್ತು ತಾಜಾ ತರಕಾರಿಗಳನ್ನು ಖರೀದಿಸುತ್ತೇನೆ। ನನಗೆ ಹಣ್ಣುಗಳು ತುಂಬಾ ಇಷ್ಟ.",
          transliteration: "Naanu pratidina beligge maarukattege hoguttene mattu taaja tarakaarigalannu khareedisuttene. Nanage hannugalu tumba ishta.",
        },
      };
      
      setCurrentSentence(fallbackSentences[targetLanguage]);
      
      toast({
        title: "Error",
        description: "Failed to load a new sentence. Showing a default sentence instead. Click 'New Sentence' to try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSentence(false);
    }
  };

  const handleLanguageChange = (newLanguage: Language) => {
    console.log("🔵 USER ACTION: Changed language to", newLanguage);
    setLanguage(newLanguage);
    setCurrentSentence(null);
    setAnalysisResult(null);
    // Load new sentence with the new language immediately
    loadNewSentence(newLanguage);
  };

  const handleListen = async () => {
    if (!currentSentence) return;

    console.log("🔵 USER ACTION: Clicked Listen button", { language, text: currentSentence.originalScript });
    setIsPlaying(true);
    try {
      // Check if speech synthesis is supported
      if (!('speechSynthesis' in window)) {
        throw new Error("Text-to-speech is not supported in your browser");
      }

      await speechSynth.current.speak(currentSentence.originalScript, language);
      console.log("✅ Audio playback completed successfully");
    } catch (error: any) {
      console.error("❌ Error playing audio:", error);
      toast({
        title: "Audio Playback Failed",
        description: error.message || "Your browser may not support this language. Try using Chrome or Edge.",
        variant: "destructive",
      });
    } finally {
      setIsPlaying(false);
    }
  };

  const handleRecord = async () => {
    console.log("🔵 USER ACTION: Clicked Record button");
    try {
      await audioRecorder.current.startRecording();
      setIsRecording(true);
      console.log("✅ Recording started successfully");
    } catch (error: any) {
      console.error("❌ Error starting recording:", error);
      toast({
        title: "Microphone Access Required",
        description: error.message || "Please allow microphone access to record your pronunciation.",
        variant: "destructive",
      });
    }
  };

  const handleStopRecording = async () => {
    if (!currentSentence) return;

    console.log("🔵 USER ACTION: Stopped recording", { language, text: currentSentence.originalScript });
    setIsRecording(false);
    setIsProcessing(true);

    try {
      const audioBlob = await audioRecorder.current.stopRecording();
      console.log("📤 Sending audio for 2-stage analysis", {
        audioSize: audioBlob.size,
        language,
      });

      // Prepare form data
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      formData.append("referenceText", currentSentence.originalScript);
      formData.append("transliteration", currentSentence.transliteration);
      formData.append("language", language);

      // Call new v2 endpoint (2-stage analysis)
      const response = await fetch("/api/pronunciation/analyze-v2", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Pronunciation analysis failed");
      }

      const result: AnalysisResult = await response.json();

      console.log("✅ 2-stage analysis successful");
      console.log("Overall score:", result.overallScore);
      console.log("Total time:", result.timing.total, "ms");
      console.log("Total tokens:", result.costBreakdown.total.totalTokens);

      // Set analysis result
      setAnalysisResult(result);

      toast({
        title: "Analysis Complete",
        description: `Your pronunciation scored ${result.overallScore}%`,
      });
    } catch (error: any) {
      console.error("Error analyzing pronunciation:", error);

      toast({
        title: "Error",
        description: "Failed to analyze your pronunciation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNewSentence = () => {
    loadNewSentence();
  };

  const hasResults = analysisResult !== null;

  if (isLoadingSentence || !currentSentence) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner message="Loading practice sentence..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 md:px-12 lg:px-16 py-8">
        <header className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-semibold mb-2" data-testid="text-app-title">
            Pronunciation Coach
          </h1>
          <p className="text-base text-muted-foreground" data-testid="text-app-subtitle">
            Master Hindi and Kannada pronunciation with AI-powered feedback
          </p>
        </header>

        <div className="space-y-6">
          <div className="flex justify-center">
            <LanguageSelector language={language} onLanguageChange={handleLanguageChange} />
          </div>

          {isLoadingSentence ? (
            <div className="py-12">
              <LoadingSpinner message="Loading new sentence..." />
            </div>
          ) : (
            <>
              <SentenceDisplay
                language={language}
                originalScript={currentSentence.originalScript}
                transliteration={currentSentence.transliteration}
              />
              {currentSentence.tokenUsage && (
                <div className="flex justify-center">
                  <div className="w-full max-w-md">
                    <TokenUsageDisplay
                      tokenUsage={currentSentence.tokenUsage}
                      model="gemini-2.5-flash-lite"
                      label="Sentence Generation Cost"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          <AudioControls
            isPlaying={isPlaying}
            isRecording={isRecording}
            onListen={handleListen}
            onRecord={handleRecord}
            onStopRecording={handleStopRecording}
            disabled={isProcessing || isLoadingSentence}
          />

          <div className="flex justify-center">
            <Button
              size="lg"
              variant="outline"
              onClick={handleNewSentence}
              disabled={isProcessing || isRecording || isLoadingSentence}
              data-testid="button-new-sentence"
            >
              <RefreshCw className="mr-2 h-5 w-5" />
              New Sentence
            </Button>
          </div>

          {isProcessing && <LoadingSpinner message="Analyzing your pronunciation..." />}

          {hasResults && !isProcessing && analysisResult && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-center">Pronunciation Analysis Results</h2>

              {/* Two-column layout: Results + Cost Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Results (takes 2 columns on large screens) */}
                <div className="lg:col-span-2">
                  <PronunciationResultsV2
                    wordScores={analysisResult.wordScores}
                    transcription={analysisResult.transcription}
                    transcriptionTransliteration={analysisResult.transcriptionTransliteration}
                    overallScore={analysisResult.overallScore}
                    tips={analysisResult.tips}
                    language={language}
                  />
                </div>

                {/* Cost Breakdown (takes 1 column) */}
                <div>
                  <CostBreakdown
                    costBreakdown={analysisResult.costBreakdown}
                    timing={analysisResult.timing}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
