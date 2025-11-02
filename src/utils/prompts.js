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

/**
 * Builds a prompt for generating a Jira ticket from user description
 * @param {string} description - User's description of the issue or feature
 * @returns {string} - Complete prompt for the AI model
 */
export function buildJiraTicketPrompt(description) {
  return `
TASK: Generate a Jira ticket based on the following description.

DESCRIPTION:
"""
${description}
"""

INSTRUCTIONS:
- Analyze the description and determine the most appropriate ticket type (Bug, Story, Task, Epic, etc.)
- Create a clear, concise title (50-80 characters recommended)
- Write a comprehensive description that includes:
  * Clear problem statement or feature request
  * Steps to reproduce (if applicable)
  * Expected vs actual behavior (if applicable)
  * Acceptance criteria (if applicable)
  * Any relevant context or technical details

OUTPUT FORMAT:
Return your response in the following JSON format:
{
  "type": "Bug|Story|Task|Epic|etc",
  "title": "Clear and concise ticket title",
  "description": "Detailed description with proper formatting"
}

IMPORTANT:
- Return ONLY valid JSON, no additional text before or after
- Ensure the JSON is properly formatted and parseable
- Use proper Jira formatting conventions in the description
- Make the title actionable and specific
`.trim();
}

/**
 * Builds a prompt for generating a professional daily standup summary
 * @param {string} notes - User's standup notes and updates
 * @returns {string} - Complete prompt for the AI model
 */
export function buildStandupPrompt(notes) {
  return `
TASK: Create a professional daily standup summary suitable for sharing with stakeholders.

STANDUP NOTES:
"""
${notes}
"""

INSTRUCTIONS:
Transform the provided notes into a well-structured, professional standup summary that includes:

1. SUMMARY: A concise overview of completed work and progress
2. ACTION ITEMS: Clear, actionable items for teammates with owners where applicable
3. BLOCKERS/DEPENDENCIES: Any impediments or dependencies that need attention

FORMATTING GUIDELINES:
- Use clear section headers
- Bullet points for action items
- Professional, concise language
- Focus on outcomes and impact
- Make action items specific and time-bound when possible

OUTPUT FORMAT:
Return a formatted text summary with clear sections. Use markdown-style formatting:
- Use ## for section headers
- Use bullet points (-) for action items
- Keep the tone professional and stakeholder-friendly
- Do not include any meta-commentary or explanations

IMPORTANT:
- Return ONLY the formatted summary text
- Maintain professional tone throughout
- Ensure action items are clear and assignable
- Keep the summary concise but comprehensive
`.trim();
}
