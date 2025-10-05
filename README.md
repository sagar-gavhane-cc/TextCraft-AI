# TextCraft AI - AI-Powered Text Rephraser Chrome Extension

A lightweight Chrome extension that provides AI-powered text rephrasing capabilities with multiple modes and tones of voice.

## Features

- **Multiple Rephrasing Modes**:
  - Simplify: Make text easier to understand
  - Improve: Enhance clarity and quality
  - Detail: Add more depth and context
  - Shorten: Make text more concise

- **Tone of Voice Options**:
  - Professional (default)
  - Casual
  - Friendly
  - Direct

- **Multiple AI Providers**:
  - OpenAI (GPT-4o-mini)
  - Google Gemini (gemini-1.5-flash)
  - Groq (llama-3.1-8b-instant)
  - Ollama (local - llama3.2)

- **Smart Provider Selection**:
  - Auto-select first available provider
  - Fallback to next available on error

- **History Management**:
  - Store last 50 entries
  - Copy, reuse, or delete entries

## Setup & Installation

### Development

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/textcraft-ai.git
   cd textcraft-ai
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start development server:
   ```
   npm run dev
   ```

4. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

### Production Build

1. Build the extension:
   ```
   npm run build
   ```

2. The production build will be available in the `dist` folder.

## API Setup

### OpenAI

1. Get an API key from [OpenAI](https://platform.openai.com/)
2. Enter the key in the extension settings

### Google Gemini

1. Get an API key from [Google AI Studio](https://makersuite.google.com/)
2. Enter the key in the extension settings

### Groq

1. Get an API key from [Groq](https://console.groq.com/)
2. Enter the key in the extension settings

### Ollama (Local)

1. Install Ollama from [ollama.ai](https://ollama.ai)
2. Run `ollama pull llama3.2` in terminal
3. Ensure Ollama is running at `http://localhost:11434`
4. The extension will automatically detect if Ollama is available

## Usage

1. Click the extension icon to open the popup
2. Enter or paste text to rephrase
3. Select rephrasing mode and tone
4. Choose AI provider
5. Click "Rephrase"
6. The result will be automatically copied to clipboard

## License

MIT
