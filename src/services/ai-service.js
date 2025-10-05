import { OpenAIProvider } from './providers/openai.js';
import { GeminiProvider } from './providers/gemini.js';
import { GroqProvider } from './providers/groq.js';
import { OllamaProvider } from './providers/ollama.js';
import { AIProvider, DEFAULTS } from '../config.js';

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
   * @returns {Promise<string>} - Rephrased text
   */
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
  
  /**
   * Initialize a provider
   * @param {string} providerName - Provider name
   */
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
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
      
    } catch (error) {
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
}
