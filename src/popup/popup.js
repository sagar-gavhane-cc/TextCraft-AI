import { StorageService } from '../services/storage.js';
import { AIService } from '../services/ai-service.js';
import { ClipboardService } from '../services/clipboard.js';
import { RephrasingMode, ToneOfVoice, AIProvider, DEFAULTS, TAB_TYPES } from '../config.js';
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
    this.currentModel = null;
    this.isProcessing = false;
    this.currentTab = TAB_TYPES.REPHRASER;
    
    // DOM elements
    this.elements = {
      // Tab navigation
      tabButtons: document.querySelectorAll('.tab-btn'),
      tabPanels: document.querySelectorAll('.tab-panel'),
      
      // Rephraser tab
      inputText: document.getElementById('inputText'),
      charCount: document.getElementById('charCount'),
      modeButtons: document.querySelectorAll('.mode-btn'),
      toneSelect: document.getElementById('toneSelect'),
      providerSelect: document.getElementById('providerSelect'),
      modelSelect: document.getElementById('modelSelect'),
      rephraseBtn: document.getElementById('rephraseBtn'),
      outputSection: document.getElementById('outputSection'),
      outputText: document.getElementById('outputText'),
      copiedNotice: document.getElementById('copiedNotice'),
      
      // Jira tab
      jiraInputText: document.getElementById('jiraInputText'),
      jiraCharCount: document.getElementById('jiraCharCount'),
      jiraProviderSelect: document.getElementById('jiraProviderSelect'),
      jiraModelSelect: document.getElementById('jiraModelSelect'),
      generateJiraBtn: document.getElementById('generateJiraBtn'),
      jiraOutputSection: document.getElementById('jiraOutputSection'),
      jiraType: document.getElementById('jiraType'),
      jiraTitle: document.getElementById('jiraTitle'),
      jiraDescription: document.getElementById('jiraDescription'),
      jiraCopiedNotice: document.getElementById('jiraCopiedNotice'),
      
      // Standup tab
      standupInputText: document.getElementById('standupInputText'),
      standupCharCount: document.getElementById('standupCharCount'),
      standupProviderSelect: document.getElementById('standupProviderSelect'),
      standupModelSelect: document.getElementById('standupModelSelect'),
      generateStandupBtn: document.getElementById('generateStandupBtn'),
      standupOutputSection: document.getElementById('standupOutputSection'),
      standupOutputText: document.getElementById('standupOutputText'),
      standupCopiedNotice: document.getElementById('standupCopiedNotice'),
      
      // Prompt Enhancer tab
      promptEnhancerInputText: document.getElementById('promptEnhancerInputText'),
      promptEnhancerCharCount: document.getElementById('promptEnhancerCharCount'),
      promptEnhancerProviderSelect: document.getElementById('promptEnhancerProviderSelect'),
      promptEnhancerModelSelect: document.getElementById('promptEnhancerModelSelect'),
      enhancePromptBtn: document.getElementById('enhancePromptBtn'),
      promptEnhancerOutputSection: document.getElementById('promptEnhancerOutputSection'),
      promptEnhancerOutputText: document.getElementById('promptEnhancerOutputText'),
      promptEnhancerCopiedNotice: document.getElementById('promptEnhancerCopiedNotice'),
      
      // Shared elements
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
      loadingText: document.getElementById('loadingText'),
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
      this.updateCharCount(this.elements.inputText, this.elements.charCount);
    }
    
    // Initialize providers
    await this.initializeProviders();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Load history
    this.renderHistory();
    
    // Auto-focus input based on current tab
    this.focusCurrentTabInput();
    
    const loadTime = performance.now() - startTime;
    console.log(`App initialized in ${loadTime.toFixed(2)}ms`);
  }
  
  /**
   * Focus input in current tab
   */
  focusCurrentTabInput() {
    switch (this.currentTab) {
      case TAB_TYPES.REPHRASER:
        this.elements.inputText?.focus();
        break;
      case TAB_TYPES.JIRA:
        this.elements.jiraInputText?.focus();
        break;
      case TAB_TYPES.STANDUP:
        this.elements.standupInputText?.focus();
        break;
      case TAB_TYPES.PROMPT_ENHANCER:
        this.elements.promptEnhancerInputText?.focus();
        break;
    }
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
    this.elements.jiraProviderSelect.innerHTML = '';
    this.elements.standupProviderSelect.innerHTML = '';
    this.elements.promptEnhancerProviderSelect.innerHTML = '';
    
    if (availableProviders.length === 0) {
      const emptyOption = '<option value="">No API configured</option>';
      this.elements.providerSelect.innerHTML = emptyOption;
      this.elements.jiraProviderSelect.innerHTML = emptyOption;
      this.elements.standupProviderSelect.innerHTML = emptyOption;
      this.elements.promptEnhancerProviderSelect.innerHTML = emptyOption;
      this.elements.rephraseBtn.disabled = true;
      this.elements.generateJiraBtn.disabled = true;
      this.elements.generateStandupBtn.disabled = true;
      this.elements.enhancePromptBtn.disabled = true;
      return;
    }
    
    availableProviders.forEach(provider => {
      const option = document.createElement('option');
      option.value = provider.value;
      option.textContent = provider.label;
      this.elements.providerSelect.appendChild(option.cloneNode(true));
      this.elements.jiraProviderSelect.appendChild(option.cloneNode(true));
      this.elements.standupProviderSelect.appendChild(option.cloneNode(true));
      this.elements.promptEnhancerProviderSelect.appendChild(option.cloneNode(true));
    });
    
    // Set last used provider or first available
    const lastProvider = this.storage.getSettings().lastProvider;
    const selectedProvider = (lastProvider && availableProviders.some(p => p.value === lastProvider)) 
      ? lastProvider 
      : availableProviders[0].value;
    
    this.elements.providerSelect.value = selectedProvider;
    this.elements.jiraProviderSelect.value = selectedProvider;
    this.elements.standupProviderSelect.value = selectedProvider;
    this.elements.promptEnhancerProviderSelect.value = selectedProvider;
    
    this.currentProvider = selectedProvider;
    
    // Initialize model dropdowns for the selected provider
    if (selectedProvider) {
      await this.updateModelDropdown(selectedProvider);
    } else {
      // Disable model dropdowns if no provider
      this.elements.modelSelect.disabled = true;
      this.elements.jiraModelSelect.disabled = true;
      this.elements.standupModelSelect.disabled = true;
      this.elements.promptEnhancerModelSelect.disabled = true;
    }
  }
  
  /**
   * Update model dropdown based on selected provider
   * @param {string} provider - Provider name
   */
  async updateModelDropdown(provider) {
    const settings = this.storage.getSettings();
    const defaultModels = DEFAULTS.defaultModels || {};
    
    // Get default model for this provider
    const defaultModel = settings.models?.[provider] || defaultModels[provider] || '';
    
    // Get all model select elements
    const modelSelects = [
      this.elements.modelSelect,
      this.elements.jiraModelSelect,
      this.elements.standupModelSelect,
      this.elements.promptEnhancerModelSelect
    ];
    
    // Clear all model dropdowns
    modelSelects.forEach(select => {
      select.innerHTML = '';
      select.disabled = false;
    });
    
    // Try to fetch models from API
    let availableModels = [];
    try {
      availableModels = await this.aiService.getProviderModels(provider);
    } catch (error) {
      console.error(`Failed to fetch models for ${provider}:`, error);
    }
    
    // If no models from API, use default model only
    if (availableModels.length === 0 && defaultModel) {
      availableModels = [defaultModel];
    }
    
    // If still no models, add default model as fallback
    if (availableModels.length === 0) {
      availableModels = defaultModel ? [defaultModel] : [];
    }
    
    // Populate model dropdowns
    modelSelects.forEach(select => {
      if (availableModels.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No models available';
        select.appendChild(option);
        select.disabled = true;
      } else {
        availableModels.forEach(model => {
          const option = document.createElement('option');
          option.value = model;
          option.textContent = model;
          select.appendChild(option.cloneNode(true));
        });
        
        // Set selected model
        const selectedModel = defaultModel && availableModels.includes(defaultModel) 
          ? defaultModel 
          : availableModels[0];
        select.value = selectedModel;
        this.currentModel = selectedModel;
      }
    });
  }
  
  /**
   * Save model selection for the current provider
   */
  saveModelSelection() {
    if (!this.currentProvider || !this.currentModel) return;
    
    const settings = this.storage.getSettings();
    if (!settings.models) {
      settings.models = {};
    }
    settings.models[this.currentProvider] = this.currentModel;
    this.storage.saveSettings(settings);
  }
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Tab switching
    this.elements.tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.target.dataset.tab;
        this.switchTab(tab);
      });
    });
    
    // Rephraser tab
    this.setupRephraserListeners();
    
    // Jira tab
    this.setupJiraListeners();
    
    // Standup tab
    this.setupStandupListeners();
    
    // Prompt Enhancer tab
    this.setupPromptEnhancerListeners();
    
    // Shared listeners
    this.setupSharedListeners();
  }
  
  /**
   * Switch to a different tab
   * @param {string} tab - Tab to switch to
   */
  switchTab(tab) {
    this.currentTab = tab;
    
    // Update tab buttons
    this.elements.tabButtons.forEach(btn => {
      if (btn.dataset.tab === tab) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    
    // Update tab panels
    this.elements.tabPanels.forEach(panel => {
      if (panel.id === `tab-${tab}`) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    });
    
    // Sync provider selection across tabs
    const activeProvider = this.currentProvider || this.elements.providerSelect.value;
    const activeModel = this.currentModel || this.elements.modelSelect.value;
    if (activeProvider) {
      this.elements.providerSelect.value = activeProvider;
      this.elements.jiraProviderSelect.value = activeProvider;
      this.elements.standupProviderSelect.value = activeProvider;
      this.elements.promptEnhancerProviderSelect.value = activeProvider;
      this.currentProvider = activeProvider;
    }
    if (activeModel) {
      this.elements.modelSelect.value = activeModel;
      this.elements.jiraModelSelect.value = activeModel;
      this.elements.standupModelSelect.value = activeModel;
      this.elements.promptEnhancerModelSelect.value = activeModel;
      this.currentModel = activeModel;
    }
    
    // Refresh history display for the new tab
    this.renderHistory();
    
    // Focus input in new tab
    setTimeout(() => this.focusCurrentTabInput(), 100);
  }
  
  /**
   * Setup event listeners for Rephraser tab
   */
  setupRephraserListeners() {
    // Input text area
    this.elements.inputText.addEventListener('input', () => {
      this.updateCharCount(this.elements.inputText, this.elements.charCount);
      this.validateInput(this.elements.inputText);
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
    this.elements.providerSelect.addEventListener('change', async (e) => {
      this.currentProvider = e.target.value;
      this.elements.jiraProviderSelect.value = e.target.value;
      this.elements.standupProviderSelect.value = e.target.value;
      this.elements.promptEnhancerProviderSelect.value = e.target.value;
      this.saveProviderSelection();
      
      // Update model dropdown when provider changes
      if (this.currentProvider) {
        await this.updateModelDropdown(this.currentProvider);
      } else {
        this.elements.modelSelect.disabled = true;
        this.elements.jiraModelSelect.disabled = true;
        this.elements.standupModelSelect.disabled = true;
        this.elements.promptEnhancerModelSelect.disabled = true;
      }
    });
    
    // Model select
    this.elements.modelSelect.addEventListener('change', (e) => {
      this.currentModel = e.target.value;
      this.elements.jiraModelSelect.value = e.target.value;
      this.elements.standupModelSelect.value = e.target.value;
      this.elements.promptEnhancerModelSelect.value = e.target.value;
      this.saveModelSelection();
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
  }
  
  /**
   * Setup event listeners for Jira tab
   */
  setupJiraListeners() {
    // Input text area
    this.elements.jiraInputText.addEventListener('input', () => {
      this.updateCharCount(this.elements.jiraInputText, this.elements.jiraCharCount);
      this.validateInput(this.elements.jiraInputText);
    });
    
    // Provider select
    this.elements.jiraProviderSelect.addEventListener('change', async (e) => {
      this.currentProvider = e.target.value;
      this.elements.providerSelect.value = e.target.value;
      this.elements.standupProviderSelect.value = e.target.value;
      this.elements.promptEnhancerProviderSelect.value = e.target.value;
      this.saveProviderSelection();
      
      // Update model dropdown when provider changes
      if (this.currentProvider) {
        await this.updateModelDropdown(this.currentProvider);
      } else {
        this.elements.modelSelect.disabled = true;
        this.elements.jiraModelSelect.disabled = true;
        this.elements.standupModelSelect.disabled = true;
        this.elements.promptEnhancerModelSelect.disabled = true;
      }
    });
    
    // Model select
    this.elements.jiraModelSelect.addEventListener('change', (e) => {
      this.currentModel = e.target.value;
      this.elements.modelSelect.value = e.target.value;
      this.elements.standupModelSelect.value = e.target.value;
      this.elements.promptEnhancerModelSelect.value = e.target.value;
      this.saveModelSelection();
    });
    
    // Generate button
    this.elements.generateJiraBtn.addEventListener('click', () => {
      this.handleGenerateJira();
    });
    
    // Enter key to generate (Ctrl/Cmd + Enter)
    this.elements.jiraInputText.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.handleGenerateJira();
      }
    });
  }
  
  /**
   * Setup event listeners for Standup tab
   */
  setupStandupListeners() {
    // Input text area
    this.elements.standupInputText.addEventListener('input', () => {
      this.updateCharCount(this.elements.standupInputText, this.elements.standupCharCount);
      this.validateInput(this.elements.standupInputText);
    });
    
    // Provider select
    this.elements.standupProviderSelect.addEventListener('change', async (e) => {
      this.currentProvider = e.target.value;
      this.elements.providerSelect.value = e.target.value;
      this.elements.jiraProviderSelect.value = e.target.value;
      this.elements.promptEnhancerProviderSelect.value = e.target.value;
      this.saveProviderSelection();
      
      // Update model dropdown when provider changes
      if (this.currentProvider) {
        await this.updateModelDropdown(this.currentProvider);
      } else {
        this.elements.modelSelect.disabled = true;
        this.elements.jiraModelSelect.disabled = true;
        this.elements.standupModelSelect.disabled = true;
        this.elements.promptEnhancerModelSelect.disabled = true;
      }
    });
    
    // Model select
    this.elements.standupModelSelect.addEventListener('change', (e) => {
      this.currentModel = e.target.value;
      this.elements.modelSelect.value = e.target.value;
      this.elements.jiraModelSelect.value = e.target.value;
      this.elements.promptEnhancerModelSelect.value = e.target.value;
      this.saveModelSelection();
    });
    
    // Generate button
    this.elements.generateStandupBtn.addEventListener('click', () => {
      this.handleGenerateStandup();
    });
    
      // Enter key to generate (Ctrl/Cmd + Enter)
      this.elements.standupInputText.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          this.handleGenerateStandup();
        }
      });
    }
  
  /**
   * Setup event listeners for Prompt Enhancer tab
   */
  setupPromptEnhancerListeners() {
    // Input text area
    this.elements.promptEnhancerInputText.addEventListener('input', () => {
      this.updateCharCount(this.elements.promptEnhancerInputText, this.elements.promptEnhancerCharCount);
      this.validateInput(this.elements.promptEnhancerInputText);
    });
    
    // Provider select
    this.elements.promptEnhancerProviderSelect.addEventListener('change', async (e) => {
      this.currentProvider = e.target.value;
      this.elements.providerSelect.value = e.target.value;
      this.elements.jiraProviderSelect.value = e.target.value;
      this.elements.standupProviderSelect.value = e.target.value;
      this.saveProviderSelection();
      
      // Update model dropdown when provider changes
      if (this.currentProvider) {
        await this.updateModelDropdown(this.currentProvider);
      } else {
        this.elements.modelSelect.disabled = true;
        this.elements.jiraModelSelect.disabled = true;
        this.elements.standupModelSelect.disabled = true;
        this.elements.promptEnhancerModelSelect.disabled = true;
      }
    });
    
    // Model select
    this.elements.promptEnhancerModelSelect.addEventListener('change', (e) => {
      this.currentModel = e.target.value;
      this.elements.modelSelect.value = e.target.value;
      this.elements.jiraModelSelect.value = e.target.value;
      this.elements.standupModelSelect.value = e.target.value;
      this.saveModelSelection();
    });
    
    // Enhance button
    this.elements.enhancePromptBtn.addEventListener('click', () => {
      this.handleEnhancePrompt();
    });
    
    // Enter key to enhance (Ctrl/Cmd + Enter)
    this.elements.promptEnhancerInputText.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.handleEnhancePrompt();
      }
    });
  }
  
  /**
   * Setup shared event listeners
   */
  setupSharedListeners() {
    // History toggle
    this.elements.historyToggle.addEventListener('click', () => {
      this.toggleHistory();
    });
    
    // Clear history
    this.elements.clearHistoryBtn.addEventListener('click', () => {
      if (confirm('Clear history for this tab?')) {
        this.storage.clearHistory(this.currentTab);
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
   * Save provider selection
   */
  saveProviderSelection() {
    this.storage.saveSettings({
      ...this.storage.getSettings(),
      lastProvider: this.currentProvider
    });
  }
  
  /**
   * Update character count
   * @param {HTMLElement} inputElement - Input element
   * @param {HTMLElement} countElement - Count display element
   */
  updateCharCount(inputElement = this.elements.inputText, countElement = this.elements.charCount) {
    const count = inputElement.value.length;
    countElement.textContent = count;
    
    // Update color based on length
    if (count > 1800) {
      countElement.classList.add('text-red-600');
      countElement.classList.remove('text-yellow-600');
    } else if (count > 1500) {
      countElement.classList.add('text-yellow-600');
      countElement.classList.remove('text-red-600');
    } else {
      countElement.classList.remove('text-red-600', 'text-yellow-600');
    }
  }
  
  /**
   * Validate input text
   * @param {HTMLElement} inputElement - Input element to validate
   * @returns {boolean} - Whether input is valid
   */
  validateInput(inputElement = this.elements.inputText) {
    const text = inputElement.value.trim();
    const isValid = text.length >= 10 && text.length <= 2000;
    
    if (!isValid) {
      inputElement.classList.add('border-red-500');
    } else {
      inputElement.classList.remove('border-red-500');
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
    this.showLoading(true, 'Rephrasing...');
    this.elements.rephraseBtn.disabled = true;
    
    try {
      const result = await this.aiService.rephrase({
        text,
        mode: this.currentMode,
        tone: this.currentTone,
        provider: this.currentProvider,
        model: this.currentModel || this.elements.modelSelect.value
      });
      
      // Display result
      this.displayResult(result);
      
      // Copy to clipboard
      await this.clipboard.copy(result);
      this.showCopiedNotice();
      
      // Save to history
      this.storage.addHistory({
        type: TAB_TYPES.REPHRASER,
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
   * Handle Jira ticket generation
   */
  async handleGenerateJira() {
    if (this.isProcessing) return;
    
    const description = this.elements.jiraInputText.value.trim();
    
    if (!this.validateInput(this.elements.jiraInputText)) {
      showToast('Please enter a description between 10 and 2000 characters', 'error');
      return;
    }
    
    const provider = this.elements.jiraProviderSelect.value;
    if (!provider) {
      showToast('Please configure an API key in settings', 'error');
      this.openSettings();
      return;
    }
    
    this.isProcessing = true;
    this.showLoading(true, 'Generating ticket...');
    this.elements.generateJiraBtn.disabled = true;
    
    try {
      const ticket = await this.aiService.generateJiraTicket({
        description,
        provider,
        model: this.currentModel || this.elements.jiraModelSelect.value
      });
      
      // Display result
      this.displayJiraResult(ticket);
      
      // Copy full ticket to clipboard
      const ticketText = `Type: ${ticket.type}\nTitle: ${ticket.title}\n\nDescription:\n${ticket.description}`;
      await this.clipboard.copy(ticketText);
      this.showCopiedNotice(TAB_TYPES.JIRA);
      
      // Save to history
      this.storage.addHistory({
        type: TAB_TYPES.JIRA,
        originalText: description,
        rephrasedText: JSON.stringify(ticket),
        provider: provider,
        ticketData: ticket
      });
      
      // Refresh history display
      this.renderHistory();
      
      // Save provider selection
      this.saveProviderSelection();
      
    } catch (error) {
      console.error('Jira generation error:', error);
      showToast(error.message || 'Failed to generate Jira ticket', 'error');
    } finally {
      this.isProcessing = false;
      this.showLoading(false);
      this.elements.generateJiraBtn.disabled = false;
    }
  }
  
  /**
   * Display Jira ticket result
   * @param {Object} ticket - Ticket object with type, title, description
   */
  displayJiraResult(ticket) {
    this.elements.jiraType.textContent = ticket.type || 'Task';
    this.elements.jiraTitle.textContent = ticket.title || '';
    this.elements.jiraDescription.textContent = ticket.description || '';
    this.elements.jiraOutputSection.classList.remove('hidden');
    this.elements.jiraOutputSection.classList.add('slide-down');
    
    // Scroll to output
    this.elements.jiraOutputSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  
  /**
   * Handle standup summary generation
   */
  async handleGenerateStandup() {
    if (this.isProcessing) return;
    
    const notes = this.elements.standupInputText.value.trim();
    
    if (!this.validateInput(this.elements.standupInputText)) {
      showToast('Please enter notes between 10 and 2000 characters', 'error');
      return;
    }
    
    const provider = this.elements.standupProviderSelect.value;
    if (!provider) {
      showToast('Please configure an API key in settings', 'error');
      this.openSettings();
      return;
    }
    
    this.isProcessing = true;
    this.showLoading(true, 'Generating summary...');
    this.elements.generateStandupBtn.disabled = true;
    
    try {
      const summary = await this.aiService.generateStandupSummary({
        notes,
        provider,
        model: this.currentModel || this.elements.standupModelSelect.value
      });
      
      // Display result
      this.displayStandupResult(summary);
      
      // Copy to clipboard
      await this.clipboard.copy(summary);
      this.showCopiedNotice(TAB_TYPES.STANDUP);
      
      // Save to history
      this.storage.addHistory({
        type: TAB_TYPES.STANDUP,
        originalText: notes,
        rephrasedText: summary,
        provider: provider
      });
      
      // Refresh history display
      this.renderHistory();
      
      // Save provider selection
      this.saveProviderSelection();
      
    } catch (error) {
      console.error('Standup generation error:', error);
      showToast(error.message || 'Failed to generate standup summary', 'error');
    } finally {
      this.isProcessing = false;
      this.showLoading(false);
      this.elements.generateStandupBtn.disabled = false;
    }
  }
  
  /**
   * Display standup summary result
   * @param {string} summary - Standup summary text
   */
  displayStandupResult(summary) {
    this.elements.standupOutputText.textContent = summary;
    this.elements.standupOutputSection.classList.remove('hidden');
    this.elements.standupOutputSection.classList.add('slide-down');
    
    // Scroll to output
    this.elements.standupOutputSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  
  /**
   * Handle prompt enhancement
   */
  async handleEnhancePrompt() {
    if (this.isProcessing) return;
    
    const promptText = this.elements.promptEnhancerInputText.value.trim();
    
    if (!this.validateInput(this.elements.promptEnhancerInputText)) {
      showToast('Please enter a prompt between 10 and 2000 characters', 'error');
      return;
    }
    
    const provider = this.elements.promptEnhancerProviderSelect.value;
    if (!provider) {
      showToast('Please configure an API key in settings', 'error');
      this.openSettings();
      return;
    }
    
    this.isProcessing = true;
    this.showLoading(true, 'Enhancing prompt...');
    this.elements.enhancePromptBtn.disabled = true;
    
    try {
      const enhancedPrompt = await this.aiService.enhancePrompt({
        promptText,
        provider,
        model: this.currentModel || this.elements.promptEnhancerModelSelect.value
      });
      
      // Display result
      this.displayPromptEnhancerResult(enhancedPrompt);
      
      // Copy to clipboard
      await this.clipboard.copy(enhancedPrompt);
      this.showCopiedNotice(TAB_TYPES.PROMPT_ENHANCER);
      
      // Save to history
      this.storage.addHistory({
        type: TAB_TYPES.PROMPT_ENHANCER,
        originalText: promptText,
        rephrasedText: enhancedPrompt,
        provider: provider
      });
      
      // Refresh history display
      this.renderHistory();
      
      // Save provider selection
      this.saveProviderSelection();
      
    } catch (error) {
      console.error('Prompt enhancement error:', error);
      showToast(error.message || 'Failed to enhance prompt', 'error');
    } finally {
      this.isProcessing = false;
      this.showLoading(false);
      this.elements.enhancePromptBtn.disabled = false;
    }
  }
  
  /**
   * Display prompt enhancer result
   * @param {string} enhancedPrompt - Enhanced prompt text
   */
  displayPromptEnhancerResult(enhancedPrompt) {
    this.elements.promptEnhancerOutputText.textContent = enhancedPrompt;
    this.elements.promptEnhancerOutputSection.classList.remove('hidden');
    this.elements.promptEnhancerOutputSection.classList.add('slide-down');
    
    // Scroll to output
    this.elements.promptEnhancerOutputSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  
  /**
   * Show copied notice
   * @param {string} tab - Tab type ('rephraser', 'jira', 'standup', 'prompt-enhancer')
   */
  showCopiedNotice(tab = 'rephraser') {
    let noticeElement;
    switch (tab) {
      case TAB_TYPES.JIRA:
        noticeElement = this.elements.jiraCopiedNotice;
        break;
      case TAB_TYPES.STANDUP:
        noticeElement = this.elements.standupCopiedNotice;
        break;
      case TAB_TYPES.PROMPT_ENHANCER:
        noticeElement = this.elements.promptEnhancerCopiedNotice;
        break;
      default:
        noticeElement = this.elements.copiedNotice;
    }
    
    noticeElement.classList.remove('opacity-0');
    noticeElement.classList.add('opacity-100');
    
    setTimeout(() => {
      noticeElement.classList.remove('opacity-100');
      noticeElement.classList.add('opacity-0');
    }, 2000);
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
   * Show/hide loading overlay
   * @param {boolean} show - Whether to show loading
   * @param {string} message - Loading message
   */
  showLoading(show, message = 'Processing...') {
    if (show) {
      this.elements.loadingText.textContent = message;
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
   * Render history items for the current tab
   */
  renderHistory() {
    const history = this.storage.getHistory(this.currentTab);
    this.elements.historyCount.textContent = history.length;
    
    if (history.length === 0) {
      this.elements.historyContent.innerHTML = '<p class="text-sm text-gray-500 text-center py-4">No history yet</p>';
      this.elements.clearHistoryBtn.classList.add('hidden');
      return;
    }
    
    this.elements.clearHistoryBtn.classList.remove('hidden');
    
    this.elements.historyContent.innerHTML = history.map(entry => {
      const badgeText = this.getHistoryBadgeText(entry);
      const inputText = entry.originalText || '';
      const outputText = entry.rephrasedText || '';
      
      // Escape HTML for safe display
      const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      };
      
      return `
        <div class="history-item" data-id="${entry.id}">
          <div class="history-item-header">
            <span class="history-badge">${badgeText}</span>
            <span class="history-timestamp">${formatTimestamp(entry.timestamp)}</span>
          </div>
          <div class="history-content-section">
            <div class="history-input-section">
              <div class="history-section-label">Input:</div>
              <div class="history-text-scrollable whitespace-pre-wrap">${escapeHtml(inputText)}</div>
              <button class="history-btn copy-input-btn" data-id="${entry.id}">
                <div class="history-btn-tooltip">Copy Input</div>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
              </button>
            </div>
            <div class="history-output-section">
              <div class="history-section-label">Output:</div>
              <div class="history-text-scrollable whitespace-pre-wrap">${escapeHtml(outputText)}</div>
              <button class="history-btn copy-output-btn" data-id="${entry.id}">
                <div class="history-btn-tooltip">Copy Output</div>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
              </button>
            </div>
          </div>
          <div class="history-actions">
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
      `;
    }).join('');
    
    // Add event listeners for history actions
    this.elements.historyContent.querySelectorAll('.copy-input-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        this.copyInputHistoryEntry(id);
      });
    });
    
    this.elements.historyContent.querySelectorAll('.copy-output-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        this.copyOutputHistoryEntry(id);
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
  
  /**
   * Get badge text for history entry
   * @param {Object} entry - History entry
   * @returns {string} - Badge text
   */
  getHistoryBadgeText(entry) {
    const type = entry.type || TAB_TYPES.REPHRASER;
    
    switch (type) {
      case TAB_TYPES.JIRA:
        return entry.ticketData?.type || 'Jira';
      case TAB_TYPES.STANDUP:
        return 'Standup';
      case TAB_TYPES.PROMPT_ENHANCER:
        return 'Prompt Enhancer';
      default:
        return entry.mode || 'Rephraser';
    }
  }
  
  /**
   * Copy input text from history entry to clipboard
   * @param {string} id - Entry ID
   */
  async copyInputHistoryEntry(id) {
    const history = this.storage.getHistory(this.currentTab);
    const entry = history.find(e => e.id === id);
    
    if (entry && entry.originalText) {
      await this.clipboard.copy(entry.originalText);
      
      // Show visual feedback on button
      const button = this.elements.historyContent.querySelector(`.copy-input-btn[data-id="${id}"]`);
      if (button) {
        this.showCopyFeedback(button, 'Input');
      }
      
      showToast('Input copied to clipboard!', 'success');
    }
  }
  
  /**
   * Copy output text from history entry to clipboard
   * @param {string} id - Entry ID
   */
  async copyOutputHistoryEntry(id) {
    const history = this.storage.getHistory(this.currentTab);
    const entry = history.find(e => e.id === id);
    
    if (entry) {
      let textToCopy = entry.rephrasedText;
      const type = entry.type || TAB_TYPES.REPHRASER;
      
      if (type === TAB_TYPES.JIRA) {
        if (entry.ticketData) {
          textToCopy = `Type: ${entry.ticketData.type}\nTitle: ${entry.ticketData.title}\n\nDescription:\n${entry.ticketData.description}`;
        } else {
          try {
            const parsed = JSON.parse(entry.rephrasedText);
            textToCopy = `Type: ${parsed.type}\nTitle: ${parsed.title}\n\nDescription:\n${parsed.description}`;
          } catch {
            textToCopy = entry.rephrasedText;
          }
        }
      }
      
      await this.clipboard.copy(textToCopy);
      
      // Show visual feedback on button
      const button = this.elements.historyContent.querySelector(`.copy-output-btn[data-id="${id}"]`);
      if (button) {
        this.showCopyFeedback(button, 'Output');
      }
      
      showToast('Output copied to clipboard!', 'success');
    }
  }
  
  /**
   * Show visual feedback on copy button
   * @param {HTMLElement} button - Copy button element
   * @param {string} type - Type of copy ('Input' or 'Output')
   */
  showCopyFeedback(button, type) {
    // Save original content
    const originalContent = button.innerHTML;
    
    // Change to checkmark icon
    button.innerHTML = `
      <div class="history-btn-tooltip">${type} Copied!</div>
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
    `;
    
    // Add copied class
    button.classList.add('copied');
    
    // Restore original after 2 seconds
    setTimeout(() => {
      button.innerHTML = originalContent;
      button.classList.remove('copied');
    }, 2000);
  }
  
  /**
   * Reuse history entry
   * @param {string} id - Entry ID
   */
  reuseHistoryEntry(id) {
    // Get entry from current tab's history
    const history = this.storage.getHistory(this.currentTab);
    const entry = history.find(e => e.id === id);
    
    if (!entry) return;
    
    const type = entry.type || TAB_TYPES.REPHRASER;
    
    // Switch to appropriate tab
    this.switchTab(type);
    
    // Set input based on type
    switch (type) {
      case TAB_TYPES.JIRA:
        this.elements.jiraInputText.value = entry.originalText;
        this.updateCharCount(this.elements.jiraInputText, this.elements.jiraCharCount);
        setTimeout(() => this.elements.jiraInputText.focus(), 200);
        break;
      case TAB_TYPES.STANDUP:
        this.elements.standupInputText.value = entry.originalText;
        this.updateCharCount(this.elements.standupInputText, this.elements.standupCharCount);
        setTimeout(() => this.elements.standupInputText.focus(), 200);
        break;
      case TAB_TYPES.PROMPT_ENHANCER:
        this.elements.promptEnhancerInputText.value = entry.originalText;
        this.updateCharCount(this.elements.promptEnhancerInputText, this.elements.promptEnhancerCharCount);
        setTimeout(() => this.elements.promptEnhancerInputText.focus(), 200);
        break;
      default:
        // Rephraser tab
        this.elements.inputText.value = entry.originalText;
        this.updateCharCount(this.elements.inputText, this.elements.charCount);
        if (entry.mode) {
          this.setActiveMode(entry.mode);
          this.currentMode = entry.mode;
        }
        if (entry.tone) {
          this.elements.toneSelect.value = entry.tone;
          this.currentTone = entry.tone;
        }
        setTimeout(() => this.elements.inputText.focus(), 200);
    }
    
    // Sync provider
    if (entry.provider) {
      this.currentProvider = entry.provider;
      this.elements.providerSelect.value = entry.provider;
      this.elements.jiraProviderSelect.value = entry.provider;
      this.elements.standupProviderSelect.value = entry.provider;
      this.elements.promptEnhancerProviderSelect.value = entry.provider;
    }
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  
  /**
   * Delete history entry
   * @param {string} id - Entry ID
   */
  deleteHistoryEntry(id) {
    this.storage.deleteHistoryEntry(id, this.currentTab);
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
