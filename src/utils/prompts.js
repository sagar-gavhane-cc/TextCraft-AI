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
- Format the output for Slack: use plain text, avoid markdown formatting (no **bold**, *italic*, # headers, or code blocks)
- Use simple formatting like line breaks and basic punctuation for readability
- Ensure the output is concise and easy to read
- Avoid using overly complex language or jargon
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
    
    case 'diplomatic':
      return 'Express ideas in a neutral, respectful manner. Be tactful and considerate, avoiding confrontation while maintaining clarity. Use balanced language that acknowledges different perspectives.';
    
    case 'exciting':
      return 'Use energetic language to convey enthusiasm and passion. Be dynamic and engaging, using vivid words and active voice. Create a sense of excitement and momentum that inspires action.';
    
    case 'confident':
      return 'Convey a sense of authority and self-assurance. Use decisive language and strong statements. Be assertive without being aggressive, demonstrating expertise and conviction.';
    
    case 'compassionate':
      return 'Show understanding and empathy towards others. Be warm, caring, and considerate. Acknowledge challenges and difficulties while offering support and encouragement.';
    
    case 'constructive':
      return 'Focus on finding solutions and offering suggestions. Be positive and forward-looking, emphasizing opportunities for improvement. Provide actionable feedback and helpful recommendations.';
    
    case 'cooperative':
      return 'Emphasize collaboration and mutual support. Use inclusive language that promotes teamwork. Be open to different viewpoints and highlight shared goals and common ground.';
    
    case 'empathetic':
      return 'Acknowledge and validate others\' feelings. Show genuine understanding of different perspectives and experiences. Be sensitive and considerate, demonstrating that you truly understand their situation.';
    
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
- Use markdown or Jira formatting conventions in the description (e.g., *bold*, _italic_, code blocks, bullet points, numbered lists)
- Jira supports markdown-style formatting, so use standard markdown syntax that works in Jira
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

Standup Date: ${new Date().toISOString()}
Standup Notes:
"""
${notes}
"""

INSTRUCTIONS:
Transform the provided notes into a well-structured, professional standup summary that includes:

1. Standup Summary: A concise overview of completed work and progress
2. Action Items: Clear, actionable items for teammates with owners where applicable
3. Blockers/Dependencies: Any impediments or dependencies that need attention

FORMATTING GUIDELINES:
- Use clear section headers
- Bullet points for action items
- Professional, concise language
- Focus on outcomes and impact
- Make action items specific and time-bound when possible

OUTPUT FORMAT:
Return a formatted text summary suitable for Slack. Use Slack-friendly formatting (NOT markdown):
- Use plain text section headers in UPPERCASE or Title Case followed by a colon
- Use simple bullet points (• or -) for action items
- Use line breaks to separate sections
- Avoid markdown syntax (no **bold**, *italic*, # headers, or code blocks)
- Use simple formatting like colons, dashes, and line breaks for structure
- Keep the tone professional and stakeholder-friendly
- Do not include any meta-commentary or explanations
- Please include the date of the standup in the summary in the human readable format (e.g. "Monday, October 28, 2025")

IMPORTANT:
- Return ONLY the formatted summary text
- Maintain professional tone throughout
- Ensure action items are clear and assignable
- Keep the summary concise but comprehensive
- Format for Slack compatibility: plain text with simple formatting only
`.trim();
}

/**
 * Builds a prompt for enhancing user prompts using professional prompt engineering techniques
 * @param {string} promptText - Original prompt text to enhance
 * @returns {string} - Complete prompt for the AI model
 */
export function buildPromptEnhancementPrompt(promptText) {
  return `
You are a professional prompt engineer specializing in crafting precise, effective prompts.

Your task is to enhance prompts by making them more specific, actionable, and effective.

**Formatting Requirements:**

- Use Markdown formatting in your response.

- Present requirements, constraints, and steps as bulleted or numbered lists.

- Separate context, instructions, and examples into clear paragraphs.

- Use headings if appropriate.

- Ensure the prompt is easy to read and visually organized.

**Instructions:**

- Improve the user prompt wrapped in \`<original_prompt>\` tags.

- Make instructions explicit and unambiguous.

- Add relevant context and constraints.

- Remove redundant information.

- Maintain the core intent.

- Ensure the prompt is self-contained.

- Use professional language.

- Add references to documentation or examples if applicable.

**For invalid or unclear prompts:**

- Respond with clear, professional guidance.

- Keep responses concise and actionable.

- Maintain a helpful, constructive tone.

- Focus on what the user should provide.

- Use a standard template for consistency.

**IMPORTANT:**  

Your response must ONLY contain the enhanced prompt text, formatted as described.  

Do not include any explanations, metadata, or wrapper tags.

<original_prompt>

${promptText}

</original_prompt>
`.trim();
}
