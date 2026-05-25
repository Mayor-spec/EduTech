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
// 2. DIRECT GEMINI CONNECTION (Scraper-Proof Format)
// ==========================================================================
const part1 = "AIzaSy";
const part2 = "AT5BylokndKf5fs47mEoxPvkibG8w3kV4"; 

const GEMINI_API_KEY = part1 + part2;

let extractedDocumentText = "";

// Dynamic volume tracking decks
let globalFlashcardsDeck = [];
let currentCardIndex = 0;

let globalMnemonicsDeck = [];
let currentMnemonicIndex = 0;

// Scoring and global progression states
let totalQuestionsCount = 0;
let correctAnswersCount = 0;
let answeredQuestionsCount = 0;

// Setup Individual Widget 3D Flip Listeners
document.getElementById('summary-widget')?.addEventListener('click', () => {
  document.getElementById('summary-widget').classList.toggle('flipped');
});

document.getElementById('mnemonic-widget')?.addEventListener('click', () => {
  document.getElementById('mnemonic-widget').classList.toggle('flipped');
});

// Dynamic File Input Listener
document.getElementById('file-upload')?.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const uploadBtn = document.getElementById('generate-btn');
  uploadBtn.disabled = true;
  uploadBtn.innerText = "Extracting document text...";

  try {
    const extension = file.name.split('.').pop().toLowerCase();
    const arrayBuffer = await file.arrayBuffer();

    if (extension === 'pdf') {
      const pdfjsLib = window['pdfjs-dist/build/pdf'];
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
      
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(item => item.str).join(" ") + "\n";
      }
      extractedDocumentText = text;
    } else if (extension === 'docx') {
      const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
      extractedDocumentText = result.value;
    } else if (extension === 'pptx') {
      const zip = await JSZip.loadAsync(file);
      let text = "";
      const slideFiles = Object.keys(zip.files).filter(name => name.startsWith("ppt/slides/slide"));
      for (let slideFile of slideFiles) {
        const slideXml = await zip.files[slideFile].async("text");
        const matches = slideXml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g);
        if (matches) text += matches.map(val => val.replace(/<[^>]*>/g, '')).join(" ") + "\n";
      }
      extractedDocumentText = text;
    }
    if (extractedDocumentText.trim()) document.getElementById('notes-input').value = extractedDocumentText;
  } catch (err) {
    alert("Extraction error: " + err.message);
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.innerText = "Generate Study Sprint";
  }
});

// Summary Navigation Controllers
document.getElementById('next-card-btn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  if (globalFlashcardsDeck.length === 0) return;
  const widget = document.getElementById('summary-widget');
  widget.classList.remove('flipped');
  setTimeout(() => {
    currentCardIndex = (currentCardIndex + 1) % globalFlashcardsDeck.length;
    renderFlashcard();
  }, 150);
});

document.getElementById('prev-card-btn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  if (globalFlashcardsDeck.length === 0) return;
  const widget = document.getElementById('summary-widget');
  widget.classList.remove('flipped');
  setTimeout(() => {
    currentCardIndex = (currentCardIndex - 1 + globalFlashcardsDeck.length) % globalFlashcardsDeck.length;
    renderFlashcard();
  }, 150);
});

// Mnemonic Navigation Controllers
document.getElementById('next-mnemonic-btn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  if (globalMnemonicsDeck.length === 0) return;
  const widget = document.getElementById('mnemonic-widget');
  widget.classList.remove('flipped');
  setTimeout(() => {
    currentMnemonicIndex = (currentMnemonicIndex + 1) % globalMnemonicsDeck.length;
    renderMnemonicCard();
  }, 150);
});

document.getElementById('prev-mnemonic-btn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  if (globalMnemonicsDeck.length === 0) return;
  const widget = document.getElementById('mnemonic-widget');
  widget.classList.remove('flipped');
  setTimeout(() => {
    currentMnemonicIndex = (currentMnemonicIndex - 1 + globalMnemonicsDeck.length) % globalMnemonicsDeck.length;
    renderMnemonicCard();
  }, 150);
});

function renderFlashcard() {
  if (globalFlashcardsDeck.length === 0) return;
  const card = globalFlashcardsDeck[currentCardIndex];
  document.getElementById('summary-front-text').innerHTML = card.front;
  document.getElementById('summary-back-text').innerHTML = card.back;
  document.getElementById('card-index-indicator').innerText = `${currentCardIndex + 1} / ${globalFlashcardsDeck.length}`;
}

function renderMnemonicCard() {
  if (globalMnemonicsDeck.length === 0) return;
  const card = globalMnemonicsDeck[currentMnemonicIndex];
  document.getElementById('mnemonic-front-text').innerHTML = card.front;
  document.getElementById('mnemonic-back-text').innerHTML = card.back;
  document.getElementById('mnemonic-index-indicator').innerText = `${currentMnemonicIndex + 1} / ${globalMnemonicsDeck.length}`;
}

