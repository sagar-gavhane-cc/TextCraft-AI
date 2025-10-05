/**
 * Clipboard service for copying text to clipboard
 */
export class ClipboardService {
  /**
   * Copy text to clipboard
   * @param {string} text - Text to copy
   * @returns {Promise<boolean>} - Whether copy was successful
   */
  async copy(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        // Use modern Clipboard API if available and in secure context
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers
        this.fallbackCopyToClipboard(text);
      }
      return true;
    } catch (error) {
      console.error('Failed to copy:', error);
      return false;
    }
  }

  /**
   * Fallback method for copying to clipboard
   * @param {string} text - Text to copy
   */
  fallbackCopyToClipboard(text) {
    // Create textarea element
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // Make the textarea out of viewport
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    // Execute copy command
    document.execCommand('copy');
    
    // Clean up
    document.body.removeChild(textArea);
  }
}
