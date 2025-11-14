/**
 * LocalStorage Manager
 * Provides utilities for managing localStorage with expiration and sync logic
 */

const STORAGE_VERSION = '1.0';
const VERSION_KEY = 'storage_version';
const LAST_SYNC_KEY = 'last_sync';

export const StorageManager = {
  /**
   * Initialize storage and check version compatibility
   */
  init() {
    if (typeof window === 'undefined') return;
    
    const currentVersion = localStorage.getItem(VERSION_KEY);
    
    // If version mismatch, clear old data
    if (currentVersion && currentVersion !== STORAGE_VERSION) {
      console.log('Storage version mismatch, clearing old data...');
      this.clearAll();
    }
    
    localStorage.setItem(VERSION_KEY, STORAGE_VERSION);
    localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
  },

  /**
   * Set item with optional expiration (in milliseconds)
   */
  setItem(key, value, expiresIn = null) {
    if (typeof window === 'undefined') return;
    
    const item = {
      value,
      timestamp: Date.now(),
      expires: expiresIn ? Date.now() + expiresIn : null
    };
    
    try {
      localStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
      console.error('Failed to set localStorage item:', error);
      // If storage is full, clear old items and try again
      this.cleanExpired();
      try {
        localStorage.setItem(key, JSON.stringify(item));
      } catch (retryError) {
        console.error('Failed to set item after cleanup:', retryError);
      }
    }
  },

  /**
   * Get item and check expiration
   */
  getItem(key) {
    if (typeof window === 'undefined') return null;
    
    try {
      const itemStr = localStorage.getItem(key);
      if (!itemStr) return null;
      
      const item = JSON.parse(itemStr);
      
      // Check if item has expired
      if (item.expires && Date.now() > item.expires) {
        this.removeItem(key);
        return null;
      }
      
      return item.value;
    } catch (error) {
      console.error('Failed to get localStorage item:', error);
      return null;
    }
  },

  /**
   * Remove specific item
   */
  removeItem(key) {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  },

  /**
   * Clean expired items
   */
  cleanExpired() {
    if (typeof window === 'undefined') return;
    
    const keysToRemove = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      
      try {
        const itemStr = localStorage.getItem(key);
        const item = JSON.parse(itemStr);
        
        if (item.expires && Date.now() > item.expires) {
          keysToRemove.push(key);
        }
      } catch (error) {
        // Skip invalid items
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`Cleaned ${keysToRemove.length} expired items from localStorage`);
  },

  /**
   * Clear all application data (except auth token)
   */
  clearAppData() {
    if (typeof window === 'undefined') return;
    
    const token = localStorage.getItem('token');
    const keysToRemove = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key !== 'token') {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`Cleared ${keysToRemove.length} items from localStorage (kept auth token)`);
    
    // Reinitialize
    this.init();
  },

  /**
   * Clear everything including auth
   */
  clearAll() {
    if (typeof window === 'undefined') return;
    localStorage.clear();
    console.log('Cleared all localStorage data');
  },

  /**
   * Get storage info
   */
  getStorageInfo() {
    if (typeof window === 'undefined') return null;
    
    let totalSize = 0;
    let itemCount = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        totalSize += key.length + (value?.length || 0);
        itemCount++;
      }
    }
    
    return {
      itemCount,
      totalSize,
      totalSizeKB: (totalSize / 1024).toFixed(2),
      lastSync: localStorage.getItem(LAST_SYNC_KEY),
      version: localStorage.getItem(VERSION_KEY)
    };
  },

  /**
   * Check if sync is needed (every 24 hours)
   */
  needsSync() {
    if (typeof window === 'undefined') return false;
    
    const lastSync = localStorage.getItem(LAST_SYNC_KEY);
    if (!lastSync) return true;
    
    const dayInMs = 24 * 60 * 60 * 1000;
    return Date.now() - parseInt(lastSync) > dayInMs;
  },

  /**
   * Perform sync - clean expired items
   */
  sync() {
    if (typeof window === 'undefined') return;
    
    console.log('Syncing localStorage...');
    this.cleanExpired();
    localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
    console.log('Sync complete');
  }
};

// Auto-initialize on import
if (typeof window !== 'undefined') {
  StorageManager.init();
  
  // Auto-sync if needed
  if (StorageManager.needsSync()) {
    StorageManager.sync();
  }
}
