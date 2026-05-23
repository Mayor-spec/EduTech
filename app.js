import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==========================================================================
// 1. FIREBASE CONFIGURATION
// ==========================================================================
const firebaseConfig = {
  apiKey: "AIzaSyCUkF92Vre4Z5ENVVT8LHKHkUo55FFV0Rs",
  authDomain: "edubridge-ai-77e13.firebaseapp.com",
  projectId: "edubridge-ai-77e13",
  storageBucket: "edubridge-ai-77e13.firebasestorage.app",
  messagingSenderId: "816242668122",
  appId: "1:816242668122:web:a4bf39f0852daa16e4de63",
  measurementId: "G-CPLH6K0XF5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==========================================================================
// 2. DIRECT GEMINI BROWSER CONNECTION
// ==========================================================================
// 👇 Paste your live "AIzaSy..." key from Google AI Studio right between the quotes:
const GEMINI_API_KEY = "AIzaSyCM7k4HIXGAKFqKBY5gCJemugsDCV8lJBk";

document.getElementById('generate-btn').addEventListener('click', async () => {
  const notesText = document.getElementById('notes-input').value;
  if (!notesText) return alert("Please paste some study materials first!");

  document.getElementById('generate-btn').innerText = "Analyzing with Google Gemini...";
  document.getElementById('generate-btn').disabled = true;

  try {
    const promptText = `You are an expert academic tutor. Analyze these study notes. Provide a clean, bulleted summary, one smart mnemonic device to remember the main topic, and exactly 3 multiple choice questions based on it.
    
    Notes: ${notesText}
    
    You MUST respond ONLY with a raw JSON object matching this exact structure, do not include markdown blocks like \`\`\`json:
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

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }]
      })
    });

    const resultData = await response.json();
    
    if (!response.ok) {
      throw new Error(resultData.error?.message || "Google API Connection Refused");
    }

    let aiResponseText = resultData.candidates[0].content.parts[0].text;
    
    if (aiResponseText.includes("```")) {
      aiResponseText = aiResponseText.replace(/```json|```/g, "").trim();
    }
    
    const data = JSON.parse(aiResponseText.trim());

    // Safe formatting handling for summary whether it returns as an array or a string
    let formattedSummary = "";
    if (Array.isArray(data.summary)) {
      formattedSummary = data.summary.map(item => `• ${item}`).join('<br>');
    } else if (typeof data.summary === 'string') {
      formattedSummary = data.summary.replace(/\n/g, '<br>');
    } else {
      formattedSummary = JSON.stringify(data.summary);
    }

    // Populate user layout elements safely
    document.getElementById('summary-content').innerHTML = formattedSummary;
    document.getElementById('mnemonic-content').innerText = data.mnemonic || "Review notes thoroughly to establish baseline parameters.";

    const quizContainer = document.getElementById('quiz-content');
    quizContainer.innerHTML = ''; 
    
    const quizData = Array.isArray(data.quiz) ? data.quiz : [];
    let totalQuestions = quizData.length;
    let correctAnswersCount = 0;
    let answeredQuestionsCount = 0;

    if (totalQuestions === 0) {
      quizContainer.innerHTML = "<p style='color:var(--text-muted);'>Quiz generation formatting retry suggested.</p>";
    }

    quizData.forEach((q, qIndex) => {
      const qElement = document.createElement('div');
      qElement.className = 'quiz-question';
      qElement.innerHTML = `<p><strong>Q${qIndex + 1}: ${q.question}</strong></p>`;
      
      const optionsContainer = document.createElement('div');
      optionsContainer.className = 'options-container';

      const optionsList = Array.isArray(q.options) ? q.options : [];
      optionsList.forEach(option => {
        const btn = document.createElement('button');
        btn.innerText = option;
        btn.className = 'option-btn';
        
        btn.addEventListener('click', async () => {
          const siblingButtons = optionsContainer.querySelectorAll('.option-btn');
          siblingButtons.forEach(b => b.disabled = true);

          answeredQuestionsCount++;

          if (option === q.correctAnswer) {
            btn.style.backgroundColor = 'var(--accent-success)';
            btn.style.color = '#ffffff';
            btn.style.borderColor = 'var(--accent-success)';
            correctAnswersCount++;
          } else {
            btn.style.backgroundColor = 'var(--accent-error)';
            btn.style.color = '#ffffff';
            btn.style.borderColor = 'var(--accent-error)';
            
            siblingButtons.forEach(b => {
              if (b.innerText === q.correctAnswer) {
                b.style.border = '2px dashed var(--accent-success)';
                b.style.color = 'var(--accent-success)';
              }
            });
          }

          const exp = document.createElement('p');
          exp.className = 'quiz-explanation';
          exp.innerHTML = `<small style="display:block; margin-top:8px; color:var(--text-muted);">💡 <strong>Explanation:</strong> ${q.explanation || 'Verified response outcome.'}</small>`;
          qElement.appendChild(exp);

          if (answeredQuestionsCount === totalQuestions) {
            renderFinalScore(quizContainer, correctAnswersCount, totalQuestions);
            
            try {
              await addDoc(collection(db, "quiz_scores"), {
                score: correctAnswersCount,
                total: totalQuestions,
                percentage: Math.round((correctAnswersCount / totalQuestions) * 100),
                timestamp: serverTimestamp()
              });
            } catch (dbError) {
              console.error("Firestore Error:", dbError);
            }
          }
        });

        optionsContainer.appendChild(btn);
      });
      
      qElement.appendChild(optionsContainer);
      quizContainer.appendChild(qElement);
    });

    document.getElementById('input-section').classList.add('hidden');
    document.getElementById('workspace-section').classList.remove('hidden');

  } catch (error) {
    console.error("Error Details:", error);
    alert("⚠️ Live Error Status: " + error.message);
  } finally {
    document.getElementById('generate-btn').innerText = "Generate Study Sprint";
    document.getElementById('generate-btn').disabled = false;
  }
});

function renderFinalScore(container, score, total) {
  const scoreCard = document.createElement('div');
  scoreCard.style.marginTop = '24px';
  scoreCard.style.padding = '20px';
  scoreCard.style.backgroundColor = '#f0ebff';
  scoreCard.style.borderRadius = '12px';
  scoreCard.style.textAlign = 'center';
  scoreCard.style.border = '1px solid var(--border-color)';
  
  const percentage = Math.round((score / total) * 100);
  scoreCard.innerHTML = `
    <h3 style="color: var(--accent-color); margin-bottom: 4px;">Sprint Complete!</h3>
    <p style="font-size: 1.6rem; font-weight: 800; color: var(--text-main); margin-bottom: 8px;">${score} / ${total} (${percentage}%)</p>
    <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.4;">Metrics synchronized successfully to your Firestore database.</p>
    <button onclick="window.location.reload();" style="margin-top:14px; padding: 10px 20px; background: var(--accent-color); color:white; border:none; border-radius:8px; cursor:pointer; font-weight:600; font-size:0.85rem;">Start New Sprint</button>
  `;
  container.appendChild(scoreCard);
}
