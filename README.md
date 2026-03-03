# OpenClassTools: Interactive AI-Powered Party & Learning Games

OpenClassTools is a modern, lightweight, and engaging hub of interactive web-based games designed for groups, classrooms, and social gatherings. Built with vanilla web technologies and an Express backend, it features a stunning "glassmorphism" UI and seamless AI integration to generate endless, highly customizable content on the fly.

## 🎮 Included Games

1. **Who Am I? (AI Enhanced)**
   - The classic identity-guessing party game.
   - **AI Feature:** Instantly generate a custom list of characters based on any prompt (e.g., "Historical figures", "Marvel superheroes", "90s Pop Stars") using Google's Gemini AI.
2. **Taboo (AI Enhanced)**
   - Describe the main word without using the 5 forbidden words. Features a built-in timer, score tracking, and team management.
   - **AI Feature:** Generate endless decks of custom Taboo cards based on any theme you type in.
3. **Hangman**
   - A sleek, digital take on the classic word-guessing game with interactive keyboard and progressive character drawing.
4. **Spin the Bottle**
   - Input names and let the physics-based SVG bottle randomly select the next person. Features a highly polished, responsive design.
5. **Wheel of Names**
   - A highly customizable spinning wheel for random selections. Perfect for teachers calling on students, giveaways, or deciding who goes next.

## ✨ Key Features

- **Zero DB Required:** The app uses lightweight local flat-file storage (`list.txt` and `taboo.json`), making it incredibly easy to deploy and host anywhere.
- **AI-Powered:** Deep integration with the Gemini API to overcome the biggest hurdle of party games—running out of fresh content!
- **Modern UI/UX:** A consistent, responsive "glassmorphism" design system with fluid animations, custom backgrounds, and mobile-first CSS architecture.
- **Customizable:** Fully modular. You can easily plug in new HTML/CSS/JS game modules into the main hub.

## 🚀 Quick Start (Local Development)

### Prerequisites

- [Node.js](https://nodejs.org/) (v16+ recommended)
- A [Google Gemini API Key](https://aistudio.google.com/app/apikey)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/aerladis/openclasstools.git
   cd openclasstools
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up your environment variables:
   - Create a file named `.env` in the root directory.
   - Add your Gemini API key:

     ```env
     GEMINI_API_KEY=your_actual_api_key_here
     PORT=8090
     ```

4. Start the server:

   ```bash
   node server.js
   ```

5. Open your browser and navigate to:

   ```
   http://localhost:8090
   ```

## 🛠 Tech Stack

- **Frontend:** HTML5, CSS3 (Vanilla), JavaScript (ES6+), Canvas API
- **Backend:** Node.js, Express.js
- **AI Integration:** Google Gemini (generative-ai)

## 🤝 Contributing

We welcome contributions! Whether it's adding a new game, improving the UI, or optimizing the AI prompts, feel free to fork the repository and submit a pull request.

## 📝 License

This project is open-source and available under the MIT License.
