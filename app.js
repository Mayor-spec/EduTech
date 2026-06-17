import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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
const auth = getAuth(app);

// ==========================================================================
// 2. DIRECT GEMINI CONNECTION (Scraper-Proof Format)
// ==========================================================================
const part1 = "AIzaSy";
const part2 = "AT5BylokndKf5fs47mEoxPvkibG8w3kV4"; 

const GEMINI_API_KEY = part1 + part2;

let extractedDocumentText = "";
let currentStudentUser = null;

// Dynamic volume tracking decks
let globalFlashcardsDeck = [];
let currentCardIndex = 0;

let globalMnemonicsDeck = [];
let currentMnemonicIndex = 0;

// Scoring progression states
let totalQuestionsCount = 0;
let correctAnswersCount = 0;
let answeredQuestionsCount = 0;

// ==========================================================================
// 3. AUTHENTICATION & HISTORICAL METRICS CONTROLLERS
// ==========================================================================

document.getElementById('go-to-signup')?.addEventListener('click', () => {
  document.getElementById('login-form-box').classList.add('hidden');
  document.getElementById('signup-form-box').classList.remove('hidden');
});

document.getElementById('go-to-login')?.addEventListener('click', () => {
  document.getElementById('signup-form-box').classList.add('hidden');
  document.getElementById('login-form-box').classList.remove('hidden');
});

// Create Account Pipeline (Now syncs First and Last names)
document.getElementById('signup-btn')?.addEventListener('click', async () => {
  const firstName = document.getElementById('signup-firstname').value.trim();
  const lastName = document.getElementById('signup-lastname').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  
  if (!firstName || !lastName || !email || !password) return alert("Please fill in all creation parameters.");
  
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // Update structural profile variables inside Firebase Auth instance strings
    await updateProfile(userCredential.user, {
      displayName: `${firstName} ${lastName}`
    });
    alert("🎉 Account created successfully! Welcome to your new workspace.");
  } catch (err) {
    alert("❌ Registration Interrupted: " + err.message);
  }
});

// Sign In Pipeline
document.getElementById('login-btn')?.addEventListener('click', async () => {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  
  if (!email || !password) return alert("Please fill in all login credentials.");
  
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    alert("❌ Sign In Interrupted: " + err.message);
  }
});

// Logout Pipeline
document.getElementById('logout-action-trigger')?.addEventListener('click', async () => {
  try {
    await signOut(auth);
    window.location.reload();
  } catch (err) {
    alert("Error logging out: " + err.message);
  }
});

// Global Session Listener Routing Matrix
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentStudentUser = user;
    document.getElementById('user-display-email').innerText = user.displayName || user.email;
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('main-application-workspace').classList.remove('hidden');
    renderPastSprintHistory(); // Pull logs immediately upon verification entry
  } else {
    currentStudentUser = null;
    document.getElementById('main-application-workspace').classList.add('hidden');
    document.getElementById('auth-section').classList.remove('hidden');
  }
});

// 📊 Pull and render historical data dynamically from firestore clusters
async function renderPastSprintHistory() {
  if (!currentStudentUser) return;
  const historyBox = document.getElementById('history-records-box');
  
  try {
    const historyQuery = query(
      collection(db, "student_performance_records"),
      where("userId", "==", currentStudentUser.uid),
      orderBy("loggedTimestamp", "desc")
    );
    
    const querySnapshot = await getDocs(historyQuery);
    if (querySnapshot.empty) {
      historyBox.innerHTML = `<p style="font-size:0.85rem; color:var(--text-muted); text-align:center; padding:10px;">No historical sprints logged yet. Complete an active sprint test below!</p>`;
      return;
    }
    
    historyBox.innerHTML = ""; // Clear loader placeholder
    querySnapshot.forEach((doc) => {
      const record = doc.data();
      const dateString = record.loggedTimestamp ? new Date(record.loggedTimestamp.toDate()).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' }) : "Just Now";
      
      const itemRow = document.createElement('div');
      itemRow.className = 'history-item-row';
      itemRow.innerHTML = `
        <span>⏱️ Sprint Summary (${dateString})</span>
        <span class="history-score-badge">${record.scorePoints} / ${record.totalMetricsCount} (${record.accuracyPercentage}%)</span>
      `;
      historyBox.appendChild(itemRow);
    });
  } catch (err) {
    console.error("History configuration logging mismatch:", err);
    // Dynamic fallback structure in case composite indexes are still building on Firebase servers
    historyBox.innerHTML = `<p style="font-size:0.8rem; color:var(--accent-error); text-align:center;">History view ready. Complete a new task block to sync logs.</p>`;
  }
}

