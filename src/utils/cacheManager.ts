import { Customer, Ticket, FollowUp, SyncConfig, CRMData } from '../types';
import { DEFAULT_WEB_APP_URL } from './crmApi';
import { 
  initDb, 
  saveCustomersToDb, 
  getCustomersFromDb, 
  saveTicketsToDb, 
  getTicketsFromDb, 
  saveFollowUpsToDb, 
  getFollowUpsFromDb, 
  saveConversationsToDb, 
  getConversationsFromDb, 
  getSyncQueueFromDb, 
  addToSyncQueueInDb, 
  updateSyncQueueItemInDb, 
  removeFromSyncQueueInDb, 
  setCacheMetadataInDb, 
  getCacheMetadataFromDb, 
  clearAllCachedData,
  SyncQueueItem 
} from './cacheDb';

// Memory Cache
let memoryCustomers: Customer[] = [];
let memoryTickets: Ticket[] = [];
let memoryFollowUps: FollowUp[] = [];
let memorySyncQueue: SyncQueueItem[] = [];
let syncHistory: { timestamp: string; action: string; details: string; status: 'SUCCESS' | 'FAILED' }[] = [];

// App Network & Sync State
let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
let syncStatus: 'CONNECTED' | 'OFFLINE' | 'SYNCING' | 'PENDING' = 'CONNECTED';
let lastSyncTime: Date | null = null;
let isSyncingActive = false;

// Subscribers for real-time reactivity
type CacheSubscriber = (data: {
  customers: Customer[];
  tickets: Ticket[];
  followUps: FollowUp[];
  syncQueue: SyncQueueItem[];
  isOnline: boolean;
  syncStatus: typeof syncStatus;
  lastSyncTime: Date | null;
  syncHistory: typeof syncHistory;
}) => void;

const subscribers = new Set<CacheSubscriber>();

export function subscribeToCache(callback: CacheSubscriber) {
  subscribers.add(callback);
  // Initial call
  callback({
    customers: memoryCustomers,
    tickets: memoryTickets,
    followUps: memoryFollowUps,
    syncQueue: memorySyncQueue,
    isOnline,
    syncStatus,
    lastSyncTime,
    syncHistory
  });
  return () => {
    subscribers.delete(callback);
  };
}

function notifySubscribers() {
  const currentData = {
    customers: [...memoryCustomers],
    tickets: [...memoryTickets],
    followUps: [...memoryFollowUps],
    syncQueue: [...memorySyncQueue],
    isOnline,
    syncStatus,
    lastSyncTime,
    syncHistory: [...syncHistory]
  };
  subscribers.forEach(cb => cb(currentData));
  
  // Also dispatch a global window event for compatibility
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('crm-cache-updated', { detail: currentData }));
  }
}

// Log to sync history
function logSyncHistory(action: string, details: string, status: 'SUCCESS' | 'FAILED') {
  syncHistory.unshift({
    timestamp: new Date().toISOString(),
    action,
    details,
    status
  });
  // Keep only last 50 entries
  if (syncHistory.length > 50) {
    syncHistory.pop();
  }
}

// NETWORK DETECTION
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    isOnline = true;
    syncStatus = memorySyncQueue.length > 0 ? 'PENDING' : 'CONNECTED';
    notifySubscribers();
    // Trigger auto sync
    triggerAutoSync();
  });

  window.addEventListener('offline', () => {
    isOnline = false;
    syncStatus = 'OFFLINE';
    notifySubscribers();
  });
}

