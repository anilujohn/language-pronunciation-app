export class SpeechSynthesizer {
  private synth: SpeechSynthesis;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    this.synth = window.speechSynthesis;
  }

  private getVoicesForLanguage(langCode: string): SpeechSynthesisVoice[] {
    const voices = this.synth.getVoices();
    return voices.filter(voice => voice.lang.startsWith(langCode));
  }

  private async ensureVoicesLoaded(): Promise<void> {
    return new Promise((resolve) => {
      const voices = this.synth.getVoices();
      if (voices.length > 0) {
        resolve();
        return;
      }

      // Some browsers load voices asynchronously
      this.synth.onvoiceschanged = () => {
        resolve();
      };

      // Fallback timeout
      setTimeout(resolve, 1000);
    });
  }

  async speak(text: string, language: "hindi" | "kannada"): Promise<void> {
    return new Promise(async (resolve, reject) => {
      // Cancel any ongoing speech
      this.synth.cancel();

      // Wait for voices to load
      await this.ensureVoicesLoaded();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set language code for proper pronunciation
      const langCode = language === "hindi" ? "hi-IN" : "kn-IN";
      utterance.lang = langCode;
      
      // Try to find a voice for this language
      const availableVoices = this.getVoicesForLanguage(langCode.split('-')[0]); // Try 'hi' or 'kn'
      
      if (availableVoices.length === 0) {
        // No voice available for this language
        console.error(`No ${language} voice found. Available voices:`, this.synth.getVoices().map(v => v.lang));
        reject(new Error(`Your browser doesn't have a ${language === "hindi" ? "Hindi" : "Kannada"} voice installed. Please try using Chrome on Android or Windows, which has better language support.`));
        return;
      }

      // Use the first available voice for this language
      utterance.voice = availableVoices[0];
      utterance.rate = 0.85; // Slightly slower for learning
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      console.log(`Using voice: ${utterance.voice.name} (${utterance.voice.lang}) for ${language}`);

      utterance.onend = () => {
        this.currentUtterance = null;
        resolve();
      };

      utterance.onerror = (event) => {
        this.currentUtterance = null;
        console.error('Speech synthesis error:', event);
        reject(new Error(`Failed to play audio: ${event.error}`));
      };

      this.currentUtterance = utterance;
      this.synth.speak(utterance);
    });
  }

  stop(): void {
    this.synth.cancel();
    this.currentUtterance = null;
  }

  isSpeaking(): boolean {
    return this.synth.speaking;
  }
}
