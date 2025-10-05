# Chrome Extension Technical Scope Document (Revised)
## AI-Powered Text Rephraser Extension - Simplified Version

---

## 1. Executive Summary

This document outlines the technical specifications for developing a lightweight Chrome extension that provides AI-powered text rephrasing capabilities. The extension will offer multiple rephrasing modes with customizable tone of voice, leveraging OpenAI, Google Gemini, Groq, and local Ollama APIs. The solution emphasizes speed (< 200ms initial load), simplicity, and minimal user configuration with a straightforward HTML/CSS/JavaScript implementation.

---

## 2. Project Overview - Revised

### 2.1 Key Changes from Original Scope
- **Added AI Providers**: Groq and local Ollama support
- **Simplified Tones**: Removed Creative, Academic, and Formal (keeping only Professional, Casual, Friendly, and Direct)
- **Simplified UI**: Smart defaults, minimal configuration required
- **Storage**: LocalStorage as primary (with size monitoring and fallback to IndexedDB only if needed)
- **Tech Stack**: Plain JavaScript + HTML + CSS (no React, no external CSS frameworks)
- **Build Tool**: Vite (retained)
- **Performance**: Initial load < 200ms (stricter requirement)

### 2.2 Core Philosophy
- **Zero Configuration Start**: Works immediately with any available API key
- **Smart Defaults**: Remember last used settings automatically
- **One-Click Actions**: Minimize clicks to get results
- **Speed First**: Every optimization focused on sub-200ms load time

---

## 3. Functional Requirements - Simplified

### 3.1 Core Features

#### 3.1.1 Text Input
- Single textarea with character count
- Character limit: 2000 characters
- Real-time validation (simple border color change)
- Auto-focus on popup open

#### 3.1.2 Rephrasing Modes (Unchanged)
1. **Simplify**
2. **Improve**
3. **Detail**
4. **Shorten**

#### 3.1.3 Tone of Voice Options (Simplified)
- **Professional** (default)
- **Casual**
- **Friendly**
- **Direct**

#### 3.1.4 AI Provider Management (Expanded)
- **OpenAI** (GPT-4o-mini)
- **Gemini** (gemini-1.5-flash)
- **Groq** (llama-3.1-8b-instant)
- **Ollama** (local - default model: llama3.2)
- **Smart Provider Selection**: 
  - Auto-select first available provider with valid API key
  - Show only configured providers in UI
  - Fallback to next available on error
- **Provider Status**: Simple indicator (green dot = ready, red = error)

#### 3.1.5 Output & Clipboard
- Auto-copy to clipboard on success
- Simple toast notification (2 seconds)
- Side-by-side comparison view (optional toggle)

#### 3.1.6 History Management (Simplified)
- Last 50 entries (reduced from 100)
- Stored in LocalStorage (JSON array)
- Simple list with:
  - Timestamp
  - Mode badge
  - Text preview (50 chars)
  - Copy button
  - Reuse button
- Collapsible section (collapsed by default)
- Clear all button

---

## 4. Technical Architecture - Simplified

### 4.1 Project Structure

```
chrome-extension-rephraser/
├── manifest.json
├── public/
│   └── icons/
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
├── src/
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.js           # Main entry point
│   │   └── popup.css          # Minimal custom CSS
│   ├── services/
│   │   ├── ai-service.js      # Main AI orchestrator
│   │   ├── providers/
│   │   │   ├── openai.js
│   │   │   ├── gemini.js
│   │   │   ├── groq.js
│   │   │   └── ollama.js
│   │   ├── storage.js         # LocalStorage wrapper
│   │   └── clipboard.js       # Clipboard operations
│   ├── utils/
│   │   ├── prompts.js         # Prompt templates
│   │   ├── validators.js      # Input validation
│   │   └── dom-helpers.js     # DOM manipulation utilities
│   └── config.js              # Constants and configuration
├── vite.config.js
└── package.json
```

### 4.2 Technology Stack

#### 4.2.1 Frontend
- **Pure JavaScript** (ES6+ modules)
- **HTML5** (single popup.html)
- **Plain CSS** (all styles contained in popup.html)
- **No Framework**: Vanilla JS for maximum speed

#### 4.2.2 Build Tool
- **Vite 5+**
  - Lightning-fast HMR during development
  - Optimized production builds
  - Tree-shaking for minimal bundle size
  - Target: < 50KB total bundle size

#### 4.2.3 Chrome Extension
- **Manifest V3**
- **Permissions**:
  - `storage` (for settings)
  - `clipboardWrite` (for auto-copy)
- **No background service worker needed** (all logic in popup)

#### 4.2.4 Storage Strategy
1. **Primary: LocalStorage**
   - Fast, synchronous access
   - Sufficient for ~5MB of history data
   - Simple JSON serialization
   - Monitor size and warn at 80% capacity

