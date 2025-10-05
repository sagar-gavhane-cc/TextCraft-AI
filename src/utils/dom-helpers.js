/**
 * Format a timestamp to a human-readable format
 * @param {number} timestamp - Timestamp in milliseconds
 * @returns {string} - Formatted date string
 */
export function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  
  // If today, show time only
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  // If this year, show month and day
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
  
  // Otherwise show full date
  return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Truncate text to a specified length with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} - Truncated text
 */
export function truncateText(text, maxLength) {
  if (!text || text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength) + '...';
}

/**
 * Create an element with specified attributes and children
 * @param {string} tag - HTML tag name
 * @param {Object} attributes - Element attributes
 * @param {Array|string} children - Child elements or text content
 * @returns {HTMLElement} - Created element
 */
export function createElement(tag, attributes = {}, children = []) {
  const element = document.createElement(tag);
  
  // Set attributes
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'dataset') {
      Object.entries(value).forEach(([dataKey, dataValue]) => {
        element.dataset[dataKey] = dataValue;
      });
    } else if (key.startsWith('on') && typeof value === 'function') {
      element.addEventListener(key.substring(2).toLowerCase(), value);
    } else {
      element.setAttribute(key, value);
    }
  });
  
  // Add children
  if (Array.isArray(children)) {
    children.forEach(child => {
      if (child instanceof HTMLElement) {
        element.appendChild(child);
      } else if (child !== null && child !== undefined) {
        element.appendChild(document.createTextNode(child.toString()));
      }
    });
  } else if (children !== null && children !== undefined) {
    element.textContent = children.toString();
  }
  
  return element;
}

/**
 * Create a button element with specified attributes and event handler
 * @param {string} text - Button text
 * @param {string} className - CSS class names
 * @param {Function} onClick - Click event handler
 * @param {Object} attributes - Additional attributes
 * @returns {HTMLButtonElement} - Created button element
 */
export function createButton(text, className, onClick, attributes = {}) {
  return createElement('button', {
    className,
    onClick,
    ...attributes
  }, text);
}

/**
 * Show a toast notification
 * @param {string} message - Toast message
 * @param {string} type - Toast type (info, success, error)
 * @param {number} duration - Duration in milliseconds
 */
export function showToast(message, type = 'info', duration = 3000) {
  // Remove existing toasts
  const existingToasts = document.querySelectorAll('.toast');
  existingToasts.forEach(toast => {
    toast.remove();
  });
  
  // Create toast element
  const toast = createElement('div', {
    className: `toast toast-${type} fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 text-white text-sm`
  }, message);
  
  // Set background color based on type
  if (type === 'error') {
    toast.style.backgroundColor = '#dc2626'; // red-600
  } else if (type === 'success') {
    toast.style.backgroundColor = '#16a34a'; // green-600
  } else {
    toast.style.backgroundColor = '#2563eb'; // blue-600
  }
  
  // Add to DOM
  document.body.appendChild(toast);
  
  // Remove after duration
  setTimeout(() => {
    toast.remove();
  }, duration);
}
