import { SyncConfig } from '../types';

export interface DuplicateGroup {
  groupId: string;
  matchType: string;
  confidenceScore: number;
  matchedValue: string;
  primaryCustomerId: string;
  duplicateCustomerIds: string[];
  status: 'Pending' | 'Resolved' | 'Merged' | 'Archived';
  detectedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface DuplicateAuditLog {
  logId: string;
  groupId: string;
  action: 'DETECTED' | 'KEEP_BOTH' | 'MERGED' | 'ARCHIVED' | 'CREATED_ANYWAY';
  primaryCustomer: string;
  duplicateCustomer: string;
  performedBy: string;
  dateTime: string;
  reason?: string;
}

const STORAGE_KEY_GROUPS = 'move_abroad_crm_duplicate_groups';
const STORAGE_KEY_LOGS = 'move_abroad_crm_duplicate_logs';

/**
 * Get all stored duplicate groups
 */
export function getDuplicateGroups(): DuplicateGroup[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_GROUPS);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Error reading duplicate groups from localStorage', err);
    return [];
  }
}

/**
 * Get all stored duplicate audit logs
 */
export function getDuplicateAuditLogs(): DuplicateAuditLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOGS);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Error reading duplicate audit logs from localStorage', err);
    return [];
  }
}

/**
 * Record a new duplicate group and corresponding audit log entry
 */
export function recordDuplicateGroup(
  group: Omit<DuplicateGroup, 'groupId' | 'detectedAt'>,
  performedBy: string,
  action: DuplicateAuditLog['action'],
  reason?: string,
  syncConfig?: SyncConfig
): { group: DuplicateGroup; log: DuplicateAuditLog } {
  const groups = getDuplicateGroups();
  const logs = getDuplicateAuditLogs();

  const groupId = `GRP-${Math.floor(100000 + Math.random() * 900000)}`;
  const logId = `LOG-${Math.floor(100000 + Math.random() * 900000)}`;
  const isoNow = new Date().toISOString();

  const newGroup: DuplicateGroup = {
    ...group,
    groupId,
    detectedAt: isoNow,
    reviewedBy: group.reviewedBy || performedBy,
    reviewedAt: group.reviewedAt || isoNow
  };

  const newLog: DuplicateAuditLog = {
    logId,
    groupId,
    action,
    primaryCustomer: group.primaryCustomerId,
    duplicateCustomer: group.duplicateCustomerIds.join(', '),
    performedBy,
    dateTime: isoNow,
    reason: reason || action
  };

  groups.unshift(newGroup);
  logs.unshift(newLog);

  try {
    localStorage.setItem(STORAGE_KEY_GROUPS, JSON.stringify(groups));
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs));
  } catch (err) {
    console.error('Failed saving duplicate record to localStorage', err);
  }

  // Sync to Google Sheets if webAppUrl is available
  if (syncConfig && syncConfig.webAppUrl && syncConfig.isLiveMode) {
    fetch(syncConfig.webAppUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'recordDuplicateGroup',
        group: newGroup,
        log: newLog
      })
    }).catch(err => console.warn('Background sync for duplicate group failed silently', err));
  }

  return { group: newGroup, log: newLog };
}

/**
 * Update an existing duplicate group status
 */
export function updateDuplicateGroupStatus(
  groupId: string,
  status: DuplicateGroup['status'],
  reviewedBy: string,
  action: DuplicateAuditLog['action'],
  reason?: string,
  syncConfig?: SyncConfig
): void {
  const groups = getDuplicateGroups();
  const idx = groups.findIndex(g => g.groupId === groupId);
  if (idx !== -1) {
    groups[idx].status = status;
    groups[idx].reviewedBy = reviewedBy;
    groups[idx].reviewedAt = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY_GROUPS, JSON.stringify(groups));
    } catch (e) {
      console.error(e);
    }
  }

  const logId = `LOG-${Math.floor(100000 + Math.random() * 900000)}`;
  const logs = getDuplicateAuditLogs();
  const newLog: DuplicateAuditLog = {
    logId,
    groupId,
    action,
    primaryCustomer: groups[idx]?.primaryCustomerId || 'N/A',
    duplicateCustomer: groups[idx]?.duplicateCustomerIds.join(', ') || 'N/A',
    performedBy: reviewedBy,
    dateTime: new Date().toISOString(),
    reason: reason || status
  };
  logs.unshift(newLog);

  try {
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs));
  } catch (e) {
    console.error(e);
  }

  if (syncConfig && syncConfig.webAppUrl && syncConfig.isLiveMode) {
    fetch(syncConfig.webAppUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'updateDuplicateGroup',
        groupId,
        status,
        log: newLog
      })
    }).catch(err => console.warn('Background sync failed', err));
  }
}
