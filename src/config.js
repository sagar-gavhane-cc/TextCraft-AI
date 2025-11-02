// Core configuration and constants

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

export const TAB_TYPES = {
  REPHRASER: 'rephraser',
  JIRA: 'jira',
  STANDUP: 'standup'
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
 * @property {string} type - Type of entry ('rephraser', 'jira', 'standup')
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
