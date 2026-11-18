<div align="center">

# 🎤 TOEIC Speaking Practice

### Questions 8–10 · Mystery Envelope · Detective Duel

An interactive English-learning website combining TOEIC-style speaking practice with a detective-themed challenge.

**25 practice sets · Interactive vocabulary · Timed exercises · Two-player duels**

</div>

---

## About

**TOEIC Speaking Practice** helps students answer questions using information from schedules, announcements, emails, and other everyday documents. It was developed by a team of three students for an educational demonstration.

The **Mystery Envelope** activity adds a detective-style challenge. Its **Detective Duel** mode lets two students compete on separate iPads while a host laptop manages the round and reveals the winner.

## Features

- **TOEIC practice:** 25 document-based sets covering Questions 8–10, with model answers and timed practice.
- **Vocabulary tools:** Interactive word explanations and locally saved vocabulary.
- **Audio support:** Browser-based text-to-speech for supported content.
- **Mystery Envelope:** Interactive cases with envelope animations and questions.
- **Detective Duel:** Two-player competition with automatic device pairing through Firebase.
- **Host screen:** Live player status, round controls, and an animated winner reveal.
- **Private results:** Players see a waiting screen after submitting; scores and the winner appear on the host screen.
- **Responsive design:** Works across desktop, tablet, and mobile layouts.

## Tech Stack

**HTML5 · CSS3 · Vanilla JavaScript · Web Speech API · Firebase Authentication · Firebase Realtime Database · GitHub Pages**

No frontend framework or build process is required.

## Getting Started

1. Download or clone the repository.
2. Keep the existing folders together.
3. Open `index.html` in a browser for the standard practice activities.

```bash
git clone https://github.com/waltdev16/TOEIC-Speaking-Practice.git
```

> Update the repository URL if its actual name differs.

### Detective Duel Setup

The multiplayer features require a configured Firebase project, Authentication, Realtime Database, and appropriate database security rules.

- **Host laptop:** Open `index.html?mode=host` and sign in as an authorized organizer.
- **Player iPads:** Open `index.html?mode=player`, request a player slot, and wait for host approval.
- **Next rounds:** Once paired, the iPads can reconnect to new duels automatically.

**Important:** The supplied archive includes `js/firebase-config.js`, but not the Firebase database rules or initial admin/game data. Those must be configured in Firebase before multiplayer mode can be used securely. Never add host passwords or private credentials to the repository.

## Project Structure

```text
├── index.html
├── assets/
│   └── icon.png
├── js/
│   ├── app.js
│   ├── data.js
│   ├── duel-core.js
│   ├── duel.js
│   ├── firebase-config.js
│   ├── host.js
│   └── sync.js
└── README.md
```

## Deployment

This project can be published with **GitHub Pages**:

1. Upload the files with `index.html` in the repository root.
2. Open **Settings → Pages**.
3. Select **Deploy from a branch**, then **main** and **/(root)**.
4. Save and open the published website.

Firebase-enabled features require an internet connection. Browser audio availability and local saved progress may vary by device or browser settings.

## Authors

Developed collaboratively by:

- **Adriana Aguilar**
- **Andrea Mejia**
- **Walter Santos**

**Academic Project | 2026**

---

<div align="center">

</div>