2. **Fallback: IndexedDB** (only if LocalStorage full)
   - Triggered automatically if LocalStorage quota exceeded
   - Transparent migration
   - Same API interface via wrapper

---

## 5. Core Type Definitions (JavaScript)

```javascript
// config.js

export const RephrasingMode = {
  SIMPLIFY: 'simplify',
  IMPROVE: 'improve',
  DETAIL: 'detail',
  SHORTEN: 'shorten'
};

export const ToneOfVoice = {
  PROFESSIONAL: 'professional',
  CASUAL: 'casual',
  FRIENDLY: 'friendly',
  DIRECT: 'direct'
};

export const AIProvider = {
  OPENAI: 'openai',
  GEMINI: 'gemini',
  GROQ: 'groq',
  OLLAMA: 'ollama'
};

export const DEFAULTS = {
  mode: RephrasingMode.IMPROVE,
  tone: ToneOfVoice.PROFESSIONAL,
  provider: null, // Auto-detect
  maxChars: 2000,
  historyLimit: 50,
  timeout: 15000, // 15 seconds
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'llama3.2'
};

// Storage keys
export const STORAGE_KEYS = {
  API_KEYS: 'api_keys',
  SETTINGS: 'settings',
  HISTORY: 'history',
  LAST_PROVIDER: 'last_provider'
};

/**
 * @typedef {Object} HistoryEntry
 * @property {string} id
 * @property {string} originalText
 * @property {string} rephrasedText
 * @property {string} mode
 * @property {string} tone
 * @property {string} provider
 * @property {number} timestamp
 */

/**
 * @typedef {Object} RephraseRequest
 * @property {string} text
 * @property {string} mode
 * @property {string} tone
 * @property {string} provider
 */

/**
 * @typedef {Object} APIConfig
 * @property {string} openaiKey
 * @property {string} geminiKey
 * @property {string} groqKey
 * @property {string} ollamaUrl
 * @property {string} ollamaModel
 */
```

---

## 6. AI Provider Implementation Details

### 6.1 Provider Specifications

#### 6.1.1 OpenAI (Existing)
```javascript
// providers/openai.js
export class OpenAIProvider {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.openai.com/v1';
    this.model = 'gpt-4o-mini';
  }

  async rephrase(text, mode, tone) {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: this.getSystemPrompt() },
          { role: 'user', content: this.buildPrompt(text, mode, tone) }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });
    
    const data = await response.json();
    return data.choices[0].message.content.trim();
  }
}
```

#### 6.1.2 Gemini (Existing)
```javascript
// providers/gemini.js
export class GeminiProvider {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    this.model = 'gemini-1.5-flash';
  }

  async rephrase(text, mode, tone) {
    const response = await fetch(
      `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: this.buildPrompt(text, mode, tone) }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2000
          }
        })
      }
    );
    
    const data = await response.json();
    return data.candidates[0].content.parts[0].text.trim();
  }
}
```

#### 6.1.3 Groq (New)
```javascript
// providers/groq.js
export class GroqProvider {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.groq.com/openai/v1';
    this.model = 'llama-3.1-8b-instant'; // Fastest model
  }

  async rephrase(text, mode, tone) {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: this.getSystemPrompt() },
          { role: 'user', content: this.buildPrompt(text, mode, tone) }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });
    
    const data = await response.json();
    return data.choices[0].message.content.trim();
  }
}
```

**Groq Benefits**:
- Extremely fast inference (claims 10x faster than alternatives)
- OpenAI-compatible API
- Free tier available
- Uses LPU (Language Processing Unit) for speed

#### 6.1.4 Ollama (New - Local)
```javascript
// providers/ollama.js
export class OllamaProvider {
  constructor(baseUrl = 'http://localhost:11434', model = 'llama3.2') {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  async rephrase(text, mode, tone) {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt: this.buildPrompt(text, mode, tone),
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 2000
        }
      })
    });
    
    const data = await response.json();
    return data.response.trim();
  }

  // Check if Ollama is running locally
  async isAvailable() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000) // 2 second timeout
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // List available models
  async listModels() {
    const response = await fetch(`${this.baseUrl}/api/tags`);
    const data = await response.json();
    return data.models.map(m => m.name);
  }
}
```

**Ollama Benefits**:
- 100% free and private
- No API key required
- Works offline
- Fast on local hardware
- Supports many models (llama3.2, mistral, phi, etc.)

**Ollama Setup Instructions for Users**:
1. Install Ollama from https://ollama.ai
2. Run `ollama pull llama3.2` in terminal
3. Ollama runs automatically on `http://localhost:11434`
4. Extension auto-detects if Ollama is available

---

## 7. Storage Implementation

### 7.1 LocalStorage Service

