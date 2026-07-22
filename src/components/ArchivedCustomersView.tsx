import React, { useState, useMemo } from 'react';
import { Customer, Ticket, FollowUp, User } from '../types';
import { 
  Archive, 
  RotateCcw, 
  Trash2, 
  Search, 
  Eye, 
  FileText, 
  ShieldAlert, 
  AlertTriangle, 
  X, 
  CheckCircle, 
  Clock, 
  UserCheck, 
  UserX,
  History,
  ArrowLeft
} from 'lucide-react';
import { getArchiveAuditLogs, ArchiveAuditEvent } from '../utils/archiveAuditLogger';
import InlineCopy from './InlineCopy';

interface ArchivedCustomersViewProps {
  customers: Customer[];
  tickets: Ticket[];
  followUps: FollowUp[];
  currentUser?: User | null;
  onSelectCustomer: (customer: Customer) => void;
  onRestoreCustomer: (id: string) => Promise<{ success: boolean; error?: string }>;
  onPermanentDeleteCustomer: (id: string) => Promise<{ success: boolean; error?: string }>;
  onBack?: () => void;
}

export default function ArchivedCustomersView({
  customers,
  tickets,
  followUps,
  currentUser,
  onSelectCustomer,
  onRestoreCustomer,
  onPermanentDeleteCustomer,
  onBack
}: ArchivedCustomersViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedCustomerForPermanentDelete, setSelectedCustomerForPermanentDelete] = useState<Customer | null>(null);
  const [selectedCustomerForRestore, setSelectedCustomerForRestore] = useState<Customer | null>(null);
  const [isAuditLogOpen, setIsAuditLogOpen] = useState(false);
  const [auditLogSearch, setAuditLogSearch] = useState('');
  const [actionAlert, setActionAlert] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });

  // Archived Customers filter
  const archivedCustomers = useMemo(() => {
    return customers.filter(c => c.isArchived);
  }, [customers]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    archivedCustomers.forEach(c => {
      if (c.customerCategory) set.add(c.customerCategory.toUpperCase());
    });
    return Array.from(set).sort();
  }, [archivedCustomers]);

  // Filtered list
  const filteredArchived = useMemo(() => {
    let result = archivedCustomers;

    if (categoryFilter) {
      result = result.filter(c => c.customerCategory && c.customerCategory.toUpperCase() === categoryFilter.toUpperCase());
    }

    const q = searchQuery.trim().toLowerCase();
    if (!q) return result;

    return result.filter(c => 
      c.name.toLowerCase().includes(q) ||
      c.mobileNumber.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      (c.customerCategory || '').toLowerCase().includes(q) ||
      (c.destinationCountry || '').toLowerCase().includes(q)
    );
  }, [archivedCustomers, categoryFilter, searchQuery]);

  // Handle Restore Execution
  const handleConfirmRestore = async () => {
    if (!selectedCustomerForRestore) return;
    const target = selectedCustomerForRestore;
    setActionAlert({ type: 'loading', message: `Restoring ${target.name}...` });
    try {
      const res = await onRestoreCustomer(target.id);
      if (res.success) {
        setActionAlert({ type: 'success', message: `${target.name} has been restored to the active customer directory.` });
        setSelectedCustomerForRestore(null);
        setTimeout(() => setActionAlert({ type: 'idle', message: '' }), 3000);
      } else {
        setActionAlert({ type: 'error', message: res.error || 'Failed to restore customer profile.' });
      }
    } catch (e: any) {
      setActionAlert({ type: 'error', message: e.message || 'An unexpected error occurred.' });
    }
  };

  // Handle Permanent Delete Execution (Admin Only)
  const handleConfirmPermanentDelete = async () => {
    if (!selectedCustomerForPermanentDelete) return;
    if (currentUser?.role !== 'Admin') {
      setActionAlert({ type: 'error', message: 'Only Administrators can permanently delete customer records.' });
      return;
    }
    const target = selectedCustomerForPermanentDelete;
    setActionAlert({ type: 'loading', message: `Permanently deleting ${target.name}...` });
    try {
      const res = await onPermanentDeleteCustomer(target.id);
      if (res.success) {
        setActionAlert({ type: 'success', message: `${target.name} (${target.id}) was permanently deleted.` });
        setSelectedCustomerForPermanentDelete(null);
        setTimeout(() => setActionAlert({ type: 'idle', message: '' }), 3000);
      } else {
        setActionAlert({ type: 'error', message: res.error || 'Failed to permanently delete customer.' });
      }
    } catch (e: any) {
      setActionAlert({ type: 'error', message: e.message || 'An unexpected error occurred.' });
    }
  };

  // Audit Logs
  const auditLogs = useMemo(() => {
    const logs = getArchiveAuditLogs();
    if (!auditLogSearch.trim()) return logs;
    const q = auditLogSearch.toLowerCase().trim();
    return logs.filter(l => 
      l.customerName.toLowerCase().includes(q) ||
      l.customerId.toLowerCase().includes(q) ||
      l.performedBy.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q)
    );
  }, [auditLogSearch, isAuditLogOpen]);

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return 'N/A';
    try {
      return new Date(isoStr).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6" id="archived-customers-container">
      {onBack && (
        <button
          onClick={onBack}
          id="btn-back-to-settings"
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 bg-white dark:bg-[#1a1a15] border border-gray-200 dark:border-[#8a8a70]/30 px-4 py-2 rounded-full transition-all cursor-pointer shadow-2xs active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>BACK TO SETTINGS</span>
        </button>
      )}

      {/* Header Banner */}
      <div className="bg-amber-500/10 border border-amber-500/20 dark:bg-amber-950/30 dark:border-amber-900/40 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Archive className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wide">
              Archived Customers Repository
            </h1>
            <p className="text-xs font-medium text-amber-800/80 dark:text-amber-300/80">
              Hidden from active search results. Restorable at any time by authorized personnel.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          <button
            onClick={() => setIsAuditLogOpen(true)}
            id="btn-archive-audit-logs"
            className="inline-flex items-center gap-2 bg-white dark:bg-[#1a1a15] hover:bg-gray-50 dark:hover:bg-[#25251e] text-gray-700 dark:text-[#ecece5] border border-gray-200 dark:border-[#8a8a70]/30 font-bold text-xs px-4 py-2.5 rounded-full shadow-2xs transition-all cursor-pointer active:scale-95"
          >
            <History className="w-4 h-4 text-amber-600" />
            <span>ARCHIVE AUDIT LOG</span>
          </button>
        </div>
      </div>

      {/* Action Alerts */}
      {actionAlert.type !== 'idle' && (
        <div className={`p-4 rounded-xl border text-xs font-bold flex items-center gap-2.5 ${
          actionAlert.type === 'loading' ? 'bg-blue-50 text-blue-800 border-blue-200' :
          actionAlert.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
          'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {actionAlert.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{actionAlert.message}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center gap-3 bg-white dark:bg-[#1a1a15] p-3 rounded-2xl border border-gray-200/80 dark:border-[#8a8a70]/20 shadow-2xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search archived customers by name, mobile, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs font-medium pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-[#20201a] border border-gray-200 dark:border-[#8a8a70]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-gray-800 dark:text-gray-100 uppercase"
          />
        </div>

        {categories.length > 0 && (
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full md:w-56 text-xs font-bold uppercase py-2.5 px-3 bg-gray-50 dark:bg-[#20201a] border border-gray-200 dark:border-[#8a8a70]/20 rounded-xl text-gray-700 dark:text-gray-200 cursor-pointer"
          >
            <option value="">ALL CATEGORIES ({archivedCustomers.length})</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        )}
      </div>

      {/* Archived Customers Grid */}
      {filteredArchived.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5" id="archived-grid">
          {filteredArchived.map((customer) => {
            const customerTickets = tickets.filter(t => t.customerId === customer.id);
            const customerFollowUps = followUps.filter(f => f.customerId === customer.id);

            return (
              <div 
                key={customer.id} 
                className="bg-white dark:bg-[#1c1c16] rounded-2xl border border-amber-500/30 dark:border-amber-900/40 p-5 space-y-4 shadow-2xs hover:shadow-md transition-all relative overflow-hidden"
              >
                <div className="top-0 right-0 absolute bg-amber-500 text-white font-black text-[9px] px-3 py-0.5 rounded-bl-lg uppercase tracking-wider">
                  Archived
                </div>

                <div className="flex items-start justify-between gap-2 pt-1">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-serif font-bold text-gray-900 dark:text-gray-100 text-sm uppercase">
                        {customer.name}
                      </h3>
                      <InlineCopy type="name" value={customer.name} className="min-w-[20px] min-h-[20px] p-0" />
                      <span className="font-mono text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-900/30">
                        {customer.id}
                      </span>
                    </div>

                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>📱 {customer.mobileNumber}</span>
                      {customer.customerCategory && (
                        <span className="uppercase font-bold text-amber-700 dark:text-amber-400">
                          {customer.customerCategory}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Audit Meta */}
                <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900/20 text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-600" />
                      Archived On: {formatDate(customer.archivedAt)}
                    </span>
                    {customer.archivedBy && (
                      <span className="flex items-center gap-1">
                        <UserX className="w-3 h-3 text-amber-600" />
                        By: {customer.archivedBy}
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-3 border-t border-gray-100 dark:border-[#8a8a70]/10 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onSelectCustomer(customer)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Details</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedCustomerForRestore(customer)}
                      className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-xs active:scale-95"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore</span>
                    </button>

                    {currentUser?.role === 'Admin' && (
                      <button
                        onClick={() => setSelectedCustomerForPermanentDelete(customer)}
                        className="inline-flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-xs active:scale-95"
                        title="Admin Only: Permanently Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center bg-white dark:bg-[#1a1a15] rounded-2xl border border-gray-200 dark:border-[#8a8a70]/20 space-y-3">
          <Archive className="w-10 h-10 text-gray-300 mx-auto" />
          <h3 className="font-bold text-gray-700 dark:text-gray-300 text-sm uppercase">No Archived Customers</h3>
          <p className="text-xs text-gray-400 font-medium">All customer records are currently active in the directory.</p>
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {selectedCustomerForRestore && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1c1c16] rounded-2xl border border-emerald-500/30 max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
              <RotateCcw className="w-6 h-6" />
              <h2 className="text-base font-bold uppercase tracking-wide">Restore Customer Profile?</h2>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
              This will restore <strong className="text-gray-900 dark:text-white uppercase">{selectedCustomerForRestore.name}</strong> ({selectedCustomerForRestore.id}) back to the active Customer Directory.
            </p>

            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/30 text-xs font-mono text-emerald-800 dark:text-emerald-300 space-y-1">
              <div>Customer ID: {selectedCustomerForRestore.id}</div>
              <div>Mobile: {selectedCustomerForRestore.mobileNumber}</div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100 dark:border-[#8a8a70]/20">
              <button
                onClick={() => setSelectedCustomerForRestore(null)}
                className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRestore}
                className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-full transition-all cursor-pointer shadow-md active:scale-95"
              >
                Confirm Restore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Modal (Admin Only) */}
      {selectedCustomerForPermanentDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1c1c16] rounded-2xl border border-rose-500/40 max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h2 className="text-base font-bold uppercase tracking-wide">Permanently Delete Customer?</h2>
            </div>

            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-800 dark:text-rose-300 font-bold uppercase tracking-wider">
              ⚠️ WARNING: THIS ACTION IS PERMANENT AND CANNOT BE UNDONE.
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
              You are about to permanently remove <strong className="text-gray-900 dark:text-white uppercase">{selectedCustomerForPermanentDelete.name}</strong> ({selectedCustomerForPermanentDelete.id}) from local database and Google Sheets.
            </p>

            <div className="p-3 bg-gray-50 dark:bg-zinc-900 rounded-xl border text-xs font-mono space-y-1 text-gray-700 dark:text-gray-300">
              <div>Customer ID: {selectedCustomerForPermanentDelete.id}</div>
              <div>Name: {selectedCustomerForPermanentDelete.name}</div>
              <div>Mobile: {selectedCustomerForPermanentDelete.mobileNumber}</div>
              <div>Archived Date: {formatDate(selectedCustomerForPermanentDelete.archivedAt)}</div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100 dark:border-[#8a8a70]/20">
              <button
                onClick={() => setSelectedCustomerForPermanentDelete(null)}
                className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPermanentDelete}
                className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-full transition-all cursor-pointer shadow-md active:scale-95"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Modal */}
      {isAuditLogOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1c1c16] rounded-2xl border border-gray-200 dark:border-[#8a8a70]/30 max-w-3xl w-full p-6 space-y-5 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#8a8a70]/20">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <History className="w-5 h-5" />
                <h2 className="text-base font-bold uppercase tracking-wide">Archive Audit Log Trail</h2>
              </div>
              <button
                onClick={() => setIsAuditLogOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search audit trail by customer, user, or action..."
                value={auditLogSearch}
                onChange={(e) => setAuditLogSearch(e.target.value)}
                className="w-full text-xs font-medium pl-10 pr-4 py-2 bg-gray-50 dark:bg-[#20201a] border border-gray-200 dark:border-[#8a8a70]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {auditLogs.length > 0 ? (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-gray-50 dark:bg-[#20201a] rounded-xl border border-gray-100 dark:border-[#8a8a70]/20 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-black ${
                        log.action === 'ARCHIVE' ? 'bg-amber-100 text-amber-800' :
                        log.action === 'RESTORE' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {log.action}
                      </span>
                      <span className="text-gray-400 font-mono text-[11px]">{formatDate(log.timestamp)}</span>
                    </div>
                    <div className="font-semibold text-gray-800 dark:text-gray-200">
                      Customer: {log.customerName} ({log.customerId})
                    </div>
                    <div className="text-gray-500 dark:text-gray-400 text-[11px] flex justify-between">
                      <span>Performed By: {log.performedBy}</span>
                      {log.details && <span>{log.details}</span>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-gray-400 italic">No audit log records found matching search.</div>
              )}
            </div>

            <div className="pt-3 border-t border-gray-100 dark:border-[#8a8a70]/20 flex justify-end">
              <button
                onClick={() => setIsAuditLogOpen(false)}
                className="px-5 py-2 text-xs font-bold bg-gray-800 text-white rounded-full hover:bg-gray-700 cursor-pointer"
              >
                Close Audit Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
