/**
 * Builds a prompt for the AI model based on the rephrasing mode and tone
 * @param {string} text - Original text to rephrase
 * @param {string} mode - Rephrasing mode (simplify, improve, detail, shorten)
 * @param {string} tone - Tone of voice (professional, casual, friendly, direct)
 * @returns {string} - Complete prompt for the AI model
 */
export function buildPrompt(text, mode, tone) {
  const modeInstructions = getModeInstructions(mode);
  const toneInstructions = getToneInstructions(tone);
  
  return `
TASK: Rephrase the following text.

MODE: ${modeInstructions}

TONE: ${toneInstructions}

TEXT TO REPHRASE:
"""
${text}
"""

IMPORTANT INSTRUCTIONS:
- Return ONLY the rephrased text without any explanations or meta-commentary
- Maintain the original meaning and intent
- Do not add any prefixes like "Rephrased:" or similar
- Preserve any technical terminology, names, or specific jargon
- Ensure the output is grammatically correct and flows naturally
`.trim();
}

/**
 * Get specific instructions for the selected rephrasing mode
 * @param {string} mode - Rephrasing mode
 * @returns {string} - Mode-specific instructions
 */
function getModeInstructions(mode) {
  switch (mode) {
    case 'simplify':
      return 'Simplify the text to make it more accessible and easier to understand. Use shorter sentences, simpler vocabulary, and clearer structure while preserving the original meaning.';
    
    case 'improve':
      return 'Improve the text by enhancing clarity, flow, and overall quality. Fix awkward phrasing, improve word choice, and ensure professional-level writing quality.';
    
    case 'detail':
      return 'Add more detail and depth to the text. Expand on key points, provide more context, and make the content more comprehensive while maintaining the original message.';
    
    case 'shorten':
      return 'Make the text more concise without losing important information. Remove redundancies, eliminate unnecessary words, and focus on delivering the core message efficiently.';
    
    default:
      return 'Improve the text by enhancing clarity, flow, and overall quality.';
  }
}

/**
 * Get specific instructions for the selected tone of voice
 * @param {string} tone - Tone of voice
 * @returns {string} - Tone-specific instructions
 */
function getToneInstructions(tone) {
  switch (tone) {
    case 'professional':
      return 'Use a professional, business-appropriate tone. Be clear, precise, and formal without being stiff. Use industry-standard terminology where appropriate.';
    
    case 'casual':
      return 'Use a casual, conversational tone as if speaking to a friend. Be relaxed and natural, using contractions and everyday language.';
    
    case 'friendly':
      return 'Use a warm, approachable, and positive tone. Be encouraging and supportive, focusing on building rapport with the reader.';
    
    case 'direct':
      return 'Use a straightforward, no-nonsense tone. Be concise, clear, and to the point without unnecessary elaboration.';
    
    default:
      return 'Use a professional, business-appropriate tone.';
  }
}