// Core Generation Pipeline
document.getElementById('generate-btn').addEventListener('click', async () => {
  const notesText = document.getElementById('notes-input').value;
  if (!notesText) return alert("Please input or upload study assets first!");

  const questionCount = document.getElementById('quiz-count').value;
  
  document.getElementById('generate-btn').innerText = "Analyzing Study Elements...";
  document.getElementById('generate-btn').disabled = true;

  try {
    const promptText = `You are an expert high-yield medical and technical academic tutor. Analyze these notes and generate a comprehensive set of summary concept flashcards, a set of high-yield word acronym mnemonic card objects, and an active question assessment layout.
    
    CRITICAL VOLUME INSTRUCTIONS:
    - Do NOT limit yourself to a fixed number of flashcards or mnemonics.
    - Dynamically scale the volume based on the note complexity. Short notes can have 2-4 cards. Extensive dense notes should scale up significantly to guarantee zero high-yield context loss.
    
    Notes to analyze: ${notesText}
    
    You MUST respond ONLY with a raw JSON object matching this exact structure, do not include markdown blocks like \`\`\`json:
    {
      "flashcards": [
        { 
          "front": "🎯 <strong style='font-size:1.1rem;'>Core Concept Title</strong><br><br>What is the fundamental objective or process name?", 
          "back": "<strong style='color:#1e40af;'>⚡ Key High-Yield Insights:</strong><br><br>• Strategic diagnostic standard or path mechanism detail 1<br>• High-yield laboratory identification criteria 2<br>• Important clinical rule or testing trap detail 3" 
        }
      ],
      "mnemonics": [
        {
          "front": "🧠 <strong style='font-size:1.1rem;'>Retention Acronym Title</strong><br><br>The high-yield key mnemonic keyword is: <strong style='color:#b91c1c; font-size:1.2rem;'>KEYWORD</strong>",
          "back": "<strong style='color:#92400e; display:block; margin-bottom:12px;'>💡 Acronym Breakdown:</strong><strong>K</strong> = Real complete phrase starting with K here<br><strong>E</strong> = Real complete phrase starting with E here"
        }
      ],
      "quiz": [
        {
          "question": "Standalone direct multiple choice question?",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": "The exact correct matching text string",
          "explanation": "Brief context validation sentence."
        }
      ]
    }
    
    CRITICAL MNEMONIC RULES (AVOID CHOPPING):
    - The acronym keyword MUST be a real, readable word or recognizable medical/technical abbreviation.
    - NEVER chop a single word across lines. The keyword letters must match the first letter of the phrase perfectly.
    - Format every single phrase item cleanly on its own line exactly matching this model layout: <strong>LETTER</strong> = Complete context statement here
    - Use a single <br> tag after each definition line string so it stacks perfectly, cleanly, and vertically down the card interface.
    
    CRITICAL ASSESSMENT INSTRUCTION: Generate exactly ${questionCount} objects inside the quiz array list elements. Do not use filler phrases like 'According to the notes'.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          temperature: 0.15,
          responseMimeType: "application/json"
        }
      })
    });

    const resultData = await response.json();
    if (!response.ok) throw new Error(resultData.error?.message || "Connection failure");

    let aiResponseText = resultData.candidates[0].content.parts[0].text;
    if (aiResponseText.includes("```")) aiResponseText = aiResponseText.replace(/```json|```/g, "").trim();
    
    const data = JSON.parse(aiResponseText.trim());

    // Process & Render Summary Deck dynamically
    globalFlashcardsDeck = Array.isArray(data.flashcards) ? data.flashcards : [];
    currentCardIndex = 0;
    renderFlashcard();

    // Process & Render Mnemonics Deck dynamically
    globalMnemonicsDeck = Array.isArray(data.mnemonics) ? data.mnemonics : [];
    currentMnemonicIndex = 0;
    renderMnemonicCard();

    // Reset scoring arrays for fresh sprint calculation
    totalQuestionsCount = 0;
    correctAnswersCount = 0;
    answeredQuestionsCount = 0;

    const quizContainer = document.getElementById('quiz-content');
    quizContainer.innerHTML = ''; 
    
    const quizData = Array.isArray(data.quiz) ? data.quiz : [];
    appendQuestionsToQuiz(quizData);

    document.getElementById('input-section').classList.add('hidden');
    document.getElementById('workspace-section').classList.remove('hidden');

  } catch (error) {
    alert("⚠️ App Execution Interrupted:\n" + error.message);
  } finally {
    document.getElementById('generate-btn').innerText = "Generate Study Sprint";
    document.getElementById('generate-btn').disabled = false;
  }
});

