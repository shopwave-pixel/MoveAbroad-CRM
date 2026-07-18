import React, { useState, useEffect } from 'react';
import { GOOGLE_APPS_SCRIPT_CODE } from '../utils/gasCode';
import { SyncConfig } from '../types';
import { 
  Database, 
  Copy, 
  Check, 
  HelpCircle, 
  FileSpreadsheet, 
  Play, 
  Globe, 
  Wifi, 
  WifiOff, 
  ChevronDown, 
  ChevronUp,
  ExternalLink,
  Settings
} from 'lucide-react';
import { motion } from 'motion/react';

interface SettingsPanelProps {
  config: SyncConfig;
  onUpdateConfig: (newConfig: SyncConfig) => void;
  onRefreshData: () => Promise<void>;
  isLoading: boolean;
  onOpenDebug?: () => void;
  isDeveloperMode?: boolean;
}

export default function SettingsPanel({
  config,
  onUpdateConfig,
  onRefreshData,
  isLoading,
  onOpenDebug,
  isDeveloperMode = false
}: SettingsPanelProps) {
  const [urlInput, setUrlInput] = useState(config.webAppUrl);
  const [isCopied, setIsCopied] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [settingsSaveStatus, setSettingsSaveStatus] = useState<'IDLE' | 'EDITING' | 'SAVING' | 'SAVED' | 'FAILED'>('IDLE');

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

  const handleSave = () => {
    onUpdateConfig({
      webAppUrl: urlInput.trim(),
      isLiveMode: !!urlInput.trim() && config.isLiveMode
    });
    setTestResult(null);
  };

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
        // Save automatically on successful test
        onUpdateConfig({
          webAppUrl: urlInput.trim(),
          isLiveMode: true // Auto enable live mode on success
        });
      } else {
        throw new Error(data.error || 'Server returned unsuccessful response.');
      }
    } catch (err: any) {
      console.error(err);
      setTestResult({
        success: false,
        message: `Connection failed. Error: ${err.message || err}. Please ensure you completed Step 7 & 8 correctly (deployed as Web App, Accessible to "Anyone").`
      });
    } finally {
      setTestingConnection(false);
    }
  };

  if (!isDeveloperMode) {
    return (
      <div className="space-y-6 animate-fade-in" id="settings-panel">
        <div className="bg-white rounded-[20px] border border-gray-200 p-8 shadow-sm text-center max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-full bg-primary-olive/10 flex items-center justify-center mx-auto mb-5 text-[#5A5A40]">
            <Settings className="w-8 h-8" />
          </div>
          <h3 className="font-serif font-bold text-[#5A5A40] text-lg mb-2.5 uppercase tracking-tight">System Settings</h3>
          <p className="text-sm text-gray-500 font-medium uppercase leading-relaxed max-w-sm mx-auto">
            MoveAboard CRM is running in standard cloud-synced mode. All configurations are managed by your administrator.
          </p>
          <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-center gap-6 text-xs font-bold text-gray-400 uppercase">
            <div>Version 1.4.0</div>
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full"></div>
            <div>All Systems Operational</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      transition={{ duration: 0.2 }}
      className="space-y-6" 
      id="settings-panel"
    >
      {/* Synchronization Status Card */}
      <div className="bg-white rounded-[20px] border border-t-4 border-t-[#475569] border-[#E5E7EB] p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${config.isLiveMode ? 'bg-[#475569]/10 text-[#475569]' : 'bg-gray-100 text-slate-400'}`}>
              {config.isLiveMode ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="font-serif font-bold text-[#475569] text-sm uppercase">Backend Engine Connection</h2>
              <p className="text-[10px] text-gray-400 font-bold uppercase">
                {config.isLiveMode ? 'Live Google Sheets Database Active' : 'Offline / Demo (LocalStorage) Mode'}
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
              <label className="block text-[10px] font-bold text-gray-500 tracking-wider uppercase">
                Google Apps Script Web App URL
              </label>
              <span className="text-[9px] font-bold uppercase tracking-wider">
                {settingsSaveStatus === 'EDITING' && <span className="text-amber-500 animate-pulse">✏ EDITING...</span>}
                {settingsSaveStatus === 'SAVING' && <span className="text-blue-500 animate-pulse">💾 SAVING...</span>}
                {settingsSaveStatus === 'SAVED' && <span className="text-emerald-500">✅ SAVED</span>}
                {settingsSaveStatus === 'FAILED' && <span className="text-red-500 animate-bounce">❌ SAVE FAILED</span>}
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="url"
                id="input-web-app-url"
                className="w-full text-xs bg-[#F8FAFC] border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#475569]/20 focus:border-[#475569] text-[#1F2937] transition-all font-medium"
                placeholder="HTTPS://SCRIPT.GOOGLE.COM/MACROS/S/.../EXEC"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              id="btn-test-connection"
              onClick={handleTestConnection}
              disabled={testingConnection || !urlInput.trim()}
              className="flex-1 sm:flex-none text-xs font-bold text-[#475569] hover:text-[#334155] bg-[#475569]/10 hover:bg-[#475569]/20 disabled:opacity-50 px-5 py-2.5 rounded-xl transition-all text-center cursor-pointer h-11"
            >
              {testingConnection ? 'TESTING CONNECTION...' : 'TEST CONNECTION'}
            </button>
            {config.isLiveMode && (
              <button
                type="button"
                id="btn-sync-now"
                onClick={onRefreshData}
                disabled={isLoading}
                className="flex-1 sm:flex-none text-xs font-bold text-[#475569] hover:text-[#334155] bg-[#475569]/10 hover:bg-[#475569]/20 disabled:opacity-50 px-5 py-2.5 rounded-xl transition-all text-center cursor-pointer h-11"
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
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                  : 'bg-rose-50 border-rose-100 text-rose-800'
              }`}
            >
              <div className="font-bold mb-1 uppercase">
                {testResult.success ? '✓ Connection Active' : '✗ Connection Failed'}
              </div>
              <p className="font-medium uppercase">{testResult.message}</p>
            </div>
          )}
          
          {onOpenDebug && (
            <div className="pt-4 border-t border-gray-100 mt-4 flex justify-end">
              <button
                type="button"
                id="btn-open-debug-panel"
                onClick={onOpenDebug}
                className="flex items-center gap-1.5 text-xs font-bold text-[#1F2937] bg-gray-100 hover:bg-gray-200 border border-gray-200 px-5 py-2.5 rounded-full transition-all cursor-pointer h-11"
              >
                🛠️ DEVS & SYSTEM ADMIN DIAGNOSTICS
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Accordion Setup Guide */}
      <div className="bg-white rounded-[20px] border border-gray-200 overflow-hidden shadow-xs">
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          id="btn-toggle-instructions"
          className="w-full flex items-center justify-between p-5 text-left focus:outline-none hover:bg-slate-50 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-5 h-5 text-[#475569]" />
            <div>
              <h3 className="font-serif font-bold text-[#475569] text-sm uppercase">How to Connect Google Sheets</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase">Step-by-step spreadsheet sync instructions</p>
            </div>
          </div>
          {showInstructions ? <ChevronUp className="w-5 h-5 text-[#475569]/60" /> : <ChevronDown className="w-5 h-5 text-[#475569]/60" />}
        </button>

        {showInstructions && (
          <div className="px-5 pb-6 pt-2 border-t border-gray-100 space-y-4 text-xs text-gray-600 leading-relaxed font-medium uppercase">
            <div className="space-y-3">
              <div className="flex gap-2.5">
                <span className="flex-none w-5 h-5 rounded-full bg-[#475569]/10 text-[#475569] flex items-center justify-center font-bold text-[10px]">1</span>
                <div>
                  Create a brand new <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-[#475569] hover:underline font-bold inline-flex items-center gap-0.5">Google Sheet <ExternalLink className="w-3 h-3" /></a>.
                </div>
              </div>
              <div className="flex gap-2.5">
                <span className="flex-none w-5 h-5 rounded-full bg-[#475569]/10 text-[#475569] flex items-center justify-center font-bold text-[10px]">2</span>
                <div>
                  From the top menu, go to <span className="font-semibold text-[#475569]">Extensions</span> &rarr; <span className="font-semibold text-[#475569]">Apps Script</span>.
                </div>
              </div>
              <div className="flex gap-2.5">
                <span className="flex-none w-5 h-5 rounded-full bg-[#475569]/10 text-[#475569] flex items-center justify-center font-bold text-[10px]">3</span>
                <div>
                  Delete any boilerplate code inside the editor and paste the <span className="font-semibold text-[#475569]">Backend Code</span> provided below.
                </div>
              </div>
              <div className="flex gap-2.5">
                <span className="flex-none w-5 h-5 rounded-full bg-[#475569]/10 text-[#475569] flex items-center justify-center font-bold text-[10px]">4</span>
                <div>
                  Click the <span className="font-semibold text-[#475569]">Save (floppy disk)</span> icon.
                </div>
              </div>
              <div className="flex gap-2.5">
                <span className="flex-none w-5 h-5 rounded-full bg-[#475569]/10 text-[#475569] flex items-center justify-center font-bold text-[10px]">5</span>
                <div>
                  Click <span className="font-semibold text-[#475569]">Deploy</span> &rarr; <span className="font-semibold text-[#475569]">New deployment</span>.
                </div>
              </div>
              <div className="flex gap-2.5">
                <span className="flex-none w-5 h-5 rounded-full bg-[#475569]/10 text-[#475569] flex items-center justify-center font-bold text-[10px]">6</span>
                <div>
                  Click the gear icon next to "Select type" and select <span className="font-semibold text-[#475569]">Web app</span>.
                </div>
              </div>
              <div className="flex gap-2.5">
                <span className="flex-none w-5 h-5 rounded-full bg-[#475569]/10 text-[#475569] flex items-center justify-center font-bold text-[10px]">7</span>
                <div>
                  Configure the settings exactly like this:
                  <ul className="list-disc pl-5 mt-1.5 space-y-1">
                    <li><span className="font-semibold text-gray-700">Execute as:</span> Me (your email)</li>
                    <li><span className="font-semibold text-gray-700">Who has access:</span> Anyone <span className="text-rose-500 font-bold">(Crucial!)</span></li>
                  </ul>
                </div>
              </div>
              <div className="flex gap-2.5">
                <span className="flex-none w-5 h-5 rounded-full bg-[#475569]/10 text-[#475569] flex items-center justify-center font-bold text-[10px]">8</span>
                <div>
                  Click <span className="font-semibold text-[#475569]">Deploy</span>, authorize the permissions when prompted, then <span className="font-semibold text-[#475569]">copy the Web App URL</span>.
                </div>
              </div>
              <div className="flex gap-2.5">
                <span className="flex-none w-5 h-5 rounded-full bg-[#475569]/10 text-[#475569] flex items-center justify-center font-bold text-[10px]">9</span>
                <div>
                  Paste it in the input field above, save it, and enable <span className="font-semibold text-[#475569]">Live Mode</span>!
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-amber-900 text-xs">
              <strong>Pro Tip:</strong> The script automatically handles creating the necessary sheets (<code className="bg-amber-100/70 px-1 rounded font-mono">Customers</code>, <code className="bg-amber-100/70 px-1 rounded font-mono">Tickets</code>, and <code className="bg-amber-100/70 px-1 rounded font-mono">FollowUps</code>) and column headers on first access. You do not need to format the Google Sheet yourself!
            </div>
          </div>
        )}
      </div>

      {/* Copyable Code Box */}
      <div className="bg-white rounded-[20px] border border-gray-200 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-[#475569]" />
            <div>
              <h3 className="font-serif font-bold text-[#475569] text-sm uppercase">Apps Script Backend Code</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase">Paste this script in Google Sheets Extensions</p>
            </div>
          </div>
          <button
            onClick={handleCopyCode}
            id="btn-copy-gas-code"
            className="flex items-center gap-1 text-xs font-bold text-[#475569] bg-[#475569]/10 hover:bg-[#475569]/20 px-3.5 py-2 rounded-full transition-colors cursor-pointer h-9"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5" /> Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" /> Copy Code
              </>
            ) /* Copy Code */}
          </button>
        </div>
        <div className="p-4 bg-slate-950 text-[#F8FAFC] font-mono text-[10.5px] leading-relaxed max-h-72 overflow-y-auto">
          <pre>{GOOGLE_APPS_SCRIPT_CODE}</pre>
        </div>
      </div>
    </motion.div>
  );
}