// Helper to check actual server connectivity if online
export async function checkServerConnectivity(webAppUrl: string): Promise<boolean> {
  const targetUrl = webAppUrl || DEFAULT_WEB_APP_URL;
  if (!targetUrl) return false;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(`${targetUrl}?action=get_data`, { 
      method: 'GET',
      mode: 'cors',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (response.ok) {
      const data = await response.json().catch(() => null);
      if (data && data.success === true) {
        isOnline = true;
        return true;
      }
      isOnline = true;
      return true;
    }
    return false;
  } catch (e) {
    console.warn("Server connectivity check exception:", e);
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }
}

// PHONE NUMBER NORMALIZATION
export function normalizePhoneNumber(num: string | undefined): string {
  if (!num) return '';
  // Strip non-digit characters
  let digits = num.replace(/\D/g, '');
  // Bangladesh normalization: +88017... -> 017...
  if (digits.startsWith('880')) {
    digits = '0' + digits.substring(3);
  }
  return digits;
}

// DUPLICATE DETECTION LOCAL
export interface DuplicateMatch {
  type: 'MOBILE' | 'WHATSAPP' | 'BOTH';
  customer: Customer;
}

export function detectDuplicatesLocal(mobileNumber: string, whatsAppNumber: string = ''): DuplicateMatch[] {
  const normMobile = normalizePhoneNumber(mobileNumber);
  const normWhatsApp = normalizePhoneNumber(whatsAppNumber);
  const matches: DuplicateMatch[] = [];

  if (!normMobile && !normWhatsApp) return [];

  memoryCustomers.forEach(customer => {
    const custMobile = normalizePhoneNumber(customer.mobileNumber);
    const custWhatsApp = normalizePhoneNumber(customer.whatsAppNumber || '');
    const additionalNorms = (customer.additionalNumbers || []).map(an => normalizePhoneNumber(an.number));

    const mobileMatches = normMobile && (
      normMobile === custMobile || 
      normMobile === custWhatsApp || 
      additionalNorms.includes(normMobile)
    );
    const whatsappMatches = normWhatsApp && (
      normWhatsApp === custMobile || 
      normWhatsApp === custWhatsApp || 
      additionalNorms.includes(normWhatsApp)
    );

    if (mobileMatches && whatsappMatches) {
      matches.push({ type: 'BOTH', customer });
    } else if (mobileMatches) {
      matches.push({ type: 'MOBILE', customer });
    } else if (whatsappMatches) {
      matches.push({ type: 'WHATSAPP', customer });
    }
  });

  return matches;
}

// RECENT SYNC CONFLICTS STATE
export interface SyncConflict {
  queueId: string;
  customer: Customer; // local version
  serverCustomer: Customer; // server version
}
export let activeConflicts: SyncConflict[] = [];
let onConflictsChanged: ((conflicts: SyncConflict[]) => void) | null = null;

export function subscribeToConflicts(cb: (conflicts: SyncConflict[]) => void) {
  onConflictsChanged = cb;
  cb(activeConflicts);
  return () => {
    onConflictsChanged = null;
  };
}

function notifyConflicts() {
  if (onConflictsChanged) {
    onConflictsChanged([...activeConflicts]);
  }
}

// --- CORE CACHE MANAGER INTERFACE ---

// Smart background sync that performs detailed client-server comparison and applies partial updates
export async function performSmartSync(config: SyncConfig): Promise<{
  success: boolean;
  hasChanges: boolean;
  addedCount: number;
  updatedCount: number;
  deletedCount: number;
  updatedIds: string[];
}> {
  if (!config.isLiveMode || !config.webAppUrl) {
    return { success: false, hasChanges: false, addedCount: 0, updatedCount: 0, deletedCount: 0, updatedIds: [] };
  }

  isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (!isOnline) {
    syncStatus = 'OFFLINE';
    notifySubscribers();
    return { success: false, hasChanges: false, addedCount: 0, updatedCount: 0, deletedCount: 0, updatedIds: [] };
  }

  try {
    syncStatus = 'SYNCING';
    notifySubscribers();

    const url = `${config.webAppUrl}?action=get_data`;
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || "Server responded with success: false");
    }

    // Deduplicate lists
    const serverCustomers = Array.from(new Map((data.customers || []).map((c: any) => [c.id, c])).values()) as Customer[];
    const serverTickets = Array.from(new Map((data.tickets || []).map((t: any) => [t.id, t])).values()) as Ticket[];
    const serverFollowUps = Array.from(new Map((data.followUps || []).map((f: any) => [f.id, f])).values()) as FollowUp[];

    let addedCount = 0;
    let updatedCount = 0;
    let deletedCount = 0;
    const updatedIds: string[] = [];

    // 1. SMART COMPARISON FOR CUSTOMERS
    const localCustMap = new Map(memoryCustomers.map(c => [c.id, c]));
    const serverCustMap = new Map(serverCustomers.map(c => [c.id, c]));
    
    serverCustomers.forEach(sc => {
      const lc = localCustMap.get(sc.id);
      if (!lc) {
        addedCount++;
        updatedIds.push(sc.id);
      } else if (JSON.stringify(lc) !== JSON.stringify(sc)) {
        updatedCount++;
        updatedIds.push(sc.id);
      }
    });
    
    memoryCustomers.forEach(lc => {
      if (!serverCustMap.has(lc.id)) {
        deletedCount++;
      }
    });

    // 2. SMART COMPARISON FOR TICKETS
    const localTktMap = new Map(memoryTickets.map(t => [t.id, t]));
    const serverTktMap = new Map(serverTickets.map(t => [t.id, t]));

    serverTickets.forEach(st => {
      const lt = localTktMap.get(st.id);
      if (!lt) {
        addedCount++;
        updatedIds.push(st.id);
      } else if (JSON.stringify(lt) !== JSON.stringify(st)) {
        updatedCount++;
        updatedIds.push(st.id);
      }
    });

    memoryTickets.forEach(lt => {
      if (!serverTktMap.has(lt.id)) {
        deletedCount++;
      }
    });

    // 3. SMART COMPARISON FOR FOLLOW-UPS
    const localFupMap = new Map(memoryFollowUps.map(f => [f.id, f]));
    const serverFupMap = new Map(serverFollowUps.map(f => [f.id, f]));

    serverFollowUps.forEach(sf => {
      const lf = localFupMap.get(sf.id);
      if (!lf) {
        addedCount++;
        updatedIds.push(sf.id);
      } else if (JSON.stringify(lf) !== JSON.stringify(sf)) {
        updatedCount++;
        updatedIds.push(sf.id);
      }
    });

    memoryFollowUps.forEach(lf => {
      if (!serverFupMap.has(lf.id)) {
        deletedCount++;
      }
    });

    const hasChanges = (addedCount > 0 || updatedCount > 0 || deletedCount > 0);

    if (hasChanges) {
      // Save updated data to DB (encrypted)
      await saveCustomersToDb(serverCustomers);
      await saveTicketsToDb(serverTickets);
      await saveFollowUpsToDb(serverFollowUps);
      await saveConversationsToDb(serverTickets);

      // Update in-memory lists incrementally
      memoryCustomers = serverCustomers;
      memoryTickets = serverTickets;
      memoryFollowUps = serverFollowUps;
    }

    lastSyncTime = new Date();
    await setCacheMetadataInDb('lastSyncTime', lastSyncTime.toISOString());

    isOnline = true;
    syncStatus = memorySyncQueue.length > 0 ? 'PENDING' : 'CONNECTED';
    notifySubscribers();

    // Trigger offline queue sync if pending changes exist
    if (memorySyncQueue.length > 0) {
      triggerAutoSync();
    }

    return {
      success: true,
      hasChanges,
      addedCount,
      updatedCount,
      deletedCount,
      updatedIds
    };
  } catch (err: any) {
    console.error("Smart Sync error:", err);
    syncStatus = 'OFFLINE';
    notifySubscribers();
    return {
      success: false,
      hasChanges: false,
      addedCount: 0,
      updatedCount: 0,
      deletedCount: 0,
      updatedIds: []
    };
  }
}

// Load data into memory (loads once from IndexedDB, triggers background load if empty or refresh is true)
export async function loadCacheAndSync(config: SyncConfig, forceRefresh = false): Promise<CRMData> {
  await initDb();
  
  // 1. Load from IndexedDB to Memory Cache first (for instant startup)
  const cachedCustomers = await getCustomersFromDb();
  const cachedTickets = await getTicketsFromDb();
  const cachedFollowUps = await getFollowUpsFromDb();
  
  memoryCustomers = cachedCustomers;
  memoryTickets = cachedTickets;
  memoryFollowUps = cachedFollowUps;
  
  memorySyncQueue = await getSyncQueueFromDb();
  const storedSyncTime = await getCacheMetadataFromDb('lastSyncTime');
  if (storedSyncTime) {
    lastSyncTime = new Date(storedSyncTime);
  }

  isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  syncStatus = isOnline ? (memorySyncQueue.length > 0 ? 'PENDING' : 'CONNECTED') : 'OFFLINE';
  
  notifySubscribers();

  // 2. Fetch from server in the background if we have no local cache or if forceRefresh/background refresh is requested
  if (config.isLiveMode && config.webAppUrl && (memoryCustomers.length === 0 || forceRefresh)) {
    performSmartSync(config).catch(err => {
      console.error("Failed background smart refresh:", err);
    });
  }

  return { customers: memoryCustomers, tickets: memoryTickets, followUps: memoryFollowUps };
}

// CLIENT-SIDE SEARCH WITH DEBOUNCE CACHE COMPATIBILITY
export function localSearch(query: string): Customer[] {
  if (!query) return memoryCustomers;
  const q = query.toLowerCase().trim();
  
  return memoryCustomers.filter(customer => {
    return (
      customer.name.toLowerCase().includes(q) ||
      customer.mobileNumber.includes(q) ||
      (customer.whatsAppNumber || '').includes(q) ||
      (customer.imoNumber || '').includes(q) ||
      (customer.destinationCountry || '').toLowerCase().includes(q) ||
      (customer.remarks || '').toLowerCase().includes(q) ||
      (customer.customerCategory || '').toLowerCase().includes(q) ||
      (customer.address || '').toLowerCase().includes(q) ||
      (customer.additionalNumbers || []).some(an => an.number.includes(q))
    );
  });
}

