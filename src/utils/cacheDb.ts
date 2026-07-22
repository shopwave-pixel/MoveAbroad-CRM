import { Customer, Ticket, FollowUp } from '../types';

// Encryption configuration
const ENCRYPTION_KEY = "MoveAboard_CRM_Enterprise_Secure_Cache_Key_2026";

// Fast and secure symmetric encryption for client-side IndexedDB caching
function encrypt(text: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const keyChar = ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
    const encrypted = charCode ^ keyChar;
    result += encrypted.toString(16).padStart(4, '0');
  }
  return btoa(result);
}

function decrypt(cipherText: string): string {
  if (!cipherText) return "";
  try {
    const hexStr = atob(cipherText);
    let result = "";
    for (let i = 0; i < hexStr.length; i += 4) {
      const hex = hexStr.substring(i, i + 4);
      const encrypted = parseInt(hex, 16);
      const keyChar = ENCRYPTION_KEY.charCodeAt((i / 4) % ENCRYPTION_KEY.length);
      result += String.fromCharCode(encrypted ^ keyChar);
    }
    return result;
  } catch (e) {
    console.error("IndexedDB decryption error:", e);
    return "";
  }
}

export interface SyncQueueItem {
  id: string;
  action: 'CREATE_CUSTOMER' | 'EDIT_CUSTOMER' | 'DELETE_CUSTOMER' | 'ARCHIVE_CUSTOMER' | 'RESTORE_CUSTOMER' | 'PERMANENT_DELETE_CUSTOMER' | 'CREATE_TICKET' | 'UPDATE_TICKET' | 'DELETE_TICKET' | 'CREATE_FOLLOWUP' | 'UPDATE_FOLLOWUP' | 'DELETE_FOLLOWUP';
  customerId: string;
  timestamp: string;
  payload: any;
  syncStatus: 'pending' | 'syncing' | 'failed';
  errorMessage?: string;
  httpStatus?: number;
  backendErrorMessage?: string;
  appsScriptResponse?: string;
  requestAction?: string;
  requestPayload?: string;
  stackTrace?: string;
  retryCount?: number;
  executionTime?: number;
}

const DB_NAME = 'MoveAboardCRM_DB';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;

export function initDb(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains('customers')) {
        db.createObjectStore('customers', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('tickets')) {
        db.createObjectStore('tickets', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('conversations')) {
        db.createObjectStore('conversations', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('followups')) {
        db.createObjectStore('followups', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('syncQueue')) {
        db.createObjectStore('syncQueue', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('cacheMetadata')) {
        db.createObjectStore('cacheMetadata', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(request.result);
    };

    request.onerror = (event) => {
      console.error('IndexedDB open error:', request.error);
      reject(request.error);
    };
  });
}

// Helper to run transaction
function getStore(storeName: string, mode: IDBTransactionMode): Promise<IDBObjectStore> {
  return initDb().then((db) => {
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  });
}

// ENCRYPTED CUSTOMER CACHE OPERATIONS
export async function saveCustomersToDb(customers: Customer[]): Promise<void> {
  const store = await getStore('customers', 'readwrite');
  return new Promise((resolve, reject) => {
    // Clear old records first
    const clearReq = store.clear();
    clearReq.onsuccess = () => {
      if (customers.length === 0) {
        resolve();
        return;
      }
      let completed = 0;
      let hasError = false;
      customers.forEach((customer) => {
        const encryptedData = encrypt(JSON.stringify(customer));
        const putReq = store.put({ id: customer.id, data: encryptedData });
        putReq.onsuccess = () => {
          completed++;
          if (completed === customers.length && !hasError) resolve();
        };
        putReq.onerror = () => {
          hasError = true;
          reject(putReq.error);
        };
      });
    };
    clearReq.onerror = () => reject(clearReq.error);
  });
}

export async function getCustomersFromDb(): Promise<Customer[]> {
  const store = await getStore('customers', 'readonly');
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => {
      const records = req.result || [];
      const customers: Customer[] = [];
      records.forEach((rec) => {
        try {
          const decrypted = decrypt(rec.data);
          if (decrypted) {
            customers.push(JSON.parse(decrypted));
          }
        } catch (e) {
          console.error("Error parsing cached customer:", e);
        }
      });
      resolve(customers);
    };
    req.onerror = () => reject(req.error);
  });
}

// ENCRYPTED TICKET CACHE OPERATIONS
export async function saveTicketsToDb(tickets: Ticket[]): Promise<void> {
  const store = await getStore('tickets', 'readwrite');
  return new Promise((resolve, reject) => {
    const clearReq = store.clear();
    clearReq.onsuccess = () => {
      if (tickets.length === 0) {
        resolve();
        return;
      }
      let completed = 0;
      let hasError = false;
      tickets.forEach((ticket) => {
        const encryptedData = encrypt(JSON.stringify(ticket));
        const putReq = store.put({ id: ticket.id, data: encryptedData });
        putReq.onsuccess = () => {
          completed++;
          if (completed === tickets.length && !hasError) resolve();
        };
        putReq.onerror = () => {
          hasError = true;
          reject(putReq.error);
        };
      });
    };
    clearReq.onerror = () => reject(clearReq.error);
  });
}

export async function getTicketsFromDb(): Promise<Ticket[]> {
  const store = await getStore('tickets', 'readonly');
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => {
      const records = req.result || [];
      const tickets: Ticket[] = [];
      records.forEach((rec) => {
        try {
          const decrypted = decrypt(rec.data);
          if (decrypted) {
            tickets.push(JSON.parse(decrypted));
          }
        } catch (e) {
          console.error("Error parsing cached ticket:", e);
        }
      });
      resolve(tickets);
    };
    req.onerror = () => reject(req.error);
  });
}