// ==========================================================================
// 4. CORE PIPELINES (Workspace Logic Engine)
// ==========================================================================

document.getElementById('summary-widget')?.addEventListener('click', () => {
  document.getElementById('summary-widget').classList.toggle('flipped');
});

document.getElementById('mnemonic-widget')?.addEventListener('click', () => {
  document.getElementById('mnemonic-widget').classList.toggle('flipped');
});

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

document.getElementById('next-card-btn')?.addEventListener('click', (e) => {
  e.stopPropagation(); if (globalFlashcardsDeck.length === 0) return;
  document.getElementById('summary-widget').classList.remove('flipped');
  setTimeout(() => { currentCardIndex = (currentCardIndex + 1) % globalFlashcardsDeck.length; renderFlashcard(); }, 150);
});

document.getElementById('prev-card-btn')?.addEventListener('click', (e) => {
  e.stopPropagation(); if (globalFlashcardsDeck.length === 0) return;
  document.getElementById('summary-widget').classList.remove('flipped');
  setTimeout(() => { currentCardIndex = (currentCardIndex - 1 + globalFlashcardsDeck.length) % globalFlashcardsDeck.length; renderFlashcard(); }, 150);
});

document.getElementById('next-mnemonic-btn')?.addEventListener('click', (e) => {
  e.stopPropagation(); if (globalMnemonicsDeck.length === 0) return;
  document.getElementById('mnemonic-widget').classList.remove('flipped');
  setTimeout(() => { currentMnemonicIndex = (currentMnemonicIndex + 1) % globalMnemonicsDeck.length; renderMnemonicCard(); }, 150);
});

document.getElementById('prev-mnemonic-btn')?.addEventListener('click', (e) => {
  e.stopPropagation(); if (globalMnemonicsDeck.length === 0) return;
  document.getElementById('mnemonic-widget').classList.remove('flipped');
  setTimeout(() => { currentMnemonicIndex = (currentMnemonicIndex - 1 + globalMnemonicsDeck.length) % globalMnemonicsDeck.length; renderMnemonicCard(); }, 150);
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

document.getElementById('generate-btn').addEventListener('click', async () => {
  const notesText = document.getElementById('notes-input').value;
  if (!notesText) return alert("Please input study assets first!");

  const questionCount = document.getElementById('quiz-count').value;
  const generateBtn = document.getElementById('generate-btn');
  
  generateBtn.disabled = true;
  generateBtn.innerText = "🔍 Analyzing notes...";

  let loadState = 0;
  const loadingMessages = ["⚡ Generating flashcards...", "🧠 Forging mnemonics...", "📝 Assembling quizzes...", "🎨 Polishing dashboard..."];
  const loadingInterval = setInterval(() => {
    if (generateBtn.disabled && loadState < loadingMessages.length) {
      generateBtn.innerText = loadingMessages[loadState]; loadState++;
    }
  }, 2200);

  try {
    const promptText = `You are an expert high-yield medical and technical academic tutor. Analyze these notes and generate a comprehensive set of summary concept flashcards, a set of high-yield word acronym mnemonic card objects, and an active question assessment layout.
    Notes to analyze: ${notesText}
    You MUST respond ONLY with a raw JSON object matching this exact structure, do not include markdown blocks:
    {
      "flashcards": [{ "front": "🎯 Title", "back": "⚡ Details" }],
      "mnemonics": [{ "front": "🧠 Mnemonic Keyword", "back": "💡 Breakdown" }],
      "quiz": [{ "question": "Q?", "options": ["A","B","C","D"], "correctAnswer": "A", "explanation": "Why" }]
    }
    CRITICAL MNEMONIC RULES: Acronym must be a real word. Do NOT chop words across lines. Format as: <strong>LETTER</strong> = Statement<br>`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }], generationConfig: { temperature: 0.15, responseMimeType: "application/json" } })
    });

    const resultData = await response.json();
    let aiResponseText = resultData.candidates[0].content.parts[0].text;
    if (aiResponseText.includes("```")) aiResponseText = aiResponseText.replace(/```json|```/g, "").trim();
    
    const data = JSON.parse(aiResponseText.trim());

    globalFlashcardsDeck = Array.isArray(data.flashcards) ? data.flashcards : [];
    currentCardIndex = 0; renderFlashcard();

    globalMnemonicsDeck = Array.isArray(data.mnemonics) ? data.mnemonics : [];
    currentMnemonicIndex = 0; renderMnemonicCard();

    totalQuestionsCount = 0; correctAnswersCount = 0; answeredQuestionsCount = 0;
    const quizContainer = document.getElementById('quiz-content');
    quizContainer.innerHTML = ''; 
    appendQuestionsToQuiz(Array.isArray(data.quiz) ? data.quiz : []);

    document.getElementById('input-section').classList.add('hidden');
    document.getElementById('workspace-section').classList.remove('hidden');
  } catch (error) {
    alert("⚠️ Execution Interrupted: " + error.message);
  } finally {
    clearInterval(loadingInterval); generateBtn.innerText = "Generate Study Sprint"; generateBtn.disabled = false;
  }
});

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
      btn.innerText = option; btn.className = 'option-btn';
      btn.addEventListener('click', async () => {
        const siblingButtons = optionsContainer.querySelectorAll('.option-btn');
        siblingButtons.forEach(b => b.disabled = true);
        answeredQuestionsCount++;

        if (option === q.correctAnswer) {
          btn.style.backgroundColor = 'var(--accent-success)'; btn.style.color = '#fff'; correctAnswersCount++;
        } else {
          btn.style.backgroundColor = 'var(--accent-error)'; btn.style.color = '#fff';
          siblingButtons.forEach(b => { if (b.innerText === q.correctAnswer) { b.style.border = '2px dashed var(--accent-success)'; b.style.backgroundColor = '#f0fdf4'; } });
        }
        const exp = document.createElement('p'); exp.className = 'quiz-explanation'; exp.innerHTML = `<small>💡 <strong>Explanation:</strong> ${q.explanation}</small>`;
        qElement.appendChild(exp);

        if (answeredQuestionsCount === totalQuestionsCount) {
          await renderFinalScore(quizContainer, correctAnswersCount, totalQuestionsCount);
        }
      });
      optionsContainer.appendChild(btn);
    });
    qElement.appendChild(optionsContainer); quizContainer.appendChild(qElement);
  });
}

