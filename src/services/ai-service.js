import { OpenAIProvider } from './providers/openai.js';
import { GeminiProvider } from './providers/gemini.js';
import { GroqProvider } from './providers/groq.js';
import { OllamaProvider } from './providers/ollama.js';
import { AIProvider, DEFAULTS } from '../config.js';
import { buildJiraTicketPrompt, buildStandupPrompt, buildPromptEnhancementPrompt } from '../utils/prompts.js';

/**
 * Main AI service for orchestrating different providers
 */
export class AIService {
  /**
   * Create a new AI service
   * @param {Object} storageService - Storage service instance
   */
  constructor(storageService) {
    this.storage = storageService;
    this.providers = {};
    this.timeout = DEFAULTS.timeout;
  }
  
  /**
   * Rephrase text using the specified provider
   * @param {Object} request - Rephrase request
   * @param {string} request.model - Model name (optional)
   * @returns {Promise<string>} - Rephrased text
   */
  async rephrase(request) {
    const { text, mode, tone, provider, model } = request;
    
    // Initialize provider if not already done or if model changed
    if (!this.providers[provider] || (model && this.providers[provider].model !== model)) {
      await this.initializeProvider(provider, model);
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
  
  /**
   * Initialize a provider
   * @param {string} providerName - Provider name
   * @param {string} model - Model name (optional)
   */
  async initializeProvider(providerName, model = null) {
    const apiKeys = this.storage.getAPIKeys();
    const settings = this.storage.getSettings();
    const defaultModels = DEFAULTS.defaultModels || {};
    
    switch (providerName) {
      case AIProvider.OPENAI:
        if (apiKeys.openaiKey) {
          const selectedModel = model || settings.models?.openai || defaultModels.openai || 'gpt-4o-mini';
          this.providers[AIProvider.OPENAI] = new OpenAIProvider(apiKeys.openaiKey, selectedModel);
        }
        break;
        
      case AIProvider.GEMINI:
        if (apiKeys.geminiKey) {
          const selectedModel = model || settings.models?.gemini || defaultModels.gemini || 'gemini-1.5-flash';
          this.providers[AIProvider.GEMINI] = new GeminiProvider(apiKeys.geminiKey, selectedModel);
        }
        break;
        
      case AIProvider.GROQ:
        if (apiKeys.groqKey) {
          const selectedModel = model || settings.models?.groq || defaultModels.groq || 'llama-3.1-8b-instant';
          this.providers[AIProvider.GROQ] = new GroqProvider(apiKeys.groqKey, selectedModel);
        }
        break;
        
      case AIProvider.OLLAMA:
        const ollamaUrl = settings.ollamaUrl || DEFAULTS.ollamaUrl;
        const selectedModel = model || settings.models?.ollama || settings.ollamaModel || defaultModels.ollama || DEFAULTS.ollamaModel;
        this.providers[AIProvider.OLLAMA] = new OllamaProvider(ollamaUrl, selectedModel);
        break;
    }
  }
  
  /**
   * Try fallback provider if primary fails
   * @param {Object} request - Rephrase request
   * @param {string} failedProvider - Failed provider name
   * @returns {Promise<string|null>} - Rephrased text or null
   */
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
  
  /**
   * Get available providers
   * @returns {Promise<Array<string>>} - List of available providers
   */
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
  
  /**
   * Check if Ollama is available
   * @returns {Promise<boolean>} - Whether Ollama is available
   */
  async checkOllamaAvailability() {
    try {
      const settings = this.storage.getSettings();
      const ollamaUrl = settings.ollamaUrl || DEFAULTS.ollamaUrl;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const response = await fetch(`${ollamaUrl}/api/tags`, {
        signal: controller.signal,
        mode: 'cors',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      console.log('Ollama check response:', response.status);
      return response.ok;
      
    } catch (error) {
      console.error('Ollama availability check error:', error.message);
      return false;
    }
  }
  
  /**
   * Create a timeout promise
   * @returns {Promise<never>} - Timeout promise
   */
  createTimeout() {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Request timeout'));
      }, this.timeout);
    });
  }
  
  /**
   * Get user-friendly error message
   * @param {Error} error - Error object
   * @returns {string} - User-friendly error message
   */
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
  
