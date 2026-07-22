export interface DuplicateAuditEvent {
  id: string;
  groupId: string;
  action: 'MERGE' | 'ARCHIVE' | 'KEEP_BOTH' | 'IGNORE';
  primaryCustomerId?: string;
  primaryCustomerName?: string;
  duplicateCustomerId?: string;
  duplicateCustomerName?: string;
  performedBy: string;
  reason?: string;
  timestamp: string;
  details?: string;
}

const STORAGE_KEY_DUPLICATE_LOGS = 'move_abroad_crm_duplicate_audit_logs';

export function getDuplicateAuditLogs(): DuplicateAuditEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DUPLICATE_LOGS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to read duplicate audit logs:", e);
    return [];
  }
}

export function logDuplicateAuditEvent(
  event: Omit<DuplicateAuditEvent, 'id' | 'timestamp'>
): DuplicateAuditEvent {
  const logs = getDuplicateAuditLogs();
  const newLog: DuplicateAuditEvent = {
    ...event,
    id: `DUP-LOG-${Math.floor(100000 + Math.random() * 900000)}`,
    timestamp: new Date().toISOString()
  };
  logs.unshift(newLog);
  if (logs.length > 500) logs.pop();

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_DUPLICATE_LOGS, JSON.stringify(logs));
    } catch (e) {
      console.error("Failed to save duplicate audit log:", e);
    }
    window.dispatchEvent(new CustomEvent('duplicate-audit-log-updated', { detail: newLog }));
  }
  return newLog;
}
