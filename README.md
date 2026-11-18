 <div align="center">

# 🎤 TOEIC Speaking Practice

### Questions 8–10 | Respond to Questions Using Information Provided

**An interactive, detective-themed learning platform designed to strengthen English speaking skills through realistic documents, vocabulary exploration, and timed practice.**

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-222222?style=flat-square&logo=github&logoColor=white)
![License](https://img.shields.io/badge/Use-Educational-2B8A6A?style=flat-square)

**25 Practice Sets · 75 Questions · Interactive Vocabulary · Timed Simulations**

[Overview](#overview) · [Features](#key-features) · [Getting Started](#getting-started) · [Deployment](#deployment)

</div>

---

## Overview

**TOEIC Speaking Practice** is a browser-based educational application focused on **Questions 8–10 of the TOEIC Speaking test**, where test takers must respond to questions using information presented in a document.

The platform transforms traditional speaking exercises into an interactive learning experience. Students can explore realistic documents, identify relevant information, review useful vocabulary, and develop clear, accurate spoken responses.

Inspired by a **detective investigation concept**, the application encourages learners to examine details, find evidence, and construct answers based on the information provided.

Developed by a team of three students in 2026, this project serves as an interactive demonstration of how web technologies can support English language learning.

> **Disclaimer:** This is an independent educational project. It is not affiliated with, sponsored by, or endorsed by ETS or the TOEIC program.

## Key Features

### Interactive Speaking Practice

- **25 practice sets:** Explore real-world scenarios involving schedules, announcements, flyers, menus, emails, and pricing information.
- **75 speaking questions:** Practice three questions per set, covering information retrieval, clarification, and synthesis.
- **Model responses:** Review suggested answers to identify important details and improve response structure.
- **Document-based learning:** Develop the ability to locate and interpret information quickly.

### Detective-Inspired Learning

- **Mystery Envelope:** An interactive activity that adds an investigative element to the learning experience.
- **Clue identification:** Encourage careful reading and attention to important details.
- **Self-assessment:** Evaluate responses through interactive practice activities.
- **Engaging interface:** A minimal design inspired by detective investigations.

### Vocabulary & Pronunciation Support

- **Interactive glossary:** Select highlighted words to access vocabulary explanations.
- **Saved vocabulary:** Build a personal collection of useful terms for later review.
- **Text-to-speech:** Listen to supported content using browser speech synthesis.
- **Speech recognition:** Practice spoken responses using supported browsers and devices.
- **Alternative evaluation:** Continue practicing through self-assessment when speech recognition is unavailable.

### Exam Preparation Tools

- **Timed practice:** Train using structured preparation and response intervals.
- **Progress tracking:** Monitor completed exercises locally.
- **Responsive interface:** Compatible with desktop, tablet, and mobile screen sizes.
- **No registration:** Access the learning activities without creating an account.

## Understanding Questions 8–10

This section evaluates the ability to understand information from a provided document and communicate it accurately in spoken English.

| Question | Main Objective | Response Time |
|:---:|---|:---:|
| **8** | Locate and communicate specific information | 15 seconds |
| **9** | Correct or clarify information based on the document | 15 seconds |
| **10** | Combine multiple details into a complete response | 30 seconds |

Students are given **45 seconds to review the document** before responding to the questions.

### Recommended Answering Strategy

1. **Read the question carefully.** Identify exactly what information is being requested.
2. **Locate the evidence.** Look for relevant dates, names, times, locations, prices, or conditions.
3. **Organize the answer.** Prioritize the information required by the question.
4. **Respond clearly.** Use complete, natural sentences without unnecessary details.
5. **Verify accuracy.** Compare the response with the information in the document.

## How It Works

The learning experience follows a simple, structured process:

**01 — Select a Practice Set**

Choose a document from the available practice categories.

**02 — Investigate the Document**

Review the provided information, identify key details, and explore highlighted vocabulary.

**03 — Respond to the Questions**

Answer Questions 8, 9, and 10 aloud using the information presented.

**04 — Review Your Performance**

Compare your responses with the model answers and identify opportunities for improvement.

**05 — Challenge Yourself**

Use timed simulations and the Mystery Envelope activity to reinforce your learning.

## Technology Stack

The application is built using standard web technologies, with no external frameworks or backend infrastructure.

| Technology | Implementation |
|---|---|
| **HTML5** | Semantic structure and accessible content |
| **CSS3** | Responsive layouts, animations, and visual design |
| **JavaScript (ES6+)** | Application logic, navigation, and interactive activities |
| **Web Speech API** | Browser-based speech synthesis and supported speech recognition |
| **Web Storage API** | Local persistence of vocabulary and exercise progress |
| **GitHub Pages** | Static website hosting |

### Architecture

The project follows a lightweight, maintainable structure, separating the presentation layer, application logic, and educational content.

```text
TOEIC-Speaking-Practice/
│
├── index.html
│
├── css/
│   └── styles.css
│
├── js/
│   ├── app.js
│   └── data.js
│
├── assets/
│   └── favicon.png
│
└── README.md
```

**File responsibilities:**

- `index.html` — Main document structure, page content, and SEO metadata.
- `styles.css` — Design system, layout, components, animations, and responsive styling.
- `app.js` — Interactive functionality, practice flow, timers, and application state.
- `data.js` — Educational documents, questions, vocabulary, and model responses.
- `assets/` — Static visual resources.
- `README.md` — Project overview and technical documentation.

## Getting Started

You can run the application locally without installing additional dependencies.

### Option 1 — Download the Repository

1. Open the GitHub repository.
2. Select **Code → Download ZIP**.
3. Extract the downloaded archive.
4. Open `index.html` in a modern web browser.

### Option 2 — Clone with Git

```bash
git clone https://github.com/waltdev16/TOEIC-Speaking-Practice.git
cd TOEIC-Speaking-Practice
```

Open `index.html` in your browser to access the application.

For a consistent development environment, you can also serve the project using a local development server.

## Deployment

This project supports deployment through **GitHub Pages** without additional build tools.

1. Upload the project files to a GitHub repository.
2. Make sure `index.html` is located in the repository root.
3. Navigate to **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Choose `main` and `/ (root)`.
6. Save the configuration and access the published website.

### Website URL

For the repository name used in the installation example, the expected URL is:

**https://waltdev16.github.io/Speaking_Practice/**

> The URL becomes active after the repository is published and GitHub Pages deployment succeeds.

## Browser Compatibility

The application is designed for modern browsers, including:

- Google Chrome
- Microsoft Edge
- Mozilla Firefox
- Safari

**Important considerations:**

- Speech synthesis and speech recognition support depend on the browser and device.
- Microphone access may require user permission and a secure browsing context.
- Saved progress and vocabulary are stored locally in the browser.
- Clearing browser storage may remove saved information.
- Some web fonts require an internet connection.
- The platform does not provide official TOEIC scoring or certified proficiency assessment.

## Educational Objectives

This project combines language learning and software development to demonstrate how interactive technologies can improve the learning experience.

Its primary objectives are to:

- Strengthen students' comprehension of written information.
- Improve spoken communication and response accuracy.
- Develop confidence when answering questions under time constraints.
- Encourage independent and interactive English practice.
- Demonstrate the practical application of frontend web technologies in education.

## Authors & Contributors

This project was collaboratively designed and developed by three students as part of an educational TOEIC Speaking demonstration.

- **Adriana Aguilar**
- **Andrea Mejia**
- **Walter Santos**

**Academic Project · 2026**


---

<div align="center">

</div>