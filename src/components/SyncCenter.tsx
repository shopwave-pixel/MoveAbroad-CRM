import React, { useState, useEffect } from 'react';
import { 
  X, RefreshCw, Wifi, WifiOff, AlertTriangle, CheckCircle2, 
  Clock, Server, Smartphone, ArrowRight, Check, AlertCircle, Trash2, Edit3, PlusCircle, HelpCircle, CheckCircle
} from 'lucide-react';
import { Customer, SyncConfig } from '../types';
import { SyncQueueItem } from '../utils/cacheDb';
import { 
  activeConflicts, 
  resolveConflict, 
  triggerAutoSync, 
  subscribeToConflicts,
  retryQueueItem,
  SyncConflict 
} from '../utils/cacheManager';

interface SyncCenterProps {
  isOpen: boolean;
  onClose: () => void;
  syncQueue: SyncQueueItem[];
  isOnline: boolean;
  syncStatus: 'CONNECTING' | 'LIVE' | 'SYNCING' | 'OFFLINE';
  lastSyncTime: Date | null;
  syncHistory: { timestamp: string; action: string; details: string; status: 'SUCCESS' | 'FAILED' }[];
  config: SyncConfig;
  isDeveloperMode?: boolean;
  onOpenLogs?: () => void;
}

export default function SyncCenter({
  isOpen,
  onClose,
  syncQueue,
  isOnline,
  syncStatus,
  lastSyncTime,
  syncHistory,
  config,
  isDeveloperMode = false,
  onOpenLogs
}: SyncCenterProps) {
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [activeCompareId, setActiveCompareId] = useState<string | null>(null);
  const [expandedDebugItemId, setExpandedDebugItemId] = useState<string | null>(null);
  const [isRetryingItem, setIsRetryingItem] = useState<string | null>(null);
  const [copiedTextType, setCopiedTextType] = useState<{ id: string; type: string } | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToConflicts((currentConflicts) => {
      setConflicts(currentConflicts);
    });
    return unsubscribe;
  }, []);

  const handleCopy = async (id: string, text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTextType({ id, type });
      setTimeout(() => setCopiedTextType(null), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const handleRetryItem = async (itemId: string) => {
    setIsRetryingItem(itemId);
    try {
      const res = await retryQueueItem(itemId);
      if (res.success) {
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: '✅ Sync retry successful!' } }));
      } else {
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: `❌ Retry failed: ${res.error || 'Server Returned Failure'}` } }));
      }
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: `❌ Error retrying: ${err.message || err}` } }));
    } finally {
      setIsRetryingItem(null);
    }
  };

  if (!isOpen) return null;

  const handleManualSyncNow = () => {
    triggerAutoSync(config);
  };

  const handleResolve = async (queueId: string, choice: 'KEEP_LOCAL' | 'KEEP_SERVER') => {
    await resolveConflict(queueId, choice);
    setActiveCompareId(null);
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE_CUSTOMER':
        return <span className="inline-flex items-center gap-1 text-[13px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30"><PlusCircle className="w-3.5 h-3.5" /> CREATE CUSTOMER</span>;
      case 'EDIT_CUSTOMER':
        return <span className="inline-flex items-center gap-1 text-[13px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30"><Edit3 className="w-3.5 h-3.5" /> EDIT CUSTOMER</span>;
      case 'DELETE_CUSTOMER':
        return <span className="inline-flex items-center gap-1 text-[13px] font-bold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30"><Trash2 className="w-3.5 h-3.5" /> DELETE CUSTOMER</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-[13px] font-bold px-2 py-0.5 rounded-full bg-slate-50 dark:bg-[#151510] text-slate-700 dark:text-[#ecece5] border border-slate-100 dark:border-[#5a5a40]/20">{action}</span>;
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" id="sync-center-overlay">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs transition-opacity" onClick={onClose}></div>

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-lg bg-white dark:bg-[#1C1C14] border-l border-slate-100 dark:border-[#5a5a40]/20 shadow-2xl flex flex-col">
          
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 dark:border-[#5a5a40]/20 bg-[#5A5A40]/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#5A5A40]/10 flex items-center justify-center text-[#5A5A40] dark:text-[#f5f5f0]">
                <RefreshCw className={`w-4 h-4 ${syncStatus === 'SYNCING' ? 'animate-spin' : ''}`} />
              </div>
              <div>
                <h2 className="font-sans font-bold text-base text-[#2c2c26] dark:text-[#f5f5f0]">Sync Center</h2>
                <p className="text-[13px] font-medium text-slate-500 dark:text-[#8a8a70] uppercase tracking-wider">Enterprise Offline Engine</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-[#ecece5] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sync Engine Status Card */}
          <div className="p-4 bg-slate-50 dark:bg-[#151510]/30 border-b border-slate-100 dark:border-[#5a5a40]/20 flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              {/* Connection Status Indicator */}
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-bold px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30">
                    <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>ONLINE Connected</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-bold px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950/20 text-rose-800 dark:text-rose-400 border border-rose-200 dark:border-rose-900/30">
                    <WifiOff className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    <span>OFFLINE Offline Mode</span>
                  </span>
                )}
              </div>

              {/* Sync Trigger button */}
              <button
                onClick={handleManualSyncNow}
                disabled={syncStatus === 'SYNCING' || !isOnline}
                className="inline-flex items-center gap-1.5 text-[13px] font-bold px-4 py-1.5 bg-[#5A5A40] dark:bg-[#5A5A40] hover:bg-[#5A5A40]/90 text-white rounded-xl shadow-xs transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'SYNCING' ? 'animate-spin' : ''}`} />
                <span>SYNC NOW</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-[13px]">
              <div className="p-2 bg-white dark:bg-[#151510] rounded-xl border border-slate-100 dark:border-[#5a5a40]/20 shadow-2xs">
                <p className="text-[13px] text-slate-400 dark:text-[#8a8a70] font-bold uppercase tracking-wider">Queue Size</p>
                <p className="text-xl font-bold text-slate-800 dark:text-[#f5f5f0] mt-0.5">{syncQueue.length}</p>
              </div>
              <div className="p-2 bg-white dark:bg-[#151510] rounded-xl border border-slate-100 dark:border-[#5a5a40]/20 shadow-2xs">
                <p className="text-[13px] text-slate-400 dark:text-[#8a8a70] font-bold uppercase tracking-wider">Last Sync</p>
                <p className="text-[13px] font-bold text-slate-700 dark:text-[#ecece5] mt-2.5">
                  {lastSyncTime ? lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'NEVER'}
                </p>
              </div>
            </div>
          </div>

          {/* Sync Center Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            
            {/* Active Conflicts Panel */}
            {conflicts.length > 0 && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/10 rounded-2xl border border-amber-200 dark:border-amber-900/30 shadow-sm space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-bounce" />
                  <div>
                    <h3 className="text-[13px] font-bold text-amber-900 dark:text-amber-400">Sync Conflicts Detected ({conflicts.length})</h3>
                    <p className="text-[13px] text-amber-700 dark:text-amber-500/90 leading-relaxed mt-0.5">
                      The same customer records were updated on another device. Please resolve to continue synchronization.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {conflicts.map((conflict) => (
                    <div key={conflict.queueId} className="bg-white dark:bg-[#151510] rounded-xl border border-amber-200 dark:border-amber-900/30 p-3 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between text-[13px] font-bold text-slate-700 dark:text-[#ecece5]">
                        <span>Customer: {conflict.customer.name} ({conflict.customer.id})</span>
                        <button
                          onClick={() => setActiveCompareId(activeCompareId === conflict.queueId ? null : conflict.queueId)}
                          className="text-[13px] text-[#5A5A40] dark:text-[#8a8a70] hover:underline cursor-pointer"
                        >
                          {activeCompareId === conflict.queueId ? 'Close Comparison' : 'Compare Changes'}
                        </button>
                      </div>

                      {activeCompareId === conflict.queueId ? (
                        <div className="space-y-3.5">
                          {/* Side by side comparison table */}
                          <div className="border border-slate-100 dark:border-[#5a5a40]/20 rounded-xl overflow-hidden text-[13px]">
                            <div className="grid grid-cols-3 bg-slate-50 dark:bg-[#151510]/50 font-bold p-1.5 text-slate-500 dark:text-[#8a8a70] border-b border-slate-100 dark:border-[#5a5a40]/20">
                              <div>Property</div>
                              <div className="text-emerald-700 dark:text-emerald-400">Local Cache</div>
                              <div className="text-blue-700 dark:text-blue-400">Server Sheet</div>
                            </div>
                            <div className="divide-y divide-slate-50 dark:divide-[#5a5a40]/10">
                              {[
                                { label: 'Name', local: conflict.customer.name, server: conflict.serverCustomer.name },
                                { label: 'Mobile', local: conflict.customer.mobileNumber, server: conflict.serverCustomer.mobileNumber },
                                { label: 'WhatsApp', local: conflict.customer.whatsAppNumber, server: conflict.serverCustomer.whatsAppNumber },
                                { label: 'Category', local: conflict.customer.customerCategory, server: conflict.serverCustomer.customerCategory },
                                { label: 'Address', local: conflict.customer.address, server: conflict.serverCustomer.address },
                                { label: 'Gender', local: conflict.customer.gender, server: conflict.serverCustomer.gender }
                              ].map((row) => (
                                <div key={row.label} className="grid grid-cols-3 p-1.5 dark:border-[#5a5a40]/10">
                                  <span className="font-bold text-slate-400 dark:text-[#8a8a70]">{row.label}</span>
                                  <span className={`font-medium dark:text-[#ecece5] ${row.local !== row.server ? 'text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-1 rounded' : ''}`}>{row.local || '—'}</span>
                                  <span className={`font-medium dark:text-[#ecece5] ${row.local !== row.server ? 'text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/20 px-1 rounded' : ''}`}>{row.server || '—'}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleResolve(conflict.queueId, 'KEEP_LOCAL')}
                              className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[13px] rounded-lg transition-all cursor-pointer"
                            >
                              KEEP LOCAL VERSION
                            </button>
                            <button
                              onClick={() => handleResolve(conflict.queueId, 'KEEP_SERVER')}
                              className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] rounded-lg transition-all cursor-pointer"
                            >
                              KEEP SERVER VERSION
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleResolve(conflict.queueId, 'KEEP_LOCAL')}
                            className="flex-1 py-1 px-2.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 font-bold text-[13px] rounded-lg border border-emerald-100 dark:border-emerald-900/30 text-center cursor-pointer"
                          >
                            Keep Local
                          </button>
                          <button
                            onClick={() => handleResolve(conflict.queueId, 'KEEP_SERVER')}
                            className="flex-1 py-1 px-2.5 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 font-bold text-[13px] rounded-lg border border-blue-100 dark:border-blue-100/30 text-center cursor-pointer"
                          >
                            Keep Server
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Sync Queue List */}
            <div className="space-y-3">
              <h3 className="text-[13px] font-bold text-slate-700 dark:text-[#ecece5] uppercase tracking-wider flex items-center justify-between">
                <span>Pending Actions ({syncQueue.length})</span>
                {syncQueue.length > 0 && <span className="text-[13px] text-amber-600 font-bold">Offline Queue Active</span>}
              </h3>

              {syncQueue.length === 0 ? (
                <div className="p-6 text-center border-2 border-dashed border-slate-100 dark:border-[#5a5a40]/20 rounded-2xl">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="text-[13px] font-bold text-slate-600 dark:text-[#ecece5] mt-2">All changes synchronized</p>
                  <p className="text-[13px] text-slate-400 dark:text-[#8a8a70] mt-0.5">Offline cache is 100% up to date with Sheets database</p>
                </div>
              ) : (
                <div className="space-y-2 divide-y divide-slate-50 dark:divide-[#5a5a40]/10 max-h-[250px] overflow-y-auto pr-1">
                  {syncQueue.map((item) => (
                    <div key={item.id} className="pt-2.5 first:pt-0 flex flex-col gap-1 text-[13px] pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {getActionBadge(item.action)}
                          <span className="text-[13px] font-mono text-slate-400 dark:text-[#8a8a70] font-bold">{item.customerId || 'GLOBAL'}</span>
                        </div>
                        <span className={`text-[13px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                          item.syncStatus === 'syncing' ? 'bg-amber-100 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 animate-pulse' :
                          item.syncStatus === 'failed' ? 'bg-rose-100 dark:bg-rose-950/20 text-rose-800 dark:text-rose-400' : 'bg-slate-100 dark:bg-[#151510] text-slate-600 dark:text-[#8a8a70]'
                        }`}>
                          {item.syncStatus}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-slate-500 dark:text-[#8a8a70] text-[13px]">
                        <span className="font-medium truncate max-w-[280px]">
                          {item.action === 'CREATE_CUSTOMER' && `Create ${item.payload?.name}`}
                          {item.action === 'EDIT_CUSTOMER' && `Edit details of ${item.payload?.name || item.customerId}`}
                          {item.action === 'DELETE_CUSTOMER' && `Delete customer record ${item.customerId}`}
                          {item.action === 'CREATE_TICKET' && `Create Ticket: "${item.payload?.conversationDescription}"`}
                          {item.action === 'UPDATE_TICKET' && `Update Ticket Status`}
                          {item.action === 'CREATE_FOLLOWUP' && `Add Follow-up reminder`}
                          {item.action === 'UPDATE_FOLLOWUP' && `Update Follow-up details`}
                        </span>
                        <span className="font-mono text-slate-400 dark:text-[#8a8a70]">{formatTime(item.timestamp)}</span>
                      </div>

                      {item.syncStatus === 'failed' && (
                        <div className="mt-2 space-y-2">
                          {/* Main Error Alert */}
                          <div className="text-[13px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/10 p-2 rounded-lg border border-rose-100/50 dark:border-rose-900/20 leading-tight flex items-start justify-between gap-1.5">
                            <span className="break-all">Error: {item.backendErrorMessage || item.errorMessage || 'Unknown sync error'}</span>
                            <button
                              onClick={() => setExpandedDebugItemId(expandedDebugItemId === item.id ? null : item.id)}
                              className="text-[11px] font-bold text-rose-700 hover:text-rose-950 dark:text-rose-300 dark:hover:text-rose-100 hover:underline cursor-pointer select-none shrink-0"
                            >
                              {expandedDebugItemId === item.id ? 'Hide Details' : 'Inspect Failure'}
                            </button>
                          </div>

                          {/* Expanded Developer Diagnostics Panel */}
                          {expandedDebugItemId === item.id && (
                            <div className="bg-[#1e1e1e] dark:bg-black text-slate-300 rounded-xl p-3.5 border border-slate-700/50 shadow-inner font-mono text-[11px] space-y-3 mt-2 overflow-x-auto select-text">
                              <div className="flex items-center justify-between border-b border-slate-700/60 pb-1.5 text-slate-400 text-[10px] font-bold uppercase">
                                <span>Developer Diagnostics</span>
                                {isDeveloperMode && (
                                  <span className="text-amber-500 font-extrabold uppercase">Admin Mode</span>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[10.5px]">
                                <div>
                                  <span className="text-slate-500 font-bold uppercase">HTTP Status:</span>{' '}
                                  <span className={`font-bold ${item.httpStatus === 200 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {item.httpStatus ?? '—'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-500 font-bold uppercase">Action:</span>{' '}
                                  <span className="text-amber-400 font-bold">{item.requestAction || item.action}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 font-bold uppercase">Customer ID:</span>{' '}
                                  <span className="text-blue-400 font-bold">{item.customerId || '—'}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 font-bold uppercase">Exec Time:</span>{' '}
                                  <span className="text-teal-400 font-bold">{item.executionTime ? `${item.executionTime}ms` : '—'}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 font-bold uppercase">Retry Count:</span>{' '}
                                  <span className="text-purple-400 font-bold">{item.retryCount ?? '0'}/3</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 font-bold uppercase">Timestamp:</span>{' '}
                                  <span className="text-slate-400">{formatTime(item.timestamp)}</span>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <span className="text-slate-500 text-[10px] font-bold uppercase block">Backend Error Message:</span>
                                <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800 text-rose-300 break-all select-all font-bold">
                                  {item.backendErrorMessage || item.errorMessage || 'No specific backend error reported.'}
                                </div>
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-500 text-[10px] font-bold uppercase">Request Payload:</span>
                                  <button
                                    onClick={() => handleCopy(item.id, item.requestPayload || JSON.stringify(item.payload), 'payload')}
                                    className="text-[10px] text-blue-400 hover:underline cursor-pointer"
                                  >
                                    {copiedTextType?.id === item.id && copiedTextType?.type === 'payload' ? 'Copied!' : 'Copy Payload'}
                                  </button>
                                </div>
                                <pre className="bg-slate-900/60 p-2 rounded-lg border border-slate-800 text-slate-300 overflow-x-auto max-h-24 select-all text-[10px] font-bold leading-normal">
                                  {item.requestPayload || JSON.stringify(item.payload, null, 2)}
                                </pre>
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-500 text-[10px] font-bold uppercase">Apps Script Response:</span>
                                  <button
                                    onClick={() => handleCopy(item.id, item.appsScriptResponse || '', 'response')}
                                    className="text-[10px] text-blue-400 hover:underline cursor-pointer"
                                  >
                                    {copiedTextType?.id === item.id && copiedTextType?.type === 'response' ? 'Copied!' : 'Copy Response'}
                                  </button>
                                </div>
                                <pre className="bg-slate-900/60 p-2 rounded-lg border border-slate-800 text-slate-300 overflow-x-auto max-h-24 select-all text-[10px] font-bold leading-normal text-wrap break-all">
                                  {item.appsScriptResponse || 'No response captured.'}
                                </pre>
                              </div>

                              {item.stackTrace && (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-500 text-[10px] font-bold uppercase">Stack Trace:</span>
                                    <button
                                      onClick={() => handleCopy(item.id, item.stackTrace || '', 'stack')}
                                      className="text-[10px] text-blue-400 hover:underline cursor-pointer"
                                    >
                                      {copiedTextType?.id === item.id && copiedTextType?.type === 'stack' ? 'Copied!' : 'Copy Trace'}
                                    </button>
                                  </div>
                                  <pre className="bg-slate-900/60 p-2 rounded-lg border border-slate-800 text-rose-300/80 overflow-x-auto max-h-24 select-all text-[10px] leading-tight text-wrap break-all">
                                    {item.stackTrace}
                                  </pre>
                                </div>
                              )}

                              {/* Interactive Developer Controls */}
                              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
                                <button
                                  onClick={() => handleRetryItem(item.id)}
                                  disabled={isRetryingItem === item.id}
                                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-[11px] rounded-lg transition-all cursor-pointer select-none uppercase font-sans tracking-wide"
                                >
                                  <RefreshCw className={`w-3 h-3 ${isRetryingItem === item.id ? 'animate-spin' : ''}`} />
                                  <span>{isRetryingItem === item.id ? 'Retrying...' : 'Retry Now'}</span>
                                </button>
                                
                                {isDeveloperMode && onOpenLogs && (
                                  <button
                                    onClick={onOpenLogs}
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-100 font-bold text-[11px] rounded-lg transition-all cursor-pointer select-none uppercase font-sans tracking-wide border border-slate-600"
                                  >
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>Open Logs</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {item.syncStatus !== 'failed' && item.errorMessage && (
                        <p className="text-[13px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/10 p-1.5 rounded-lg mt-1 border border-rose-100/50 dark:border-rose-900/20 leading-tight">
                          Error: {item.errorMessage}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sync History List */}
            <div className="space-y-3">
              <h3 className="text-[13px] font-bold text-slate-700 dark:text-[#ecece5] uppercase tracking-wider">Sync Log</h3>
              
              {syncHistory.length === 0 ? (
                <p className="text-[13px] font-medium text-slate-400 dark:text-[#8a8a70] italic">No sync activities recorded in this session</p>
              ) : (
                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                  {syncHistory.slice(0, 15).map((log, index) => (
                    <div key={index} className="flex items-start justify-between text-[13px] py-1 border-b border-slate-50 dark:border-[#5a5a40]/10 last:border-0">
                      <div className="flex items-start gap-1.5 max-w-[80%]">
                        <span className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${log.status === 'SUCCESS' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                        <div>
                          <p className="font-bold text-slate-700 dark:text-[#ecece5] leading-none">{log.action}</p>
                          <p className="text-[13px] text-slate-400 dark:text-[#8a8a70] mt-0.5 truncate max-w-xs">{log.details}</p>
                        </div>
                      </div>
                      <span className="font-mono text-[13px] text-slate-400 dark:text-[#8a8a70] shrink-0">{formatTime(log.timestamp)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 dark:bg-[#151510]/30 border-t border-slate-100 dark:border-[#5a5a40]/20 text-center text-[13px] text-slate-400 dark:text-[#8a8a70] font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-slate-400 dark:text-[#8a8a70]" />
            <span>Dual Sync Engine v2.0 • Secured IndexedDB</span>
          </div>

        </div>
      </div>
    </div>
  );
}
