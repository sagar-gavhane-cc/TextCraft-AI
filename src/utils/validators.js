/**
 * Validate input text length
 * @param {string} text - Text to validate
 * @param {number} minLength - Minimum allowed length
 * @param {number} maxLength - Maximum allowed length
 * @returns {boolean} - Whether the text is valid
 */
export function validateTextLength(text, minLength = 10, maxLength = 2000) {
  if (!text) return false;
  const trimmedText = text.trim();
  return trimmedText.length >= minLength && trimmedText.length <= maxLength;
}

/**
 * Validate OpenAI API key format
 * @param {string} key - API key to validate
 * @returns {boolean} - Whether the key format is valid
 */
export function validateOpenAIKey(key) {
  if (!key) return false;
  return /^sk-[a-zA-Z0-9]{32,}$/.test(key.trim());
}

/**
 * Validate Gemini API key format
 * @param {string} key - API key to validate
 * @returns {boolean} - Whether the key format is valid
 */
export function validateGeminiKey(key) {
  if (!key) return false;
  return /^AIza[a-zA-Z0-9_-]{35,}$/.test(key.trim());
}

/**
 * Validate Groq API key format
 * @param {string} key - API key to validate
 * @returns {boolean} - Whether the key format is valid
 */
export function validateGroqKey(key) {
  if (!key) return false;
  return /^gsk_[a-zA-Z0-9]{32,}$/.test(key.trim());
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} - Whether the URL format is valid
 */
export function validateUrl(url) {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Check if a string is a masked API key
 * @param {string} value - Value to check
 * @returns {boolean} - Whether the value is a masked API key
 */
export function isMaskedApiKey(value) {
  return value && value.includes('•');
}
