import React, { useState, useEffect } from 'react';
import { getDuplicateAuditLogs, DuplicateAuditEvent } from '../utils/duplicateAuditLogger';
import { History, X, Search, Download, ShieldCheck, Filter } from 'lucide-react';
import { motion } from 'motion/react';

interface DuplicateAuditLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DuplicateAuditLogsModal({
  isOpen,
  onClose
}: DuplicateAuditLogsModalProps) {
  if (!isOpen) return null;

  const [logs, setLogs] = useState<DuplicateAuditEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  useEffect(() => {
    setLogs(getDuplicateAuditLogs());
  }, [isOpen]);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.groupId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.performedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.primaryCustomerId && log.primaryCustomerId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.primaryCustomerName && log.primaryCustomerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.duplicateCustomerName && log.duplicateCustomerName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  const handleExportCSV = () => {
    const headers = ['ID', 'Group ID', 'Action', 'Primary Customer', 'Duplicate Customer', 'Performed By', 'Reason', 'Timestamp'];
    const rows = filteredLogs.map(l => [
      l.id,
      l.groupId,
      l.action,
      l.primaryCustomerName || l.primaryCustomerId || '',
      l.duplicateCustomerName || l.duplicateCustomerId || '',
      l.performedBy,
      l.reason || '',
      l.timestamp
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Duplicate_Audit_Logs_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in" id="dup-audit-logs-modal-overlay">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2 }}
        id="dup-audit-logs-modal"
        className="relative w-full max-w-4xl bg-white dark:bg-[#1a1a15] rounded-3xl border border-gray-200 dark:border-[#8a8a70]/30 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gray-50 dark:bg-[#20201a] border-b border-gray-200 dark:border-[#8a8a70]/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 rounded-2xl">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-gray-900 dark:text-white">
                Duplicate Resolution Audit Trail
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Immutable event records for duplicate merges, archives, keep-both, and ignores
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-1.5 text-xs font-bold bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-50 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-4 bg-gray-100/50 dark:bg-[#1f1f1a] border-b border-gray-200 dark:border-[#8a8a70]/20 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search group ID, customer, user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-[#1a1a15] border border-gray-200 dark:border-[#8a8a70]/30 rounded-xl text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {['ALL', 'MERGE', 'ARCHIVE', 'KEEP_BOTH', 'IGNORE'].map(act => (
              <button
                key={act}
                onClick={() => setActionFilter(act)}
                className={`px-3 py-1 text-[10px] font-bold uppercase rounded-lg transition-colors cursor-pointer ${
                  actionFilter === act
                    ? 'bg-amber-600 text-white'
                    : 'bg-white dark:bg-zinc-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-zinc-700'
                }`}
              >
                {act.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Table List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-xs font-bold uppercase space-y-2">
              <ShieldCheck className="w-8 h-8 mx-auto opacity-40" />
              <p>No audit log entries recorded yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLogs.map(log => (
                <div
                  key={log.id}
                  className="p-3 bg-white dark:bg-[#1f1f1a] border border-gray-200 dark:border-[#8a8a70]/20 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-gray-500">{log.groupId}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        log.action === 'MERGE' ? 'bg-emerald-100 text-emerald-800' :
                        log.action === 'ARCHIVE' ? 'bg-amber-100 text-amber-800' :
                        log.action === 'KEEP_BOTH' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {log.action}
                      </span>
                      <span className="text-gray-400 font-mono text-[10px]">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-gray-800 dark:text-gray-200 font-medium">
                      {log.primaryCustomerName && <span>Primary: <strong>{log.primaryCustomerName}</strong></span>}
                      {log.duplicateCustomerName && <span className="ml-2">Duplicate: <strong>{log.duplicateCustomerName}</strong></span>}
                    </p>
                  </div>

                  <div className="text-right text-[11px] text-gray-500 shrink-0">
                    <div>User: <strong className="text-gray-800 dark:text-gray-200">{log.performedBy}</strong></div>
                    {log.reason && <div className="text-[10px] italic">Reason: {log.reason}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