```javascript
// services/storage.js

export class StorageService {
  constructor() {
    this.storage = window.localStorage;
    this.maxSize = 5 * 1024 * 1024; // 5MB limit
    this.useIndexedDB = false;
  }

  // Get API keys
  getAPIKeys() {
    const keys = this.storage.getItem(STORAGE_KEYS.API_KEYS);
    return keys ? JSON.parse(keys) : {};
  }

  // Save API keys
  saveAPIKeys(keys) {
    this.storage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(keys));
  }

  // Get settings
  getSettings() {
    const settings = this.storage.getItem(STORAGE_KEYS.SETTINGS);
    return settings ? JSON.parse(settings) : DEFAULTS;
  }

  // Save settings
  saveSettings(settings) {
    this.storage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  // Get history
  getHistory() {
    const history = this.storage.getItem(STORAGE_KEYS.HISTORY);
    return history ? JSON.parse(history) : [];
  }

  // Add history entry
  addHistory(entry) {
    const history = this.getHistory();
    history.unshift({
      id: Date.now().toString(),
      ...entry,
      timestamp: Date.now()
    });
    
    // Keep only last 50 entries
    const trimmed = history.slice(0, DEFAULTS.historyLimit);
    
    try {
      this.storage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(trimmed));
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        // Handle quota exceeded - remove oldest entries
        const reduced = trimmed.slice(0, 25);
        this.storage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(reduced));
        console.warn('LocalStorage quota exceeded, reduced history to 25 entries');
      }
    }
  }

  // Clear history
  clearHistory() {
    this.storage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify([]));
  }

  // Delete specific entry
  deleteHistoryEntry(id) {
    const history = this.getHistory();
    const filtered = history.filter(entry => entry.id !== id);
    this.storage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(filtered));
  }

  // Get storage size
  getStorageSize() {
    let total = 0;
    for (let key in this.storage) {
      if (this.storage.hasOwnProperty(key)) {
        total += this.storage[key].length + key.length;
      }
    }
    return total;
  }

  // Check storage health
  checkStorageHealth() {
    const size = this.getStorageSize();
    const percentUsed = (size / this.maxSize) * 100;
    
    return {
      size,
      percentUsed,
      warning: percentUsed > 80,
      critical: percentUsed > 95
    };
  }
}
```

### 7.2 IndexedDB Fallback (Optional)

```javascript
// services/storage-indexeddb.js
// Only loaded if LocalStorage is full

export class IndexedDBStorage {
  constructor() {
    this.dbName = 'RephraseExtension';
    this.version = 1;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('history')) {
          db.createObjectStore('history', { keyPath: 'id' });
        }
      };
    });
  }

  async addHistory(entry) {
    const transaction = this.db.transaction(['history'], 'readwrite');
    const store = transaction.objectStore('history');
    await store.add(entry);
  }

  async getHistory() {
    const transaction = this.db.transaction(['history'], 'readonly');
    const store = transaction.objectStore('history');
    const request = store.getAll();
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result);
    });
  }
}
```

---

## 8. User Interface Design - Simplified

### 8.1 Popup Dimensions
- **Width**: 400px (fixed)
- **Height**: 550px (adjustable based on content)
- **Minimum Height**: 450px

### 8.2 HTML Structure

