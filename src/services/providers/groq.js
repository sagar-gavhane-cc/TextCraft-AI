import { buildPrompt } from '../../utils/prompts.js';

/**
 * Groq provider for text rephrasing
 */
export class GroqProvider {
  /**
   * Create a new Groq provider
   * @param {string} apiKey - Groq API key
   */
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.groq.com/openai/v1';
    this.model = 'llama-3.1-8b-instant';
  }
  
  /**
   * Rephrase text using Groq
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
      throw new Error(error.error?.message || `Groq error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content.trim();
  }
}