// CLIENT-SIDE ADVANCED FILTER COMPATIBILITY
export function localFilter(filters: {
  category?: string;
  source?: string;
  destinationCountry?: string;
  gender?: string;
  status?: string; // Wait! If filtering by tickets status
}): Customer[] {
  return memoryCustomers.filter(customer => {
    if (filters.category && customer.customerCategory !== filters.category) return false;
    if (filters.source && customer.source !== filters.source) return false;
    if (filters.destinationCountry && customer.destinationCountry !== filters.destinationCountry) return false;
    if (filters.gender && customer.gender !== filters.gender) return false;
    return true;
  });
}

// --- OFFLINE / MUTATIVE ACTIONS QUEUEING ---

// Generate Temporary ID
function generateTempId(prefix: 'TEMP' | 'TKT-TEMP' | 'FUP-TEMP'): string {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${rand}`;
}

// ADD CUSTOMER
export async function queueAddCustomer(config: SyncConfig, customer: Omit<Customer, 'id' | 'createdAt'>): Promise<{ success: boolean; customer: Customer }> {
  const tempId = generateTempId('TEMP');
  const newCustomer: Customer = {
    ...customer,
    id: tempId,
    createdAt: new Date().toISOString()
  };

  // 1. Update In-Memory Cache
  memoryCustomers = [...memoryCustomers, newCustomer];

  // 2. Persist to IndexedDB immediately
  await saveCustomersToDb(memoryCustomers);
  notifySubscribers();

  // 3. Queue Action
  const queueItem = await addToSyncQueueInDb({
    id: generateTempId('TEMP'),
    action: 'CREATE_CUSTOMER',
    customerId: tempId,
    payload: newCustomer
  });

  memorySyncQueue = [...memorySyncQueue, queueItem];
  syncStatus = 'PENDING';
  notifySubscribers();

  // 4. Trigger Sync
  triggerAutoSync();

  return { success: true, customer: newCustomer };
}

// EDIT CUSTOMER
export async function queueUpdateCustomer(config: SyncConfig, id: string, updates: Partial<Customer>): Promise<{ success: boolean }> {
  // Find current customer first
  const currentCustomer = memoryCustomers.find(c => c.id === id);
  
  if (!currentCustomer) {
    const errorMsg = `❌ Sync Aborted: Customer record (ID: ${id}) cannot be found in the local cache.`;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: errorMsg } }));
    }
    logSyncHistory('UPDATE CUSTOMER FAILED', errorMsg, 'FAILED');
    return { success: false };
  }

  // Create partial updates object of ONLY modified fields compared to the current customer
  const changedFields: Partial<Customer> = {};
  let hasChanges = false;
  
  (Object.keys(updates) as (keyof Customer)[]).forEach(key => {
    if (key === 'additionalNumbers') {
      const currentJson = JSON.stringify(currentCustomer.additionalNumbers || []);
      const updatesJson = JSON.stringify(updates.additionalNumbers || []);
      if (currentJson !== updatesJson) {
        changedFields.additionalNumbers = updates.additionalNumbers;
        hasChanges = true;
      }
      return;
    }
    const valCurrent = currentCustomer[key] === undefined || currentCustomer[key] === null ? '' : String(currentCustomer[key]).trim();
    const valUpdate = updates[key] === undefined || updates[key] === null ? '' : String(updates[key]).trim();
    if (valCurrent !== valUpdate) {
      (changedFields as any)[key] = updates[key];
      hasChanges = true;
    }
  });

  if (!hasChanges) {
    // If no changed fields, don't queue or run sync
    logSyncHistory('UPDATE PENDING CUSTOMER', `No changes detected for customer ${id}, skipping sync request`, 'SUCCESS');
    return { success: true };
  }

  // 1. Update In-Memory
  memoryCustomers = memoryCustomers.map(c => c.id === id ? { ...c, ...updates } : c);
  
  // Cascade name/mobile updates in memory tickets & follow-ups
  if (updates.name || updates.mobileNumber) {
    const updatedName = updates.name;
    const updatedMobile = updates.mobileNumber;
    
    memoryTickets = memoryTickets.map(t => t.customerId === id ? { 
      ...t, 
      ...(updatedName ? { name: updatedName } : {}), 
      ...(updatedMobile ? { mobileNumber: updatedMobile } : {}) 
    } : t);
    
    memoryFollowUps = memoryFollowUps.map(f => f.customerId === id ? { 
      ...f, 
      ...(updatedName ? { name: updatedName } : {}), 
      ...(updatedMobile ? { mobileNumber: updatedMobile } : {}) 
    } : f);
    
    await saveTicketsToDb(memoryTickets);
    await saveFollowUpsToDb(memoryFollowUps);
  }

  // 2. Save cache
  await saveCustomersToDb(memoryCustomers);
  notifySubscribers();

  // Get complete customer object
  const updatedCustomer = memoryCustomers.find(c => c.id === id);
  if (!updatedCustomer) {
    const errorMsg = `❌ Sync Aborted: Customer record (ID: ${id}) was lost from local cache during update.`;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: errorMsg } }));
    }
    logSyncHistory('UPDATE CUSTOMER FAILED', errorMsg, 'FAILED');
    return { success: false };
  }

  // Construct complete queued payload satisfying the required fields
  const completePayload = {
    action: 'update_customer',
    id: updatedCustomer.id,
    name: updatedCustomer.name || '',
    mobileNumber: updatedCustomer.mobileNumber || '',
    whatsAppNumber: updatedCustomer.whatsAppNumber || '',
    customerCategory: updatedCustomer.customerCategory || '',
    address: updatedCustomer.address || '',
    gender: updatedCustomer.gender || '',
    destinationCountry: updatedCustomer.destinationCountry || '',
    source: updatedCustomer.source || '',
    remarks: updatedCustomer.remarks || '',
    imoNumber: updatedCustomer.imoNumber || '',
    additionalNumbers: updatedCustomer.additionalNumbers || [],
    createdAt: updatedCustomer.createdAt || new Date().toISOString(),
    isArchived: updatedCustomer.isArchived || false,
    archivedAt: updatedCustomer.archivedAt || '',
    archivedBy: updatedCustomer.archivedBy || '',
    restoredAt: updatedCustomer.restoredAt || '',
    restoredBy: updatedCustomer.restoredBy || ''
  };

  // 3. Check if there's already a CREATE_CUSTOMER for this tempId in the queue
  const createItem = memorySyncQueue.find(item => item.customerId === id && item.action === 'CREATE_CUSTOMER');
  if (createItem) {
    // Merge updates directly into the pending CREATE payload
    createItem.payload = { ...createItem.payload, ...updates };
    await updateSyncQueueItemInDb(createItem);
    logSyncHistory('UPDATE PENDING CUSTOMER', `Merged updates into pending customer ${id}`, 'SUCCESS');
  } else {
    // Add new EDIT queue item with COMPLETE fields
    const queueItem = await addToSyncQueueInDb({
      id: generateTempId('TEMP'),
      action: 'EDIT_CUSTOMER',
      customerId: id,
      payload: completePayload
    });
    memorySyncQueue = [...memorySyncQueue, queueItem];
  }

  syncStatus = 'PENDING';
  notifySubscribers();

  // 4. Trigger Sync
  triggerAutoSync();

  return { success: true };
}

// DELETE CUSTOMER
export async function queueDeleteCustomer(config: SyncConfig, id: string): Promise<{ success: boolean }> {
  // 1. Update Memory
  memoryCustomers = memoryCustomers.filter(c => c.id !== id);
  memoryTickets = memoryTickets.filter(t => t.customerId !== id);
  memoryFollowUps = memoryFollowUps.filter(f => f.customerId !== id);

  // 2. Save DB Cache
  await saveCustomersToDb(memoryCustomers);
  await saveTicketsToDb(memoryTickets);
  await saveFollowUpsToDb(memoryFollowUps);
  notifySubscribers();

  // 3. Handle Sync Queue merges
  // If there's a pending CREATE_CUSTOMER, we can just remove it from the queue and not sync anything!
  const createItem = memorySyncQueue.find(item => item.customerId === id && item.action === 'CREATE_CUSTOMER');
  if (createItem) {
    await removeFromSyncQueueInDb(createItem.id);
    memorySyncQueue = memorySyncQueue.filter(item => item.id !== createItem.id);
    logSyncHistory('CANCEL PENDING CUSTOMER', `Cancelled creation of offline customer ${id}`, 'SUCCESS');
  } else {
    // Add DELETE_CUSTOMER item to queue
    const queueItem = await addToSyncQueueInDb({
      id: generateTempId('TEMP'),
      action: 'DELETE_CUSTOMER',
      customerId: id,
      payload: null
    });
    memorySyncQueue = [...memorySyncQueue, queueItem];
  }

  syncStatus = memorySyncQueue.length > 0 ? 'PENDING' : 'CONNECTED';
  notifySubscribers();

  // 4. Trigger Sync
  triggerAutoSync();

  return { success: true };
}

// ARCHIVE CUSTOMER
export async function queueArchiveCustomer(config: SyncConfig, id: string, userFullName: string = 'Staff'): Promise<{ success: boolean; customer?: Customer }> {
  const customer = memoryCustomers.find(c => c.id === id);
  if (!customer) {
    return { success: false };
  }

  const archiveTime = new Date().toISOString();
  const updates: Partial<Customer> = {
    isArchived: true,
    archivedAt: archiveTime,
    archivedBy: userFullName
  };

  // 1. Update In-Memory
  memoryCustomers = memoryCustomers.map(c => c.id === id ? { ...c, ...updates } : c);

  // 2. Persist to DB immediately
  await saveCustomersToDb(memoryCustomers);
  notifySubscribers();

  // 3. Queue ARCHIVE_CUSTOMER action
  const queueItem = await addToSyncQueueInDb({
    id: generateTempId('TEMP'),
    action: 'ARCHIVE_CUSTOMER',
    customerId: id,
    payload: {
      id,
      archivedBy: userFullName,
      archivedAt: archiveTime,
      archiveReason: 'Manual Archive'
    }
  });

  memorySyncQueue = [...memorySyncQueue, queueItem];
  syncStatus = 'PENDING';
  notifySubscribers();

  // 4. Trigger Sync
  triggerAutoSync();

  const updated = memoryCustomers.find(c => c.id === id);
  return { success: true, customer: updated };
}

// RESTORE CUSTOMER
export async function queueRestoreCustomer(config: SyncConfig, id: string, userFullName: string = 'Staff'): Promise<{ success: boolean; customer?: Customer }> {
  const customer = memoryCustomers.find(c => c.id === id);
  if (!customer) {
    return { success: false };
  }

  const restoreTime = new Date().toISOString();
  const updates: Partial<Customer> = {
    isArchived: false,
    restoredAt: restoreTime,
    restoredBy: userFullName
  };

  // 1. Update In-Memory
  memoryCustomers = memoryCustomers.map(c => c.id === id ? { ...c, ...updates } : c);

  // 2. Persist to DB immediately
  await saveCustomersToDb(memoryCustomers);
  notifySubscribers();

  // 3. Queue RESTORE_CUSTOMER action
  const queueItem = await addToSyncQueueInDb({
    id: generateTempId('TEMP'),
    action: 'RESTORE_CUSTOMER',
    customerId: id,
    payload: {
      id,
      restoredBy: userFullName,
      restoredAt: restoreTime
    }
  });

  memorySyncQueue = [...memorySyncQueue, queueItem];
  syncStatus = 'PENDING';
  notifySubscribers();

  // 4. Trigger Sync
  triggerAutoSync();

  const updated = memoryCustomers.find(c => c.id === id);
  return { success: true, customer: updated };
}

// PERMANENT DELETE CUSTOMER (ADMIN ONLY)
export async function queuePermanentDeleteCustomer(config: SyncConfig, id: string): Promise<{ success: boolean }> {
  // 1. Remove from memory
  memoryCustomers = memoryCustomers.filter(c => c.id !== id);
  memoryTickets = memoryTickets.filter(t => t.customerId !== id);
  memoryFollowUps = memoryFollowUps.filter(f => f.customerId !== id);

  // 2. Save DB Cache
  await saveCustomersToDb(memoryCustomers);
  await saveTicketsToDb(memoryTickets);
  await saveFollowUpsToDb(memoryFollowUps);
  notifySubscribers();

  // 3. Queue PERMANENT_DELETE_CUSTOMER action
  const queueItem = await addToSyncQueueInDb({
    id: generateTempId('TEMP'),
    action: 'PERMANENT_DELETE_CUSTOMER',
    customerId: id,
    payload: { id }
  });

  memorySyncQueue = [...memorySyncQueue, queueItem];
  syncStatus = 'PENDING';
  notifySubscribers();

  // 4. Trigger Sync
  triggerAutoSync();

  return { success: true };
}

// CREATE TICKET
export async function queueCreateTicket(config: SyncConfig, ticket: Omit<Ticket, 'id' | 'createdAt'>): Promise<{ success: boolean; ticket: Ticket }> {
  let effectiveCustomerId = ticket.customerId;
  let name = ticket.name || '';
  let mobileNumber = ticket.mobileNumber || '';

  const customer = memoryCustomers.find(c => c.id === effectiveCustomerId || (c.mobileNumber && c.mobileNumber === mobileNumber) || (c.name && c.name === name));
  if (customer) {
    effectiveCustomerId = customer.id;
    if (!name) name = customer.name;
    if (!mobileNumber) mobileNumber = customer.mobileNumber;
  }

  const tempId = generateTempId('TKT-TEMP');
  const newTicket: Ticket = {
    ...ticket,
    customerId: effectiveCustomerId,
    name,
    mobileNumber,
    id: tempId,
    createdAt: new Date().toISOString()
  };

  // 1. Update Memory
  memoryTickets = [...memoryTickets, newTicket];

  // 2. Save DB Cache
  await saveTicketsToDb(memoryTickets);
  notifySubscribers();

  // 3. Queue Action
  const queueItem = await addToSyncQueueInDb({
    id: generateTempId('TEMP'),
    action: 'CREATE_TICKET',
    customerId: effectiveCustomerId,
    payload: newTicket
  });

  memorySyncQueue = [...memorySyncQueue, queueItem];
  syncStatus = 'PENDING';
  notifySubscribers();

  // 4. Trigger Sync
  triggerAutoSync();

  return { success: true, ticket: newTicket };
}

// UPDATE TICKET
export async function queueUpdateTicket(config: SyncConfig, id: string, updates: Partial<Ticket>): Promise<{ success: boolean }> {
  // 1. Update Memory
  memoryTickets = memoryTickets.map(t => t.id === id ? { ...t, ...updates } : t);

  // 2. Save Cache
  await saveTicketsToDb(memoryTickets);
  notifySubscribers();

  // 3. Queue
  const createItem = memorySyncQueue.find(item => item.payload?.id === id && item.action === 'CREATE_TICKET');
  if (createItem) {
    // Merge into pending creation
    createItem.payload = { ...createItem.payload, ...updates };
    await updateSyncQueueItemInDb(createItem);
    logSyncHistory('UPDATE PENDING TICKET', `Merged updates into pending ticket ${id}`, 'SUCCESS');
  } else {
    const queueItem = await addToSyncQueueInDb({
      id: generateTempId('TEMP'),
      action: 'UPDATE_TICKET',
      customerId: '', // Not strictly needed
      payload: { id, ...updates }
    });
    memorySyncQueue = [...memorySyncQueue, queueItem];
  }

  syncStatus = 'PENDING';
  notifySubscribers();

  // 4. Trigger Sync
  triggerAutoSync();

  return { success: true };
}

// DELETE TICKET
export async function queueDeleteTicket(config: SyncConfig, id: string): Promise<{ success: boolean }> {
  // 1. Update Memory
  memoryTickets = memoryTickets.filter(t => t.id !== id);

  // 2. Save Cache
  await saveTicketsToDb(memoryTickets);
  notifySubscribers();

  // 3. Queue
  const createItem = memorySyncQueue.find(item => item.payload?.id === id && item.action === 'CREATE_TICKET');
  if (createItem) {
    await removeFromSyncQueueInDb(createItem.id);
    memorySyncQueue = memorySyncQueue.filter(item => item.id !== createItem.id);
    logSyncHistory('CANCEL PENDING TICKET', `Cancelled creation of offline ticket ${id}`, 'SUCCESS');
  } else {
    const queueItem = await addToSyncQueueInDb({
      id: generateTempId('TEMP'),
      action: 'DELETE_TICKET',
      customerId: '',
      payload: { id }
    });
    memorySyncQueue = [...memorySyncQueue, queueItem];
  }

  syncStatus = memorySyncQueue.length > 0 ? 'PENDING' : 'CONNECTED';
  notifySubscribers();

  // 4. Trigger Sync
  triggerAutoSync();

  return { success: true };
}

// CREATE FOLLOW-UP
export async function queueCreateFollowUp(config: SyncConfig, followup: Omit<FollowUp, 'id' | 'createdAt'>): Promise<{ success: boolean; followUp: FollowUp }> {
  let effectiveCustomerId = followup.customerId;
  let name = followup.name || '';
  let mobileNumber = followup.mobileNumber || '';

  const customer = memoryCustomers.find(c => c.id === effectiveCustomerId || (c.mobileNumber && c.mobileNumber === mobileNumber) || (c.name && c.name === name));
  if (customer) {
    effectiveCustomerId = customer.id;
    if (!name) name = customer.name;
    if (!mobileNumber) mobileNumber = customer.mobileNumber;
  }

  const tempId = generateTempId('FUP-TEMP');
  const newFollowUp: FollowUp = {
    ...followup,
    customerId: effectiveCustomerId,
    name,
    mobileNumber,
    id: tempId,
    createdAt: new Date().toISOString()
  };

  // 1. Update Memory
  memoryFollowUps = [...memoryFollowUps, newFollowUp];

  // 2. Save Cache
  await saveFollowUpsToDb(memoryFollowUps);
  notifySubscribers();

  // 3. Queue
  const queueItem = await addToSyncQueueInDb({
    id: generateTempId('TEMP'),
    action: 'CREATE_FOLLOWUP',
    customerId: effectiveCustomerId,
    payload: newFollowUp
  });

  memorySyncQueue = [...memorySyncQueue, queueItem];
  syncStatus = 'PENDING';
  notifySubscribers();

  // 4. Trigger Sync
  triggerAutoSync();

  return { success: true, followUp: newFollowUp };
}

// UPDATE FOLLOW-UP
export async function queueUpdateFollowUp(config: SyncConfig, id: string, updates: Partial<FollowUp>): Promise<{ success: boolean }> {
  // 1. Update Memory
  memoryFollowUps = memoryFollowUps.map(f => f.id === id ? { ...f, ...updates } : f);

  // 2. Save Cache
  await saveFollowUpsToDb(memoryFollowUps);
  notifySubscribers();

  // 3. Queue
  const createItem = memorySyncQueue.find(item => item.payload?.id === id && item.action === 'CREATE_FOLLOWUP');
  if (createItem) {
    createItem.payload = { ...createItem.payload, ...updates };
    await updateSyncQueueItemInDb(createItem);
    logSyncHistory('UPDATE PENDING FOLLOWUP', `Merged updates into pending follow-up ${id}`, 'SUCCESS');
  } else {
    const queueItem = await addToSyncQueueInDb({
      id: generateTempId('TEMP'),
      action: 'UPDATE_FOLLOWUP',
      customerId: '',
      payload: { id, ...updates }
    });
    memorySyncQueue = [...memorySyncQueue, queueItem];
  }

  syncStatus = 'PENDING';
  notifySubscribers();

  // 4. Trigger Sync
  triggerAutoSync();

  return { success: true };
}

// DELETE FOLLOW-UP
export async function queueDeleteFollowUp(config: SyncConfig, id: string): Promise<{ success: boolean }> {
  // 1. Update Memory
  memoryFollowUps = memoryFollowUps.filter(f => f.id !== id);

  // 2. Save Cache
  await saveFollowUpsToDb(memoryFollowUps);
  notifySubscribers();

  // 3. Queue
  const createItem = memorySyncQueue.find(item => item.payload?.id === id && item.action === 'CREATE_FOLLOWUP');
  if (createItem) {
    await removeFromSyncQueueInDb(createItem.id);
    memorySyncQueue = memorySyncQueue.filter(item => item.id !== createItem.id);
    logSyncHistory('CANCEL PENDING FOLLOWUP', `Cancelled creation of offline follow-up ${id}`, 'SUCCESS');
  } else {
    const queueItem = await addToSyncQueueInDb({
      id: generateTempId('TEMP'),
      action: 'DELETE_FOLLOWUP',
      customerId: '',
      payload: { id }
    });
    memorySyncQueue = [...memorySyncQueue, queueItem];
  }

  syncStatus = memorySyncQueue.length > 0 ? 'PENDING' : 'CONNECTED';
  notifySubscribers();

  // 4. Trigger Sync
  triggerAutoSync();

  return { success: true };
}


// --- ACTIVE AUTO SYNC ENGINE ---

export async function triggerAutoSync(manualConfig?: SyncConfig) {
  if (isSyncingActive) return;
  
  const envApiUrl = (import.meta as any).env?.VITE_API_URL || '';
  const storedConfig = typeof localStorage !== 'undefined' ? localStorage.getItem('move_abroad_crm_sync_config') : null;
  let activeConfig: SyncConfig = { webAppUrl: envApiUrl || DEFAULT_WEB_APP_URL, isLiveMode: true };
  
  if (manualConfig && manualConfig.webAppUrl) {
    activeConfig = {
      ...manualConfig,
      webAppUrl: manualConfig.webAppUrl || DEFAULT_WEB_APP_URL,
      isLiveMode: true
    };
  } else if (storedConfig) {
    try { 
      const parsed = JSON.parse(storedConfig); 
      activeConfig = {
        ...parsed,
        webAppUrl: parsed.webAppUrl || envApiUrl || DEFAULT_WEB_APP_URL,
        isLiveMode: true
      };
    } catch (e) {}
  }

  if (!activeConfig.webAppUrl) {
    activeConfig.webAppUrl = DEFAULT_WEB_APP_URL;
    activeConfig.isLiveMode = true;
  }

  // Reload sync queue
  memorySyncQueue = await getSyncQueueFromDb();
  if (memorySyncQueue.length === 0) {
    if (isOnline) {
      syncStatus = 'CONNECTED';
      notifySubscribers();
    }
    return;
  }

  isSyncingActive = true;
  syncStatus = 'SYNCING';
  notifySubscribers();

  try {
    const reachable = await checkServerConnectivity(activeConfig.webAppUrl);
    if (!reachable) {
      isOnline = false;
      syncStatus = 'OFFLINE';
      isSyncingActive = false;
      notifySubscribers();
      return;
    }

    isOnline = true;
    notifySubscribers();

    // Process one item at a time (from oldest to newest)
    for (const item of [...memorySyncQueue]) {
      // If we hit a conflict, skip it and let user resolve
      if (activeConflicts.some(c => c.queueId === item.id)) {
        continue;
      }

      // Check if this is EDIT_CUSTOMER and customer is not in local cache
      if (item.action === 'EDIT_CUSTOMER') {
        const localCustomer = memoryCustomers.find(c => c.id === item.customerId);
        if (!localCustomer) {
          const errorMsg = `Sync Cancelled: Customer record for ID ${item.customerId} was not found in the local cache.`;
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: `❌ ${errorMsg}` } }));
          }
          logSyncHistory('SYNC CANCELLED', errorMsg, 'FAILED');
          
          item.syncStatus = 'failed';
          item.errorMessage = errorMsg;
          item.backendErrorMessage = errorMsg;
          await updateSyncQueueItemInDb(item);
          break; // Cancel the sync loop completely
        }
      }

      item.syncStatus = 'syncing';
      await updateSyncQueueItemInDb(item);
      notifySubscribers();

      let success = false;
      let attempt = 0;
      const maxRetries = 3;
      let lastError = '';

      // Clear previous debug parameters
      item.httpStatus = undefined;
      item.backendErrorMessage = undefined;
      item.appsScriptResponse = undefined;
      item.requestAction = undefined;
      item.requestPayload = undefined;
      item.stackTrace = undefined;
      item.retryCount = undefined;
      item.executionTime = undefined;

      while (attempt < maxRetries && !success) {
        try {
          const res = await processSyncItem(activeConfig, item);
          success = res.success;
          
          // Populate debug info
          item.httpStatus = res.httpStatus;
          item.backendErrorMessage = res.backendErrorMessage;
          item.appsScriptResponse = res.appsScriptResponse;
          item.requestAction = res.requestAction;
          item.requestPayload = res.requestPayload;
          item.stackTrace = res.stackTrace;
          item.executionTime = res.executionTime;

          if (success) {
            break;
          }
          lastError = res.backendErrorMessage || 'Server returned failure';
        } catch (err: any) {
          lastError = err.message || String(err);
          item.backendErrorMessage = lastError;
          item.stackTrace = err.stack || String(err);
        }

        attempt++;
        item.retryCount = attempt;
        if (!success && attempt < maxRetries) {
          item.syncStatus = 'failed';
          item.errorMessage = `Sync attempt ${attempt}/${maxRetries} failed: ${lastError}. Retrying...`;
          await updateSyncQueueItemInDb(item);
          
          logSyncHistory(item.action, `Sync failed. Retrying (Attempt ${attempt}/${maxRetries})...`, 'FAILED');
          notifySubscribers();
          
          // Exponential backoff delay (e.g. 2s, 4s)
          const delay = 1000 * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      if (success) {
        await removeFromSyncQueueInDb(item.id);
        memorySyncQueue = memorySyncQueue.filter(q => q.id !== item.id);
        logSyncHistory(item.action, `Successfully synced ${item.action} for ${item.customerId}`, 'SUCCESS');
        
        lastSyncTime = new Date();
        await setCacheMetadataInDb('lastSyncTime', lastSyncTime.toISOString());
      } else {
        item.syncStatus = 'failed';
        item.errorMessage = `Failed after ${maxRetries} attempts: ${lastError}`;
        item.retryCount = maxRetries;
        await updateSyncQueueItemInDb(item);
        logSyncHistory(item.action, `Failed to sync ${item.action} after ${maxRetries} attempts. Moved to Offline Queue.`, 'FAILED');
      }
      notifySubscribers();
    }
  } catch (e) {
    console.error("Auto Sync fatal exception:", e);
  } finally {
    isSyncingActive = false;
    syncStatus = memorySyncQueue.length > 0 ? 'PENDING' : 'CONNECTED';
    notifySubscribers();
  }
}

interface ProcessSyncResult {
  success: boolean;
  httpStatus?: number;
  backendErrorMessage?: string;
  appsScriptResponse?: string;
  requestAction?: string;
  requestPayload?: string;
  stackTrace?: string;
  executionTime?: number;
}

// CORE PROCESSOR FOR SINGLE QUEUE ITEM
async function processSyncItem(config: SyncConfig, item: SyncQueueItem): Promise<ProcessSyncResult> {
  const url = config.webAppUrl;
  const startTime = Date.now();
  let payload: any = null;
  
  if (item.action === 'CREATE_CUSTOMER') {
    payload = {
      action: 'add_customer',
      ...item.payload,
      id: undefined
    };
  } else if (item.action === 'EDIT_CUSTOMER') {
    // Conflict check
    try {
      const checkRes = await fetch(`${url}?action=getCustomer&id=${item.customerId}`);
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        if (checkData.success && checkData.customer) {
          const serverCustomer = checkData.customer;
          const localCustomer = memoryCustomers.find(c => c.id === item.customerId);
          
          const isConflicting = (
            serverCustomer.name !== localCustomer?.name &&
            serverCustomer.mobileNumber !== localCustomer?.mobileNumber &&
            item.payload.name && serverCustomer.name !== item.payload.name
          );

          if (isConflicting && localCustomer) {
            activeConflicts.push({
              queueId: item.id,
              customer: localCustomer,
              serverCustomer: serverCustomer
            });
            notifyConflicts();
            logSyncHistory('SYNC CONFLICT DETECTED', `Conflict on customer ${item.customerId}`, 'FAILED');
            return {
              success: false,
              backendErrorMessage: "Sync Conflict Detected",
              appsScriptResponse: JSON.stringify(checkData),
              requestAction: 'getCustomer',
              requestPayload: `id=${item.customerId}`
            };
          }
        }
      }
    } catch (e) {
      console.warn("Could not perform conflict pre-check, continuing with standard update", e);
    }

    payload = {
      action: 'update_customer',
      id: item.customerId,
      ...item.payload
    };
  } else if (item.action === 'DELETE_CUSTOMER') {
    payload = {
      action: 'delete_customer',
      id: item.customerId
    };
  } else if (item.action === 'ARCHIVE_CUSTOMER') {
    payload = {
      action: 'archive_customer',
      id: item.customerId,
      archivedBy: item.payload?.archivedBy || 'Staff',
      archivedAt: item.payload?.archivedAt || new Date().toISOString(),
      archiveReason: item.payload?.archiveReason || 'Manual Archive'
    };
  } else if (item.action === 'RESTORE_CUSTOMER') {
    payload = {
      action: 'restore_customer',
      id: item.customerId,
      restoredBy: item.payload?.restoredBy || 'Staff',
      restoredAt: item.payload?.restoredAt || new Date().toISOString()
    };
  } else if (item.action === 'PERMANENT_DELETE_CUSTOMER') {
    payload = {
      action: 'permanent_delete_customer',
      id: item.customerId
    };
  } else if (item.action === 'CREATE_TICKET') {
    let effectiveCustomerId = item.customerId || item.payload?.customerId || '';
    const custInMem = memoryCustomers.find(c => c.id === effectiveCustomerId || (c.mobileNumber && c.mobileNumber === item.payload?.mobileNumber));
    if (custInMem && !custInMem.id.startsWith('TEMP')) {
      effectiveCustomerId = custInMem.id;
    }
    const name = item.payload?.name || custInMem?.name || '';
    const mobileNumber = item.payload?.mobileNumber || custInMem?.mobileNumber || '';

    payload = {
      action: 'create_ticket',
      customerId: effectiveCustomerId,
      name: name,
      mobileNumber: mobileNumber,
      conversationDescription: item.payload?.conversationDescription || '',
      status: item.payload?.status || 'Open'
    };
  } else if (item.action === 'UPDATE_TICKET') {
    payload = {
      action: 'update_ticket',
      id: item.payload?.id || '',
      conversationDescription: item.payload?.conversationDescription || '',
      status: item.payload?.status || 'Open'
    };
  } else if (item.action === 'DELETE_TICKET') {
    payload = {
      action: 'delete_ticket',
      id: item.payload?.id || ''
    };
  } else if (item.action === 'CREATE_FOLLOWUP') {
    let effectiveCustomerId = item.customerId || item.payload?.customerId || '';
    const custInMem = memoryCustomers.find(c => c.id === effectiveCustomerId || (c.mobileNumber && c.mobileNumber === item.payload?.mobileNumber));
    if (custInMem && !custInMem.id.startsWith('TEMP')) {
      effectiveCustomerId = custInMem.id;
    }
    const name = item.payload?.name || custInMem?.name || '';
    const mobileNumber = item.payload?.mobileNumber || custInMem?.mobileNumber || '';

    payload = {
      action: 'create_follow_up',
      customerId: effectiveCustomerId,
      name: name,
      mobileNumber: mobileNumber,
      followUpDate: item.payload?.followUpDate || '',
      followUpTime: item.payload?.followUpTime || '10:00',
      notes: item.payload?.notes || '',
      status: item.payload?.status || 'Pending'
    };
  } else if (item.action === 'UPDATE_FOLLOWUP') {
    payload = {
      action: 'update_follow_up',
      id: item.payload.id,
      followUpDate: item.payload.followUpDate,
      followUpTime: item.payload.followUpTime,
      notes: item.payload.notes,
      status: item.payload.status
    };
  } else if (item.action === 'DELETE_FOLLOWUP') {
    payload = {
      action: 'delete_follow_up',
      id: item.payload.id
    };
  }

  const result: ProcessSyncResult = {
    success: false,
    requestAction: payload?.action,
    requestPayload: payload ? JSON.stringify(payload) : undefined
  };

  if (!payload) {
    result.backendErrorMessage = "Unknown sync action";
    result.executionTime = Date.now() - startTime;
    return result;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    result.httpStatus = response.status;
    result.executionTime = Date.now() - startTime;

    const rawText = await response.text();
    result.appsScriptResponse = rawText;

    if (!response.ok) {
      result.backendErrorMessage = `HTTP Error ${response.status}: ${response.statusText || rawText.substring(0, 100)}`;
      return result;
    }

    let resData: any;
    try {
      resData = JSON.parse(rawText);
    } catch (parseError: any) {
      result.backendErrorMessage = `JSON Parse Error: ${parseError.message || parseError}`;
      return result;
    }

    if (resData.success) {
      result.success = true;

      // Handle ID replacement or Cache update side-effects
      if (item.action === 'CREATE_CUSTOMER' && resData.customer) {
        const permanentId = resData.customer.id;
        const temporaryId = item.customerId;
        
        memoryCustomers = memoryCustomers.map(c => c.id === temporaryId ? { ...c, id: permanentId } : c);
        memoryTickets = memoryTickets.map(t => t.customerId === temporaryId ? { ...t, customerId: permanentId } : t);
        memoryFollowUps = memoryFollowUps.map(f => f.customerId === temporaryId ? { ...f, customerId: permanentId } : f);
        
        await saveCustomersToDb(memoryCustomers);
        await saveTicketsToDb(memoryTickets);
        await saveFollowUpsToDb(memoryFollowUps);

        for (const qItem of memorySyncQueue) {
          if (qItem.customerId === temporaryId || (qItem.payload && qItem.payload.customerId === temporaryId)) {
            qItem.customerId = permanentId;
            if (qItem.payload) {
              qItem.payload.customerId = permanentId;
              if (!qItem.payload.name && resData.customer.name) qItem.payload.name = resData.customer.name;
              if (!qItem.payload.mobileNumber && resData.customer.mobileNumber) qItem.payload.mobileNumber = resData.customer.mobileNumber;
            }
            await updateSyncQueueItemInDb(qItem);
          }
        }
      } else if (item.action === 'CREATE_TICKET' && resData.ticket) {
        const permanentId = resData.ticket.id;
        const temporaryId = item.payload.id;
        memoryTickets = memoryTickets.map(t => t.id === temporaryId ? { ...t, id: permanentId } : t);
        await saveTicketsToDb(memoryTickets);
      } else if (item.action === 'CREATE_FOLLOWUP' && resData.followUp) {
        const permanentId = resData.followUp.id;
        const temporaryId = item.payload.id;
        memoryFollowUps = memoryFollowUps.map(f => f.id === temporaryId ? { ...f, id: permanentId } : f);
        await saveFollowUpsToDb(memoryFollowUps);
      }
    } else {
      result.backendErrorMessage = resData.error || "Server returned success: false";
    }

  } catch (error: any) {
    result.executionTime = Date.now() - startTime;
    result.backendErrorMessage = error.message || String(error);
    result.stackTrace = error.stack || String(error);
  }

  return result;
}

export async function retryQueueItem(queueId: string) {
  // Find the queue item in memory or DB
  const item = memorySyncQueue.find(q => q.id === queueId);
  if (!item) return { success: false, error: 'Queue item not found' };

  // If customer is not found in the local cache, cancel/fail manual retry immediately
  if (item.action === 'EDIT_CUSTOMER') {
    const localCustomer = memoryCustomers.find(c => c.id === item.customerId);
    if (!localCustomer) {
      const errorMsg = `Manual retry cancelled: Customer record for ID ${item.customerId} was not found in the local cache.`;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: `❌ ${errorMsg}` } }));
      }
      item.syncStatus = 'failed';
      item.errorMessage = errorMsg;
      item.backendErrorMessage = errorMsg;
      await updateSyncQueueItemInDb(item);
      logSyncHistory(item.action, errorMsg, 'FAILED');
      notifySubscribers();
      return { success: false, error: errorMsg };
    }
  }

  // Set syncing status
  item.syncStatus = 'syncing';
  notifySubscribers();

  const envApiUrl = (import.meta as any).env?.VITE_API_URL || '';
  const storedConfig = typeof localStorage !== 'undefined' ? localStorage.getItem('move_abroad_crm_sync_config') : null;
  let activeConfig: SyncConfig = { webAppUrl: envApiUrl || DEFAULT_WEB_APP_URL, isLiveMode: true };
  if (storedConfig) {
    try { 
      const parsed = JSON.parse(storedConfig); 
      activeConfig = {
        ...parsed,
        webAppUrl: parsed.webAppUrl || envApiUrl || DEFAULT_WEB_APP_URL,
        isLiveMode: true
      };
    } catch (e) {}
  }

  // Clear previous debug parameters
  item.httpStatus = undefined;
  item.backendErrorMessage = undefined;
  item.appsScriptResponse = undefined;
  item.requestAction = undefined;
  item.requestPayload = undefined;
  item.stackTrace = undefined;
  item.retryCount = undefined;
  item.executionTime = undefined;

  try {
    const res = await processSyncItem(activeConfig, item);
    item.httpStatus = res.httpStatus;
    item.backendErrorMessage = res.backendErrorMessage;
    item.appsScriptResponse = res.appsScriptResponse;
    item.requestAction = res.requestAction;
    item.requestPayload = res.requestPayload;
    item.stackTrace = res.stackTrace;
    item.executionTime = res.executionTime;
    item.retryCount = 1;

    if (res.success) {
      await removeFromSyncQueueInDb(item.id);
      memorySyncQueue = memorySyncQueue.filter(q => q.id !== item.id);
      logSyncHistory(item.action, `Successfully synced ${item.action} for ${item.customerId} via manual retry`, 'SUCCESS');
      
      lastSyncTime = new Date();
      await setCacheMetadataInDb('lastSyncTime', lastSyncTime.toISOString());
      notifySubscribers();
      return { success: true };
    } else {
      item.syncStatus = 'failed';
      item.errorMessage = `Manual retry failed: ${res.backendErrorMessage || 'Server returned failure'}`;
      await updateSyncQueueItemInDb(item);
      logSyncHistory(item.action, `Manual retry failed for ${item.action}: ${res.backendErrorMessage}`, 'FAILED');
      notifySubscribers();
      return { success: false, error: res.backendErrorMessage };
    }
  } catch (err: any) {
    const errMsg = err.message || String(err);
    item.syncStatus = 'failed';
    item.errorMessage = `Manual retry threw error: ${errMsg}`;
    item.backendErrorMessage = errMsg;
    item.stackTrace = err.stack || String(err);
    await updateSyncQueueItemInDb(item);
    logSyncHistory(item.action, `Manual retry error: ${errMsg}`, 'FAILED');
    notifySubscribers();
    return { success: false, error: errMsg };
  }
}

// RESOLVE CONFLICT ACTION
export async function resolveConflict(queueId: string, choice: 'KEEP_LOCAL' | 'KEEP_SERVER') {
  const conflictIndex = activeConflicts.findIndex(c => c.queueId === queueId);
  if (conflictIndex === -1) return;
  const conflict = activeConflicts[conflictIndex];

  if (choice === 'KEEP_SERVER') {
    // Keep Server Version: overwrite local cache with server customer data
    memoryCustomers = memoryCustomers.map(c => c.id === conflict.customer.id ? conflict.serverCustomer : c);
    await saveCustomersToDb(memoryCustomers);
    
    // Remove conflict from queue (skip local edit since we accept server)
    await removeFromSyncQueueInDb(queueId);
    memorySyncQueue = memorySyncQueue.filter(q => q.id !== queueId);
    logSyncHistory('RESOLVE CONFLICT', `Kept server version for ${conflict.customer.id}`, 'SUCCESS');
  } else {
    // Keep Local Version: overwrite conflict check on next sync by simply forcing our edit.
    // We just remove the conflict tracker, and allow standard sync to overwrite the server!
    logSyncHistory('RESOLVE CONFLICT', `Forced local version for ${conflict.customer.id}`, 'SUCCESS');
  }

  // Remove from active conflicts
  activeConflicts.splice(conflictIndex, 1);
  notifyConflicts();
  notifySubscribers();

  // Re-trigger sync to process queue items
  triggerAutoSync();
}

// SECURITY CLEAR CHACE AFTER LOGOUT
export async function clearCacheOnLogout() {
  memoryCustomers = [];
  memoryTickets = [];
  memoryFollowUps = [];
  memorySyncQueue = [];
  activeConflicts = [];
  lastSyncTime = null;
  notifySubscribers();
  await clearAllCachedData();
}