  /**
   * Generate a Jira ticket from description
   * @param {Object} request - Jira ticket request
   * @param {string} request.description - Description of the issue/feature
   * @param {string} request.provider - Provider to use
   * @param {string} request.model - Model name (optional)
   * @returns {Promise<Object>} - Jira ticket object with type, title, description
   */
  async generateJiraTicket(request) {
    const { description, provider, model } = request;
    
    // Initialize provider if not already done or if model changed
    if (!this.providers[provider] || (model && this.providers[provider].model !== model)) {
      await this.initializeProvider(provider, model);
    }
    
    if (!this.providers[provider]) {
      throw new Error(`Provider ${provider} not available`);
    }
    
    try {
      const prompt = buildJiraTicketPrompt(description);
      const systemMessage = 'You are a Jira ticket generator. Return only valid JSON without any explanations.';
      
      const result = await Promise.race([
        this.providers[provider].generate(prompt, systemMessage),
        this.createTimeout()
      ]);
      
      // Parse JSON response
      try {
        // Clean up the response - remove markdown code blocks if present
        let cleanedResult = result.trim();
        if (cleanedResult.startsWith('```json')) {
          cleanedResult = cleanedResult.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        } else if (cleanedResult.startsWith('```')) {
          cleanedResult = cleanedResult.replace(/^```\n?/, '').replace(/\n?```$/, '');
        }
        
        const parsed = JSON.parse(cleanedResult);
        return {
          type: parsed.type || 'Task',
          title: parsed.title || '',
          description: parsed.description || ''
        };
      } catch (parseError) {
        // If JSON parsing fails, try to extract information from text
        console.error('Failed to parse JSON, attempting text extraction:', parseError);
        return {
          type: 'Task',
          title: description.substring(0, 80),
          description: result
        };
      }
      
    } catch (error) {
      console.error(`Error generating Jira ticket with ${provider}:`, error);
      
      // Try fallback to next available provider
      const fallbackResult = await this.tryFallbackJira(request, provider);
      if (fallbackResult) {
        return fallbackResult;
      }
      
      throw new Error(this.getUserFriendlyError(error));
    }
  }
  
  /**
   * Generate a standup summary from notes
   * @param {Object} request - Standup summary request
   * @param {string} request.notes - Standup notes
   * @param {string} request.provider - Provider to use
   * @param {string} request.model - Model name (optional)
   * @returns {Promise<string>} - Formatted standup summary
   */
  async generateStandupSummary(request) {
    const { notes, provider, model } = request;
    
    // Initialize provider if not already done or if model changed
    if (!this.providers[provider] || (model && this.providers[provider].model !== model)) {
      await this.initializeProvider(provider, model);
    }
    
    if (!this.providers[provider]) {
      throw new Error(`Provider ${provider} not available`);
    }
    
    try {
      const prompt = buildStandupPrompt(notes);
      const systemMessage = 'You are a professional standup summary generator. Return only the formatted summary text without any meta-commentary.';
      
      const result = await Promise.race([
        this.providers[provider].generate(prompt, systemMessage),
        this.createTimeout()
      ]);
      
      return result;
      
    } catch (error) {
      console.error(`Error generating standup summary with ${provider}:`, error);
      
      // Try fallback to next available provider
      const fallbackResult = await this.tryFallbackStandup(request, provider);
      if (fallbackResult) {
        return fallbackResult;
      }
      
      throw new Error(this.getUserFriendlyError(error));
    }
  }
  
  /**
   * Try fallback provider for Jira ticket generation
   * @param {Object} request - Jira ticket request
   * @param {string} failedProvider - Failed provider name
   * @returns {Promise<Object|null>} - Jira ticket or null
   */
  async tryFallbackJira(request, failedProvider) {
    const availableProviders = await this.getAvailableProviders();
    const fallbackProviders = availableProviders.filter(p => p !== failedProvider);
    
    if (fallbackProviders.length === 0) {
      return null;
    }
    
    console.log(`Trying fallback provider for Jira: ${fallbackProviders[0]}`);
    
    try {
      return await this.generateJiraTicket({
        ...request,
        provider: fallbackProviders[0]
      });
    } catch (error) {
      console.error('Fallback also failed:', error);
      return null;
    }
  }
  
  /**
   * Try fallback provider for standup summary generation
   * @param {Object} request - Standup summary request
   * @param {string} failedProvider - Failed provider name
   * @returns {Promise<string|null>} - Standup summary or null
   */
  async tryFallbackStandup(request, failedProvider) {
    const availableProviders = await this.getAvailableProviders();
    const fallbackProviders = availableProviders.filter(p => p !== failedProvider);
    
    if (fallbackProviders.length === 0) {
      return null;
    }
    
    console.log(`Trying fallback provider for standup: ${fallbackProviders[0]}`);
    
    try {
      return await this.generateStandupSummary({
        ...request,
        provider: fallbackProviders[0]
      });
    } catch (error) {
      console.error('Fallback also failed:', error);
      return null;
    }
  }
  