```html
<!-- popup/popup.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Rephraser</title>
  <style>
    /* All CSS styles are defined here */
    /* No external dependencies */
  </style>
</head>
<body>
  
  <!-- Header -->
  <header class="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
    <h1 class="text-lg font-semibold text-gray-800">AI Rephraser</h1>
    <button id="settingsBtn" class="text-gray-500 hover:text-gray-700">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
      </svg>
    </button>
  </header>

  <!-- Main Content -->
  <main class="p-4 space-y-4">
    
    <!-- Input Section -->
    <div class="space-y-2">
      <div class="relative">
        <textarea 
          id="inputText" 
          placeholder="Enter text to rephrase..."
          class="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          maxlength="2000"
        ></textarea>
        <div class="absolute bottom-2 right-2 text-xs text-gray-500">
          <span id="charCount">0</span>/2000
        </div>
      </div>
    </div>

    <!-- Mode Selection -->
    <div class="grid grid-cols-4 gap-2">
      <button class="mode-btn active" data-mode="improve">Improve</button>
      <button class="mode-btn" data-mode="simplify">Simplify</button>
      <button class="mode-btn" data-mode="detail">Detail</button>
      <button class="mode-btn" data-mode="shorten">Shorten</button>
    </div>

    <!-- Tone & Provider Row -->
    <div class="flex gap-2">
      <select id="toneSelect" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
        <option value="professional">Professional</option>
        <option value="casual">Casual</option>
        <option value="friendly">Friendly</option>
        <option value="direct">Direct</option>
      </select>
      
      <select id="providerSelect" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
        <!-- Populated dynamically based on available API keys -->
      </select>
    </div>

    <!-- Rephrase Button -->
    <button 
      id="rephraseBtn" 
      class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
    >
      Rephrase
    </button>

    <!-- Output Section (hidden initially) -->
    <div id="outputSection" class="hidden space-y-2">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-medium text-gray-700">Result</h3>
        <span id="copiedNotice" class="text-xs text-green-600 opacity-0 transition-opacity">✓ Copied!</span>
      </div>
      <div class="bg-white border border-gray-200 rounded-lg p-3 text-sm text-gray-800" id="outputText"></div>
    </div>

    <!-- History Section -->
    <div class="border-t border-gray-200 pt-4">
      <button id="historyToggle" class="w-full flex items-center justify-between text-sm font-medium text-gray-700 hover:text-gray-900">
        <span>History (<span id="historyCount">0</span>)</span>
        <svg class="w-4 h-4 transform transition-transform" id="historyChevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>
      
      <div id="historyContent" class="hidden mt-3 space-y-2 max-h-48 overflow-y-auto">
        <!-- History items populated dynamically -->
      </div>
      
      <button id="clearHistoryBtn" class="hidden w-full mt-2 text-xs text-red-600 hover:text-red-700">
        Clear All History
      </button>
    </div>

  </main>

  <!-- Settings Modal (hidden initially) -->
  <div id="settingsModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 w-[350px] max-h-[500px] overflow-y-auto">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold">Settings</h2>
        <button id="closeSettingsBtn" class="text-gray-500 hover:text-gray-700">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      <div class="space-y-4">
        <!-- OpenAI -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">OpenAI API Key</label>
          <input type="password" id="openaiKey" placeholder="sk-..." class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
        </div>
        
        <!-- Gemini -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Gemini API Key</label>
          <input type="password" id="geminiKey" placeholder="AIza..." class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
        </div>
        
        <!-- Groq -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Groq API Key</label>
          <input type="password" id="groqKey" placeholder="gsk_..." class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
        </div>
        
        <!-- Ollama -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Ollama URL</label>
          <input type="text" id="ollamaUrl" value="http://localhost:11434" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <p class="text-xs text-gray-500 mt-1">Make sure Ollama is running locally</p>
        </div>
        
        <button id="saveSettingsBtn" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg">
          Save Settings
        </button>
      </div>
    </div>
  </div>

  <!-- Loading Overlay -->
  <div id="loadingOverlay" class="hidden fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-40">
    <div class="text-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      <p class="text-sm text-gray-600 mt-2">Rephrasing...</p>
    </div>
  </div>

  <script type="module" src="popup.js"></script>
</body>
</html>
```

### 8.3 CSS (Minimal Custom Styles)

```css
/* All styles are now directly included in popup.html */
/* No separate CSS file is needed */
```

---

## 9. Main JavaScript Implementation

### 9.1 popup.js (Main Entry Point)

