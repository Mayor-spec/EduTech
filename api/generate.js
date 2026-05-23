import { GoogleGenAI } from "@google/genai";

// Vercel securely pulls your key from its dashboard settings, keeping it off GitHub!
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const studySchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    mnemonic: { type: "string" },
    quiz: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          correctAnswer: { type: "string" },
          explanation: { type: "string" }
        },
        required: ["question", "options", "correctAnswer", "explanation"]
      }
    }
  },
  required: ["summary", "mnemonic", "quiz"]
};

export default async function handler(req, res) {
  // Handle cross-origin browser access headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { notes } = req.body;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      config: {
        responseMimeType: "application/json",
        responseSchema: studySchema,
      },
      contents: `You are an expert academic tutor. Analyze these study notes. Provide a clean, bulleted summary, one smart mnemonic device to remember the main topic, and exactly 3 multiple choice questions based on it: ${notes}`,
    });

    return res.status(200).json(JSON.parse(response.text));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

