import { STORAGE_KEYS, DEFAULTS } from '../config.js';

/**
 * Storage service for managing local storage
 */
export class StorageService {
  constructor() {
    this.storage = window.localStorage;
    this.maxSize = 5 * 1024 * 1024; // 5MB limit
    this.useIndexedDB = false;
  }

  /**
   * Get API keys from storage
   * @returns {Object} - API keys object
   */
  getAPIKeys() {
    const keys = this.storage.getItem(STORAGE_KEYS.API_KEYS);
    return keys ? JSON.parse(keys) : {};
  }

  /**
   * Save API keys to storage
   * @param {Object} keys - API keys object
   */
  saveAPIKeys(keys) {
    this.storage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(keys));
  }

  /**
   * Get settings from storage
   * @returns {Object} - Settings object
   */
  getSettings() {
    const settings = this.storage.getItem(STORAGE_KEYS.SETTINGS);
    return settings ? JSON.parse(settings) : DEFAULTS;
  }

  /**
   * Save settings to storage
   * @param {Object} settings - Settings object
   */
  saveSettings(settings) {
    this.storage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  /**
   * Get history from storage
   * @returns {Array} - History entries
   */
  getHistory() {
    const history = this.storage.getItem(STORAGE_KEYS.HISTORY);
    return history ? JSON.parse(history) : [];
  }

  /**
   * Add history entry
   * @param {Object} entry - History entry
   */
  addHistory(entry) {
    const history = this.getHistory();
    history.unshift({
      id: Date.now().toString(),
      ...entry,
      timestamp: Date.now()
    });
    
    // Keep only last 50 entries
    const trimmed = history.slice(0, DEFAULTS.historyLimit);
    
    try {
      this.storage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(trimmed));
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        // Handle quota exceeded - remove oldest entries
        const reduced = trimmed.slice(0, 25);
        this.storage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(reduced));
        console.warn('LocalStorage quota exceeded, reduced history to 25 entries');
      }
    }
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.storage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify([]));
  }

  /**
   * Delete specific entry
   * @param {string} id - Entry ID
   */
  deleteHistoryEntry(id) {
    const history = this.getHistory();
    const filtered = history.filter(entry => entry.id !== id);
    this.storage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(filtered));
  }

  /**
   * Get storage size
   * @returns {number} - Storage size in bytes
   */
  getStorageSize() {
    let total = 0;
    for (let key in this.storage) {
      if (this.storage.hasOwnProperty(key)) {
        total += (this.storage[key].length + key.length) * 2; // UTF-16 characters (2 bytes each)
      }
    }
    return total;
  }

  /**
   * Check storage health
   * @returns {Object} - Storage health object
   */
  checkStorageHealth() {
    const size = this.getStorageSize();
    const percentUsed = (size / this.maxSize) * 100;
    
    return {
      size,
      percentUsed,
      warning: percentUsed > 80,
      critical: percentUsed > 95
    };
  }
}
