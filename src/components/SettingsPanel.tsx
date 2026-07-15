import React, { useState } from 'react';
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
  ExternalLink
} from 'lucide-react';

interface SettingsPanelProps {
  config: SyncConfig;
  onUpdateConfig: (newConfig: SyncConfig) => void;
  onRefreshData: () => Promise<void>;
  isLoading: boolean;
  onOpenDebug?: () => void;
}

export default function SettingsPanel({
  config,
  onUpdateConfig,
  onRefreshData,
  isLoading,
  onOpenDebug
}: SettingsPanelProps) {
  const [urlInput, setUrlInput] = useState(config.webAppUrl);
  const [isCopied, setIsCopied] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);

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

  return (
    <div className="space-y-6" id="settings-panel">
      {/* Synchronization Status Card */}
      <div className="bg-white dark:bg-[#20201a] rounded-3xl border border-[#5A5A40]/10 dark:border-[#8a8a70]/20 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${config.isLiveMode ? 'bg-[#5A5A40]/10 text-[#5A5A40] dark:bg-[#5A5A40]/20 dark:text-[#ecece5]' : 'bg-[#5A5A40]/10 text-slate-500 dark:bg-[#5A5A40]/10 dark:text-slate-400'}`}>
              {config.isLiveMode ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="font-serif font-bold text-[#5A5A40] dark:text-[#ecece5] text-base">Backend Engine</h2>
              <p className="text-xs text-[#5A5A40]/60 dark:text-[#8a8a70]">
                {config.isLiveMode ? 'Live Google Sheets Database Active' : 'Offline / Demo (LocalStorage) Mode'}
              </p>
            </div>
          </div>
          
          <button
            onClick={handleToggleLiveMode}
            id="btn-toggle-live-mode"
            disabled={!config.webAppUrl}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              config.isLiveMode ? 'bg-[#5A5A40]' : 'bg-gray-200 dark:bg-[#151510] disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                config.isLiveMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#5A5A40]/80 dark:text-[#8a8a70] mb-1.5">
              Google Apps Script Web App URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                id="input-web-app-url"
                className="flex-1 text-sm bg-[#f5f5f0]/50 dark:bg-[#151510]/50 border border-[#5A5A40]/15 dark:border-[#8a8a70]/30 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#5A5A40] focus:bg-white dark:focus:bg-[#1e1e18] text-[#2c2c26] dark:text-[#f5f5f0]"
                placeholder="https://script.google.com/macros/s/.../exec"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
              />
              <button
                type="button"
                id="btn-save-settings"
                onClick={handleSave}
                className="bg-[#5A5A40] hover:bg-[#4a4a34] dark:bg-[#5A5A40] dark:hover:bg-[#6c6c4e] text-white font-medium text-sm px-5 py-2.5 rounded-full shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              id="btn-test-connection"
              onClick={handleTestConnection}
              disabled={testingConnection || !urlInput.trim()}
              className="flex-1 sm:flex-none text-xs font-bold text-[#5A5A40] dark:text-[#ecece5] hover:text-[#4a4a34] dark:hover:text-[#fff] bg-[#5A5A40]/10 hover:bg-[#5A5A40]/20 dark:bg-[#5A5A40]/20 dark:hover:bg-[#5A5A40]/30 disabled:opacity-50 px-4 py-2.5 rounded-xl transition-all text-center cursor-pointer"
            >
              {testingConnection ? 'Testing...' : 'Test Connection'}
            </button>
            {config.isLiveMode && (
              <button
                type="button"
                id="btn-sync-now"
                onClick={onRefreshData}
                disabled={isLoading}
                className="flex-1 sm:flex-none text-xs font-bold text-[#5A5A40] dark:text-[#ecece5] hover:text-[#4a4a34] dark:hover:text-[#fff] bg-[#5A5A40]/10 hover:bg-[#5A5A40]/20 dark:bg-[#5A5A40]/20 dark:hover:bg-[#5A5A40]/30 disabled:opacity-50 px-4 py-2.5 rounded-xl transition-all text-center cursor-pointer"
              >
                {isLoading ? 'Syncing...' : 'Sync Now'}
              </button>
            )}
          </div>

          {testResult && (
            <div 
              id="test-result-alert"
              className={`p-3.5 rounded-xl text-xs leading-relaxed ${
                testResult.success 
                  ? 'bg-[#5A5A40]/10 dark:bg-[#5A5A40]/20 border border-[#5A5A40]/25 dark:border-[#8a8a70]/30 text-[#5A5A40] dark:text-[#ecece5]' 
                  : 'bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 text-rose-800 dark:text-rose-300'
              }`}
            >
              <div className="font-semibold mb-1">
                {testResult.success ? '✓ Test Successful' : '✗ Connection Failed'}
              </div>
              {testResult.message}
            </div>
          )}
          
          {onOpenDebug && (
            <div className="pt-4 border-t border-[#5A5A40]/10 dark:border-[#8a8a70]/20 mt-4 flex justify-end">
              <button
                type="button"
                id="btn-open-debug-panel"
                onClick={onOpenDebug}
                className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40 dark:hover:bg-emerald-950/40 px-4.5 py-2.5 rounded-full transition-all cursor-pointer"
              >
                🛠️ Admin Debug & Testing Center
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Accordion Setup Guide */}
      <div className="bg-white dark:bg-[#20201a] rounded-3xl border border-[#5A5A40]/10 dark:border-[#8a8a70]/20 overflow-hidden">
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          id="btn-toggle-instructions"
          className="w-full flex items-center justify-between p-5 text-left focus:outline-none hover:bg-[#5A5A40]/5 dark:hover:bg-[#5A5A40]/10 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-5 h-5 text-[#5A5A40] dark:text-[#ecece5]" />
            <div>
              <h3 className="font-serif font-bold text-[#5A5A40] dark:text-[#ecece5] text-sm">How to Connect Google Sheets</h3>
              <p className="text-xs text-[#5A5A40]/60 dark:text-[#8a8a70]">Step-by-step instructions (takes 2 minutes)</p>
            </div>
          </div>
          {showInstructions ? <ChevronUp className="w-5 h-5 text-[#5A5A40]/60 dark:text-[#ecece5]/60" /> : <ChevronDown className="w-5 h-5 text-[#5A5A40]/60 dark:text-[#ecece5]/60" />}
        </button>

        {showInstructions && (
          <div className="px-5 pb-6 pt-2 border-t border-[#5A5A40]/10 dark:border-[#8a8a70]/20 space-y-4 text-xs text-[#2c2c26]/80 dark:text-[#ecece5]/80 leading-relaxed">
            <div className="space-y-3">
              <div className="flex gap-2.5">
                <span className="flex-none w-5 h-5 rounded-full bg-[#5A5A40]/10 dark:bg-[#5A5A40]/20 text-[#5A5A40] dark:text-[#ecece5] flex items-center justify-center font-bold text-[10px]">1</span>
                <div>
                  Create a brand new <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-[#5A5A40] dark:text-[#ecece5] hover:underline font-bold inline-flex items-center gap-0.5">Google Sheet <ExternalLink className="w-3 h-3" /></a>.
                </div>
              </div>
              <div className="flex gap-2.5">
                <span className="flex-none w-5 h-5 rounded-full bg-[#5A5A40]/10 dark:bg-[#5A5A40]/20 text-[#5A5A40] dark:text-[#ecece5] flex items-center justify-center font-bold text-[10px]">2</span>
                <div>
                  From the top menu, go to <span className="font-semibold text-[#5A5A40] dark:text-[#ecece5]">Extensions</span> &rarr; <span className="font-semibold text-[#5A5A40] dark:text-[#ecece5]">Apps Script</span>.
                </div>
              </div>
              <div className="flex gap-2.5">
                <span className="flex-none w-5 h-5 rounded-full bg-[#5A5A40]/10 dark:bg-[#5A5A40]/20 text-[#5A5A40] dark:text-[#ecece5] flex items-center justify-center font-bold text-[10px]">3</span>
                <div>
                  Delete any boilerplate code inside the editor and paste the <span className="font-semibold text-[#5A5A40] dark:text-[#ecece5]">Backend Code</span> provided below.
                </div>
              </div>
              <div className="flex gap-2.5">
                <span className="flex-none w-5 h-5 rounded-full bg-[#5A5A40]/10 dark:bg-[#5A5A40]/20 text-[#5A5A40] dark:text-[#ecece5] flex items-center justify-center font-bold text-[10px]">4</span>
                <div>
                  Click the <span className="font-semibold text-[#5A5A40] dark:text-[#ecece5]">Save (floppy disk)</span> icon.
                </div>
              </div>
              <div className="flex gap-2.5">
                <span className="flex-none w-5 h-5 rounded-full bg-[#5A5A40]/10 dark:bg-[#5A5A40]/20 text-[#5A5A40] dark:text-[#ecece5] flex items-center justify-center font-bold text-[10px]">5</span>
                <div>
                  Click <span className="font-semibold text-[#5A5A40] dark:text-[#ecece5]">Deploy</span> &rarr; <span className="font-semibold text-[#5A5A40] dark:text-[#ecece5]">New deployment</span>.
                </div>
              </div>
              <div className="flex gap-2.5">
                <span className="flex-none w-5 h-5 rounded-full bg-[#5A5A40]/10 dark:bg-[#5A5A40]/20 text-[#5A5A40] dark:text-[#ecece5] flex items-center justify-center font-bold text-[10px]">6</span>
                <div>
                  Click the gear icon next to "Select type" and select <span className="font-semibold text-[#5A5A40] dark:text-[#ecece5]">Web app</span>.
                </div>
              </div>
              <div className="flex gap-2.5">
                <span className="flex-none w-5 h-5 rounded-full bg-[#5A5A40]/10 dark:bg-[#5A5A40]/20 text-[#5A5A40] dark:text-[#ecece5] flex items-center justify-center font-bold text-[10px]">7</span>
                <div>
                  Configure the settings exactly like this:
                  <ul className="list-disc pl-5 mt-1.5 space-y-1">
                    <li><span className="font-semibold text-[#2c2c26]/90 dark:text-[#ecece5]/90">Execute as:</span> Me (your email)</li>
                    <li><span className="font-semibold text-[#2c2c26]/90 dark:text-[#ecece5]/90">Who has access:</span> Anyone <span className="text-rose-500 font-bold">(Crucial!)</span></li>
                  </ul>
                </div>
              </div>
              <div className="flex gap-2.5">
                <span className="flex-none w-5 h-5 rounded-full bg-[#5A5A40]/10 dark:bg-[#5A5A40]/20 text-[#5A5A40] dark:text-[#ecece5] flex items-center justify-center font-bold text-[10px]">8</span>
                <div>
                  Click <span className="font-semibold text-[#5A5A40] dark:text-[#ecece5]">Deploy</span>, authorize the permissions when prompted, then <span className="font-semibold text-[#5A5A40] dark:text-[#ecece5]">copy the Web App URL</span>.
                </div>
              </div>
              <div className="flex gap-2.5">
                <span className="flex-none w-5 h-5 rounded-full bg-[#5A5A40]/10 dark:bg-[#5A5A40]/20 text-[#5A5A40] dark:text-[#ecece5] flex items-center justify-center font-bold text-[10px]">9</span>
                <div>
                  Paste it in the input field above, save it, and enable <span className="font-semibold text-[#5A5A40] dark:text-[#ecece5]">Live Mode</span>!
                </div>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl p-3.5 text-amber-900 dark:text-amber-300 text-xs">
              <strong>Pro Tip:</strong> The script automatically handles creating the necessary sheets (<code className="bg-amber-100/70 dark:bg-amber-900/40 px-1 rounded font-mono">Customers</code>, <code className="bg-amber-100/70 dark:bg-amber-900/40 px-1 rounded font-mono">Tickets</code>, and <code className="bg-amber-100/70 dark:bg-amber-900/40 px-1 rounded font-mono">FollowUps</code>) and column headers on first access. You do not need to format the Google Sheet yourself!
            </div>
          </div>
        )}
      </div>

      {/* Copyable Code Box */}
      <div className="bg-white dark:bg-[#20201a] rounded-3xl border border-[#5A5A40]/10 dark:border-[#8a8a70]/20 overflow-hidden">
        <div className="p-5 border-b border-[#5A5A40]/10 dark:border-[#8a8a70]/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-[#5A5A40] dark:text-[#ecece5]" />
            <div>
              <h3 className="font-serif font-bold text-[#5A5A40] dark:text-[#ecece5] text-sm">Apps Script Backend Code</h3>
              <p className="text-xs text-[#5A5A40]/60 dark:text-[#8a8a70]">Paste this script in Google Sheets Extensions</p>
            </div>
          </div>
          <button
            onClick={handleCopyCode}
            id="btn-copy-gas-code"
            className="flex items-center gap-1 text-xs font-bold text-[#5A5A40] dark:text-[#ecece5] bg-[#5A5A40]/10 hover:bg-[#5A5A40]/20 dark:bg-[#5A5A40]/20 dark:hover:bg-[#5A5A40]/30 px-3.5 py-2 rounded-full transition-colors cursor-pointer"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5" /> Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" /> Copy Code
              </>
            )}
          </button>
        </div>
        <div className="p-4 bg-[#2c2c26] text-[#f5f5f0]/90 font-mono text-[10.5px] leading-relaxed max-h-72 overflow-y-auto">
          <pre>{GOOGLE_APPS_SCRIPT_CODE}</pre>
        </div>
      </div>
    </div>
  );
}
