# ⚡ EduBridge AI — Interactive High-Yield Study Dashboard

An innovative, light-themed micro-learning workspace engineered to transform dense lecture materials into high-yield, interactive study sprints. Built as a functional serverless web application, EduBridge AI leverages advanced generative AI to power active recall and spaced repetition loops instantly from any mobile or desktop browser.

## 🏆 GDGOC CareerFest '26 Innovation Challenge
This project was developed for the **GDGOC University of Ilorin Talent and Innovation Challenge** (May 20th–25th, 2026).

* **SDG Target:** **Goal 4: Quality Education** — Aiming to ensure inclusive and equitable quality education by providing students with accessible, intelligent, and optimized self-assessment tools.
* **Core Google Technology Stack:** Google Gemini API & Firebase Firestore.
* **Developed By:** Smart Markup

---

## ✨ Key Features

* **📦 Client-Side Document Parsing:** Extract text directly from local user storage files including **PDFs, Word Documents (.docx), and PowerPoint Slides (.pptx)** seamlessly using lightweight web dependencies (`pdfjs`, `mammoth`, `jszip`).
* **⚡ 3D Interactive Flashcards:** Dense notes are dynamically tokenized into a variable-volume deck of flip-capable concept cards featuring foundational definitions on the front and high-yield operational insights on the back.
* **🧠 Custom Memory Acronyms:** Generates structured, vertical keyword mnemonics locked to a strict inline formula model (`LETTER = Concept`) without broken strings or split-word errors.
* **📝 Dynamic Assessment Center:** Generates custom-length multiple-choice evaluation metrics (3, 5, or 10 questions) based strictly on the uploaded text with standalone styling.
* **💡 Real-Time Recall Feedback:** Incorrect quiz entries instantly trigger a subtle red state indicator while automatically mapping a dashed emerald border around the verified correct response option container.
* **📊 Firestore Synchronization:** Test performance outcomes, historical score parameters, and metric percentages are automatically pushed to a live Firebase backend database.

---

## 🛠️ Architecture & Tech Stack

* **Frontend Design Layer:** Vanilla HTML5, Modern CSS3 Bento Grid Design, Responsive Pastel Light-Mode System Palette.
* **Application Execution Logic:** Vanilla JavaScript (ES6 Modules).
* **Intelligence Layer Engine:** Google Gemini API (`gemini-2.5-flash`) via structured JSON schema instructions.
* **Database Infrastructure Backend:** Google Firebase (App Initializer Modules & Firestore Realtime Database Collections).

---

## 🚀 Getting Started

### Prerequisites
To run this project locally, you will need a valid Google Gemini API Key. You can generate a free access token directly through the [Google AI Studio Console](https://aistudio.google.com/).

### Installation

1. Clone the repository to your desktop machine:
   ```bash
   git clone [https://github.com/BabatundeMoses/edu-tech-amber.git](https://github.com/BabatundeMoses/edu-tech-amber.git)
