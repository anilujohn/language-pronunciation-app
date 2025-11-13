import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generatePracticeSentence, analyzePronunciation } from "./gemini";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  // Generate a new practice sentence
  app.post("/api/sentences/generate", async (req, res) => {
    try {
      const { language, model } = req.body;

      if (!language || (language !== "hindi" && language !== "kannada")) {
        return res.status(400).json({ error: "Invalid language. Must be 'hindi' or 'kannada'" });
      }

      // Validate and default the model
      const validModels = ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite"];
      const selectedModel = model && validModels.includes(model) ? model : "gemini-2.5-flash";

      console.log(`📝 Generating sentence - Language: ${language}, Model: ${selectedModel}`);

      const sentence = await generatePracticeSentence(language, selectedModel);
      res.json(sentence);
    } catch (error: any) {
      console.error("Error generating sentence:", error);
      res.status(500).json({ error: "Failed to generate sentence" });
    }
  });

  // Analyze pronunciation from audio recording
  app.post("/api/pronunciation/analyze", upload.single("audio"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      const { referenceText, language, model } = req.body;
      
      if (!referenceText || !language) {
        return res.status(400).json({ error: "Missing referenceText or language" });
      }

      if (language !== "hindi" && language !== "kannada") {
        return res.status(400).json({ error: "Invalid language. Must be 'hindi' or 'kannada'" });
      }

      // Validate and default the model
      const validModels = ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite"];
      const selectedModel = model && validModels.includes(model) ? model : "gemini-2.5-flash";

      console.log(`📥 Received pronunciation analysis request:`);
      console.log(`   Model requested: ${model || 'not specified'}`);
      console.log(`   Model selected: ${selectedModel}`);
      console.log(`   Language: ${language}`);
      console.log(`   Audio file size: ${req.file.buffer.length} bytes`);

      const result = await analyzePronunciation(
        req.file.buffer,
        referenceText,
        language,
        selectedModel
      );

      console.log(`✅ Successfully analyzed pronunciation with ${selectedModel}`);
      res.json(result);
    } catch (error: any) {
      console.error("❌ Error in /api/pronunciation/analyze endpoint:");
      console.error("   Error name:", error.name);
      console.error("   Error message:", error.message);
      
      // Log additional error details if available
      if (error.response) {
        console.error("   API Response:", error.response);
      }
      if (error.code) {
        console.error("   Error code:", error.code);
      }
      
      res.status(500).json({ 
        error: "Failed to analyze pronunciation",
        details: error.message 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
