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

  try {
    // 1. Manually parse incoming body string if Vercel passes it unparsed
    let body = req.body;
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }
    
    const { notes } = body;
    if (!notes) {
      return res.status(400).json({ error: "No notes provided" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "API key configuration missing on Vercel server." });
    }

    // 2. Structural Prompt definition to force Gemini to return strict JSON formatting
    const promptText = `You are an expert academic tutor. Analyze these study notes. Provide a clean, bulleted summary, one smart mnemonic device to remember the main topic, and exactly 3 multiple choice questions based on it.
    
    Notes: ${notes}
    
    You MUST respond with a raw JSON object matching this exact structure:
    {
      "summary": "Your bulleted study summary text here",
      "mnemonic": "Your memory device trick text here",
      "quiz": [
        {
          "question": "Question 1 text?",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": "The exact matching text of the correct option",
          "explanation": "Brief explanation why this option is correct"
        }
      ]
    }`;

    // 3. Direct Fetch communication to Google's live gateway endpoint
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    const resultData = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json({ error: resultData.error?.message || "Gemini processing failed" });
    }

    // 4. Extract generated text and pass it straight back to your frontend app.js
    const aiResponseText = resultData.candidates[0].content.parts[0].text;
    return res.status(200).json(JSON.parse(aiResponseText.trim()));

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
    You MUST respond with a raw JSON object matching this exact structure:
    {
      "summary": "Your bulleted study summary text here",
      "mnemonic": "Your memory device trick text here",
      "quiz": [
        {
          "question": "Question 1 text?",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": "The exact matching text of the correct option",
          "explanation": "Brief explanation why this option is correct"
        }
      ]
    }`;

    // 3. Native Fetch directly to Google's secure live gateway endpoint
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    const resultData = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json({ error: resultData.error?.message || "Gemini processing failed" });
    }

    // 4. Extract text response and safely pass it back to our purple UI container dashboard
    const aiResponseText = resultData.candidates[0].content.parts[0].text;
    return res.status(200).json(JSON.parse(aiResponseText.trim()));

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
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

