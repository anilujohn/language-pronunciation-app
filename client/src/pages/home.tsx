import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import LanguageSelector from "@/components/LanguageSelector";
import SentenceDisplay from "@/components/SentenceDisplay";
import AudioControls from "@/components/AudioControls";
import PronunciationResults from "@/components/PronunciationResults";
import FeedbackSection from "@/components/FeedbackSection";
import LoadingSpinner from "@/components/LoadingSpinner";
import ModelSelector from "@/components/ModelSelector";
import { useToast } from "@/hooks/use-toast";
import type { Language, WordScore, AIModel } from "@shared/schema";
import { RefreshCw } from "lucide-react";
import { AudioRecorder } from "@/lib/audioRecorder";
import { SpeechSynthesizer } from "@/lib/speechSynthesis";

interface PracticeSentence {
  originalScript: string;
  transliteration: string;
}

export default function Home() {
  const [language, setLanguage] = useState<Language>("hindi");
  const [selectedModel, setSelectedModel] = useState<AIModel>("gemini-2.5-flash");
  const [currentSentence, setCurrentSentence] = useState<PracticeSentence | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingSentence, setIsLoadingSentence] = useState(false);
  const [wordScores, setWordScores] = useState<WordScore[]>([]);
  const [simpleTips, setSimpleTips] = useState<string[]>([]);
  const [detailedFeedback, setDetailedFeedback] = useState<string[]>([]);
  
  const audioRecorder = useRef<AudioRecorder>(new AudioRecorder());
  const speechSynth = useRef<SpeechSynthesizer>(new SpeechSynthesizer());
  const { toast } = useToast();

  // Load initial sentence
  useEffect(() => {
    loadNewSentence();
  }, []);

  const loadNewSentence = async (languageToUse?: Language) => {
    const targetLanguage = languageToUse || language;
    setIsLoadingSentence(true);
    setWordScores([]);
    setSimpleTips([]);
    setDetailedFeedback([]);
    
    try {
      const response = await fetch("/api/sentences/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: targetLanguage }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate sentence");
      }

      const sentence = await response.json();
      setCurrentSentence(sentence);
    } catch (error) {
      console.error("Error loading sentence:", error);
      
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
    setLanguage(newLanguage);
    setCurrentSentence(null);
    setWordScores([]);
    setSimpleTips([]);
    setDetailedFeedback([]);
    // Load new sentence with the new language immediately
    loadNewSentence(newLanguage);
  };

  const handleListen = async () => {
    if (!currentSentence) return;
    
    setIsPlaying(true);
    try {
      // Check if speech synthesis is supported
      if (!('speechSynthesis' in window)) {
        throw new Error("Text-to-speech is not supported in your browser");
      }
      
      await speechSynth.current.speak(currentSentence.originalScript, language);
    } catch (error: any) {
      console.error("Error playing audio:", error);
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
    try {
      await audioRecorder.current.startRecording();
      setIsRecording(true);
    } catch (error: any) {
      console.error("Error starting recording:", error);
      toast({
        title: "Microphone Access Required",
        description: error.message || "Please allow microphone access to record your pronunciation.",
        variant: "destructive",
      });
    }
  };

  const handleStopRecording = async () => {
    if (!currentSentence) return;
    
    setIsRecording(false);
    setIsProcessing(true);

    let response: Response | undefined;
    try {
      const audioBlob = await audioRecorder.current.stopRecording();
      
      // Send audio to backend for analysis
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      formData.append("referenceText", currentSentence.originalScript);
      formData.append("language", language);
      formData.append("model", selectedModel);

      response = await fetch("/api/pronunciation/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to analyze pronunciation");
      }

      const result = await response.json();
      setWordScores(result.wordScores || []);
      setSimpleTips(result.simpleTips || []);
      setDetailedFeedback(result.detailedFeedback || []);
      
      toast({
        title: "Analysis Complete",
        description: "Your pronunciation has been analyzed!",
      });
    } catch (error: any) {
      console.error("Error analyzing pronunciation:", error);
      
      // Check if it's a Flash Lite unsupported model error
      const errorMessage = error?.message || String(error);
      let responseData: any = {};
      if (response && !response.ok) {
        responseData = await response.json().catch(() => ({}));
      }
      const isFlashLiteError = selectedModel === "gemini-2.5-flash-lite" && 
        (errorMessage.includes("UNSUPPORTED_MODEL") || 
         errorMessage.includes("not supported") ||
         responseData?.details?.includes("UNSUPPORTED_MODEL"));
      
      toast({
        title: "Error",
        description: isFlashLiteError 
          ? "Flash Lite is not currently available. Please try Flash or Pro model instead."
          : "Failed to analyze your pronunciation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNewSentence = () => {
    loadNewSentence();
  };

  const hasResults = wordScores.length > 0;

  if (isLoadingSentence || !currentSentence) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner message="Loading practice sentence..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
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

          <ModelSelector 
            selectedModel={selectedModel} 
            onModelChange={setSelectedModel}
          />

          {isLoadingSentence ? (
            <div className="py-12">
              <LoadingSpinner message="Loading new sentence..." />
            </div>
          ) : (
            <SentenceDisplay
              language={language}
              originalScript={currentSentence.originalScript}
              transliteration={currentSentence.transliteration}
            />
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

          {hasResults && !isProcessing && (
            <>
              <PronunciationResults wordScores={wordScores} />
              <FeedbackSection simpleTips={simpleTips} detailedFeedback={detailedFeedback} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