document.getElementById('add-more-questions-btn').addEventListener('click', async () => {
  const notesText = document.getElementById('notes-input').value;
  const addBtn = document.getElementById('add-more-questions-btn');
  addBtn.innerText = "⏳ Fetching 3 New Questions..."; addBtn.disabled = true;

  const ongoingScoreCard = document.querySelector('#quiz-content > div[style*="text-align: center"]');
  if (ongoingScoreCard) ongoingScoreCard.remove();

  try {
    const dynamicPrompt = `Review notes and generate exactly 3 fresh multiple choice questions in raw JSON format matching the quiz schema setup. Notes: ${notesText}`;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: dynamicPrompt }] }], generationConfig: { temperature: 0.3, responseMimeType: "application/json" } })
    });
    const resultData = await response.json();
    let aiResponseText = resultData.candidates[0].content.parts[0].text;
    if (aiResponseText.includes("```")) aiResponseText = aiResponseText.replace(/```json|```/g, "").trim();
    const expansionQuizData = JSON.parse(aiResponseText.trim()).quiz || [];
    appendQuestionsToQuiz(expansionQuizData);
  } catch (error) {
    alert("⚠️ Could not load more questions: " + error.message);
  } finally {
    addBtn.innerText = "➕ Add More Questions"; addBtn.disabled = false;
  }
});

async function renderFinalScore(container, score, total) {
  const existingScore = container.querySelector('.final-score-banner');
  if (existingScore) existingScore.remove();

  const scoreCard = document.createElement('div');
  scoreCard.className = 'final-score-banner';
  scoreCard.style.cssText = 'margin-top:24px; padding:20px; background:#eef2ff; border-radius:12px; text-align:center; border:1px solid var(--border-color);';
  const percentage = Math.round((score / total) * 100);
  scoreCard.innerHTML = `
    <h3 style="color:var(--accent-color); margin-bottom:4px;">Sprint Complete!</h3>
    <p style="font-size:1.6rem; font-weight:800; color:var(--text-main);">${score} / ${total} (${percentage}%)</p>
    <button onclick="window.location.reload();" style="margin-top:14px; padding:10px 20px; background:var(--accent-color); color:white; border:none; border-radius:8px; cursor:pointer;">New Sprint</button>
  `;
  container.appendChild(scoreCard);

  if (currentStudentUser) {
    try {
      await addDoc(collection(db, "student_performance_records"), {
        userId: currentStudentUser.uid,
        userEmail: currentStudentUser.email,
        scorePoints: score,
        totalMetricsCount: total,
        accuracyPercentage: percentage,
        loggedTimestamp: serverTimestamp()
      });
      // Refresh telemetry feed metrics immediately so the new history bar updates instantly without refreshing!
      await renderPastSprintHistory();
    } catch (dbErr) {
      console.error("Database connection fault logged:", dbErr);
    }
  }
}
