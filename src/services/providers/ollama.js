import { buildPrompt } from '../../utils/prompts.js';

/**
 * Ollama provider for local text rephrasing
 */
export class OllamaProvider {
  /**
   * Create a new Ollama provider
   * @param {string} baseUrl - Ollama API URL
   * @param {string} model - Ollama model name
   */
  constructor(baseUrl = 'http://localhost:11434', model = 'llama3.2') {
    this.baseUrl = baseUrl;
    this.model = model;
  }
  
  /**
   * Rephrase text using Ollama
   * @param {string} text - Text to rephrase
   * @param {string} mode - Rephrasing mode
   * @param {string} tone - Tone of voice
   * @returns {Promise<string>} - Rephrased text
   */
  async rephrase(text, mode, tone) {
    const prompt = buildPrompt(text, mode, tone);
    
    try {
      console.log(`Sending request to Ollama at ${this.baseUrl}`);
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'cors',
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.7,
            num_predict: 2000
          }
        })
      });
      
      if (!response.ok) {
        console.error(`Ollama error: ${response.status} - ${response.statusText}`);
        throw new Error(`Ollama error: ${response.status}`);
      }
      
      const data = await response.json();
      return data.response.trim();
    } catch (error) {
      console.error('Ollama rephrase error:', error);
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('Cannot connect to Ollama. Make sure Ollama is running locally and accessible.');
      }
      throw error;
    }
  }

  /**
   * Check if Ollama is available
   * @returns {Promise<boolean>} - Whether Ollama is available
   */
  async isAvailable() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: controller.signal,
        mode: 'cors',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      console.log('Ollama availability check:', response.status, response.statusText);
      return response.ok;
    } catch (error) {
      console.error('Ollama availability check error:', error);
      return false;
    }
  }

  /**
   * List available models
   * @returns {Promise<Array<string>>} - List of available models
   */
  async listModels() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.error('Failed to fetch Ollama models:', response.status, response.statusText);
        return [];
      }
      
      const data = await response.json();
      console.log('Ollama models:', data);
      return data.models ? data.models.map(m => m.name) : [];
    } catch (error) {
      console.error('Error listing Ollama models:', error);
      return [];
    }
  }
}