  /**
   * Enhance a prompt using the specified provider
   * @param {Object} request - Prompt enhancement request
   * @param {string} request.promptText - Original prompt text to enhance
   * @param {string} request.provider - Provider to use
   * @param {string} request.model - Model name (optional)
   * @returns {Promise<string>} - Enhanced prompt text
   */
  async enhancePrompt(request) {
    const { promptText, provider, model } = request;
    
    // Initialize provider if not already done or if model changed
    if (!this.providers[provider] || (model && this.providers[provider].model !== model)) {
      await this.initializeProvider(provider, model);
    }
    
    if (!this.providers[provider]) {
      throw new Error(`Provider ${provider} not available`);
    }
    
    try {
      const prompt = buildPromptEnhancementPrompt(promptText);
      const systemMessage = 'You are a professional prompt engineer. Return only the enhanced prompt without any explanations or metadata.';
      
      const result = await Promise.race([
        this.providers[provider].generate(prompt, systemMessage),
        this.createTimeout()
      ]);
      
      return result;
      
    } catch (error) {
      console.error(`Error enhancing prompt with ${provider}:`, error);
      
      // Try fallback to next available provider
      const fallbackResult = await this.tryFallbackPromptEnhancement(request, provider);
      if (fallbackResult) {
        return fallbackResult;
      }
      
      throw new Error(this.getUserFriendlyError(error));
    }
  }
  
  /**
   * Try fallback provider for prompt enhancement
   * @param {Object} request - Prompt enhancement request
   * @param {string} failedProvider - Failed provider name
   * @returns {Promise<string|null>} - Enhanced prompt or null
   */
  async tryFallbackPromptEnhancement(request, failedProvider) {
    const availableProviders = await this.getAvailableProviders();
    const fallbackProviders = availableProviders.filter(p => p !== failedProvider);
    
    if (fallbackProviders.length === 0) {
      return null;
    }
    
    console.log(`Trying fallback provider for prompt enhancement: ${fallbackProviders[0]}`);
    
    try {
      return await this.enhancePrompt({
        ...request,
        provider: fallbackProviders[0]
      });
    } catch (error) {
      console.error('Fallback also failed:', error);
      return null;
    }
  }
  
  /**
   * Get available models for a provider
   * @param {string} providerName - Provider name
   * @param {string} apiKey - API key for the provider (optional, will fetch from storage)
   * @returns {Promise<Array<string>>} - List of available model names
   */
  async getProviderModels(providerName, apiKey = null) {
    // Check cache first
    const maxAgeHours = 24; // Use 24 hours as default
    if (this.storage.isModelCacheValid(providerName, maxAgeHours)) {
      const cachedModels = this.storage.getCachedModels(providerName);
      if (cachedModels && cachedModels.length > 0) {
        console.log(`Using cached models for ${providerName}`);
        return cachedModels;
      }
    }
    
    // Cache is invalid or missing, fetch from API
    const apiKeys = this.storage.getAPIKeys();
    const settings = this.storage.getSettings();
    
    try {
      let models = [];
      
      switch (providerName) {
        case AIProvider.OPENAI:
          if (!apiKey) apiKey = apiKeys.openaiKey;
          if (!apiKey) return [];
          const openaiProvider = new OpenAIProvider(apiKey);
          models = await openaiProvider.listModels();
          break;
          
        case AIProvider.GEMINI:
          if (!apiKey) apiKey = apiKeys.geminiKey;
          if (!apiKey) return [];
          const geminiProvider = new GeminiProvider(apiKey);
          models = await geminiProvider.listModels();
          break;
          
        case AIProvider.GROQ:
          if (!apiKey) apiKey = apiKeys.groqKey;
          if (!apiKey) return [];
          const groqProvider = new GroqProvider(apiKey);
          models = await groqProvider.listModels();
          break;
          
        case AIProvider.OLLAMA:
          const ollamaUrl = settings.ollamaUrl || DEFAULTS.ollamaUrl;
          const ollamaProvider = new OllamaProvider(ollamaUrl);
          models = await ollamaProvider.listModels();
          break;
          
        default:
          return [];
      }
      
      // Cache the fetched models if we got any
      if (models && models.length > 0) {
        this.storage.saveCachedModels(providerName, models);
        console.log(`Cached ${models.length} models for ${providerName}`);
      }
      
      return models;
    } catch (error) {
      console.error(`Error fetching models for ${providerName}:`, error);
      
      // If API call fails, try to return cached models even if stale
      const cachedModels = this.storage.getCachedModels(providerName);
      if (cachedModels && cachedModels.length > 0) {
        console.log(`API call failed, using stale cached models for ${providerName}`);
        return cachedModels;
      }
      
      return [];
    }
  }
}