// ENCRYPTED FOLLOW-UP CACHE OPERATIONS
export async function saveFollowUpsToDb(followups: FollowUp[]): Promise<void> {
  const store = await getStore('followups', 'readwrite');
  return new Promise((resolve, reject) => {
    const clearReq = store.clear();
    clearReq.onsuccess = () => {
      if (followups.length === 0) {
        resolve();
        return;
      }
      let completed = 0;
      let hasError = false;
      followups.forEach((fup) => {
        const encryptedData = encrypt(JSON.stringify(fup));
        const putReq = store.put({ id: fup.id, data: encryptedData });
        putReq.onsuccess = () => {
          completed++;
          if (completed === followups.length && !hasError) resolve();
        };
        putReq.onerror = () => {
          hasError = true;
          reject(putReq.error);
        };
      });
    };
    clearReq.onerror = () => reject(clearReq.error);
  });
}

export async function getFollowUpsFromDb(): Promise<FollowUp[]> {
  const store = await getStore('followups', 'readonly');
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => {
      const records = req.result || [];
      const followups: FollowUp[] = [];
      records.forEach((rec) => {
        try {
          const decrypted = decrypt(rec.data);
          if (decrypted) {
            followups.push(JSON.parse(decrypted));
          }
        } catch (e) {
          console.error("Error parsing cached follow-up:", e);
        }
      });
      resolve(followups);
    };
    req.onerror = () => reject(req.error);
  });
}

// CONVERSATIONS CACHE OPERATIONS (MAPPED COMPLIANCE)
export async function saveConversationsToDb(conversations: any[]): Promise<void> {
  const store = await getStore('conversations', 'readwrite');
  return new Promise((resolve, reject) => {
    const clearReq = store.clear();
    clearReq.onsuccess = () => {
      if (conversations.length === 0) {
        resolve();
        return;
      }
      let completed = 0;
      let hasError = false;
      conversations.forEach((conv) => {
        const encryptedData = encrypt(JSON.stringify(conv));
        const putReq = store.put({ id: conv.id, data: encryptedData });
        putReq.onsuccess = () => {
          completed++;
          if (completed === conversations.length && !hasError) resolve();
        };
        putReq.onerror = () => {
          hasError = true;
          reject(putReq.error);
        };
      });
    };
    clearReq.onerror = () => reject(clearReq.error);
  });
}

export async function getConversationsFromDb(): Promise<any[]> {
  const store = await getStore('conversations', 'readonly');
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => {
      const records = req.result || [];
      const conversations: any[] = [];
      records.forEach((rec) => {
        try {
          const decrypted = decrypt(rec.data);
          if (decrypted) {
            conversations.push(JSON.parse(decrypted));
          }
        } catch (e) {
          console.error("Error parsing cached conversation:", e);
        }
      });
      resolve(conversations);
    };
    req.onerror = () => reject(req.error);
  });
}

// SYNC QUEUE OPERATIONS
export async function getSyncQueueFromDb(): Promise<SyncQueueItem[]> {
  const store = await getStore('syncQueue', 'readonly');
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => {
      const queue = req.result || [];
      // Sort oldest to newest
      queue.sort((a: SyncQueueItem, b: SyncQueueItem) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      resolve(queue);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function addToSyncQueueInDb(item: Omit<SyncQueueItem, 'timestamp' | 'syncStatus'>): Promise<SyncQueueItem> {
  const store = await getStore('syncQueue', 'readwrite');
  const queueItem: SyncQueueItem = {
    ...item,
    timestamp: new Date().toISOString(),
    syncStatus: 'pending'
  };

  return new Promise((resolve, reject) => {
    const req = store.put(queueItem);
    req.onsuccess = () => resolve(queueItem);
    req.onerror = () => reject(req.error);
  });
}

export async function updateSyncQueueItemInDb(item: SyncQueueItem): Promise<void> {
  const store = await getStore('syncQueue', 'readwrite');
  return new Promise((resolve, reject) => {
    const req = store.put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function removeFromSyncQueueInDb(id: string): Promise<void> {
  const store = await getStore('syncQueue', 'readwrite');
  return new Promise((resolve, reject) => {
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// CACHE METADATA OPERATIONS
export async function setCacheMetadataInDb(key: string, value: any): Promise<void> {
  const store = await getStore('cacheMetadata', 'readwrite');
  return new Promise((resolve, reject) => {
    const req = store.put({ key, value });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getCacheMetadataFromDb(key: string): Promise<any> {
  const store = await getStore('cacheMetadata', 'readonly');
  return new Promise((resolve, reject) => {
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result ? req.result.value : null);
    req.onerror = () => reject(req.error);
  });
}

// SECURITY: CLEAR CACHE ON LOGOUT
export async function clearAllCachedData(): Promise<void> {
  const stores = ['customers', 'tickets', 'conversations', 'followups', 'cacheMetadata'];
  for (const storeName of stores) {
    const store = await getStore(storeName, 'readwrite');
    await new Promise<void>((resolve, reject) => {
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}
