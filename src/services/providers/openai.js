import { buildPrompt } from '../../utils/prompts.js';

/**
 * OpenAI provider for text rephrasing
 */
export class OpenAIProvider {
  /**
   * Create a new OpenAI provider
   * @param {string} apiKey - OpenAI API key
   */
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.openai.com/v1';
    this.model = 'gpt-4o-mini';
  }
  
  /**
   * Rephrase text using OpenAI
   * @param {string} text - Text to rephrase
   * @param {string} mode - Rephrasing mode
   * @param {string} tone - Tone of voice
   * @returns {Promise<string>} - Rephrased text
   */
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
  
  /**
   * Generate text using OpenAI with a custom prompt
   * @param {string} prompt - Custom prompt
   * @param {string} systemMessage - System message (optional)
   * @returns {Promise<string>} - Generated text
   */
  async generate(prompt, systemMessage = 'You are a helpful AI assistant.') {
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
            content: systemMessage
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
