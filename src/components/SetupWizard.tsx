import React, { useState } from 'react';
import { 
  Check, Play, ArrowRight, ArrowLeft, Copy, CheckCircle2, 
  Settings, ShieldAlert, CheckCircle, RefreshCw, Clipboard,
  HelpCircle, Eye, EyeOff, Terminal, FileSpreadsheet, Server
} from 'lucide-react';
import { SyncConfig } from '../types';
import { GOOGLE_APPS_SCRIPT_CODE } from '../utils/gasCode';
import { 
  validateSpreadsheetId, 
  validateAppsScriptUrl, 
  setupDefaultSheetsAndAdmin, 
  runSystemTests,
  saveSyncConfig
} from '../utils/crmApi';

interface SetupWizardProps {
  onSetupComplete: (config: SyncConfig) => void;
  onCancel?: () => void;
}

export default function SetupWizard({ onSetupComplete, onCancel }: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [webAppUrl, setWebAppUrl] = useState('');
  
  // Admin Credentials
  const [adminFullName, setAdminFullName] = useState('System Administrator');
  const [adminLoginId, setAdminLoginId] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);

  // States
  const [copiedCode, setCopiedCode] = useState(false);
  const [isSetupRunning, setIsSetupRunning] = useState(false);
  const [setupError, setSetupError] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [stepErrors, setStepErrors] = useState<Record<number, string>>({});

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const validateStep = async (step: number): Promise<boolean> => {
    const errors = { ...stepErrors };
    delete errors[step];
    setStepErrors(errors);

    if (step === 2 && isLiveMode) {
      if (!spreadsheetId.trim()) {
        setStepErrors({ ...errors, 2: 'Spreadsheet ID is required for Live Mode.' });
        return false;
      }
      if (!validateSpreadsheetId(spreadsheetId)) {
        setStepErrors({ ...errors, 2: 'Invalid Google Spreadsheet ID format. Standard ID is usually 44 characters.' });
        return false;
      }
    }

    if (step === 3 && isLiveMode) {
      if (!webAppUrl.trim()) {
        setStepErrors({ ...errors, 3: 'Google Apps Script Web App URL is required.' });
        return false;
      }
      const isValidFormat = await validateAppsScriptUrl(webAppUrl);
      if (!isValidFormat) {
        setStepErrors({ ...errors, 3: 'URL must start with https://script.google.com/macros/s/' });
        return false;
      }
    }

    if (step === 5) {
      if (!adminFullName.trim()) {
        setStepErrors({ ...errors, 5: 'Full Name is required.' });
        return false;
      }
      if (!adminLoginId.trim()) {
        setStepErrors({ ...errors, 5: 'Admin Login ID is required.' });
        return false;
      }
      if (adminPassword.length < 4) {
        setStepErrors({ ...errors, 5: 'Password must be at least 4 characters.' });
        return false;
      }
      if (adminPassword !== adminConfirmPassword) {
        setStepErrors({ ...errors, 5: 'Passwords do not match.' });
        return false;
      }
    }

    return true;
  };

  const handleNext = async () => {
    const isValid = await validateStep(currentStep);
    if (!isValid) return;

    if (currentStep === 3) {
      // Step 4 is "Create Sheets" trigger action
      setCurrentStep(4);
      triggerSheetsCreation();
    } else if (currentStep === 5) {
      // Step 6 is system test execution trigger
      setCurrentStep(6);
      triggerSystemTests();
    } else if (currentStep === 7) {
      // Complete setup
      const finalConfig: SyncConfig = {
        webAppUrl: isLiveMode ? webAppUrl.trim() : '',
        isLiveMode,
        spreadsheetId: isLiveMode ? spreadsheetId.trim() : undefined,
        setupComplete: true
      };
      saveSyncConfig(finalConfig);
      onSetupComplete(finalConfig);
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const triggerSheetsCreation = async () => {
    setIsSetupRunning(true);
    setSetupError('');
    
    const config: SyncConfig = {
      webAppUrl: isLiveMode ? webAppUrl.trim() : '',
      isLiveMode,
      spreadsheetId: isLiveMode ? spreadsheetId.trim() : undefined
    };

    try {
      const response = await setupDefaultSheetsAndAdmin(config, adminFullName, adminLoginId, adminPassword || 'admin');
      if (response.success) {
        setTimeout(() => {
          setIsSetupRunning(false);
          setCurrentStep(5); // Proceed to step 5 (Create Admin Credentials check)
        }, 1200);
      } else {
        setIsSetupRunning(false);
        setSetupError(response.error || 'Failed to communicate with Google Sheets. Please check your App Script Deployment configuration and allow "Anyone" access.');
      }
    } catch (err: any) {
      setIsSetupRunning(false);
      setSetupError(err.message || String(err));
    }
  };

  const triggerSystemTests = async () => {
    setIsTesting(true);
    const config: SyncConfig = {
      webAppUrl: isLiveMode ? webAppUrl.trim() : '',
      isLiveMode,
      spreadsheetId: isLiveMode ? spreadsheetId.trim() : undefined
    };

    try {
      const results = await runSystemTests(config);
      setTestResults(results);
    } catch (error) {
      console.error('System tests failed', error);
    } finally {
      setIsTesting(false);
    }
  };

  const steps = [
    { num: 1, name: 'Welcome' },
    { num: 2, name: 'Sheet ID' },
    { num: 3, name: 'GAS API' },
    { num: 4, name: 'Initialize' },
    { num: 5, name: 'Admin Account' },
    { num: 6, name: 'Connection Test' },
    { num: 7, name: 'Finish' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#151510] text-slate-800 dark:text-[#ecece5] flex flex-col justify-between" id="setup-wizard-container">
      {/* Header step tracker */}
      <div className="bg-white dark:bg-[#20201a] border-b border-slate-200 dark:border-[#8a8a70]/20 py-4 px-6 shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-emerald-600 animate-spin-slow" />
            <div>
              <h2 className="font-bold text-sm tracking-tight text-slate-900 dark:text-[#f5f5f0]">MoveAboard CRM</h2>
              <p className="text-[13px] text-slate-500 dark:text-[#8a8a70] font-semibold tracking-wider uppercase">Setup Wizard</p>
            </div>
          </div>
          
          {/* Timeline indicator */}
          <div className="flex items-center gap-1.5 md:gap-3 text-[13px]">
            {steps.map(s => (
              <React.Fragment key={s.num}>
                {s.num > 1 && <div className={`h-[2px] w-4 md:w-8 ${currentStep >= s.num ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-slate-800'}`}></div>}
                <div className="flex items-center gap-1">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center font-semibold text-[13px] transition-all duration-300 ${
                    currentStep === s.num ? 'bg-emerald-600 text-white ring-4 ring-emerald-50 shadow' : 
                    currentStep > s.num ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                  }`}>
                    {currentStep > s.num ? <Check className="w-3.5 h-3.5" /> : s.num}
                  </span>
                  <span className={`hidden sm:inline font-medium text-[13px] ${currentStep === s.num ? 'text-slate-800 dark:text-[#ecece5] font-semibold' : 'text-slate-400 dark:text-slate-500'}`}>
                    {s.name}
                  </span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Main step container */}
      <div className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <div className="bg-white dark:bg-[#20201a] rounded-2xl shadow-xl border border-slate-100 dark:border-[#8a8a70]/20 p-6 sm:p-8 w-full transition-all duration-300" id="wizard-card">
          
          {/* STEP 1: WELCOME SCREEN */}
          {currentStep === 1 && (
            <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 mb-2">
                <Settings className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-[#f5f5f0]">Welcome to MoveAboard CRM</h1>
                <p className="text-[13px] text-slate-500 dark:text-[#8a8a70] max-w-md mx-auto">
                  Configure your overseas recruitment visa system in less than 5 minutes. Select your operating database preference below to get started.
                </p>
              </div>

              {/* Mode Selection Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto pt-2">
                <button
                  type="button"
                  onClick={() => setIsLiveMode(false)}
                  className={`p-4 rounded-xl text-left border-2 transition-all flex flex-col justify-between h-36 cursor-pointer ${
                    !isLiveMode ? 'border-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/10 ring-1 ring-emerald-500' : 'border-slate-200 dark:border-[#8a8a70]/30 hover:border-slate-300 dark:hover:border-slate-400'
                  }`}
                >
                  <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-lg w-fit text-slate-600 dark:text-[#ecece5]">
                    <Terminal className="w-5 h-5 text-slate-800 dark:text-[#f5f5f0]" />
                  </div>
                  <div>
                    <span className="font-semibold text-[13px] text-slate-900 dark:text-[#f5f5f0] block">Offline Demo Mode</span>
                    <span className="text-[13px] text-slate-500 dark:text-[#8a8a70] mt-0.5 block">Stores data inside your browser. No setups required. Perfect for previewing!</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setIsLiveMode(true)}
                  className={`p-4 rounded-xl text-left border-2 transition-all flex flex-col justify-between h-36 cursor-pointer ${
                    isLiveMode ? 'border-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/10 ring-1 ring-emerald-500' : 'border-slate-200 dark:border-[#8a8a70]/30 hover:border-slate-300 dark:hover:border-slate-400'
                  }`}
                >
                  <div className="bg-emerald-100 dark:bg-emerald-950/20 p-1.5 rounded-lg w-fit text-emerald-700 dark:text-emerald-400">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-semibold text-[13px] text-slate-900 dark:text-[#f5f5f0] block">Live Google Sheets Mode</span>
                    <span className="text-[13px] text-slate-500 dark:text-[#8a8a70] mt-0.5 block">Connect real Google Sheets + Google Apps Script Web App for persistent multi-user data.</span>
                  </div>
                </button>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-[#8a8a70]/20 flex justify-center gap-3">
                {onCancel && (
                  <button
                    onClick={onCancel}
                    className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-[#ecece5] text-[13px] font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Go Back to Login
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold rounded-xl transition-colors inline-flex items-center gap-1.5 shadow cursor-pointer"
                >
                  Begin Setup <Play className="w-3.5 h-3.5 fill-current" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: SHEET ID CONFIGURATION */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex items-start gap-4">
                <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 p-2.5 rounded-xl">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-900 dark:text-[#f5f5f0] text-base">Step 2: Connect Google Spreadsheet</h3>
                  <p className="text-[13px] text-slate-500 dark:text-[#8a8a70]">
                    {isLiveMode 
                      ? 'Extract and link your Google Spreadsheet ID.' 
                      : 'You chose Offline Demo Mode. This step will configure a robust simulated database. Click Continue.'}
                  </p>
                </div>
              </div>

              {isLiveMode ? (
                <div className="space-y-4">
                  {/* Instructions */}
                  <div className="p-3.5 bg-slate-50 dark:bg-[#151510]/60 border border-slate-200 dark:border-[#8a8a70]/30 rounded-xl text-[13px] text-slate-600 dark:text-[#8a8a70] space-y-1">
                    <span className="font-semibold text-slate-800 dark:text-[#f5f5f0] block">How to find your Spreadsheet ID:</span>
                    <ol className="list-decimal pl-4 space-y-0.5">
                      <li>Go to Google Sheets (<a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline inline-flex items-center gap-0.5 font-semibold">sheets.new</a>) and create a blank sheet.</li>
                      <li>Copy the long random string of alphanumeric characters in the URL address bar.</li>
                      <li>Example URL format: <code className="bg-slate-200/60 dark:bg-slate-800 px-1 py-0.5 rounded text-[13px]">https://docs.google.com/spreadsheets/d/<span className="bg-yellow-200 dark:bg-yellow-950/30 px-1 font-bold">SPREADSHEET_ID_HERE</span>/edit</code></li>
                    </ol>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[13px] font-semibold text-slate-700 dark:text-[#ecece5] block">Google Spreadsheet ID</label>
                    <input
                      type="text"
                      placeholder="e.g. 1aBCDeFGHiJKlMnOPQRsTuvwXyZ1234567890ABCDE"
                      value={spreadsheetId}
                      onChange={(e) => setSpreadsheetId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50/50 dark:bg-[#151510]/50 border border-slate-200 dark:border-[#8a8a70]/30 rounded-xl text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:text-[#f5f5f0] transition-colors"
                    />
                    {stepErrors[2] && (
                      <span className="text-[13px] text-red-600 font-medium flex items-center gap-1 mt-1">
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                        {stepErrors[2]}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                  <p className="text-[13px] text-emerald-800 dark:text-emerald-400 font-medium">
                    Offline Demo mode is selected. Local Cache database initialization is complete!
                  </p>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 dark:border-[#8a8a70]/20 flex justify-between">
                <button
                  onClick={handleBack}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-[#ecece5] text-[13px] font-semibold rounded-xl transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button
                  onClick={handleNext}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold rounded-xl transition-colors inline-flex items-center gap-1 shadow cursor-pointer"
                >
                  Continue <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: GOOGLE APPS SCRIPT CONFIGURATION */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex items-start gap-4">
                <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 p-2.5 rounded-xl">
                  <Server className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-900 dark:text-[#f5f5f0] text-base">Step 3: Deploy Google Apps Script</h3>
                  <p className="text-[13px] text-slate-500 dark:text-[#8a8a70]">
                    {isLiveMode 
                      ? 'Deploy the backend logic to connect Google Sheets securely.' 
                      : 'Offline Mode: No server setup is required. Press Continue.'}
                  </p>
                </div>
              </div>

              {isLiveMode ? (
                <div className="space-y-4">
                  {/* Copy Button & Snippet */}
                  <div className="p-4 bg-slate-900 dark:bg-[#151510] text-slate-300 dark:text-[#ecece5] rounded-xl font-mono text-[13px] space-y-2 relative border border-[#5A5A40]/10">
                    <span className="font-bold text-slate-400 dark:text-[#8a8a70] block border-b border-slate-800 dark:border-[#8a8a70]/25 pb-1 flex items-center justify-between">
                      <span>Code.gs - REST API Script</span>
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="px-2 py-1 bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-[13px] font-sans font-bold text-white rounded flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Clipboard className="w-3 h-3" />}
                        {copiedCode ? 'Copied!' : 'Copy Script'}
                      </button>
                    </span>
                    <p className="line-clamp-4 leading-normal opacity-80 font-mono">
                      {GOOGLE_APPS_SCRIPT_CODE}
                    </p>
                    <span className="text-[13px] text-slate-500 dark:text-[#8a8a70] block text-right italic">Truncated preview. Click Copy Script above to get the complete backend template.</span>
                  </div>

                  {/* Deployment Walkthrough */}
                  <div className="p-3.5 bg-slate-50 dark:bg-[#151510]/40 border border-slate-200 dark:border-[#8a8a70]/20 rounded-xl text-[13px] text-slate-600 dark:text-[#8a8a70] space-y-1">
                    <span className="font-semibold text-slate-800 dark:text-[#f5f5f0] block">How to Deploy:</span>
                    <ol className="list-decimal pl-4 space-y-0.5">
                      <li>In your spreadsheet, go to <strong className="text-slate-800 dark:text-white">Extensions &gt; Apps Script</strong>.</li>
                      <li>Delete any code in the editor, paste the copied script template.</li>
                      <li>Click <strong className="text-slate-800 dark:text-white">Save</strong> (floppy icon).</li>
                      <li>Click <strong className="text-slate-800 dark:text-white">Deploy &gt; New deployment</strong>. Select type: <strong className="text-slate-800 dark:text-white">Web app</strong>.</li>
                      <li>Set: Execute as: <strong className="text-slate-800 dark:text-white">Me</strong>, Who has access: <strong className="text-slate-800 dark:text-white">Anyone</strong>.</li>
                      <li>Click Deploy, approve permissions, and paste the <strong className="text-slate-800 dark:text-white">Web app URL</strong> below.</li>
                    </ol>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[13px] font-semibold text-slate-700 dark:text-[#ecece5] block">Apps Script Web App URL</label>
                    <input
                      type="text"
                      placeholder="https://script.google.com/macros/s/AKfycb...exec"
                      value={webAppUrl}
                      onChange={(e) => setWebAppUrl(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50/50 dark:bg-[#151510]/50 border border-slate-200 dark:border-[#8a8a70]/30 rounded-xl text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:text-[#f5f5f0] transition-colors"
                    />
                    {stepErrors[3] && (
                      <span className="text-[13px] text-red-600 font-medium flex items-center gap-1 mt-1">
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                        {stepErrors[3]}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                  <p className="text-[13px] text-emerald-800 dark:text-emerald-400 font-medium">
                    Google Apps Script and Web API configurations bypassed.
                  </p>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 dark:border-[#8a8a70]/20 flex justify-between">
                <button
                  onClick={handleBack}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-[#ecece5] text-[13px] font-semibold rounded-xl transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button
                  onClick={handleNext}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold rounded-xl transition-colors inline-flex items-center gap-1 shadow cursor-pointer"
                >
                  Continue <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: INITIALIZE SHEETS LOADER */}
          {currentStep === 4 && (
            <div className="py-8 text-center space-y-6 animate-in fade-in duration-200">
              {isSetupRunning ? (
                <>
                  <div className="relative w-16 h-16 mx-auto">
                    <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                    <FileSpreadsheet className="w-6 h-6 text-emerald-600 absolute inset-0 m-auto" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-900 dark:text-[#f5f5f0] text-base">Initializing Sheets...</h3>
                    <p className="text-[13px] text-slate-500 dark:text-[#8a8a70] max-w-sm mx-auto">
                      Connecting to Google Sheets. We are creating <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">Users</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">Customers</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">Tickets</code>, and <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">FollowUps</code> sheets.
                    </p>
                  </div>
                </>
              ) : setupError ? (
                <div className="space-y-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-50 text-red-600">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-900 dark:text-[#f5f5f0] text-base">Initialization Failed</h3>
                    <p className="text-[13px] text-red-600 dark:text-red-400 max-w-sm mx-auto">{setupError}</p>
                  </div>
                  <div className="p-3.5 bg-slate-50 dark:bg-[#151510]/40 border border-slate-200 dark:border-[#8a8a70]/20 rounded-xl text-[13px] text-slate-600 dark:text-[#8a8a70] space-y-1 max-w-md mx-auto text-left">
                    <span className="font-semibold text-slate-800 dark:text-[#f5f5f0] block">💡 Trouble shooting tips:</span>
                    <ul className="list-disc pl-4 space-y-0.5">
                      <li>Ensure your Google Apps Script has been successfully deployed as a Web App.</li>
                      <li>Double check that the Web App URL has <strong className="text-slate-800 dark:text-white">Who has access: Anyone</strong>.</li>
                      <li>Try refreshing/re-deploying your Apps script as a new version.</li>
                    </ul>
                  </div>
                  <div className="flex justify-center gap-3 pt-2">
                    <button
                      onClick={() => setCurrentStep(3)}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-[#ecece5] text-[13px] font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      Check Web App URL
                    </button>
                    <button
                      onClick={triggerSheetsCreation}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold rounded-xl transition-colors inline-flex items-center gap-1.5 shadow cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Retry Sheet Setup
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* STEP 5: MASTER ADMIN CREDENTIALS */}
          {currentStep === 5 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex items-start gap-4">
                <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 p-2.5 rounded-xl">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-900 dark:text-[#f5f5f0] text-base">Step 4: Create Master Admin User</h3>
                  <p className="text-[13px] text-slate-500 dark:text-[#8a8a70]">
                    Set up your secure administrator login credential to manage users and view full records.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="space-y-1">
                    <label className="text-[13px] font-semibold text-slate-700 dark:text-[#ecece5] block">Admin Full Name</label>
                    <input
                      type="text"
                      value={adminFullName}
                      onChange={(e) => setAdminFullName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50/50 dark:bg-[#151510]/50 border border-slate-200 dark:border-[#8a8a70]/30 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:text-[#f5f5f0] transition-colors"
                      placeholder="e.g. Agency Manager"
                    />
                  </div>

                  {/* Login ID */}
                  <div className="space-y-1">
                    <label className="text-[13px] font-semibold text-slate-700 dark:text-[#ecece5] block">Admin Login ID</label>
                    <input
                      type="text"
                      value={adminLoginId}
                      onChange={(e) => setAdminLoginId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50/50 dark:bg-[#151510]/50 border border-slate-200 dark:border-[#8a8a70]/30 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:text-[#f5f5f0] transition-colors"
                      placeholder="e.g. admin"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Password */}
                  <div className="space-y-1">
                    <label className="text-[13px] font-semibold text-slate-700 dark:text-[#ecece5] block">Password</label>
                    <div className="relative">
                      <input
                        type={showAdminPass ? 'text' : 'password'}
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50/50 dark:bg-[#151510]/50 border border-slate-200 dark:border-[#8a8a70]/30 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:text-[#f5f5f0] transition-colors"
                        placeholder="At least 4 characters"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminPass(!showAdminPass)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                      >
                        {showAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1">
                    <label className="text-[13px] font-semibold text-slate-700 dark:text-[#ecece5] block">Confirm Password</label>
                    <input
                      type={showAdminPass ? 'text' : 'password'}
                      value={adminConfirmPassword}
                      onChange={(e) => setAdminConfirmPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50/50 dark:bg-[#151510]/50 border border-slate-200 dark:border-[#8a8a70]/30 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:text-[#f5f5f0] transition-colors"
                      placeholder="Retype password"
                    />
                  </div>
                </div>

                {stepErrors[5] && (
                  <span className="text-[13px] text-red-600 font-medium flex items-center gap-1 mt-1">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                    {stepErrors[5]}
                  </span>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-[#8a8a70]/20 flex justify-between">
                <button
                  onClick={handleBack}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-[#ecece5] text-[13px] font-semibold rounded-xl transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button
                  onClick={handleNext}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold rounded-xl transition-colors inline-flex items-center gap-1 shadow cursor-pointer"
                >
                  Register Admin &amp; Connect <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: SYSTEM INTEGRATION TESTS */}
          {currentStep === 6 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex items-start gap-4">
                <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 p-2.5 rounded-xl">
                  <Terminal className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-900 dark:text-[#f5f5f0] text-base">Step 5: System Integration Tests</h3>
                  <p className="text-[13px] text-slate-500 dark:text-[#8a8a70]">
                    Verifying the operational readiness of all connected databases and write endpoints.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                {isTesting ? (
                  <div className="py-6 text-center space-y-3">
                    <div className="w-8 h-8 border-3 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mx-auto"></div>
                    <p className="text-[13px] text-slate-500 dark:text-[#8a8a70] font-medium animate-pulse">Running live CRUD integration tests...</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                    {testResults.map((test, index) => (
                      <div 
                        key={test.key} 
                        className={`p-3 rounded-xl border flex justify-between items-center text-[13px] transition-all ${
                          test.success ? 'bg-emerald-50/40 border-emerald-100 dark:border-emerald-900/20 text-emerald-800' : 'bg-red-50/40 border-red-100 dark:border-red-900/20 text-red-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-400 dark:text-[#8a8a70] font-mono text-[13px]">0{index + 1}</span>
                          <span className="font-medium text-slate-800 dark:text-[#ecece5]">{test.label}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {test.success ? (
                            <>
                              <span className="text-[13px] font-semibold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full font-mono">PASSED</span>
                              <CheckCircle className="w-4 h-4 text-emerald-600" />
                            </>
                          ) : (
                            <>
                              <span className="text-[13px] font-semibold text-red-700 bg-red-100 dark:bg-red-950/30 px-2 py-0.5 rounded-full font-mono">WARNING</span>
                              <ShieldAlert className="w-4 h-4 text-red-500" />
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-[#8a8a70]/20 flex justify-between">
                <button
                  onClick={() => setCurrentStep(5)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-[#ecece5] text-[13px] font-semibold rounded-xl transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button
                  onClick={() => setCurrentStep(7)}
                  disabled={isTesting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold rounded-xl transition-colors inline-flex items-center gap-1 shadow cursor-pointer"
                >
                  Continue to Finish <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 7: FINISH & SUMMARY */}
          {currentStep === 7 && (
            <div className="space-y-6 text-center animate-in fade-in duration-200">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600 mb-2">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-[#f5f5f0]">Setup Configuration Complete!</h1>
                <p className="text-[13px] text-slate-500 dark:text-[#8a8a70] max-w-sm mx-auto">
                  Your MoveAboard CRM is fully initialized. Here is a summary of your active system database configuration.
                </p>
              </div>

              {/* Summary card */}
              <div className="bg-slate-50 dark:bg-[#151510] rounded-2xl p-4 border border-slate-200/80 dark:border-[#8a8a70]/30 text-left space-y-2.5 text-[13px] max-w-md mx-auto">
                <div className="flex justify-between border-b border-slate-200/50 dark:border-[#8a8a70]/20 pb-1.5">
                  <span className="text-slate-500 dark:text-[#8a8a70] font-semibold uppercase text-[13px]">Database Mode</span>
                  <span className="font-bold text-slate-800 dark:text-[#f5f5f0]">{isLiveMode ? 'Live Google Sheets' : 'Offline / Simulated Local'}</span>
                </div>
                {isLiveMode && (
                  <>
                    <div className="flex justify-between border-b border-slate-200/50 dark:border-[#8a8a70]/20 pb-1.5 font-mono">
                      <span className="text-slate-500 dark:text-[#8a8a70] font-semibold font-sans uppercase text-[13px]">Spreadsheet ID</span>
                      <span className="text-slate-800 dark:text-[#f5f5f0] truncate max-w-[200px]">{spreadsheetId}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/50 dark:border-[#8a8a70]/20 pb-1.5 font-mono">
                      <span className="text-slate-500 dark:text-[#8a8a70] font-semibold font-sans uppercase text-[13px]">Web App Endpoint</span>
                      <span className="text-slate-800 dark:text-[#f5f5f0] truncate max-w-[200px]">{webAppUrl}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-[#8a8a70] font-semibold uppercase text-[13px]">Registered Admin ID</span>
                  <span className="font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 px-2 rounded">{adminLoginId}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-[#8a8a70]/20 flex justify-center gap-3">
                <button
                  onClick={handleNext}
                  className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold rounded-xl shadow-lg hover:shadow-emerald-100 transition-all inline-flex items-center gap-1.5 cursor-pointer"
                >
                  Complete Setup &amp; Launch CRM <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Footer support */}
      <div className="text-center pb-6 text-slate-400 dark:text-slate-500 text-[13px] font-medium px-4">
        Need assistance? View the complete Deployment Guide inside your project files or click help.
      </div>
    </div>
  );
}
