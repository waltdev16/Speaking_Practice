<div align="center">

# 🎤 TOEIC Speaking Practice

### Questions 8–10 | Respond to Questions Using Information Provided

An interactive, browser-based learning experience designed to help English learners practice reading real-world documents, understanding questions, and responding confidently in spoken English.

**25 practice sets · 75 questions · Vocabulary support · Timed practice**

[Explore the practice sets](#getting-started) · [Features](#features) · [Deployment](#deploying-to-github-pages)

</div>

---

## Overview

**TOEIC Speaking Practice** focuses on Questions **8–10**, where learners use information from a provided document to answer spoken questions. The application combines realistic materials, interactive vocabulary, model responses, and timed exercises in a clean, responsive interface.

The project was created by our team for an **educational TOEIC Speaking demonstration**. It is an independent practice resource and is not affiliated with or endorsed by ETS or TOEIC.

## Features

- **25 practice sets:** Work with practical documents such as schedules, flyers, menus, emails, and price lists.
- **Three questions per set:** Practice retrieving details, identifying incorrect assumptions, and combining information into a clear response.
- **Model answers:** Compare your spoken response with a sample answer after attempting a question.
- **Interactive vocabulary:** Select highlighted words to explore their meanings and save useful terms for later review.
- **Text-to-speech:** Listen to supported questions with the browser's speech synthesis capabilities.
- **Timed practice mode:** Rehearse under structured time limits, including 45 seconds to review the document and answer windows of 15, 15, and 30 seconds.
- **Progress tracking:** Keep track of completed sets and saved vocabulary in the browser.
- **Responsive design:** Use the site on desktop, tablet, or mobile devices.
- **No backend required:** The application runs as a static website without installation or account registration.

## How It Works

1. **Choose a document** from the available categories and practice sets.
2. **Review the information** and select highlighted vocabulary if needed.
3. **Answer Questions 8, 9, and 10 aloud**, using only the information provided.
4. **Check a model response** to evaluate accuracy and completeness.
5. **Try timed practice** to simulate the pace of the speaking task.

> **Note:** Speaking responses are practiced aloud. The application does not automatically record, transcribe, or score your pronunciation.

## Tech Stack

| Technology | Purpose |
| --- | --- |
| HTML5 | Semantic page structure and learning content |
| CSS3 | Responsive layout, styling, and animations |
| Vanilla JavaScript | Practice navigation, questions, timers, and interactions |
| Web Speech API | Browser-based text-to-speech |
| localStorage | Local persistence of progress and saved vocabulary |
| GitHub Pages | Optional static site hosting |

No frameworks, build tools, or backend services are required.

## Getting Started

**Option 1 — Open locally**

1. Download or clone this repository.
2. Keep the folder structure intact.
3. Open `index.html` in a modern browser.

**Option 2 — Clone with Git**

```bash
git clone https://github.com/waltdev16/TOEIC-Speaking-Practice.git
cd TOEIC-Speaking-Practice
```

Then open `index.html` in your browser.

> Update the clone URL if your repository uses a different name.

## Project Structure

```text
TOEIC-Speaking-Practice/
├── index.html          # Main page and SEO metadata
├── css/
│   └── styles.css      # Styles, layout, and responsive behavior
├── js/
│   ├── app.js          # Interactions, practice flow, timers, and storage
│   └── data.js         # Practice documents, vocabulary, and model answers
├── assets/
│   ├── favicon.png     # Browser icon
│   └── logo.png        # Application logo
└── README.md           # Project documentation
```

## Deploying to GitHub Pages

1. Upload the project files to the **root** of your GitHub repository. Ensure `index.html` is at the root.
2. Open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select **`main`** and **`/ (root)`**, then save.
5. Once deployment finishes, open the site URL shown in GitHub Pages settings.

For a repository named `TOEIC-Speaking-Practice` under `waltdev16`, the expected project-site format is:

```text
https://waltdev16.github.io/TOEIC-Speaking-Practice/
```

The URL above is illustrative until GitHub Pages is enabled and deployed.

## Browser Compatibility & Notes

- Use a recent version of Chrome, Edge, Firefox, or Safari.
- **Text-to-speech availability and voice quality vary by browser and operating system.**
- **Progress and saved words remain on the same browser/device** through `localStorage`; clearing site data can erase them.
- Some fonts load from Google Fonts and therefore require an internet connection; system font fallbacks are provided.
- This project is designed for educational practice, not official TOEIC assessment or scoring.

## Authors & Contributors

This project was designed and developed by a team of three students as part of an interactive TOEIC Speaking demonstration.

- Aguilar, Adriana
- Mejia, Andrea
- Santos, Walter

### Acknowledgments

Developed as an educational project to support English language learning and demonstrate interactive TOEIC Speaking practice.

**Academic Project — 2026**

---

<div align="center">

**Developed by our team for an educational TOEIC Speaking demonstration.**

</div>
