import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, User as UserIcon, AlertCircle, HelpCircle, MapPin } from 'lucide-react';
import { SyncConfig, User } from '../types';
import { loginUser, saveSession } from '../utils/crmApi';

interface LoginScreenProps {
  config: SyncConfig;
  onLoginSuccess: (user: User) => void;
  onOpenSetupWizard?: () => void;
}

export default function LoginScreen({ config, onLoginSuccess, onOpenSetupWizard }: LoginScreenProps) {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Pre-fill remembered user
  useEffect(() => {
    const remembered = localStorage.getItem('move_abroad_crm_remembered_id');
    if (remembered) {
      setLoginId(remembered);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmedId = loginId.trim();
    const trimmedPass = password.trim();

    if (!trimmedId) {
      setErrorMessage('Login ID is required.');
      return;
    }
    if (!trimmedPass) {
      setErrorMessage('Password is required.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await loginUser(config, trimmedId, trimmedPass);
      if (response.success && response.user) {
        if (rememberMe) {
          localStorage.setItem('move_abroad_crm_remembered_id', trimmedId);
        } else {
          localStorage.removeItem('move_abroad_crm_remembered_id');
        }
        saveSession(response.user);
        onLoginSuccess(response.user);
      } else {
        setErrorMessage(response.error || 'Invalid Login ID or Password.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 text-slate-800" id="login-container">
      {/* Top decorative bar with passport emerald & gold gradient */}
      <div className="h-2 bg-gradient-to-r from-emerald-600 via-yellow-500 to-emerald-700 w-full"></div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden" id="login-card">
          <div className="p-6 sm:p-8 bg-gradient-to-b from-emerald-50/50 to-white border-b border-slate-100 text-center">
            {/* Elegant Map-Pin style travel logo */}
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-200 mb-4 animate-bounce">
              <MapPin className="w-8 h-8 text-yellow-300" />
            </div>

            <h1 className="text-2xl font-bold text-slate-900 tracking-tight" id="app-title">
              MoveAbroad CRM
            </h1>
            <p className="text-xs font-semibold text-emerald-700 tracking-wider uppercase mt-1">
              Bangladesh Overseas Recruitment
            </p>
          </div>

          <form onSubmit={handleLogin} className="p-6 sm:p-8 space-y-5" id="login-form">
            {errorMessage && (
              <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 animate-pulse" id="login-error">
                <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Login ID */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 block">Login ID</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4.5 h-4.5" />
                </div>
                <input
                  type="text"
                  placeholder="Enter your Login ID"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  disabled={isLoading}
                  autoComplete="username"
                  id="login-id-input"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline focus:outline-none"
                  id="forgot-password-btn"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4.5 h-4.5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  disabled={isLoading}
                  autoComplete="current-password"
                  id="login-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  id="password-visibility-toggle"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="relative flex items-center cursor-pointer select-none text-xs text-slate-600 gap-2">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                  id="remember-me-checkbox"
                />
                Remember Me
              </label>

              {onOpenSetupWizard && (
                <button
                  type="button"
                  onClick={onOpenSetupWizard}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700 hover:underline flex items-center gap-1"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  Run Setup Wizard
                </button>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              id="submit-login-btn"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Logging In...
                </>
              ) : (
                'Log In to Dashboard'
              )}
            </button>
          </form>


        </div>
      </div>

      {/* Footer Info & App Version */}
      <div className="text-center pb-6 space-y-1 px-4">
        <p className="text-xs text-slate-500">
          &copy; {new Date().getFullYear()} MoveAbroad. All rights reserved.
        </p>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-200/60 border border-slate-300/40 text-[10px] font-mono text-slate-600 font-medium">
          App Version 2.1.0-BD
        </div>
      </div>

      {/* Forgot Password Drawer/Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" id="forgot-modal">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white flex justify-between items-center">
              <h3 className="font-semibold text-sm">Forgot Password Assistance</h3>
              <button
                onClick={() => setShowForgotModal(false)}
                className="text-white/80 hover:text-white font-bold text-lg leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs text-slate-600">
              <p>
                To maintain the integrity and security of the visa and customer logs, user password resets must be processed by the agency's <strong>System Administrator</strong>.
              </p>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800">
                <span className="font-semibold block mb-1">🔑 For Administrators:</span>
                If you lost your master admin password, you can reset it by updating the <code className="bg-amber-100/80 px-1 py-0.5 rounded font-semibold">Users</code> sheet directly inside your connected Google Spreadsheet.
              </div>
              <button
                onClick={() => setShowForgotModal(false)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-center transition-colors"
              >
                Understood, Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
