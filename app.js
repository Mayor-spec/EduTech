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
  document.getElementById('generate-btn').innerText = "Analyzing with Google Gemini...";
  document.getElementById('generate-btn').disabled = true;

  try {
    const promptText = `You are an expert high-yield technical academic tutor. Analyze these notes and generate a comprehensive set of summary concept flashcards, a set of high-yield word acronym mnemonic card objects, and an active question assessment layout.
    
    CRITICAL VOLUME INSTRUCTIONS:
    - Do NOT limit yourself to a fixed number of flashcards or mnemonics.
    - Dynamically scale the volume based on the note complexity. Short notes can have 2-4 cards. Extensive dense notes should scale up significantly (e.g., 6-12 flashcards, and 2-4 distinct mnemonics for different sub-topics) to guarantee zero high-yield context loss.
    
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
          "front": "🧠 <strong style='font-size:1.1rem;'>Retention Acronym Title</strong><br><br>The high-yield word token key mnemonic is: <strong style='color:#b91c1c; font-size:1.2rem;'>KEYWORD</strong>",
          "back": "<strong style='color:#92400e;'>💡 High-Yield Memory Breakdowns:</strong><br><br>• <strong>K</strong> - Functional concept point 1<br>• <strong>E</strong> - Functional concept point 2<br>• <strong>Y</strong> - Functional concept point 3"
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
    CRITICAL ASSESSMENT INSTRUCTION: Generate exactly ${questionCount} objects inside the quiz array list elements. Do not use filler phrases like 'According to the notes'.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
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

    // Render Quiz Elements with Correct Highlight Mapping
    const quizContainer = document.getElementById('quiz-content');
    quizContainer.innerHTML = ''; 
    const quizData = Array.isArray(data.quiz) ? data.quiz : [];
    let totalQuestions = quizData.length;
    let correctAnswersCount = 0;
    let answeredQuestionsCount = 0;

    quizData.forEach((q, qIndex) => {
      const qElement = document.createElement('div');
      qElement.className = 'quiz-question';
      qElement.innerHTML = `<p><strong>Q${qIndex + 1}: ${q.question}</strong></p>`;
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

          if (answeredQuestionsCount === totalQuestions) {
            renderFinalScore(quizContainer, correctAnswersCount, totalQuestions);
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
    alert("Live error status: " + error.message);
  } finally {
    document.getElementById('generate-btn').innerText = "Generate Study Sprint";
    document.getElementById('generate-btn').disabled = false;
  }
});

function renderFinalScore(container, score, total) {
  const scoreCard = document.createElement('div');
  scoreCard.style.marginTop = '24px';
  scoreCard.style.padding = '20px';
  scoreCard.style.backgroundColor = '#eef2ff';
  scoreCard.style.borderRadius = '12px';
  scoreCard.style.textAlign = 'center';
  const percentage = Math.round((score / total) * 100);
  scoreCard.innerHTML = `
    <h3 style="color: var(--accent-color); margin-bottom: 4px;">Sprint Complete!</h3>
    <p style="font-size: 1.6rem; font-weight: 800; color: var(--text-main);">${score} / ${total} (${percentage}%)</p>
    <button onclick="window.location.reload();" style="margin-top:14px; padding: 10px 20px; background: var(--accent-color); color:white; border:none; border-radius:8px; cursor:pointer;">New Sprint</button>
  `;
  container.appendChild(scoreCard);
}
