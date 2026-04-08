import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.post("/api/ai-check", async (req, res) => {
    try {
      const { rx, diagnosis, age, sex, vitals } = req.body;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(500).json({ error: "API key not configured on server." });
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `You are a medical AI assistant checking a prescription for safety.
Patient Info: Age ${age || 'Unknown'}, Sex ${sex || 'Unknown'}
Vitals: BP ${vitals?.bp || 'N/A'}, HR ${vitals?.hr || 'N/A'}, Temp ${vitals?.temp || 'N/A'}, RR ${vitals?.rr || 'N/A'}
Diagnosis: ${diagnosis || 'None provided'}
Prescription: ${rx || 'None provided'}

Please provide a brief, professional safety check of this prescription. Keep it under 3 sentences. Highlight any obvious contraindications or state if it appears generally within standard ranges.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      res.json({ result: response.text });
    } catch (error) {
      console.error("AI Check Error:", error);
      res.status(500).json({ error: "Failed to perform AI check." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
