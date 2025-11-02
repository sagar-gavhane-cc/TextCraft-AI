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
    
    if (availableProviders.length === 0) {
      const emptyOption = '<option value="">No API configured</option>';
      this.elements.providerSelect.innerHTML = emptyOption;
      this.elements.jiraProviderSelect.innerHTML = emptyOption;
      this.elements.standupProviderSelect.innerHTML = emptyOption;
      this.elements.rephraseBtn.disabled = true;
      this.elements.generateJiraBtn.disabled = true;
      this.elements.generateStandupBtn.disabled = true;
      return;
    }
    
    availableProviders.forEach(provider => {
      const option = document.createElement('option');
      option.value = provider.value;
      option.textContent = provider.label;
      this.elements.providerSelect.appendChild(option.cloneNode(true));
      this.elements.jiraProviderSelect.appendChild(option.cloneNode(true));
      this.elements.standupProviderSelect.appendChild(option.cloneNode(true));
    });
    
    // Set last used provider or first available
    const lastProvider = this.storage.getSettings().lastProvider;
    const selectedProvider = (lastProvider && availableProviders.some(p => p.value === lastProvider)) 
      ? lastProvider 
      : availableProviders[0].value;
    
    this.elements.providerSelect.value = selectedProvider;
    this.elements.jiraProviderSelect.value = selectedProvider;
    this.elements.standupProviderSelect.value = selectedProvider;
    
    this.currentProvider = selectedProvider;
    
    // Initialize model dropdowns for the selected provider
    if (selectedProvider) {
      await this.updateModelDropdown(selectedProvider);
    } else {
      // Disable model dropdowns if no provider
      this.elements.modelSelect.disabled = true;
      this.elements.jiraModelSelect.disabled = true;
      this.elements.standupModelSelect.disabled = true;
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
      this.elements.standupModelSelect
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
      this.currentProvider = activeProvider;
    }
    if (activeModel) {
      this.elements.modelSelect.value = activeModel;
      this.elements.jiraModelSelect.value = activeModel;
      this.elements.standupModelSelect.value = activeModel;
      this.currentModel = activeModel;
    }
    
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
      this.saveProviderSelection();
      
      // Update model dropdown when provider changes
      if (this.currentProvider) {
        await this.updateModelDropdown(this.currentProvider);
      } else {
        this.elements.modelSelect.disabled = true;
        this.elements.jiraModelSelect.disabled = true;
        this.elements.standupModelSelect.disabled = true;
      }
    });
    
    // Model select
    this.elements.modelSelect.addEventListener('change', (e) => {
      this.currentModel = e.target.value;
      this.elements.jiraModelSelect.value = e.target.value;
      this.elements.standupModelSelect.value = e.target.value;
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
      this.saveProviderSelection();
      
      // Update model dropdown when provider changes
      if (this.currentProvider) {
        await this.updateModelDropdown(this.currentProvider);
      } else {
        this.elements.modelSelect.disabled = true;
        this.elements.jiraModelSelect.disabled = true;
        this.elements.standupModelSelect.disabled = true;
      }
    });
    
    // Model select
    this.elements.jiraModelSelect.addEventListener('change', (e) => {
      this.currentModel = e.target.value;
      this.elements.modelSelect.value = e.target.value;
      this.elements.standupModelSelect.value = e.target.value;
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
      this.saveProviderSelection();
      
      // Update model dropdown when provider changes
      if (this.currentProvider) {
        await this.updateModelDropdown(this.currentProvider);
      } else {
        this.elements.modelSelect.disabled = true;
        this.elements.jiraModelSelect.disabled = true;
        this.elements.standupModelSelect.disabled = true;
      }
    });
    
    // Model select
    this.elements.standupModelSelect.addEventListener('change', (e) => {
      this.currentModel = e.target.value;
      this.elements.modelSelect.value = e.target.value;
      this.elements.jiraModelSelect.value = e.target.value;
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
   * Setup shared event listeners
   */
  setupSharedListeners() {
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
   * Show copied notice
   * @param {string} tab - Tab type ('rephraser', 'jira', 'standup')
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
    
    this.elements.historyContent.innerHTML = history.map(entry => {
      const type = entry.type || TAB_TYPES.REPHRASER;
      const badgeText = this.getHistoryBadgeText(entry);
      const displayText = this.getHistoryDisplayText(entry);
      
      return `
        <div class="history-item" data-id="${entry.id}">
          <div class="history-item-header">
            <span class="history-badge">${badgeText}</span>
            <span class="history-timestamp">${formatTimestamp(entry.timestamp)}</span>
          </div>
          <div class="history-text" data-id="${entry.id}">${truncateText(displayText, 80)}</div>
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
      `;
    }).join('');
    
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
      default:
        return entry.mode || 'Rephraser';
    }
  }
  
  /**
   * Get display text for history entry
   * @param {Object} entry - History entry
   * @returns {string} - Display text
   */
  getHistoryDisplayText(entry) {
    const type = entry.type || TAB_TYPES.REPHRASER;
    
    switch (type) {
      case TAB_TYPES.JIRA:
        if (entry.ticketData) {
          return entry.ticketData.title || entry.rephrasedText;
        }
        try {
          const parsed = JSON.parse(entry.rephrasedText);
          return parsed.title || entry.rephrasedText;
        } catch {
          return entry.rephrasedText;
        }
      case TAB_TYPES.STANDUP:
        return entry.rephrasedText;
      default:
        return entry.rephrasedText;
    }
  }
  
  /**
   * Copy history entry to clipboard
   * @param {string} id - Entry ID
   */
  async copyHistoryEntry(id) {
    const history = this.storage.getHistory();
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
    }
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
