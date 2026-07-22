export interface ArchiveAuditEvent {
  id: string;
  customerId: string;
  customerName: string;
  action: 'ARCHIVE' | 'RESTORE' | 'PERMANENT_DELETE';
  archivedBy?: string;
  archiveDateTime?: string;
  restoredBy?: string;
  restoreDateTime?: string;
  permanentlyDeletedBy?: string;
  permanentDeleteDateTime?: string;
  performedBy: string;
  timestamp: string;
  details?: string;
}

const STORAGE_KEY_ARCHIVE_LOGS = 'move_abroad_crm_archive_audit_logs';

export function getArchiveAuditLogs(): ArchiveAuditEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ARCHIVE_LOGS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to read archive audit logs:", e);
    return [];
  }
}

export function logArchiveAuditEvent(
  event: Omit<ArchiveAuditEvent, 'id' | 'timestamp'>
): ArchiveAuditEvent {
  const logs = getArchiveAuditLogs();
  const newLog: ArchiveAuditEvent = {
    ...event,
    id: `ARCH-LOG-${Math.floor(100000 + Math.random() * 900000)}`,
    timestamp: new Date().toISOString()
  };
  logs.unshift(newLog);
  if (logs.length > 500) logs.pop();

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_ARCHIVE_LOGS, JSON.stringify(logs));
    } catch (e) {
      console.error("Failed to save archive audit log:", e);
    }
    window.dispatchEvent(new CustomEvent('archive-audit-log-updated', { detail: newLog }));
  }
  return newLog;
}
