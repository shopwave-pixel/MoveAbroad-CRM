import React, { useState, useEffect } from 'react';
import { Customer, Ticket, FollowUp, SyncConfig, User } from './types';
import { 
  fetchCRMData, 
  addCustomer, 
  updateCustomer,
  deleteCustomer,
  createTicket, 
  updateTicket,
  deleteTicket,
  createFollowUp,
  updateFollowUp,
  deleteFollowUp,
  getSyncConfig, 
  saveSyncConfig,
  initLocalStorage,
  getStoredSession,
  clearSession
} from './utils/crmApi';

import Dashboard from './components/Dashboard';
import CustomerSearch from './components/CustomerSearch';
import CustomerForm from './components/CustomerForm';
import CustomerDetails from './components/CustomerDetails';
import TicketsManager from './components/TicketsManager';
import FollowUps from './components/FollowUps';
import SettingsPanel from './components/SettingsPanel';
import LoginScreen from './components/LoginScreen';
import SetupWizard from './components/SetupWizard';
import UserManagement from './components/UserManagement';

import { 
  LayoutDashboard,
  Users, 
  Ticket as TicketIcon, 
  Calendar,
  Settings, 
  Wifi, 
  WifiOff, 
  Loader2, 
  AlertCircle,
  RefreshCw,
  Plus,
  LogOut,
  UserCheck
} from 'lucide-react';