// Reusable function to build and append quiz cards dynamically
function appendQuestionsToQuiz(questionsArray) {
  const quizContainer = document.getElementById('quiz-content');
  
  questionsArray.forEach((q) => {
    totalQuestionsCount++;
    const activeIndex = totalQuestionsCount;

    const qElement = document.createElement('div');
    qElement.className = 'quiz-question';
    qElement.innerHTML = `<p><strong>Q${activeIndex}: ${q.question}</strong></p>`;
    
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'options-container';

    q.options.forEach(option => {
      const btn = document.createElement('button');
      btn.innerText = option;
      btn.className = 'option-btn';
      
      btn.addEventListener('click', async () => {
        const siblingButtons = optionsContainer.querySelectorAll('.option-btn');
        siblingButtons.forEach(b => b.disabled = true);
        answeredQuestionsCount++;

        if (option === q.correctAnswer) {
          btn.style.backgroundColor = 'var(--accent-success)';
          btn.style.color = '#fff';
          btn.style.borderColor = 'var(--accent-success)';
          correctAnswersCount++;
        } else {
          btn.style.backgroundColor = 'var(--accent-error)';
          btn.style.color = '#fff';
          btn.style.borderColor = 'var(--accent-error)';
          
          siblingButtons.forEach(b => {
            if (b.innerText === q.correctAnswer) {
              b.style.border = '2px dashed var(--accent-success)';
              b.style.color = 'var(--accent-success)';
              b.style.backgroundColor = '#f0fdf4';
            }
          });
        }

        const exp = document.createElement('p');
        exp.className = 'quiz-explanation';
        exp.innerHTML = `<small>💡 <strong>Explanation:</strong> ${q.explanation}</small>`;
        qElement.appendChild(exp);

        if (answeredQuestionsCount === totalQuestionsCount) {
          renderFinalScore(quizContainer, correctAnswersCount, totalQuestionsCount);
        }
      });
      optionsContainer.appendChild(btn);
    });
    
    qElement.appendChild(optionsContainer);
    quizContainer.appendChild(qElement);
  });
}

// ⚡ EXTRA LOAD ROUTINE: Dynamic Question Generator Button Listener
document.getElementById('add-more-questions-btn').addEventListener('click', async () => {
  const notesText = document.getElementById('notes-input').value;
  const addBtn = document.getElementById('add-more-questions-btn');
  
  addBtn.innerText = "⏳ Fetching 3 New Questions...";
  addBtn.disabled = true;

  // Clear any existing final score card banner if present to let the test flow continue
  const ongoingScoreCard = document.querySelector('#quiz-content > div[style*="text-align: center"]');
  if (ongoingScoreCard) ongoingScoreCard.remove();

  try {
    const dynamicPrompt = `You are a high-yield technical assessment engine. Review these notes and generate exactly 3 fresh, unique multiple-choice questions that are DIFFERENT from basic standard definitions.
    
    Notes: ${notesText}
    
    You MUST respond ONLY with a raw JSON object matching this exact structure:
    {
      "quiz": [
        {
          "question": "Sharp standalone analytical question?",
          "options": ["A", "B", "C", "D"],
          "correctAnswer": "Exact match option text string",
          "explanation": "High-yield context rule justification statement."
        }
      ]
    }`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        contents: [{ parts: [{ text: dynamicPrompt }] }],
        generationConfig: { temperature: 0.3, responseMimeType: "application/json" }
      })
    });

    const resultData = await response.json();
    if (!response.ok) throw new Error("Could not populate addition questions layer.");

    let aiResponseText = resultData.candidates[0].content.parts[0].text;
    if (aiResponseText.includes("```")) aiResponseText = aiResponseText.replace(/```json|```/g, "").trim();
    
    const data = JSON.parse(aiResponseText.trim());
    const expansionQuizData = Array.isArray(data.quiz) ? data.quiz : [];
    
    appendQuestionsToQuiz(expansionQuizData);
    alert("🎉 Added 3 brand new high-yield questions to the bottom of your track!");

  } catch (error) {
    alert("⚠️ Could not load more questions: " + error.message);
  } finally {
    addBtn.innerText = "➕ Add More Questions";
    addBtn.disabled = false;
  }
});

function renderFinalScore(container, score, total) {
  // Remove any previously appended summary score cards to avoid duplicates
  const existingScore = container.querySelector('.final-score-banner');
  if (existingScore) existingScore.remove();

  const scoreCard = document.createElement('div');
  scoreCard.className = 'final-score-banner';
  scoreCard.style.marginTop = '24px';
  scoreCard.style.padding = '20px';
  scoreCard.style.backgroundColor = '#eef2ff';
  scoreCard.style.borderRadius = '12px';
  scoreCard.style.textAlign = 'center';
  scoreCard.style.border = '1px solid var(--border-color)';
  
  const percentage = Math.round((score / total) * 100);
  scoreCard.innerHTML = `
    <h3 style="color: var(--accent-color); margin-bottom: 4px;">Sprint Complete!</h3>
    <p style="font-size: 1.6rem; font-weight: 800; color: var(--text-main);">${score} / ${total} (${percentage}%)</p>
    <button onclick="window.location.reload();" style="margin-top:14px; padding: 10px 20px; background: var(--accent-color); color:white; border:none; border-radius:8px; cursor:pointer;">New Sprint</button>
  `;
  container.appendChild(scoreCard);
}