```javascript
// popup/popup.js

import { StorageService } from '../services/storage.js';
import { AIService } from '../services/ai-service.js';
import { ClipboardService } from '../services/clipboard.js';
import { RephrasingMode, ToneOfVoice, AIProvider, DEFAULTS } from '../config.js';
import { formatTimestamp, truncateText } from '../utils/dom-helpers.js';

class RephraseApp {
  constructor() {
    this.storage = new StorageService();
    this.aiService = new AIService(this.storage);
    this.clipboard = new ClipboardService();
    
    // State
    this.currentMode = DEFAULTS.mode;
    this.currentTone = DEFAULTS.tone;
    this.currentProvider = null;
    this.isProcessing = false;
    
    // DOM elements
    this.elements = {
      inputText: document.getElementById('inputText'),
      charCount: document.getElementById('charCount'),
      modeButtons: document.querySelectorAll('.mode-btn'),
      toneSelect: document.getElementById('toneSelect'),
      providerSelect: document.getElementById('providerSelect'),
      rephraseBtn: document.getElementById('rephraseBtn'),
      outputSection: document.getElementById('outputSection'),
      outputText: document.getElementById('outputText'),
      copiedNotice: document.getElementById('copiedNotice'),
      historyToggle: document.getElementById('historyToggle'),
      historyContent: document.getElementById('historyContent'),
      historyCount: document.getElementById('historyCount'),
      historyChevron: document.getElementById('historyChevron'),
      clearHistoryBtn: document.getElementById('clearHistoryBtn'),
      settingsBtn: document.getElementById('settingsBtn'),
      settingsModal: document.getElementById('settingsModal'),
      closeSettingsBtn: document.getElementById('closeSettingsBtn'),
      saveSettingsBtn: document.getElementById('saveSettingsBtn'),
      loadingOverlay: document.getElementById('loadingOverlay'),
      openaiKey: document.getElementById('openaiKey'),
      geminiKey: document.getElementById('geminiKey'),
      groqKey: document.getElementById('groqKey'),
      ollamaUrl: document.getElementById('ollamaUrl')
    };
    
    this.init();
  }
  
  async init() {
    const startTime = performance.now();
    
    // Load saved settings
    await this.loadSettings();
    
    // Initialize providers
    await this.initializeProviders();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Load history
    this.renderHistory();
    
    // Auto-focus input
    this.elements.inputText.focus();
    
    const loadTime = performance.now() - startTime;
    console.log(`App initialized in ${loadTime.toFixed(2)}ms`);
  }
  
  async loadSettings() {
    const settings = this.storage.getSettings();
    this.currentMode = settings.mode || DEFAULTS.mode;
    this.currentTone = settings.tone || DEFAULTS.tone;
    
    // Set UI to match saved settings
    this.elements.toneSelect.value = this.currentTone;
    this.setActiveMode(this.currentMode);
  }
  
  async initializeProviders() {
    const apiKeys = this.storage.getAPIKeys();
    const availableProviders = [];
    
    // Check OpenAI
    if (apiKeys.openaiKey) {
      availableProviders.push({ value: AIProvider.OPENAI, label: 'OpenAI' });
    }
    
    // Check Gemini
    if (apiKeys.geminiKey) {
      availableProviders.push({ value: AIProvider.GEMINI, label: 'Gemini' });
    }
    
    // Check Groq
    if (apiKeys.groqKey) {
      availableProviders.push({ value: AIProvider.GROQ, label: 'Groq' });
    }
    
    // Check Ollama
    const ollamaAvailable = await this.aiService.checkOllamaAvailability();
    if (ollamaAvailable) {
      availableProviders.push({ value: AIProvider.OLLAMA, label: 'Ollama (Local)' });
    }
    
    // Populate provider select
    this.elements.providerSelect.innerHTML = '';
    
    if (availableProviders.length === 0) {
      this.elements.providerSelect.innerHTML = '<option value="">No API configured</option>';
      this.elements.rephraseBtn.disabled = true;
      return;
    }
    
    availableProviders.forEach(provider => {
      const option = document.createElement('option');
      option.value = provider.value;
      option.textContent = provider.label;
      this.elements.providerSelect.appendChild(option);
    });
    
    // Set last used provider or first available
    const lastProvider = this.storage.getSettings().lastProvider;
    if (lastProvider && availableProviders.some(p => p.value === lastProvider)) {
      this.elements.providerSelect.value = lastProvider;
    } else {
      this.elements.providerSelect.value = availableProviders[0].value;
    }
    
    this.currentProvider = this.elements.providerSelect.value;
  }
  
  setupEventListeners() {
    // Input text area
    this.elements.inputText.addEventListener('input', () => {
      this.updateCharCount();
      this.validateInput();
    });
    
    // Mode buttons
    this.elements.modeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = e.target.dataset.mode;
        this.setActiveMode(mode);
        this.currentMode = mode;
      });
    });
    
    // Tone select
    this.elements.toneSelect.addEventListener('change', (e) => {
      this.currentTone = e.target.value;
    });
    
    // Provider select
    this.elements.providerSelect.addEventListener('change', (e) => {
      this.currentProvider = e.target.value;
      this.storage.saveSettings({
        ...this.storage.getSettings(),
        lastProvider: this.currentProvider
      });
    });
    
    // Rephrase button
    this.elements.rephraseBtn.addEventListener('click', () => {
      this.handleRephrase();
    });
    
    // Enter key to rephrase (Ctrl/Cmd + Enter)
    this.elements.inputText.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.handleRephrase();
      }
    });
    
    // History toggle
    this.elements.historyToggle.addEventListener('click', () => {
      this.toggleHistory();
    });
    
    // Clear history
    this.elements.clearHistoryBtn.addEventListener('click', () => {
      if (confirm('Clear all history?')) {
        this.storage.clearHistory();
        this.renderHistory();
      }
    });
    
    // Settings modal
    this.elements.settingsBtn.addEventListener('click', () => {
      this.openSettings();
    });
    
    this.elements.closeSettingsBtn.addEventListener('click', () => {
      this.closeSettings();
    });
    
    this.elements.saveSettingsBtn.addEventListener('click', () => {
      this.saveSettings();
    });
    
    // Close modal on outside click
    this.elements.settingsModal.addEventListener('click', (e) => {
      if (e.target === this.elements.settingsModal) {
        this.closeSettings();
      }
    });
  }
  
  updateCharCount() {
    const count = this.elements.inputText.value.length;
    this.elements.charCount.textContent = count;
    
    // Update color based on length
    if (count > 1800) {
      this.elements.charCount.classList.add('text-red-600');
    } else if (count > 1500) {
      this.elements.charCount.classList.add('text-yellow-600');
      this.elements.charCount.classList.remove('text-red-600');
    } else {
      this.elements.charCount.classList.remove('text-red-600', 'text-yellow-600');
    }
  }
  
  validateInput() {
    const text = this.elements.inputText.value.trim();
    const isValid = text.length >= 10 && text.length <= 2000;
    
    if (!isValid) {
      this.elements.inputText.classList.add('border-red-500');
    } else {
      this.elements.inputText.classList.remove('border-red-500');
    }
    
    return isValid;
  }
  
  setActiveMode(mode) {
    this.elements.modeButtons.forEach(btn => {
      if (btn.dataset.mode === mode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }
  
  async handleRephrase() {
    if (this.isProcessing) return;
    
    const text = this.elements.inputText.value.trim();
    
    if (!this.validateInput()) {
      this.showToast('Please enter text between 10 and 2000 characters', 'error');
      return;
    }
    
    if (!this.currentProvider) {
      this.showToast('Please configure an API key in settings', 'error');
      this.openSettings();
      return;
    }
    
    this.isProcessing = true;
    this.showLoading(true);
    this.elements.rephraseBtn.disabled = true;
    
    try {
      const result = await this.aiService.rephrase({
        text,
        mode: this.currentMode,
        tone: this.currentTone,
        provider: this.currentProvider
      });
      
      // Display result
      this.displayResult(result);
      
      // Copy to clipboard
      await this.clipboard.copy(result);
      this.showCopiedNotice();
      
      // Save to history
      this.storage.addHistory({
        originalText: text,
        rephrasedText: result,
        mode: this.currentMode,
        tone: this.currentTone,
        provider: this.currentProvider
      });
      
      // Refresh history display
      this.renderHistory();
      
      // Save last used settings
      this.storage.saveSettings({
        mode: this.currentMode,
        tone: this.currentTone,
        lastProvider: this.currentProvider
      });
      
    } catch (error) {
      console.error('Rephrase error:', error);
      this.showToast(error.message || 'Failed to rephrase text', 'error');
    } finally {
      this.isProcessing = false;
      this.showLoading(false);
      this.elements.rephraseBtn.disabled = false;
    }
  }
  
  displayResult(text) {
    this.elements.outputText.textContent = text;
    this.elements.outputSection.classList.remove('hidden');
    this.elements.outputSection.classList.add('slide-down');
    
    // Scroll to output
    this.elements.outputSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  
  showCopiedNotice() {
    this.elements.copiedNotice.classList.remove('opacity-0');
    this.elements.copiedNotice.classList.add('opacity-100');
    
    setTimeout(() => {
      this.elements.copiedNotice.classList.remove('opacity-100');
      this.elements.copiedNotice.classList.add('opacity-0');
    }, 2000);
  }
  
  showLoading(show) {
    if (show) {
      this.elements.loadingOverlay.classList.remove('hidden');
    } else {
      this.elements.loadingOverlay.classList.add('hidden');
    }
  }
  
  showToast(message, type = 'info') {
    // Simple toast implementation
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 ${
      type === 'error' ? 'bg-red-600' : 'bg-blue-600'
    } text-white text-sm`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
  
  toggleHistory() {
    const isHidden = this.elements.historyContent.classList.contains('hidden');
    
    if (isHidden) {
      this.elements.historyContent.classList.remove('hidden');
      this.elements.historyChevron.classList.add('rotate-180');
    } else {
      this.elements.historyContent.classList.add('hidden');
      this.elements.historyChevron.classList.remove('rotate-180');
    }
  }
  
  renderHistory() {
    const history = this.storage.getHistory();
    this.elements.historyCount.textContent = history.length;
    
    if (history.length === 0) {
      this.elements.historyContent.innerHTML = '<p class="text-sm text-gray-500 text-center py-4">No history yet</p>';
      this.elements.clearHistoryBtn.classList.add('hidden');
      return;
    }
    
    this.elements.clearHistoryBtn.classList.remove('hidden');
    
    this.elements.historyContent.innerHTML = history.map(entry => `
      <div class="history-item" data-id="${entry.id}">
        <div class="history-item-header">
          <span class="history-badge">${entry.mode}</span>
          <span class="history-timestamp">${formatTimestamp(entry.timestamp)}</span>
        </div>
        <div class="history-text">${truncateText(entry.rephrasedText, 80)}</div>
        <div class="history-actions">
          <button class="history-btn copy-btn" data-id="${entry.id}">
            <svg class="w-3 h-3 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
            </svg>
            Copy
          </button>
          <button class="history-btn reuse-btn" data-id="${entry.id}">
            <svg class="w-3 h-3 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            Reuse
          </button>
          <button class="history-btn delete-btn text-red-600" data-id="${entry.id}">
            <svg class="w-3 h-3 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
            Delete
          </button>
        </div>
      </div>
    `).join('');
    
    // Add event listeners for history actions
    this.elements.historyContent.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        this.copyHistoryEntry(id);
      });
    });
    
    this.elements.historyContent.querySelectorAll('.reuse-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        this.reuseHistoryEntry(id);
      });
    });
    
    this.elements.historyContent.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        this.deleteHistoryEntry(id);
      });
    });
  }
  
  async copyHistoryEntry(id) {
    const history = this.storage.getHistory();
    const entry = history.find(e => e.id === id);
    
    if (entry) {
      await this.clipboard.copy(entry.rephrasedText);
      this.showToast('Copied to clipboard!');
    }
  }
  
  reuseHistoryEntry(id) {
    const history = this.storage.getHistory();
    const entry = history.find(e => e.id === id);
    
    if (entry) {
      this.elements.inputText.value = entry.originalText;
      this.updateCharCount();
      this.setActiveMode(entry.mode);
      this.currentMode = entry.mode;
      this.elements.toneSelect.value = entry.tone;
      this.currentTone = entry.tone;
      this.elements.inputText.focus();
      
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
  
  deleteHistoryEntry(id) {
    this.storage.deleteHistoryEntry(id);
    this.renderHistory();
    this.showToast('Entry deleted');
  }
  
  openSettings() {
    const apiKeys = this.storage.getAPIKeys();
    
    // Populate form with existing keys (masked)
    if (apiKeys.openaiKey) {
      this.elements.openaiKey.value = this.maskApiKey(apiKeys.openaiKey);
    }
    if (apiKeys.geminiKey) {
      this.elements.geminiKey.value = this.maskApiKey(apiKeys.geminiKey);
    }
    if (apiKeys.groqKey) {
      this.elements.groqKey.value = this.maskApiKey(apiKeys.groqKey);
    }
    
    const settings = this.storage.getSettings();
    this.elements.ollamaUrl.value = settings.ollamaUrl || DEFAULTS.ollamaUrl;
    
    this.elements.settingsModal.classList.remove('hidden');
  }
  
  closeSettings() {
    this.elements.settingsModal.classList.add('hidden');
  }
  
  async saveSettings() {
    const apiKeys = this.storage.getAPIKeys();
    
    // Only update keys that were changed (not masked values)
    const newKeys = {};
    
    if (this.elements.openaiKey.value && !this.elements.openaiKey.value.includes('•')) {
      newKeys.openaiKey = this.elements.openaiKey.value.trim();
    } else if (apiKeys.openaiKey) {
      newKeys.openaiKey = apiKeys.openaiKey;
    }
    
    if (this.elements.geminiKey.value && !this.elements.geminiKey.value.includes('•')) {
      newKeys.geminiKey = this.elements.geminiKey.value.trim();
    } else if (apiKeys.geminiKey) {
      newKeys.geminiKey = apiKeys.geminiKey;
    }
    
    if (this.elements.groqKey.value && !this.elements.groqKey.value.includes('•')) {
      newKeys.groqKey = this.elements.groqKey.value.trim();
    } else if (apiKeys.groqKey) {
      newKeys.groqKey = apiKeys.groqKey;
    }
    
    this.storage.saveAPIKeys(newKeys);
    
    // Save Ollama URL
    const settings = this.storage.getSettings();
    settings.ollamaUrl = this.elements.ollamaUrl.value.trim();
    this.storage.saveSettings(settings);
    
    // Reinitialize providers
    await this.initializeProviders();
    
    this.closeSettings();
    this.showToast('Settings saved!');
  }
  
  maskApiKey(key) {
    if (!key) return '';
    const visibleChars = 4;
    return key.substring(0, visibleChars) + '•'.repeat(12);
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new RephraseApp();
});
```

---

## 10. AI Service Implementation

### 10.1 Main AI Service

```javascript
// services/ai-service.js

import { OpenAIProvider } from './providers/openai.js';
import { GeminiProvider } from './providers/gemini.js';
import { GroqProvider } from './providers/groq.js';
import { OllamaProvider } from './providers/ollama.js';
import { AIProvider, DEFAULTS } from '../config.js';
import { buildPrompt } from '../utils/prompts.js';

export class AIService {
  constructor(storageService) {
    this.storage = storageService;
    this.providers = {};
    this.timeout = DEFAULTS.timeout;
  }
  
  async rephrase(request) {
    const { text, mode, tone, provider } = request;
    
    // Initialize provider if not already done
    if (!this.providers[provider]) {
      await this.initializeProvider(provider);
    }
    
    if (!this.providers[provider]) {
      throw new Error(`Provider ${provider} not available`);
    }
    
    try {
      // Add timeout to request
      const result = await Promise.race([
        this.providers[provider].rephrase(text, mode, tone),
        this.createTimeout()
      ]);
      
      return result;
      
    } catch (error) {
      console.error(`Error with ${provider}:`, error);
      
      // Try fallback to next available provider
      const fallbackResult = await this.tryFallback(request, provider);
      if (fallbackResult) {
        return fallbackResult;
      }
      
      throw new Error(this.getUserFriendlyError(error));
    }
  }
  
  async initializeProvider(providerName) {
    const apiKeys = this.storage.getAPIKeys();
    const settings = this.storage.getSettings();
    
    switch (providerName) {
      case AIProvider.OPENAI:
        if (apiKeys.openaiKey) {
          this.providers[AIProvider.OPENAI] = new OpenAIProvider(apiKeys.openaiKey);
        }
        break;
        
      case AIProvider.GEMINI:
        if (apiKeys.geminiKey) {
          this.providers[AIProvider.GEMINI] = new GeminiProvider(apiKeys.geminiKey);
        }
        break;
        
      case AIProvider.GROQ:
        if (apiKeys.groqKey) {
          this.providers[AIProvider.GROQ] = new GroqProvider(apiKeys.groqKey);
        }
        break;
        
      case AIProvider.OLLAMA:
        const ollamaUrl = settings.ollamaUrl || DEFAULTS.ollamaUrl;
        const ollamaModel = settings.ollamaModel || DEFAULTS.ollamaModel;
        this.providers[AIProvider.OLLAMA] = new OllamaProvider(ollamaUrl, ollamaModel);
        break;
    }
  }
  
  async tryFallback(request, failedProvider) {
    const availableProviders = await this.getAvailableProviders();
    const fallbackProviders = availableProviders.filter(p => p !== failedProvider);
    
    if (fallbackProviders.length === 0) {
      return null;
    }
    
    console.log(`Trying fallback provider: ${fallbackProviders[0]}`);
    
    try {
      return await this.rephrase({
        ...request,
        provider: fallbackProviders[0]
      });
    } catch (error) {
      console.error('Fallback also failed:', error);
      return null;
    }
  }
  
  async getAvailableProviders() {
    const apiKeys = this.storage.getAPIKeys();
    const providers = [];
    
    if (apiKeys.openaiKey) providers.push(AIProvider.OPENAI);
    if (apiKeys.geminiKey) providers.push(AIProvider.GEMINI);
    if (apiKeys.groqKey) providers.push(AIProvider.GROQ);
    
    const ollamaAvailable = await this.checkOllamaAvailability();
    if (ollamaAvailable) providers.push(AIProvider.OLLAMA);
    
    return providers;
  }
  
  async checkOllamaAvailability() {
    try {
      const settings = this.storage.getSettings();
      const ollamaUrl = settings.ollamaUrl || DEFAULTS.ollamaUrl;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const response = await fetch(`${ollamaUrl}/api/tags`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
      
    } catch (error) {
      return false;
    }
  }
  
  createTimeout() {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Request timeout'));
      }, this.timeout);
    });
  }
  
  getUserFriendlyError(error) {
    if (error.message === 'Request timeout') {
      return 'Request timed out. Please try again.';
    }
    
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      return 'Invalid API key. Please check your settings.';
    }
    
    if (error.message.includes('429') || error.message.includes('rate limit')) {
      return 'Rate limit exceeded. Please wait a moment.';
    }
    
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'Network error. Please check your connection.';
    }
    
    return 'An error occurred. Please try again.';
  }
}
```

### 10.2 Provider Implementations

```javascript
// services/providers/openai.js

