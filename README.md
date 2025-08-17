# Study Reels

Study Reels is a web application designed to help users learn and revise efficiently through a series of engaging, short-form study reels (similar to Instagram Reels or TikTok, but for educational content).

## Features

- **Short-form Study Content:** Swipe through quick, focused study videos or cards to reinforce concepts.
- **User-Friendly Interface:** Clean, intuitive design for distraction-free learning.
- **Personalized Experience:** Save favorite reels, mark as learned, and track progress.
- **Responsive Design:** Works seamlessly across devices—desktop, tablet, and mobile.

## Technologies Used

- **Frontend:** React (with Vite)
- **Languages:** JavaScript, TypeScript, CSS
- **UI Library:** [shadcn/ui](https://ui.shadcn.com/) (for modern, accessible UI components)
- **Styling:** CSS and shadcn themes
- **Backend:** Node.js/Express (or similar)
- **Media Processing:** Uses **FFmpeg** in the backend to process and generate video/audio content.
- **Text-to-Speech:** Integrates **TTS (Text-to-Speech) models** in the backend for generating educational audio content.
- **Gemini API:** Uses Gemini for AI-powered features (make sure to add your own Gemini API key).

## Getting Started

### Prerequisites

- Node.js (v18 or above recommended)
- npm or yarn
- FFmpeg installed and available in your system PATH
- Your own Gemini API key

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Amrit-Nigam/Study-reels.git
   cd Study-reels
   ```

2. **Install dependencies for both frontend and backend:**
   - Switch to the frontend directory and install dependencies:
     ```bash
     cd frontend
     npm install
     ```
   - In a new terminal, switch to the backend directory and install dependencies:
     ```bash
     cd backend
     npm install
     ```

3. **Set up environment variables:**
   - Copy `.env.example` to `.env` in both `frontend` and `backend` directories.
   - Add your own Gemini API key and adjust other values as needed (e.g., API URLs, TTS model paths, FFmpeg config).

4. **Start the development servers:**
   - In the `frontend` directory:
     ```bash
     npm run dev
     ```
   - In the `backend` directory:
     ```bash
     npm run dev
     ```

5. **Open in your browser:**
   - Visit `http://localhost:5173` (or the displayed port) to view the app.


## Contributing

Contributions are welcome! Please open an issue or pull request for enhancements or bug fixes.

## License

This project is licensed under the MIT License.

---

**Study Reels — Swipe. Learn. Repeat.**
