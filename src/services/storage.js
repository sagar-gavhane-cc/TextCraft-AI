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
    const parsed = settings ? JSON.parse(settings) : {};
    // Merge with defaults to ensure all default values are present
    return { ...DEFAULTS, ...parsed };
  }

  /**
   * Save settings to storage
   * @param {Object} settings - Settings object
   */
  saveSettings(settings) {
    // Merge with existing settings to preserve other values
    const currentSettings = this.getSettings();
    const mergedSettings = { ...currentSettings, ...settings };
    this.storage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(mergedSettings));
  }
  
  /**
   * Save input text to storage
   * @param {string} input - Input text to save
   */
  saveInput(input) {
    chrome.storage.local.set({ savedInput: input });
  }
  
  /**
   * Get saved input text
   * @returns {string} - Saved input text or empty string if none
   */
  getSavedInput() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['savedInput'], (result) => {
        resolve(result.savedInput || '');
      });
    });
  }

  /**
   * Get storage key for a specific tab's history
   * @param {string} tabType - Tab type (rephraser, jira, standup, prompt-enhancer)
   * @returns {string} - Storage key
   */
  getHistoryKey(tabType) {
    return `history_${tabType}`;
  }

  /**
   * Migrate old global history to tab-specific storage
   */
  migrateHistory() {
    const oldHistory = this.storage.getItem(STORAGE_KEYS.HISTORY);
    if (!oldHistory) return; // No old history to migrate
    
    try {
      const entries = JSON.parse(oldHistory);
      if (!Array.isArray(entries) || entries.length === 0) {
        // Remove empty old history key
        this.storage.removeItem(STORAGE_KEYS.HISTORY);
        return;
      }

      // Group entries by type
      const entriesByTab = {};
      entries.forEach(entry => {
        const tabType = entry.type || 'rephraser';
        if (!entriesByTab[tabType]) {
          entriesByTab[tabType] = [];
        }
        entriesByTab[tabType].push(entry);
      });

      // Save to tab-specific keys
      Object.keys(entriesByTab).forEach(tabType => {
        const key = this.getHistoryKey(tabType);
        // Limit to 50 entries per tab
        const trimmed = entriesByTab[tabType].slice(0, DEFAULTS.historyLimit);
        this.storage.setItem(key, JSON.stringify(trimmed));
      });

      // Remove old global history key
      this.storage.removeItem(STORAGE_KEYS.HISTORY);
      console.log('Migrated history to tab-specific storage');
    } catch (error) {
      console.error('Error migrating history:', error);
    }
  }

  /**
   * Get history from storage for a specific tab
   * @param {string} tabType - Tab type (rephraser, jira, standup, prompt-enhancer)
   * @returns {Array} - History entries
   */
  getHistory(tabType) {
    if (!tabType) {
      // If no tabType provided, migrate first and return empty array
      this.migrateHistory();
      return [];
    }
    
    // Migrate old history on first access
    if (this.storage.getItem(STORAGE_KEYS.HISTORY)) {
      this.migrateHistory();
    }
    
    const key = this.getHistoryKey(tabType);
    const history = this.storage.getItem(key);
    return history ? JSON.parse(history) : [];
  }

  /**
   * Add history entry to a specific tab's history
   * @param {Object} entry - History entry (must include 'type' field)
   */
  addHistory(entry) {
    const tabType = entry.type || 'rephraser';
    const history = this.getHistory(tabType);
    
    history.unshift({
      id: Date.now().toString(),
      ...entry,
      timestamp: Date.now()
    });
    
    // Keep only last 50 entries for this tab
    const trimmed = history.slice(0, DEFAULTS.historyLimit);
    
    try {
      const key = this.getHistoryKey(tabType);
      this.storage.setItem(key, JSON.stringify(trimmed));
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        // Handle quota exceeded - remove oldest entries
        const reduced = trimmed.slice(0, 25);
        const key = this.getHistoryKey(tabType);
        this.storage.setItem(key, JSON.stringify(reduced));
        console.warn(`LocalStorage quota exceeded, reduced ${tabType} history to 25 entries`);
      }
    }
  }

  /**
   * Clear history for a specific tab
   * @param {string} tabType - Tab type (rephraser, jira, standup, prompt-enhancer)
   */
  clearHistory(tabType) {
    if (!tabType) {
      console.warn('clearHistory called without tabType');
      return;
    }
    
    const key = this.getHistoryKey(tabType);
    this.storage.setItem(key, JSON.stringify([]));
  }

  /**
   * Delete specific entry from a tab's history
   * @param {string} id - Entry ID
   * @param {string} tabType - Tab type (rephraser, jira, standup, prompt-enhancer)
   */
  deleteHistoryEntry(id, tabType) {
    if (!tabType) {
      console.warn('deleteHistoryEntry called without tabType');
      return;
    }
    
    const history = this.getHistory(tabType);
    const filtered = history.filter(entry => entry.id !== id);
    const key = this.getHistoryKey(tabType);
    this.storage.setItem(key, JSON.stringify(filtered));
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
  
  /**
   * Get cached model list for a provider
   * @param {string} provider - Provider name
   * @returns {Array<string>|null} - Cached model list or null if not cached
   */
  getCachedModels(provider) {
    try {
      const cacheKey = `model_cache_${provider}`;
      const cached = this.storage.getItem(cacheKey);
      if (!cached) return null;
      
      const parsed = JSON.parse(cached);
      return parsed.models || null;
    } catch (error) {
      console.error(`Error reading cached models for ${provider}:`, error);
      return null;
    }
  }
  
  /**
   * Save model list to cache with timestamp
   * @param {string} provider - Provider name
   * @param {Array<string>} models - List of model names
   */
  saveCachedModels(provider, models) {
    try {
      const cacheKey = `model_cache_${provider}`;
      const cacheData = {
        models: models,
        timestamp: Date.now()
      };
      this.storage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.error(`Error saving cached models for ${provider}:`, error);
    }
  }
  
  /**
   * Check if model cache is still valid
   * @param {string} provider - Provider name
   * @param {number} maxAgeHours - Maximum age in hours (default: 24)
   * @returns {boolean} - Whether cache is valid
   */
  isModelCacheValid(provider, maxAgeHours = 24) {
    try {
      const cacheKey = `model_cache_${provider}`;
      const cached = this.storage.getItem(cacheKey);
      if (!cached) return false;
      
      const parsed = JSON.parse(cached);
      if (!parsed.timestamp) return false;
      
      const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert hours to milliseconds
      const age = Date.now() - parsed.timestamp;
      
      return age < maxAge;
    } catch (error) {
      console.error(`Error checking cache validity for ${provider}:`, error);
      return false;
    }
  }
}