import { buildPrompt } from '../../utils/prompts.js';

export class OpenAIProvider {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.openai.com/v1';
    this.model = 'gpt-4o-mini';
  }
  
  async rephrase(text, mode, tone) {
    const prompt = buildPrompt(text, mode, tone);
    
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a professional text rephraser. Return only the rephrased text without any explanations or meta-commentary.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `OpenAI error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content.trim();
  }
}
```

```javascript
// services/providers/gemini.js

import { buildPrompt } from '../../utils/prompts.js';

export class GeminiProvider {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    this.model = 'gemini-1.5-flash';
  }
  
  async rephrase(text, mode, tone) {
    const prompt = buildPrompt(text, mode, tone);
    
    const response = await fetch(
      `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2000
          },
          safetySettings: [
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_NONE'
            },
            {
              category: 'HARM_CATEGORY_HATE_SPEECH',
              threshold: 'BLOCK_NONE'
            }
          ]
        })
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `Gemini error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response from Gemini');
    }
    
    return data.candidates[0].content.parts[0].text.trim();
  }
}
```

```javascript
// services/providers/groq.js

import { buildPrompt } from '../../utils/prompts.js';

export class GroqProvider {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.groq.com/openai/v1';
    this.model = 'llama-3.1-8b-instant';
  }
  
  async rephrase(text, mode, tone) {
    const prompt = buildPrompt(text, mode, tone);
    
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a professional text rephraser. Return only the rephrased text without any explanations or meta-commentary.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `Groq error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content.trim();
  }
}
```
