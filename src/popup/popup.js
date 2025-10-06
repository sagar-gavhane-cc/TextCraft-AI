import { StorageService } from '../services/storage.js';
import { AIService } from '../services/ai-service.js';
import { ClipboardService } from '../services/clipboard.js';
import { RephrasingMode, ToneOfVoice, AIProvider, DEFAULTS } from '../config.js';
import { formatTimestamp, truncateText, showToast } from '../utils/dom-helpers.js';

/**
 * Main application class for the rephraser extension
 */
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
  
  /**
   * Initialize the application
   */
  async init() {
    const startTime = performance.now();
    
    // Load saved settings
    await this.loadSettings();
    
    // Load saved input text if any
    const savedInput = await this.storage.getSavedInput();
    if (savedInput) {
      this.elements.inputText.value = savedInput;
      this.updateCharCount();
    }
    
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
  
  /**
   * Load settings from storage
   */
  async loadSettings() {
    const settings = this.storage.getSettings();
    this.currentMode = settings.mode || DEFAULTS.mode;
    this.currentTone = settings.tone || DEFAULTS.tone;
    
    // Set UI to match saved settings
    this.elements.toneSelect.value = this.currentTone;
    this.setActiveMode(this.currentMode);
  }
  
  /**
   * Initialize AI providers
   */
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
    
    // Always add Ollama as an option regardless of availability
    availableProviders.push({ value: AIProvider.OLLAMA, label: 'Ollama Local' });
    
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
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Input text area
    this.elements.inputText.addEventListener('input', () => {
      this.updateCharCount();
      this.validateInput();
      // Save input text to storage
      this.storage.saveInput(this.elements.inputText.value);
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
  
  /**
   * Update character count
   */
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
  
  /**
   * Validate input text
   * @returns {boolean} - Whether input is valid
   */
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
  
  /**
   * Set active mode button
   * @param {string} mode - Mode to set active
   */
  setActiveMode(mode) {
    this.elements.modeButtons.forEach(btn => {
      if (btn.dataset.mode === mode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }
  
  /**
   * Handle rephrase button click
   */
  async handleRephrase() {
    if (this.isProcessing) return;
    
    const text = this.elements.inputText.value.trim();
    
    if (!this.validateInput()) {
      showToast('Please enter text between 10 and 2000 characters', 'error');
      return;
    }
    
    if (!this.currentProvider) {
      showToast('Please configure an API key in settings', 'error');
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
      showToast(error.message || 'Failed to rephrase text', 'error');
    } finally {
      this.isProcessing = false;
      this.showLoading(false);
      this.elements.rephraseBtn.disabled = false;
    }
  }
  
  /**
   * Display result in output section
   * @param {string} text - Rephrased text
   */
  displayResult(text) {
    this.elements.outputText.textContent = text;
    this.elements.outputSection.classList.remove('hidden');
    this.elements.outputSection.classList.add('slide-down');
    
    // Scroll to output
    this.elements.outputSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  
  /**
   * Show copied notice
   */
  showCopiedNotice() {
    this.elements.copiedNotice.classList.remove('opacity-0');
    this.elements.copiedNotice.classList.add('opacity-100');
    
    setTimeout(() => {
      this.elements.copiedNotice.classList.remove('opacity-100');
      this.elements.copiedNotice.classList.add('opacity-0');
    }, 2000);
  }
  
  /**
   * Show/hide loading overlay
   * @param {boolean} show - Whether to show loading
   */
  showLoading(show) {
    if (show) {
      this.elements.loadingOverlay.classList.remove('hidden');
    } else {
      this.elements.loadingOverlay.classList.add('hidden');
    }
  }
  
  /**
   * Toggle history section
   */
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
  
  /**
   * Render history items
   */
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
        <div class="history-text" data-id="${entry.id}">${truncateText(entry.rephrasedText, 80)}</div>
        <div class="history-actions">
          <button class="history-btn copy-btn" data-id="${entry.id}">
            <div class="history-btn-tooltip">Copy</div>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
            </svg>
          </button>
          <button class="history-btn reuse-btn" data-id="${entry.id}">
            <div class="history-btn-tooltip">Reuse</div>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
          </button>
          <button class="history-btn delete-btn text-red-600" data-id="${entry.id}">
            <div class="history-btn-tooltip">Delete</div>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
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
    
    // Add event listeners for clicking on history text (also triggers reuse)
    this.elements.historyContent.querySelectorAll('.history-text').forEach(text => {
      text.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        this.reuseHistoryEntry(id);
      });
    });
  }
  
  /**
   * Copy history entry to clipboard
   * @param {string} id - Entry ID
   */
  async copyHistoryEntry(id) {
    const history = this.storage.getHistory();
    const entry = history.find(e => e.id === id);
    
    if (entry) {
      await this.clipboard.copy(entry.rephrasedText);
      showToast('Copied to clipboard!', 'success');
    }
  }
  
  /**
   * Reuse history entry
   * @param {string} id - Entry ID
   */
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
  
  /**
   * Delete history entry
   * @param {string} id - Entry ID
   */
  deleteHistoryEntry(id) {
    this.storage.deleteHistoryEntry(id);
    this.renderHistory();
    showToast('Entry deleted');
  }
  
  /**
   * Open settings modal
   */
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
  
  /**
   * Close settings modal
   */
  closeSettings() {
    this.elements.settingsModal.classList.add('hidden');
  }
  
  /**
   * Save settings
   */
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
    showToast('Settings saved!', 'success');
  }
  
  /**
   * Mask API key for display
   * @param {string} key - API key
   * @returns {string} - Masked API key
   */
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
