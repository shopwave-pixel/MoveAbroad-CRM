import React, { useState, useEffect } from 'react';
import { GOOGLE_APPS_SCRIPT_CODE } from '../utils/gasCode';
import { SyncConfig, User } from '../types';
import { 
  Database, 
  Copy, 
  Check, 
  FileSpreadsheet, 
  Wifi, 
  WifiOff, 
  ChevronDown, 
  ChevronUp,
  ExternalLink,
  Users,
  Archive,
  Wrench,
  Terminal,
  Activity,
  History,
  RefreshCw,
  Server,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SettingsCard from './SettingsCard';

interface SettingsPanelProps {
  config: SyncConfig;
  onUpdateConfig: (newConfig: SyncConfig) => void;
  onRefreshData: () => Promise<void>;
  isLoading: boolean;
  onOpenDebug?: () => void;
  isDeveloperMode?: boolean;
  currentUser?: User | null;
  archivedCount?: number;
  onOpenArchivedCustomers?: () => void;
  onOpenArchivedAuditLogs?: () => void;
  onOpenDuplicateManagement?: () => void;
  lastSyncTime?: Date | null;
  syncStatus?: 'CONNECTING' | 'LIVE' | 'SYNCING' | 'OFFLINE';
  isOnline?: boolean;
}

function formatRelativeTime(date: Date | null | string | undefined): string {
  if (!date) return 'Never';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'Never';
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diffSec < 10) return 'Just now';
  if (diffSec < 60) return `${diffSec} seconds ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? 's' : ''} ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
  return d.toLocaleDateString();
}

export default function SettingsPanel({
  config,
  onUpdateConfig,
  onRefreshData,
  isLoading,
  onOpenDebug,
  isDeveloperMode = false,
  currentUser,
  archivedCount = 0,
  onOpenArchivedCustomers,
  onOpenArchivedAuditLogs,
  onOpenDuplicateManagement,
  lastSyncTime,
  syncStatus = 'LIVE',
  isOnline = true
}: SettingsPanelProps) {
  const [urlInput, setUrlInput] = useState(config.webAppUrl);
  const [isCopied, setIsCopied] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [settingsSaveStatus, setSettingsSaveStatus] = useState<'IDLE' | 'EDITING' | 'SAVING' | 'SAVED' | 'FAILED'>('IDLE');

  // Single expandable section constraint: 'customer-management' | 'admin-tools' | 'sync-center' | null
  const [openSection, setOpenSection] = useState<'customer-management' | 'admin-tools' | 'sync-center' | null>(null);

  const isAdmin = currentUser ? currentUser.role === 'Admin' : true;

  const toggleSection = (section: 'customer-management' | 'admin-tools' | 'sync-center') => {
    setOpenSection(prev => prev === section ? null : section);
  };

  // Debounced auto-save for Google Sheets URL
  useEffect(() => {
    if (urlInput.trim() === config.webAppUrl) {
      setSettingsSaveStatus('IDLE');
      return;
    }

    setSettingsSaveStatus('EDITING');
    window.dispatchEvent(new CustomEvent('set-save-status', { detail: { status: 'EDITING' } }));

    const timer = setTimeout(() => {
      setSettingsSaveStatus('SAVING');
      window.dispatchEvent(new CustomEvent('set-save-status', { detail: { status: 'SAVING' } }));
      try {
        onUpdateConfig({
          webAppUrl: urlInput.trim(),
          isLiveMode: !!urlInput.trim() && config.isLiveMode
        });
        setSettingsSaveStatus('SAVED');
        window.dispatchEvent(new CustomEvent('set-save-status', { detail: { status: 'SAVED' } }));
        setTimeout(() => {
          setSettingsSaveStatus('IDLE');
          window.dispatchEvent(new CustomEvent('set-save-status', { detail: { status: 'IDLE' } }));
        }, 1500);
      } catch (err) {
        setSettingsSaveStatus('FAILED');
        window.dispatchEvent(new CustomEvent('set-save-status', { detail: { status: 'FAILED' } }));
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [urlInput, config.webAppUrl, onUpdateConfig, config.isLiveMode]);

  const handleToggleLiveMode = () => {
    if (!config.webAppUrl) {
      setTestResult({
        success: false,
        message: 'Please provide a valid Web App URL before enabling Live Mode.'
      });
      return;
    }
    const newLiveState = !config.isLiveMode;
    onUpdateConfig({
      ...config,
      isLiveMode: newLiveState
    });
    setTestResult(null);
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code: ', err);
    }
  };

  const handleTestConnection = async () => {
    if (!urlInput.trim()) {
      setTestResult({ success: false, message: 'Please enter a URL to test.' });
      return;
    }
    setTestingConnection(true);
    setTestResult(null);
    try {
      const url = `${urlInput.trim()}?action=get_data`;
      const res = await fetch(url, { method: 'GET', mode: 'cors' });
      if (!res.ok) {
        throw new Error(`HTTP Status ${res.status}`);
      }
      const data = await res.json();
      if (data.success) {
        setTestResult({
          success: true,
          message: `Successfully connected! Found ${data.customers?.length || 0} customers and ${data.tickets?.length || 0} tickets.`
        });
        onUpdateConfig({
          webAppUrl: urlInput.trim(),
          isLiveMode: true
        });
      } else {
        throw new Error(data.error || 'Server returned unsuccessful response.');
      }
    } catch (err: any) {
      console.error(err);
      setTestResult({
        success: false,
        message: `Connection failed. Error: ${err.message || err}. Please ensure you completed Apps Script deployment correctly.`
      });
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.2 }}
      className="space-y-6" 
      id="settings-panel"
    >
      {/* 1. Customer Management Section (Admin Only) */}
      {isAdmin && (
        <div className="bg-white dark:bg-[#1a1a15] rounded-[20px] border border-gray-200 dark:border-[#8a8a70]/20 p-5 shadow-xs transition-all" id="section-customer-management">
          <button
            onClick={() => toggleSection('customer-management')}
            id="accordion-header-customer-management"
            className="w-full flex items-center justify-between focus:outline-none cursor-pointer group text-left"
            aria-expanded={openSection === 'customer-management'}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-serif font-bold text-gray-900 dark:text-gray-100 text-sm uppercase group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                    Customer Management
                  </h2>
                  {archivedCount > 0 && (
                    <span className="bg-amber-500 text-white font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {archivedCount} ARCHIVED
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">
                  Enterprise customer directory controls & archived records
                </p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-500 group-hover:bg-amber-100 dark:group-hover:bg-amber-950/40 group-hover:text-amber-700 transition-all shrink-0">
              {openSection === 'customer-management' ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </button>

          <AnimatePresence initial={false}>
            {openSection === 'customer-management' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-2.5 pt-4 border-t border-gray-100 dark:border-[#8a8a70]/15 mt-4">
                  {/* 1.1 Archived Customers */}
                  <SettingsCard
                    id="btn-settings-archived-customers"
                    icon={Archive}
                    iconBg="bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400"
                    title="Archived Customers"
                    description="Access hidden customer profiles, restore records, or view archive audit trail"
                    badge={archivedCount > 0 ? { text: `${archivedCount} ARCHIVED`, variant: 'archived' } : undefined}
                    onClick={onOpenArchivedCustomers}
                    clickable={true}
                  />

                  {/* 1.2 Duplicate Management */}
                  <SettingsCard
                    id="card-duplicate-management"
                    icon={Copy}
                    iconBg="bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400"
                    title="Duplicate Management"
                    description="Enterprise duplicate detection, side-by-side comparison & contact merge center"
                    badge={{ text: 'ACTIVE', variant: 'success' }}
                    onClick={onOpenDuplicateManagement}
                    clickable={true}
                  />

                  {/* 1.3 Import / Export */}
                  <SettingsCard
                    id="card-import-export"
                    icon={FileSpreadsheet}
                    title="Import / Export"
                    description="Bulk CSV/XLSX import and directory backup export"
                    badge={{ text: 'Coming Soon', variant: 'comingSoon' }}
                    clickable={false}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 2. Admin Tools Section (Admin & Developer Mode Only) */}
      {isAdmin && isDeveloperMode && (
        <div className="bg-white dark:bg-[#1a1a15] rounded-[20px] border border-gray-200 dark:border-[#8a8a70]/20 p-5 shadow-xs transition-all" id="section-admin-tools">
          <button
            onClick={() => toggleSection('admin-tools')}
            id="accordion-header-admin-tools"
            className="w-full flex items-center justify-between focus:outline-none cursor-pointer group text-left"
            aria-expanded={openSection === 'admin-tools'}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-500/10 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-serif font-bold text-gray-900 dark:text-gray-100 text-sm uppercase group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                  Admin Tools
                </h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">
                  System diagnostics, synchronization center & audit logging
                </p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-500 group-hover:bg-slate-200 dark:group-hover:bg-zinc-700 transition-all shrink-0">
              {openSection === 'admin-tools' ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </button>

          <AnimatePresence initial={false}>
            {openSection === 'admin-tools' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-2.5 pt-4 border-t border-gray-100 dark:border-[#8a8a70]/15 mt-4">
                  {/* 2.1 Developer Panel (Visible when Developer Mode activated) */}
                  {isDeveloperMode && (
                    <SettingsCard
                      id="card-developer-panel"
                      icon={Terminal}
                      iconBg="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300"
                      title="Developer Panel"
                      description="Advanced system flags, simulation tools, and debug controls"
                      onClick={onOpenDebug}
                      clickable={!!onOpenDebug}
                    />
                  )}

                  {/* 2.2 Sync Center */}
                  <SettingsCard
                    id="card-sync-center"
                    icon={RefreshCw}
                    iconBg="bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400"
                    title="Sync Center"
                    description="Google Apps Script Web App connection, manual sync & endpoint configuration"
                    badge={config.isLiveMode ? { text: 'ACTIVE', variant: 'success' } : { text: 'OFFLINE', variant: 'neutral' }}
                    onClick={() => toggleSection('sync-center')}
                    clickable={true}
                  />

                  {/* 2.3 Audit Logs */}
                  <SettingsCard
                    id="card-audit-logs"
                    icon={History}
                    iconBg="bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400"
                    title="Audit Logs"
                    description="Archive audit trail, record restoration history, and system change logs"
                    onClick={() => {
                      if (onOpenArchivedAuditLogs) {
                        onOpenArchivedAuditLogs();
                      } else if (onOpenArchivedCustomers) {
                        onOpenArchivedCustomers();
                      }
                    }}
                    clickable={true}
                  />

                  {/* 2.4 System Diagnostics */}
                  <SettingsCard
                    id="card-system-diagnostics"
                    icon={Activity}
                    iconBg="bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400"
                    title="System Diagnostics"
                    description="Perform connection diagnostics, test response latency, and verify database health"
                    onClick={handleTestConnection}
                    clickable={true}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 3. Sync Center Configuration Drawer / Expandable Panel */}
      <AnimatePresence initial={false}>
        {openSection === 'sync-center' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-white dark:bg-[#1a1a15] rounded-[20px] border border-t-4 border-t-[#475569] border-[#E5E7EB] dark:border-[#8a8a70]/20 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#8a8a70]/15">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${config.isLiveMode ? 'bg-[#475569]/10 text-[#475569] dark:text-slate-300' : 'bg-gray-100 text-slate-400'}`}>
                    {config.isLiveMode ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
                  </div>
                  <div>
                    <h2 className="font-serif font-bold text-[#475569] dark:text-slate-200 text-sm uppercase">Backend Engine Connection</h2>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">
                      {config.isLiveMode ? 'Live Google Sheets Database Active' : 'Offline / LocalStorage Mode'}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={handleToggleLiveMode}
                  id="btn-toggle-live-mode"
                  disabled={!config.webAppUrl}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    config.isLiveMode ? 'bg-[#475569]' : 'bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      config.isLiveMode ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 tracking-wider uppercase">
                      Google Apps Script Web App URL
                    </label>
                    <span className="text-[9px] font-bold uppercase tracking-wider">
                      {settingsSaveStatus === 'EDITING' && <span className="text-amber-500 animate-pulse">✏ EDITING...</span>}
                      {settingsSaveStatus === 'SAVING' && <span className="text-blue-500 animate-pulse">💾 SAVING...</span>}
                      {settingsSaveStatus === 'SAVED' && <span className="text-emerald-500">✅ SAVED</span>}
                      {settingsSaveStatus === 'FAILED' && <span className="text-red-500 animate-bounce">❌ SAVE FAILED</span>}
                    </span>
                  </div>
                  <input
                    type="url"
                    id="input-web-app-url"
                    className="w-full text-xs bg-[#F8FAFC] dark:bg-[#20201a] border border-gray-200 dark:border-[#8a8a70]/30 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#475569]/20 focus:border-[#475569] text-[#1F2937] dark:text-gray-100 transition-all font-medium"
                    placeholder="HTTPS://SCRIPT.GOOGLE.COM/MACROS/S/.../EXEC"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                  />
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    id="btn-test-connection"
                    onClick={handleTestConnection}
                    disabled={testingConnection || !urlInput.trim()}
                    className="flex-1 sm:flex-none text-xs font-bold text-[#475569] dark:text-slate-300 hover:text-[#334155] bg-[#475569]/10 dark:bg-slate-800 hover:bg-[#475569]/20 disabled:opacity-50 px-5 py-2.5 rounded-xl transition-all text-center cursor-pointer h-11"
                  >
                    {testingConnection ? 'TESTING CONNECTION...' : 'TEST CONNECTION'}
                  </button>
                  {config.isLiveMode && (
                    <button
                      type="button"
                      id="btn-sync-now"
                      onClick={onRefreshData}
                      disabled={isLoading}
                      className="flex-1 sm:flex-none text-xs font-bold text-[#475569] dark:text-slate-300 hover:text-[#334155] bg-[#475569]/10 dark:bg-slate-800 hover:bg-[#475569]/20 disabled:opacity-50 px-5 py-2.5 rounded-xl transition-all text-center cursor-pointer h-11"
                    >
                      {isLoading ? 'SYNCING...' : 'SYNC NOW'}
                    </button>
                  )}
                </div>

                {testResult && (
                  <div 
                    id="test-result-alert"
                    className={`p-4 rounded-xl text-xs leading-relaxed border ${
                      testResult.success 
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800/40 dark:text-emerald-300' 
                        : 'bg-rose-50 border-rose-100 text-rose-800 dark:bg-rose-950/30 dark:border-rose-800/40 dark:text-rose-300'
                    }`}
                  >
                    <div className="font-bold mb-1 uppercase">
                      {testResult.success ? '✓ Connection Active' : '✗ Connection Failed'}
                    </div>
                    <p className="font-medium uppercase">{testResult.message}</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Compact System Information Panel */}
      <div className="bg-white dark:bg-[#1a1a15] rounded-[20px] border border-gray-200 dark:border-[#8a8a70]/20 p-5 shadow-xs space-y-4" id="section-system-info">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#8a8a70]/15">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-500/10 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-gray-900 dark:text-gray-100 text-sm uppercase">System Information</h2>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Enterprise environment & synchronization status</p>
            </div>
          </div>
          <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-extrabold text-[10px] px-2.5 py-1 rounded-full uppercase border border-emerald-500/20">
            ENTERPRISE V3.2.0
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* CRM Version */}
          <div className="p-3 bg-gray-50 dark:bg-[#20201a] rounded-xl border border-gray-200/60 dark:border-[#8a8a70]/15">
            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">CRM Version</div>
            <div className="font-bold text-gray-900 dark:text-gray-100 uppercase text-xs">Enterprise v3.2.0</div>
          </div>

          {/* Database */}
          <div className="p-3 bg-gray-50 dark:bg-[#20201a] rounded-xl border border-gray-200/60 dark:border-[#8a8a70]/15">
            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Database</div>
            <div className="font-bold text-gray-900 dark:text-gray-100 uppercase text-xs">Google Sheets</div>
          </div>

          {/* Apps Script Status */}
          <div className="p-3 bg-gray-50 dark:bg-[#20201a] rounded-xl border border-gray-200/60 dark:border-[#8a8a70]/15">
            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Apps Script</div>
            <div className="font-bold uppercase text-xs flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${config.isLiveMode && config.webAppUrl ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
              <span className={config.isLiveMode && config.webAppUrl ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                {config.isLiveMode && config.webAppUrl ? 'Connected' : 'Offline'}
              </span>
            </div>
          </div>

          {/* Local Cache */}
          <div className="p-3 bg-gray-50 dark:bg-[#20201a] rounded-xl border border-gray-200/60 dark:border-[#8a8a70]/15">
            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Local Cache</div>
            <div className="font-bold text-emerald-600 dark:text-emerald-400 uppercase text-xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Active</span>
            </div>
          </div>

          {/* Sync Status */}
          <div className="p-3 bg-gray-50 dark:bg-[#20201a] rounded-xl border border-gray-200/60 dark:border-[#8a8a70]/15">
            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Sync Status</div>
            <div className="font-bold text-gray-900 dark:text-gray-100 uppercase text-xs">
              {isLoading ? '⏳ Syncing...' : '🟢 Synced'}
            </div>
          </div>

          {/* Last Sync Time */}
          <div className="p-3 bg-gray-50 dark:bg-[#20201a] rounded-xl border border-gray-200/60 dark:border-[#8a8a70]/15">
            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Last Sync</div>
            <div className="font-bold text-gray-900 dark:text-gray-100 uppercase text-xs">
              {formatRelativeTime(lastSyncTime)}
            </div>
          </div>

          {/* Current User */}
          <div className="p-3 bg-gray-50 dark:bg-[#20201a] rounded-xl border border-gray-200/60 dark:border-[#8a8a70]/15">
            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Current User</div>
            <div className="font-bold text-gray-900 dark:text-gray-100 uppercase text-xs truncate" title={currentUser?.loginId || 'Admin'}>
              {currentUser?.fullName || currentUser?.loginId || 'Administrator'}
            </div>
          </div>

          {/* Current Role */}
          <div className="p-3 bg-gray-50 dark:bg-[#20201a] rounded-xl border border-gray-200/60 dark:border-[#8a8a70]/15">
            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Role</div>
            <div className="font-bold text-amber-700 dark:text-amber-400 uppercase text-xs">
              {currentUser?.role || 'Administrator'}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Setup Guide Accordion & 6. Copyable Backend Code Box (Hidden by default; visible when 5 clicks on MoveAboard CRM header enables Developer Mode) */}
      <AnimatePresence>
        {isDeveloperMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-6 overflow-hidden"
          >
            {/* 5. Setup Guide Accordion */}
            <div className="bg-white dark:bg-[#1a1a15] rounded-[20px] border border-gray-200 dark:border-[#8a8a70]/20 overflow-hidden shadow-xs">
              <button
                onClick={() => setShowInstructions(!showInstructions)}
                id="btn-toggle-instructions"
                className="w-full flex items-center justify-between p-5 text-left focus:outline-none hover:bg-slate-50 dark:hover:bg-[#20201a] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-[#475569] dark:text-slate-300" />
                  <div>
                    <h3 className="font-serif font-bold text-[#475569] dark:text-slate-200 text-sm uppercase">How to Connect Google Sheets</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Step-by-step spreadsheet sync instructions</p>
                  </div>
                </div>
                {showInstructions ? <ChevronUp className="w-5 h-5 text-[#475569]/60" /> : <ChevronDown className="w-5 h-5 text-[#475569]/60" />}
              </button>

              {showInstructions && (
                <div className="px-5 pb-6 pt-2 border-t border-gray-100 dark:border-[#8a8a70]/15 space-y-4 text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-medium uppercase">
                  <div className="space-y-3">
                    <div className="flex gap-2.5">
                      <span className="flex-none w-5 h-5 rounded-full bg-[#475569]/10 text-[#475569] dark:text-slate-300 flex items-center justify-center font-bold text-[10px]">1</span>
                      <div>
                        Create a brand new <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-[#475569] dark:text-amber-400 hover:underline font-bold inline-flex items-center gap-0.5">Google Sheet <ExternalLink className="w-3 h-3" /></a>.
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      <span className="flex-none w-5 h-5 rounded-full bg-[#475569]/10 text-[#475569] dark:text-slate-300 flex items-center justify-center font-bold text-[10px]">2</span>
                      <div>
                        From the top menu, go to <span className="font-semibold text-[#475569] dark:text-slate-200">Extensions</span> &rarr; <span className="font-semibold text-[#475569] dark:text-slate-200">Apps Script</span>.
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      <span className="flex-none w-5 h-5 rounded-full bg-[#475569]/10 text-[#475569] dark:text-slate-300 flex items-center justify-center font-bold text-[10px]">3</span>
                      <div>
                        Delete any boilerplate code inside the editor and paste the <span className="font-semibold text-[#475569] dark:text-slate-200">Backend Code</span> provided below.
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      <span className="flex-none w-5 h-5 rounded-full bg-[#475569]/10 text-[#475569] dark:text-slate-300 flex items-center justify-center font-bold text-[10px]">4</span>
                      <div>
                        Click <span className="font-semibold text-[#475569] dark:text-slate-200">Deploy</span> &rarr; <span className="font-semibold text-[#475569] dark:text-slate-200">New deployment</span> (Web App, Who has access: Anyone).
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 6. Copyable Backend Code Box */}
            <div className="bg-white dark:bg-[#1a1a15] rounded-[20px] border border-gray-200 dark:border-[#8a8a70]/20 overflow-hidden shadow-xs">
              <div className="p-5 border-b border-gray-100 dark:border-[#8a8a70]/15 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-[#475569] dark:text-slate-300" />
                  <div>
                    <h3 className="font-serif font-bold text-[#475569] dark:text-slate-200 text-sm uppercase">Apps Script Backend Code</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Paste this script in Google Sheets Extensions</p>
                  </div>
                </div>
                <button
                  onClick={handleCopyCode}
                  id="btn-copy-gas-code"
                  className="flex items-center gap-1 text-xs font-bold text-[#475569] dark:text-slate-300 bg-[#475569]/10 dark:bg-zinc-800 hover:bg-[#475569]/20 px-3.5 py-2 rounded-full transition-colors cursor-pointer h-9"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy Code
                    </>
                  )}
                </button>
              </div>
              <div className="p-4 bg-slate-950 text-[#F8FAFC] font-mono text-[10.5px] leading-relaxed max-h-72 overflow-y-auto">
                <pre>{GOOGLE_APPS_SCRIPT_CODE}</pre>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