export default function App() {
  // Navigation & View States
  const [activeTab, setActiveTab] = useState<'dashboard' | 'customers' | 'tickets' | 'followups' | 'settings' | 'users'>('dashboard');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [preselectedCustomerId, setPreselectedCustomerId] = useState<string>('');
  const [isAddingCustomerInline, setIsAddingCustomerInline] = useState(false);

  // User Authentication & Wizard States
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [showSetupWizard, setShowSetupWizard] = useState(false);

  // Core Data States
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [config, setConfig] = useState<SyncConfig>({ webAppUrl: '', isLiveMode: false });

  // Status States
  const [isLoading, setIsLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Initialize and load configuration on startup
  useEffect(() => {
    initLocalStorage();
    const storedConfig = getSyncConfig();
    setConfig(storedConfig);
    
    // Check session
    const session = getStoredSession();
    if (session) {
      setSessionUser(session);
    }
    
    // Auto-trigger setup wizard if not complete and no local users configured
    if (!storedConfig.setupComplete && !localStorage.getItem('move_abroad_crm_users')) {
      setShowSetupWizard(true);
    }
  }, []);

  // Sync data automatically whenever config is loaded or updated and session is authenticated
  useEffect(() => {
    if (sessionUser) {
      loadCRMData(config);
    }
  }, [config, sessionUser]);

  // Load / Sync Data helper
  const loadCRMData = async (currentConfig: SyncConfig) => {
    setIsLoading(true);
    setGlobalError(null);
    try {
      const data = await fetchCRMData(currentConfig);
      setCustomers(data.customers);
      setTickets(data.tickets);
      setFollowUps(data.followUps || []);
    } catch (err: any) {
      console.error('Data Sync Error:', err);
      setGlobalError(
        currentConfig.isLiveMode 
          ? 'Failed to sync with Google Sheets. Please verify your Apps Script URL or network connection.' 
          : 'Failed to load local data cache.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Event handler: Trigger full manual refresh
  const handleManualSync = async () => {
    await loadCRMData(config);
  };

  // Event handler: Update sync configuration
  const handleUpdateConfig = (newConfig: SyncConfig) => {
    setConfig(newConfig);
    saveSyncConfig(newConfig);
  };

  // Event handler: Create customer API proxy
  const handleAddCustomer = async (
    name: string, 
    mobileNumber: string,
    whatsAppNumber: string = '',
    destinationCountry: string = '',
    source: string = 'Other',
    remarks: string = ''
  ) => {
    const res = await addCustomer(config, name, mobileNumber, whatsAppNumber, destinationCountry, source, remarks);
    if (res.success && res.customer) {
      setCustomers(prev => [...prev, res.customer!]);
    }
    return res;
  };

  // Event handler: Update customer API proxy
  const handleUpdateCustomer = async (
    id: string, 
    name: string, 
    mobileNumber: string,
    whatsAppNumber: string = '',
    destinationCountry: string = '',
    source: string = 'Other',
    remarks: string = ''
  ) => {
    const res = await updateCustomer(config, id, name, mobileNumber, whatsAppNumber, destinationCountry, source, remarks);
    if (res.success) {
      // Sync local customers state
      setCustomers(prev => prev.map(c => c.id === id ? { 
        ...c, 
        name, 
        mobileNumber,
        whatsAppNumber,
        destinationCountry,
        source,
        remarks
      } : c));
      // Sync local tickets cache
      setTickets(prev => prev.map(t => t.customerId === id ? { ...t, name, mobileNumber } : t));
      // Sync local follow-ups cache
      setFollowUps(prev => prev.map(f => f.customerId === id ? { ...f, name, mobileNumber } : f));
      
      // Update selected candidate state
      setSelectedCustomer(prev => prev && prev.id === id ? { 
        ...prev, 
        name, 
        mobileNumber,
        whatsAppNumber,
        destinationCountry,
        source,
        remarks
      } : prev);
    }
    return res;
  };

  // Event handler: Delete customer API proxy (Cascade deletes associated tickets & follow-ups)
  const handleDeleteCustomer = async (id: string) => {
    const res = await deleteCustomer(config, id);
    if (res.success) {
      setCustomers(prev => prev.filter(c => c.id !== id));
      setTickets(prev => prev.filter(t => t.customerId !== id));
      setFollowUps(prev => prev.filter(f => f.customerId !== id));
      setSelectedCustomer(null);
    }
    return res;
  };

  // Event handler: Create ticket API proxy
  const handleCreateTicket = async (
    customerId: string,
    name: string,
    mobileNumber: string,
    conversationDescription: string,
    status: Ticket['status']
  ) => {
    const res = await createTicket(config, customerId, name, mobileNumber, conversationDescription, status);
    if (res.success && res.ticket) {
      setTickets(prev => [...prev, res.ticket!]);
    }
    return res;
  };

  // Event handler: Update ticket API proxy
  const handleUpdateTicket = async (id: string, updates: Partial<Ticket>) => {
    const res = await updateTicket(
      config,
      id,
      updates.conversationDescription || '',
      updates.status || 'Open'
    );
    if (res.success) {
      setTickets(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    }
    return res;
  };

  // Event handler: Delete ticket API proxy
  const handleDeleteTicket = async (id: string) => {
    const res = await deleteTicket(config, id);
    if (res.success) {
      setTickets(prev => prev.filter(t => t.id !== id));
    }
    return res;
  };

  // Event handler: Create follow-up API proxy
  const handleCreateFollowUp = async (
    customerId: string,
    name: string,
    mobileNumber: string,
    followUpDate: string,
    followUpTime: string,
    notes: string,
    status: 'Pending' | 'Completed'
  ) => {
    const res = await createFollowUp(config, customerId, name, mobileNumber, followUpDate, followUpTime, notes, status);
    if (res.success && res.followUp) {
      setFollowUps(prev => [...prev, res.followUp!]);
    }
    return res;
  };

  // Event handler: Update/Complete follow-up API proxy
  const handleUpdateFollowUp = async (id: string, updates: Partial<FollowUp>) => {
    const existing = followUps.find(f => f.id === id);
    if (!existing) return { success: false, error: 'Follow-up not found' };
    
    const date = updates.followUpDate ?? existing.followUpDate;
    const time = updates.followUpTime ?? existing.followUpTime;
    const notes = updates.notes ?? existing.notes;
    const status = updates.status ?? existing.status;

    const res = await updateFollowUp(config, id, date, time, notes, status);
    if (res.success) {
      setFollowUps(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    }
    return res;
  };

  // Event handler: Delete follow-up API proxy
  const handleDeleteFollowUp = async (id: string) => {
    const res = await deleteFollowUp(config, id);
    if (res.success) {
      setFollowUps(prev => prev.filter(f => f.id !== id));
    }
    return res;
  };

  // Navigation controller helper: Open Customer profile details
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setActiveTab('customers');
  };

  // Navigation controller helper: Quick start support ticket for customer
  const handleStartTicketForCustomer = (customerId: string) => {
    setPreselectedCustomerId(customerId);
    setSelectedCustomer(null);
    setActiveTab('tickets');
  };

  // Navigation controller helper: Quick start follow-up task for customer
  const handleStartFollowUpForCustomer = (customerId: string) => {
    setPreselectedCustomerId(customerId);
    setSelectedCustomer(null);
    setActiveTab('followups');
  };

  const handleTabNavigation = (tab: typeof activeTab) => {
    setSelectedCustomer(null);
    setPreselectedCustomerId('');
    setIsAddingCustomerInline(false);
    setActiveTab(tab);
  };

  const handleLogout = () => {
    clearSession();
    setSessionUser(null);
    setActiveTab('dashboard');
  };

  if (showSetupWizard) {
    return (
      <SetupWizard 
        onSetupComplete={(newConfig) => {
          setConfig(newConfig);
          setShowSetupWizard(false);
        }}
        onCancel={() => setShowSetupWizard(false)}
      />
    );
  }

  if (!sessionUser) {
    return (
      <LoginScreen 
        config={config} 
        onLoginSuccess={(user) => setSessionUser(user)} 
        onOpenSetupWizard={() => setShowSetupWizard(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f0] flex flex-col font-sans text-[#2c2c26] selection:bg-[#5A5A40]/20 selection:text-[#2c2c26] antialiased">
      
      {/* Top Main Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-[#5A5A40]/10 shadow-xs px-4 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#5A5A40] flex items-center justify-center text-white font-serif font-bold text-lg shadow-sm">
              M
            </div>
            <div>
              <h1 className="font-serif font-bold text-lg text-[#5A5A40] tracking-tight leading-tight">MoveAbroad CRM</h1>
              <p className="text-[10px] text-[#5A5A40]/60 font-semibold tracking-wider uppercase">Visa & Agency Hub</p>
            </div>
          </div>

          {/* Real-time sync badge indicator */}
          <div className="flex items-center gap-2.5">
            {isLoading && (
              <Loader2 className="w-4 h-4 animate-spin text-[#5A5A40]" />
            )}
            
            <button
              onClick={handleManualSync}
              disabled={isLoading}
              title="Force Sync Now"
              className="p-1.5 text-[#5A5A40]/75 hover:text-[#5A5A40] hover:bg-[#5A5A40]/5 rounded-xl border border-[#5A5A40]/10 active:scale-95 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1 rounded-full border ${
              config.isLiveMode 
                ? 'bg-[#5A5A40]/10 text-[#5A5A40] border-[#5A5A40]/20' 
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}>
              {config.isLiveMode ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-[#5A5A40]" />
                  <span>SHEETS LIVE</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-500" />
                  <span>DEMO MODE</span>
                </>
              )}
            </span>

            {sessionUser && (
              <>
                <div className="h-6 w-[1px] bg-slate-200 hidden sm:block"></div>
                
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex flex-col text-right">
                    <span className="text-xs font-bold text-slate-800 leading-none">{sessionUser.fullName}</span>
                    <span className="text-[9px] font-semibold text-emerald-700 uppercase tracking-wider mt-0.5">{sessionUser.role}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl border border-red-100 transition-colors cursor-pointer flex items-center gap-1"
                    title="Log Out"
                    id="header-logout-btn"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-xs font-semibold hidden md:inline">Logout</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Responsive Grid Container */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-6 pb-28">
        
        {/* Global Connection / Sync Error alert banner */}
        {globalError && (
          <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-3 shadow-xs max-w-3xl mx-auto">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
            <div className="space-y-1.5">
              <p className="font-semibold">Sync Connection Notice</p>
              <p className="leading-relaxed">{globalError}</p>
              <button 
                onClick={() => handleTabNavigation('settings')}
                className="text-[10px] font-bold text-[#5A5A40] underline hover:text-[#4a4a34] block"
              >
                Configure Link Settings &rarr;
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Route/View Dispatcher */}
        {selectedCustomer ? (
          /* Sub-View: Customer details with history logs */
          <div className="max-w-4xl mx-auto">
            <CustomerDetails
              customer={selectedCustomer}
              tickets={tickets}
              followUps={followUps}
              existingCustomers={customers}
              onBack={() => setSelectedCustomer(null)}
              onAddTicket={handleStartTicketForCustomer}
              onAddFollowUp={handleStartFollowUpForCustomer}
              onUpdateCustomer={handleUpdateCustomer}
              onDeleteCustomer={handleDeleteCustomer}
            />
          </div>
        ) : (
          /* Primary Route Screens */
          <div className="space-y-5">
            
            {/* 1. Dashboard View */}
            {activeTab === 'dashboard' && (
              <Dashboard
                customers={customers}
                tickets={tickets}
                followUps={followUps}
                onNavigate={handleTabNavigation}
                onSelectCustomer={handleSelectCustomer}
                onQuickAddCustomer={() => {
                  setSelectedCustomer(null);
                  setActiveTab('customers');
                  setIsAddingCustomerInline(true);
                }}
                onQuickAddTicket={() => {
                  setSelectedCustomer(null);
                  setActiveTab('tickets');
                }}
              />
            )}

            {/* 2. Customers Directory View */}
            {activeTab === 'customers' && (
              <div className="space-y-5 max-w-4xl mx-auto">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-serif font-bold text-[#5A5A40] tracking-tight">Candidate Profiles</h2>
                    <p className="text-xs text-[#5A5A40]/60">Manage overseas visa candidates and lookup history</p>
                  </div>
                  
                  <button
                    onClick={() => setIsAddingCustomerInline(!isAddingCustomerInline)}
                    id="btn-toggle-add-candidate"
                    className="inline-flex items-center gap-1 bg-[#5A5A40] hover:bg-[#4a4a34] text-white text-xs font-semibold px-4 py-2 rounded-full cursor-pointer transition-colors shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    {isAddingCustomerInline ? 'Search Directory' : 'Register Candidate'}
                  </button>
                </div>

                {isAddingCustomerInline ? (
                  <div className="max-w-md mx-auto">
                    <CustomerForm
                      onAddCustomer={handleAddCustomer}
                      existingCustomers={customers}
                    />
                  </div>
                ) : (
                  <CustomerSearch
                    customers={customers}
                    tickets={tickets}
                    onSelectCustomer={handleSelectCustomer}
                    onNavigateToAddCustomer={() => setIsAddingCustomerInline(true)}
                  />
                )}
              </div>
            )}

            {/* 3. Support Tickets Manager View */}
            {activeTab === 'tickets' && (
              <div className="max-w-4xl mx-auto">
                <TicketsManager
                  customers={customers}
                  tickets={tickets}
                  onAddCustomer={handleAddCustomer}
                  onCreateTicket={handleCreateTicket}
                  onUpdateTicket={handleUpdateTicket}
                  onDeleteTicket={handleDeleteTicket}
                  preselectedCustomerId={preselectedCustomerId}
                />
              </div>
            )}

            {/* 4. Follow-up Tasks view */}
            {activeTab === 'followups' && (
              <div className="max-w-4xl mx-auto">
                <FollowUps
                  customers={customers}
                  followUps={followUps}
                  onCreateFollowUp={handleCreateFollowUp}
                  onUpdateFollowUp={handleUpdateFollowUp}
                  onDeleteFollowUp={handleDeleteFollowUp}
                />
              </div>
            )}

            {/* 5. Settings Configuration View */}
            {activeTab === 'settings' && (
              <div className="max-w-3xl mx-auto">
                <SettingsPanel
                  config={config}
                  onUpdateConfig={handleUpdateConfig}
                  onRefreshData={handleManualSync}
                  isLoading={isLoading}
                />
              </div>
            )}

            {/* 6. Admin User Management View */}
            {activeTab === 'users' && sessionUser?.role === 'Admin' && (
              <div className="max-w-4xl mx-auto">
                <UserManagement
                  config={config}
                  currentUser={sessionUser}
                />
              </div>
            )}

          </div>
        )}
      </main>

      {/* Sticky Bottom Tab Navigation Bar (Optimized for Phones) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#5A5A40]/10 shadow-lg py-2 px-4 z-40">
        <div className={`max-w-lg mx-auto grid ${sessionUser?.role === 'Admin' ? 'grid-cols-6' : 'grid-cols-5'} gap-1`}>
          
          {/* Tab 1: Dashboard */}
          <button
            onClick={() => handleTabNavigation('dashboard')}
            id="tab-btn-dashboard"
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'dashboard' && !selectedCustomer
                ? 'text-[#5A5A40] bg-[#5A5A40]/10 font-bold'
                : 'text-[#2c2c26]/50 hover:text-[#2c2c26] hover:bg-[#5A5A40]/5'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Dashboard</span>
          </button>

          {/* Tab 2: Customers */}
          <button
            onClick={() => handleTabNavigation('customers')}
            id="tab-btn-customers"
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'customers' || selectedCustomer
                ? 'text-[#5A5A40] bg-[#5A5A40]/10 font-bold'
                : 'text-[#2c2c26]/50 hover:text-[#2c2c26] hover:bg-[#5A5A40]/5'
            }`}
          >
            <Users className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Candidates</span>
          </button>

          {/* Tab 3: Tickets */}
          <button
            onClick={() => handleTabNavigation('tickets')}
            id="tab-btn-tickets"
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'tickets'
                ? 'text-[#5A5A40] bg-[#5A5A40]/10 font-bold'
                : 'text-[#2c2c26]/50 hover:text-[#2c2c26] hover:bg-[#5A5A40]/5'
            }`}
          >
            <TicketIcon className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Tickets</span>
          </button>

          {/* Tab 4: Follow-ups */}
          <button
            onClick={() => handleTabNavigation('followups')}
            id="tab-btn-followups"
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'followups'
                ? 'text-[#5A5A40] bg-[#5A5A40]/10 font-bold'
                : 'text-[#2c2c26]/50 hover:text-[#2c2c26] hover:bg-[#5A5A40]/5'
            }`}
          >
            <Calendar className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Follow-ups</span>
          </button>

          {/* Tab 5: Users (Admin Only) */}
          {sessionUser?.role === 'Admin' && (
            <button
              onClick={() => handleTabNavigation('users')}
              id="tab-btn-users"
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer ${
                activeTab === 'users'
                  ? 'text-emerald-700 bg-emerald-50 font-bold border border-emerald-100'
                  : 'text-[#2c2c26]/50 hover:text-[#2c2c26] hover:bg-[#5A5A40]/5'
              }`}
            >
              <UserCheck className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] tracking-tight">Users</span>
            </button>
          )}

          {/* Tab 6: Settings */}
          <button
            onClick={() => handleTabNavigation('settings')}
            id="tab-btn-settings"
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'text-[#5A5A40] bg-[#5A5A40]/10 font-bold'
                : 'text-[#2c2c26]/50 hover:text-[#2c2c26] hover:bg-[#5A5A40]/5'
            }`}
          >
            <Settings className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Settings</span>
          </button>

        </div>
      </nav>
    </div>
  );
}
