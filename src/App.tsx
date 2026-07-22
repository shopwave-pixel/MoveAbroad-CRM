import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Customer, AdditionalNumber, Ticket, FollowUp, SyncConfig, User } from './types';
import { 
  fetchCRMData, 
  addCustomer, 
  updateCustomer,
  deleteCustomer,
  archiveCustomer,
  restoreCustomer,
  permanentDeleteCustomer,
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

import { subscribeToCache, triggerAutoSync, loadCacheAndSync, performSmartSync } from './utils/cacheManager';
import { logCustomerActivity } from './utils/activityLogger';
import { logArchiveAuditEvent } from './utils/archiveAuditLogger';
import SyncCenter from './components/SyncCenter';

import { 
  DashboardSkeleton, 
  CustomerDirectorySkeleton, 
  TicketsManagerSkeleton, 
  FollowUpsSkeleton, 
  SettingsSkeleton 
} from './components/Skeletons';

import Dashboard from './components/Dashboard';
import CustomerSearch from './components/CustomerSearch';
import SmartGlobalSearch from './components/SmartGlobalSearch';
import CustomerForm from './components/CustomerForm';
import CustomerDetails from './components/CustomerDetails';
import TicketsManager from './components/TicketsManager';
import FollowUps from './components/FollowUps';
import SettingsPanel from './components/SettingsPanel';
import LoginScreen from './components/LoginScreen';
import SetupWizard from './components/SetupWizard';
import UserManagement from './components/UserManagement';
import AdminDebug from './components/AdminDebug';
import DuplicateManagementCenter from './components/DuplicateManagementCenter';

const ArchivedCustomersView = React.lazy(() => import('./components/ArchivedCustomersView'));

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
  UserCheck,
  UserPlus,
  Sun,
  Moon,
  Laptop,
  Archive
} from 'lucide-react';

const AUTH_ENABLED = false;

const bypassAdminUser: User = {
  id: 'USR-ADMIN-BYPASS',
  fullName: 'Admin User',
  loginId: 'admin',
  password: '',
  role: 'Admin',
  status: 'Active',
  createdAt: '2026-07-15T14:23:42-07:00'
};

export default function App() {
  // Toast notifications state
  const [toasts, setToasts] = useState<{ id: string; message: string }[]>([]);

  useEffect(() => {
    const handleToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string }>;
      if (customEvent.detail && customEvent.detail.message) {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message: customEvent.detail.message }]);
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3000);
      }
    };
    window.addEventListener('show-toast', handleToastEvent);
    const handleSelectCustomerEvent = (e: Event) => {
      const customEvent = e as CustomEvent<Customer>;
      if (customEvent.detail) {
        handleSelectCustomer(customEvent.detail);
      }
    };
    window.addEventListener('select-customer', handleSelectCustomerEvent);
    return () => {
      window.removeEventListener('show-toast', handleToastEvent);
      window.removeEventListener('select-customer', handleSelectCustomerEvent);
    };
  }, []);

  // Theme support state (light, dark, system)
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark' | 'system') || 'system';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== 'system') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(mediaQuery.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Hidden Developer Mode state
  const [isDeveloperMode, setIsDeveloperMode] = useState<boolean>(false);
  const tapTimestamps = useRef<number[]>([]);

  const handleLogoTap = () => {
    // Only available for Admin users
    if (effectiveUser && effectiveUser.role !== 'Admin') {
      return;
    }

    const now = Date.now();
    // Keep only taps in the last 3 seconds
    const recentTaps = tapTimestamps.current.filter((t) => now - t <= 3000);
    recentTaps.push(now);
    tapTimestamps.current = recentTaps;

    if (recentTaps.length >= 5) {
      tapTimestamps.current = [];
      setIsDeveloperMode((prev) => {
        const nextState = !prev;
        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: { message: nextState ? '🔓 Developer Mode Enabled' : '🔒 Developer Mode Disabled' }
          })
        );
        return nextState;
      });
    }
  };

  // Navigation & View States
  const [activeTab, setActiveTab] = useState<'dashboard' | 'customers' | 'tickets' | 'followups' | 'settings' | 'users' | 'debug'>('dashboard');
  const [settingsSubView, setSettingsSubView] = useState<'main' | 'archived' | 'duplicates'>('main');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [preselectedCustomerId, setPreselectedCustomerId] = useState<string>('');
  const [isAddingCustomerInline, setIsAddingCustomerInline] = useState(false);
  const [filterSearchQuery, setFilterSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [genderFilter, setGenderFilter] = useState<string>('');

  // User Authentication & Wizard States
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [showSetupWizard, setShowSetupWizard] = useState(false);

  const effectiveUser = AUTH_ENABLED ? sessionUser : bypassAdminUser;

  // Core Data States
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [config, setConfig] = useState<SyncConfig>({ webAppUrl: '', isLiveMode: false });

  // Google Sheets Sync & Auto Save States
  const [syncStatus, setSyncStatus] = useState<'CONNECTING' | 'LIVE' | 'SYNCING' | 'OFFLINE'>('CONNECTING');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(new Date());
  const [retryCountdown, setRetryCountdown] = useState<number>(30);
  const [globalSaveStatus, setGlobalSaveStatus] = useState<'IDLE' | 'EDITING' | 'SAVING' | 'SAVED' | 'FAILED'>('IDLE');

  // Enterprise Client-Side Cache States
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [syncQueue, setSyncQueue] = useState<any[]>([]);
  const [syncHistory, setSyncHistory] = useState<any[]>([]);
  const [showSyncCenter, setShowSyncCenter] = useState<boolean>(false);

  // Status States
  const [isLoading, setIsLoading] = useState(false);
  const [isCacheLoading, setIsCacheLoading] = useState<boolean>(true);
  const [newlyUpdatedIds, setNewlyUpdatedIds] = useState<Set<string>>(new Set());
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Subscribe to central Cache Manager for live reactive sync states
  useEffect(() => {
    const unsubscribe = subscribeToCache((data) => {
      setCustomers(data.customers);
      setTickets(data.tickets);
      setFollowUps(data.followUps);
      setIsOnline(data.isOnline);
      setSyncQueue(data.syncQueue);
      setSyncHistory(data.syncHistory);
      setLastSyncTime(data.lastSyncTime);
      
      if (!data.isOnline) {
        setSyncStatus('OFFLINE');
      } else if (data.syncStatus === 'SYNCING') {
        setSyncStatus('SYNCING');
      } else {
        setSyncStatus('LIVE');
      }
    });
    return unsubscribe;
  }, []);

  // Background refresh every 5 minutes (300,000 ms)
  useEffect(() => {
    if (!effectiveUser) return;
    const interval = setInterval(() => {
      if (config.isLiveMode && isOnline) {
        // Run silent background refresh
        loadCacheAndSync(config, true);
      }
    }, 300000);
    return () => clearInterval(interval);
  }, [config, effectiveUser, isOnline]);

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
    if (AUTH_ENABLED && !storedConfig.setupComplete && !localStorage.getItem('move_abroad_crm_users')) {
      setShowSetupWizard(true);
    }
  }, []);

  // Listen for global autosave status changes
  useEffect(() => {
    const handleSaveStatusEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ status: 'IDLE' | 'EDITING' | 'SAVING' | 'SAVED' | 'FAILED' }>;
      if (customEvent.detail && customEvent.detail.status) {
        setGlobalSaveStatus(customEvent.detail.status);
      }
    };
    window.addEventListener('set-save-status', handleSaveStatusEvent);
    return () => {
      window.removeEventListener('set-save-status', handleSaveStatusEvent);
    };
  }, []);

  // Warning when leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (globalSaveStatus === 'EDITING' || globalSaveStatus === 'SAVING') {
        const msg = 'UNSAVED CHANGES DETECTED';
        e.preventDefault();
        e.returnValue = msg;
        return msg;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [globalSaveStatus]);

  // Polling for offline auto-reconnection
  useEffect(() => {
    let interval: any = null;
    if (syncStatus === 'OFFLINE' && config.isLiveMode) {
      interval = setInterval(() => {
        setRetryCountdown(prev => {
          if (prev <= 1) {
            // Trigger auto-reconnect attempt
            loadCRMData(config);
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setRetryCountdown(30);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [syncStatus, config]);

  // Periodic tick to update human-readable last sync text
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Pull to Refresh State & Touch Event Binding
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const startYRef = useRef(0);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startYRef.current = e.touches[0].clientY;
        setIsPulling(true);
      } else {
        setIsPulling(false);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (startYRef.current === 0) return;
      const currentY = e.touches[0].clientY;
      const diff = currentY - startYRef.current;
      
      if (diff > 0 && window.scrollY === 0) {
        const distance = Math.min(80, diff * 0.45);
        setPullDistance(distance);
        if (e.cancelable && distance > 10) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = async () => {
      startYRef.current = 0;
      setIsPulling(false);
      
      if (pullDistance >= 45) {
        setPullDistance(45);
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: '🔄 Syncing Sheets Cache...' } }));
        await loadCRMData(config);
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: '✅ Synchronization Complete' } }));
      }
      setPullDistance(0);
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullDistance, config]);

  // Sync data automatically whenever config is loaded or updated and session is authenticated
  useEffect(() => {
    if (effectiveUser) {
      loadCRMData(config);
    }
  }, [config, effectiveUser]);

  // Load / Sync Data helper with Progressive Loading Engine
  const loadCRMData = async (currentConfig: SyncConfig) => {
    setGlobalError(null);
    
    // Step 1: Instantly load cached database values to prevent blank screens (<50ms)
    try {
      const cached = await fetchCRMData(currentConfig);
      if (cached && (cached.customers?.length > 0 || cached.tickets?.length > 0)) {
        setCustomers(cached.customers);
        setTickets(cached.tickets);
        setFollowUps(cached.followUps || []);
        setIsCacheLoading(false); // Cache hit! Hide modular skeletons instantly
      }
    } catch (cacheErr) {
      console.error('Fast cache load error:', cacheErr);
    }

    // Step 2: Start silent background comparison sync with Google Sheets
    setSyncStatus('SYNCING'); // Render '🟡 Checking...' status label in header
    try {
      const syncResult = await performSmartSync(currentConfig);
      
      if (syncResult.success) {
        setIsOnline(true);
        setSyncStatus('LIVE'); // Render '🟢 Synced' status label in header
        setLastSyncTime(new Date());
        
        if (syncResult.hasChanges) {
          // Temporarily register newly updated IDs to trigger green flash hover highlights
          if (syncResult.updatedIds && syncResult.updatedIds.length > 0) {
            const updatedSet = new Set(syncResult.updatedIds);
            setNewlyUpdatedIds(updatedSet);
            setTimeout(() => {
              setNewlyUpdatedIds(new Set());
            }, 4000);

            // Display non-intrusive toast with total updates applied
            const totalCount = syncResult.addedCount + syncResult.updatedCount + syncResult.deletedCount;
            window.dispatchEvent(new CustomEvent('show-toast', { 
              detail: { message: `🔄 CRM Synced: Applied ${totalCount} partial updates.` } 
            }));
          }
        }
      } else {
        // Handle sync failure based on internet connection
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          setSyncStatus('OFFLINE'); // Render '🟠 Offline'
        } else {
          setSyncStatus('CONNECTING'); // Triggers retrying flow or fails
        }
      }
    } catch (syncErr: any) {
      console.error('Silent background sync failure:', syncErr);
      setSyncStatus('OFFLINE');
      setRetryCountdown(30);
    } finally {
      setIsLoading(false);
      setIsCacheLoading(false); // Insures skeletons collapse even on empty datasets
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

  // Generic Auto-Save wrapper to trigger global status events
  const wrapSave = async <T,>(action: () => Promise<T>): Promise<T> => {
    window.dispatchEvent(new CustomEvent('set-save-status', { detail: { status: 'SAVING' } }));
    try {
      const res = await action();
      const isSuccess = (res as any)?.success !== false;
      if (isSuccess) {
        window.dispatchEvent(new CustomEvent('set-save-status', { detail: { status: 'SAVED' } }));
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('set-save-status', { detail: { status: 'IDLE' } }));
        }, 1500);
      } else {
        window.dispatchEvent(new CustomEvent('set-save-status', { detail: { status: 'FAILED' } }));
      }
      return res;
    } catch (err) {
      window.dispatchEvent(new CustomEvent('set-save-status', { detail: { status: 'FAILED' } }));
      throw err;
    }
  };

  // Event handler: Create customer API proxy
  const handleAddCustomer = async (
    name: string, 
    mobileNumber: string,
    whatsAppNumber: string = '',
    destinationCountry: string = '',
    source: string = 'Other',
    remarks: string = '',
    imoNumber: string = '',
    customerCategory: string = '',
    address: string = '',
    gender: string = '',
    additionalNumbers: AdditionalNumber[] = []
  ) => {
    return wrapSave(async () => {
      const res = await addCustomer(config, name, mobileNumber, whatsAppNumber, destinationCountry, source, remarks, imoNumber, customerCategory, address, gender, additionalNumbers);
      if (res.success && res.customer) {
        setCustomers(prev => [...prev, res.customer!]);
        logCustomerActivity(res.customer.id, effectiveUser?.fullName || 'Staff', 'Customer Created', `Profile created with primary mobile: ${mobileNumber}`);

        // Automatically create initial open support ticket if conversation remarks exist
        if (remarks && remarks.trim()) {
          const tktRes = await createTicket(
            config, 
            res.customer.id, 
            res.customer.name, 
            res.customer.mobileNumber, 
            remarks.trim(), 
            'Open'
          );
          if (tktRes.success && tktRes.ticket) {
            setTickets(prev => [...prev, tktRes.ticket!]);
            logCustomerActivity(res.customer.id, effectiveUser?.fullName || 'Staff', 'Ticket Created', `Opened initial support ticket ${tktRes.ticket.id}: "${remarks.trim()}"`);
          }
        }
      }
      return res;
    });
  };

  // Event handler: Update customer API proxy
  const handleUpdateCustomer = async (
    id: string, 
    name: string, 
    mobileNumber: string,
    whatsAppNumber: string = '',
    destinationCountry: string = '',
    source: string = 'Other',
    remarks: string = '',
    imoNumber: string = '',
    customerCategory: string = '',
    address: string = '',
    gender: string = '',
    additionalNumbers: AdditionalNumber[] = []
  ) => {
    return wrapSave(async () => {
      const res = await updateCustomer(config, id, name, mobileNumber, whatsAppNumber, destinationCountry, source, remarks, imoNumber, customerCategory, address, gender, additionalNumbers);
      if (res.success) {
        // Sync local customers state
        setCustomers(prev => prev.map(c => c.id === id ? { 
          ...c, 
          name, 
          mobileNumber,
          whatsAppNumber,
          imoNumber,
          destinationCountry,
          source,
          remarks,
          customerCategory,
          address,
          gender,
          additionalNumbers
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
          imoNumber,
          destinationCountry,
          source,
          remarks,
          customerCategory,
          address,
          gender,
          additionalNumbers
        } : prev);

        logCustomerActivity(id, effectiveUser?.fullName || 'Staff', 'Customer Updated', `Profile details updated`);
      }
      return res;
    });
  };

  // Event handler: Delete customer API proxy (Cascade deletes associated tickets & follow-ups)
  const handleDeleteCustomer = async (id: string) => {
    return wrapSave(async () => {
      const res = await deleteCustomer(config, id);
      if (res.success) {
        setCustomers(prev => prev.filter(c => c.id !== id));
        setTickets(prev => prev.filter(t => t.customerId !== id));
        setFollowUps(prev => prev.filter(f => f.customerId !== id));
        setSelectedCustomer(null);
      }
      return res;
    });
  };

  // Event handler: Archive customer API proxy
  const handleArchiveCustomer = async (id: string) => {
    return wrapSave(async () => {
      const currentCus = customers.find(c => c.id === id);
      const userName = effectiveUser?.fullName || 'Staff';
      const res = await archiveCustomer(config, id, userName);
      if (res.success) {
        const isoNow = new Date().toISOString();
        setCustomers(prev => prev.map(c => c.id === id ? {
          ...c,
          isArchived: true,
          archivedAt: isoNow,
          archivedBy: userName
        } : c));

        if (selectedCustomer?.id === id) {
          setSelectedCustomer(prev => prev ? {
            ...prev,
            isArchived: true,
            archivedAt: isoNow,
            archivedBy: userName
          } : null);
        }

        if (currentCus) {
          logArchiveAuditEvent({
            customerId: id,
            customerName: currentCus.name,
            action: 'ARCHIVE',
            archivedBy: userName,
            archiveDateTime: isoNow,
            performedBy: userName,
            details: `Customer profile ${currentCus.name} (${id}) archived`
          });
          logCustomerActivity(id, 'UPDATED', `Profile archived by ${userName}`, userName);
        }
      }
      return res;
    });
  };

  // Event handler: Restore customer API proxy
  const handleRestoreCustomer = async (id: string) => {
    return wrapSave(async () => {
      const currentCus = customers.find(c => c.id === id);
      const userName = effectiveUser?.fullName || 'Staff';
      const res = await restoreCustomer(config, id, userName);
      if (res.success) {
        const isoNow = new Date().toISOString();
        setCustomers(prev => prev.map(c => c.id === id ? {
          ...c,
          isArchived: false,
          restoredAt: isoNow,
          restoredBy: userName
        } : c));

        if (selectedCustomer?.id === id) {
          setSelectedCustomer(prev => prev ? {
            ...prev,
            isArchived: false,
            restoredAt: isoNow,
            restoredBy: userName
          } : null);
        }

        if (currentCus) {
          logArchiveAuditEvent({
            customerId: id,
            customerName: currentCus.name,
            action: 'RESTORE',
            restoredBy: userName,
            restoreDateTime: isoNow,
            performedBy: userName,
            details: `Customer profile ${currentCus.name} (${id}) restored to active directory`
          });
          logCustomerActivity(id, 'UPDATED', `Profile restored by ${userName}`, userName);
        }
      }
      return res;
    });
  };

  // Event handler: Permanently delete archived customer API proxy (Admin Only)
  const handlePermanentDeleteCustomer = async (id: string) => {
    if (effectiveUser?.role !== 'Admin') {
      return { success: false, error: 'Only Administrators can permanently delete archived customers.' };
    }
    return wrapSave(async () => {
      const currentCus = customers.find(c => c.id === id);
      const userName = effectiveUser?.fullName || 'Admin';
      const res = await permanentDeleteCustomer(config, id);
      if (res.success) {
        const isoNow = new Date().toISOString();
        setCustomers(prev => prev.filter(c => c.id !== id));
        setTickets(prev => prev.filter(t => t.customerId !== id));
        setFollowUps(prev => prev.filter(f => f.customerId !== id));
        if (selectedCustomer?.id === id) {
          setSelectedCustomer(null);
        }

        if (currentCus) {
          logArchiveAuditEvent({
            customerId: id,
            customerName: currentCus.name,
            action: 'PERMANENT_DELETE',
            permanentlyDeletedBy: userName,
            permanentDeleteDateTime: isoNow,
            performedBy: userName,
            details: `Customer profile ${currentCus.name} (${id}) permanently deleted from system`
          });
        }
      }
      return res;
    });
  };

  // Event handler: Create ticket API proxy
  const handleCreateTicket = async (
    customerId: string,
    name: string,
    mobileNumber: string,
    conversationDescription: string,
    status: Ticket['status']
  ) => {
    return wrapSave(async () => {
      const res = await createTicket(config, customerId, name, mobileNumber, conversationDescription, status);
      if (res.success && res.ticket) {
        setTickets(prev => [...prev, res.ticket!]);
        logCustomerActivity(customerId, effectiveUser?.fullName || 'Staff', 'Ticket Created', `Opened support ticket ${res.ticket.id}: "${conversationDescription}"`);
      }
      return res;
    });
  };

  // Event handler: Update ticket API proxy
  const handleUpdateTicket = async (id: string, updates: Partial<Ticket>) => {
    return wrapSave(async () => {
      const res = await updateTicket(
        config,
        id,
        updates.conversationDescription || '',
        updates.status || 'Open'
      );
      if (res.success) {
        setTickets(prev => {
          const currentTkt = prev.find(t => t.id === id);
          if (currentTkt) {
            const statusLabel = updates.status && updates.status !== currentTkt.status ? `Status Changed to ${updates.status}` : 'Ticket Updated';
            logCustomerActivity(currentTkt.customerId, effectiveUser?.fullName || 'Staff', statusLabel, `Updated ticket ${id}: ${updates.conversationDescription || currentTkt.conversationDescription}`);
          }
          return prev.map(t => t.id === id ? { ...t, ...updates } : t);
        });
      }
      return res;
    });
  };

  // Event handler: Delete ticket API proxy
  const handleDeleteTicket = async (id: string) => {
    return wrapSave(async () => {
      const res = await deleteTicket(config, id);
      if (res.success) {
        setTickets(prev => prev.filter(t => t.id !== id));
      }
      return res;
    });
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
    return wrapSave(async () => {
      const res = await createFollowUp(config, customerId, name, mobileNumber, followUpDate, followUpTime, notes, status);
      if (res.success && res.followUp) {
        setFollowUps(prev => [...prev, res.followUp!]);
        logCustomerActivity(customerId, effectiveUser?.fullName || 'Staff', 'Follow-up Added', `Scheduled follow-up ${res.followUp.id} for ${followUpDate} @ ${followUpTime}: "${notes}"`);
      }
      return res;
    });
  };

  // Event handler: Update/Complete follow-up API proxy
  const handleUpdateFollowUp = async (id: string, updates: Partial<FollowUp>) => {
    return wrapSave(async () => {
      const existing = followUps.find(f => f.id === id);
      if (!existing) return { success: false, error: 'Follow-up not found' };
      
      const date = updates.followUpDate ?? existing.followUpDate;
      const time = updates.followUpTime ?? existing.followUpTime;
      const notes = updates.notes ?? existing.notes;
      const status = updates.status ?? existing.status;

      const res = await updateFollowUp(config, id, date, time, notes, status);
      if (res.success) {
        setFollowUps(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
        const actionLabel = updates.status === 'Completed' ? 'Follow-up Completed' : 'Follow-up Updated';
        logCustomerActivity(existing.customerId, effectiveUser?.fullName || 'Staff', actionLabel, `Follow-up ${id} updated to ${status}`);
      }
      return res;
    });
  };

  // Event handler: Delete follow-up API proxy
  const handleDeleteFollowUp = async (id: string) => {
    return wrapSave(async () => {
      const res = await deleteFollowUp(config, id);
      if (res.success) {
        setFollowUps(prev => prev.filter(f => f.id !== id));
      }
      return res;
    });
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
    setCategoryFilter('');
    setSettingsSubView('main');
    setActiveTab(tab);
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCustomer(null);
    setPreselectedCustomerId('');
    setIsAddingCustomerInline(false);
    setCategoryFilter(category);
    setFilterSearchQuery('');
    setGenderFilter('');
    setActiveTab('customers');
  };

  const handleLogout = () => {
    clearSession();
    setSessionUser(null);
    setIsDeveloperMode(false);
    setActiveTab('dashboard');
  };

  if (AUTH_ENABLED && showSetupWizard) {
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

  if (AUTH_ENABLED && !sessionUser) {
    return (
      <LoginScreen 
        config={config} 
        onLoginSuccess={(user) => setSessionUser(user)} 
        onOpenSetupWizard={() => setShowSetupWizard(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-[#2c2c26] selection:bg-[#5A5A40]/20 selection:text-[#2c2c26] antialiased">
      
      {/* Pull to Refresh Shimmer Indicator */}
      {pullDistance > 0 && (
        <div 
          className="fixed left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-[#1a1a15] text-[#5A5A40] dark:text-[#ecece5] shadow-md border border-gray-100 dark:border-[#8a8a70]/10 rounded-full p-2.5 flex items-center justify-center transition-all duration-75"
          style={{ 
            top: `${Math.min(100, pullDistance + 10)}px`,
            opacity: pullDistance / 45,
            transform: `translate(-50%, -50%) rotate(${pullDistance * 6}deg) scale(${Math.min(1, pullDistance / 45)})`
          }}
        >
          <RefreshCw className={`w-4 h-4 ${syncStatus === 'SYNCING' ? 'animate-spin' : ''}`} />
        </div>
      )}
      
      {/* Top Main Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-[#5A5A40]/10 shadow-xs px-3.5 py-1.5 sm:py-2">
        <div className="max-w-5xl mx-auto flex flex-col gap-1.5 sm:gap-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between">
            <div 
              onClick={handleLogoTap} 
              className="flex items-center gap-2 cursor-pointer select-none active:opacity-80 transition-opacity"
              title="MoveAboard CRM Logo"
            >
              <div className="w-7 h-7 rounded-lg bg-primary-olive flex items-center justify-center text-white font-serif font-bold text-base shadow-sm shrink-0">
                M
              </div>
              <div>
                <h1 className="font-serif font-bold text-base text-primary-olive tracking-tight leading-tight">MoveAboard CRM</h1>
              </div>
            </div>
            
            {/* Mobile sync indicators & actions */}
            <div className="sm:hidden flex items-center gap-1.5">
              {globalSaveStatus !== 'IDLE' && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-100 shrink-0">
                  {globalSaveStatus === 'EDITING' && '✏'}
                  {globalSaveStatus === 'SAVING' && '💾'}
                  {globalSaveStatus === 'SAVED' && '✅'}
                  {globalSaveStatus === 'FAILED' && '❌'}
                </span>
              )}
              <button
                onClick={handleManualSync}
                disabled={isLoading}
                className="p-1 text-primary-olive/75 hover:bg-primary-olive/5 rounded-lg border border-primary-olive/10 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Controls and Sync States */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Global Auto-Save Status */}
            {globalSaveStatus !== 'IDLE' && (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200 shrink-0">
                {globalSaveStatus === 'EDITING' && <span>✏ EDITING...</span>}
                {globalSaveStatus === 'SAVING' && <span className="animate-pulse">💾 SAVING...</span>}
                {globalSaveStatus === 'SAVED' && <span className="text-emerald-600">✅ SAVED</span>}
                {globalSaveStatus === 'FAILED' && <span className="text-rose-600 animate-bounce">❌ SAVE FAILED</span>}
              </span>
            )}

            {/* Live Sheets Sync Indicator */}
            {(() => {
              if (!config.isLiveMode) {
                return (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border bg-amber-50 text-amber-800 border-amber-200 shrink-0">
                    <WifiOff className="w-3 h-3 text-amber-500" />
                    <span>DEMO MODE</span>
                  </span>
                );
              }

              const isCurrentlyRetrying = syncQueue.some(q => q.syncStatus === 'failed' && q.errorMessage?.includes('Retrying'));

              if (isCurrentlyRetrying) {
                return (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border bg-rose-100 text-rose-800 border-rose-200 animate-pulse shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping"></span>
                    <span>🔴 SYNC FAILED</span>
                  </span>
                );
              }

              switch (syncStatus) {
                case 'CONNECTING':
                case 'SYNCING':
                  return (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border bg-amber-100 text-amber-800 border-amber-200 shrink-0">
                      <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                      <span>🟡 CHECKING...</span>
                    </span>
                  );
                case 'OFFLINE':
                  return (
                    <span 
                      onClick={() => loadCRMData(config)}
                      title="Offline. Click to retry sync."
                      className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border bg-orange-100 text-orange-800 border-orange-200 cursor-pointer animate-pulse shrink-0"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping"></span>
                      <span>🟠 OFFLINE</span>
                    </span>
                  );
                case 'LIVE':
                default:
                  return (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-800 border-emerald-200 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping"></span>
                      <span>🟢 SYNCED</span>
                    </span>
                  );
              }
            })()}

            {/* Theme Selector (Light, Dark, System) */}
            <div className="flex items-center bg-gray-100 dark:bg-zinc-800 p-0.5 rounded-lg border border-gray-200 dark:border-zinc-700 select-none shrink-0" id="theme-selector">
              <button
                type="button"
                onClick={() => setTheme('light')}
                title="Light Mode"
                className={`p-1 rounded-md transition-all cursor-pointer flex items-center justify-center ${theme === 'light' ? 'bg-white text-amber-500 shadow-xs' : 'text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300'}`}
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                title="Dark Mode"
                className={`p-1 rounded-md transition-all cursor-pointer flex items-center justify-center ${theme === 'dark' ? 'bg-zinc-700 text-amber-400 shadow-xs' : 'text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300'}`}
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setTheme('system')}
                title="System Mode"
                className={`p-1 rounded-md transition-all cursor-pointer flex items-center justify-center ${theme === 'system' ? 'bg-white dark:bg-zinc-700 text-primary-olive dark:text-zinc-200 shadow-xs' : 'text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300'}`}
              >
                <Laptop className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Sync Center Trigger Button with Queue Size Badge */}
            <button
              onClick={() => setShowSyncCenter(true)}
              title="Open Sync Center"
              className="relative p-1 text-primary-olive/75 hover:text-primary-olive hover:bg-primary-olive/5 rounded-lg border border-primary-olive/10 active:scale-95 transition-all cursor-pointer h-[28px] flex items-center gap-1 px-2 shrink-0"
              id="header-sync-center-btn"
            >
              <RefreshCw className={`w-3 h-3 ${syncStatus === 'SYNCING' ? 'animate-spin' : ''}`} />
              <span className="text-[9px] font-bold">Sync Center</span>
              {syncQueue.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-white font-black text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center animate-pulse">
                  {syncQueue.length}
                </span>
              )}
            </button>

            {effectiveUser && (
              <>
                <div className="hidden sm:block h-4 w-[1px] bg-slate-200 shrink-0"></div>
                
                <div className="flex items-center gap-1.5">
                  <div className="hidden md:flex flex-col text-right shrink-0">
                    <span className="text-[10px] font-bold text-slate-800 leading-none">{effectiveUser.fullName}</span>
                    <span className="text-[8px] font-semibold text-emerald-700 uppercase tracking-wider mt-0.5 leading-none">{effectiveUser.role}</span>
                  </div>
                  {AUTH_ENABLED && (
                    <button
                      onClick={handleLogout}
                      className="px-2 py-0.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-red-100 transition-all cursor-pointer flex items-center gap-1 h-[28px] shrink-0"
                      title="Log Out"
                      id="header-logout-btn"
                    >
                      <LogOut className="w-3 h-3" />
                      <span className="text-[9px] font-semibold">Logout</span>
                    </button>
                  )}
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
              onArchiveCustomer={handleArchiveCustomer}
              onRestoreCustomer={handleRestoreCustomer}
              onPermanentDeleteCustomer={handlePermanentDeleteCustomer}
              onCreateTicket={handleCreateTicket}
              currentUser={effectiveUser}
            />
          </div>
        ) : (
          /* Primary Route Screens */
          <div className="space-y-5">
            
            {/* 1. Dashboard View */}
            {activeTab === 'dashboard' && (
              isCacheLoading ? (
                <DashboardSkeleton />
              ) : (
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
                  currentUser={effectiveUser}
                  onCategorySelect={handleCategorySelect}
                  newlyUpdatedIds={newlyUpdatedIds}
                />
              )
            )}

            {/* 2. Customers Directory View */}
            {activeTab === 'customers' && (
              <div className="space-y-5 max-w-4xl mx-auto">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="text-xl font-serif font-bold text-[#5A5A40] tracking-tight">Customer Profiles</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-[#5A5A40]/60">Manage customer profiles and lookup interaction history</p>
                      <span className="text-[10px] font-bold bg-[#5A5A40]/10 text-[#5A5A40] dark:bg-[#8a8a70]/20 dark:text-[#ecece5] px-2 py-0.5 rounded-full">
                        {customers.filter(c => !c.isArchived).length} active
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setIsAddingCustomerInline(!isAddingCustomerInline);
                      if (!isAddingCustomerInline) {
                        setCategoryFilter('');
                      }
                    }}
                    id="btn-toggle-add-customer"
                    className="inline-flex items-center gap-1.5 bg-[#5A5A40] hover:bg-[#4a4a34] dark:bg-[#5A5A40] dark:hover:bg-[#6c6c4e] text-white text-xs font-medium px-4 py-2.5 rounded-full cursor-pointer transition-all shadow-sm active:scale-95"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{isAddingCustomerInline ? 'SEARCH DIRECTORY' : '+ ADD CUSTOMER'}</span>
                  </button>
                </div>

                {isCacheLoading ? (
                  <CustomerDirectorySkeleton />
                ) : isAddingCustomerInline ? (
                  <div className="w-full max-w-[700px] md:w-[90%] mx-auto px-4 sm:px-5">
                    <CustomerForm
                      onAddCustomer={handleAddCustomer}
                      existingCustomers={customers}
                      onSelectCustomer={handleSelectCustomer}
                      currentUser={effectiveUser}
                      tickets={tickets}
                      followUps={followUps}
                      onArchiveCustomer={handleArchiveCustomer}
                      onUpdateCustomer={handleUpdateCustomer}
                      onCreateTicket={handleCreateTicket}
                      syncConfig={config}
                    />
                  </div>
                ) : (
                  <CustomerSearch
                    customers={customers}
                    tickets={tickets}
                    followUps={followUps}
                    onSelectCustomer={handleSelectCustomer}
                    onNavigateToAddCustomer={() => setIsAddingCustomerInline(true)}
                    searchQuery={filterSearchQuery}
                    onSearchQueryChange={setFilterSearchQuery}
                    categoryFilter={categoryFilter}
                    onCategoryFilterChange={setCategoryFilter}
                    genderFilter={genderFilter}
                    onGenderFilterChange={setGenderFilter}
                    onAddTicket={handleStartTicketForCustomer}
                    onArchiveCustomer={handleArchiveCustomer}
                    onRestoreCustomer={handleRestoreCustomer}
                    onPermanentDeleteCustomer={handlePermanentDeleteCustomer}
                    currentUser={effectiveUser}
                    isLoading={isLoading}
                    newlyUpdatedIds={newlyUpdatedIds}
                  />
                )}
              </div>
            )}

            {/* 3. Support Tickets Manager View */}
            {activeTab === 'tickets' && (
              <div className="max-w-4xl mx-auto">
                {isCacheLoading ? (
                  <TicketsManagerSkeleton />
                ) : (
                  <TicketsManager
                    customers={customers}
                    tickets={tickets}
                    followUps={followUps}
                    onAddCustomer={handleAddCustomer}
                    onCreateTicket={handleCreateTicket}
                    onUpdateTicket={handleUpdateTicket}
                    onDeleteTicket={handleDeleteTicket}
                    preselectedCustomerId={preselectedCustomerId}
                  />
                )}
              </div>
            )}

            {/* 4. Follow-up Tasks view */}
            {activeTab === 'followups' && (
              <div className="max-w-4xl mx-auto">
                {isCacheLoading ? (
                  <FollowUpsSkeleton />
                ) : (
                  <FollowUps
                    customers={customers}
                    followUps={followUps}
                    tickets={tickets}
                    onCreateFollowUp={handleCreateFollowUp}
                    onUpdateFollowUp={handleUpdateFollowUp}
                    onDeleteFollowUp={handleDeleteFollowUp}
                  />
                )}
              </div>
            )}

             {/* 5. Settings Configuration View & Nested Subviews */}
            {activeTab === 'settings' && (
              <div className={settingsSubView === 'duplicates' ? "max-w-5xl mx-auto" : "max-w-3xl mx-auto"}>
                {settingsSubView === 'duplicates' ? (
                  <DuplicateManagementCenter
                    customers={customers}
                    tickets={tickets}
                    followUps={followUps}
                    currentUser={effectiveUser}
                    config={config}
                    onRefreshData={handleManualSync}
                    onSelectCustomer={handleSelectCustomer}
                    onUpdateCustomer={handleUpdateCustomer}
                    onArchiveCustomer={handleArchiveCustomer}
                    onBack={() => setSettingsSubView('main')}
                  />
                ) : settingsSubView === 'archived' ? (
                  <React.Suspense fallback={
                    <div className="p-12 text-center bg-white dark:bg-[#1a1a15] rounded-2xl border border-gray-200 dark:border-[#8a8a70]/20 space-y-3">
                      <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                      <p className="text-xs text-amber-800 dark:text-amber-300 font-bold uppercase">Loading Archived Repository...</p>
                    </div>
                  }>
                    <ArchivedCustomersView
                      customers={customers}
                      tickets={tickets}
                      followUps={followUps}
                      currentUser={effectiveUser}
                      onSelectCustomer={handleSelectCustomer}
                      onRestoreCustomer={handleRestoreCustomer}
                      onPermanentDeleteCustomer={handlePermanentDeleteCustomer}
                      onBack={() => setSettingsSubView('main')}
                    />
                  </React.Suspense>
                ) : isCacheLoading ? (
                  <SettingsSkeleton />
                ) : (
                  <SettingsPanel
                    config={config}
                    onUpdateConfig={handleUpdateConfig}
                    onRefreshData={handleManualSync}
                    isLoading={isLoading}
                    isDeveloperMode={isDeveloperMode}
                    onOpenDebug={(effectiveUser?.role === 'Admin' && isDeveloperMode) ? () => setActiveTab('debug') : undefined}
                    currentUser={effectiveUser}
                    archivedCount={customers.filter(c => c.isArchived).length}
                    onOpenArchivedCustomers={() => setSettingsSubView('archived')}
                    onOpenArchivedAuditLogs={() => setSettingsSubView('archived')}
                    onOpenDuplicateManagement={() => setSettingsSubView('duplicates')}
                    lastSyncTime={lastSyncTime}
                    syncStatus={syncStatus}
                    isOnline={isOnline}
                  />
                )}
              </div>
            )}

            {/* 6. Admin User Management View */}
            {AUTH_ENABLED && activeTab === 'users' && effectiveUser?.role === 'Admin' && (
              <div className="max-w-4xl mx-auto">
                <UserManagement
                  config={config}
                  currentUser={effectiveUser}
                />
              </div>
            )}

            {/* 7. Admin Debug & Diagnostics View */}
            {activeTab === 'debug' && effectiveUser?.role === 'Admin' && isDeveloperMode && (
              <div className="max-w-4xl mx-auto">
                <AdminDebug
                  config={config}
                  currentUser={effectiveUser}
                  onBack={() => setActiveTab('settings')}
                />
              </div>
            )}

          </div>
        )}
      </main>

      {/* Sticky Bottom Tab Navigation Bar (Optimized for Phones) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#5A5A40]/10 shadow-lg px-2 z-40 py-1 sm:py-1.5 pb-[calc(5px+env(safe-area-inset-bottom,0px))] md:pb-1.5">
        <div className={`max-w-lg mx-auto grid ${(AUTH_ENABLED && effectiveUser?.role === 'Admin') ? 'grid-cols-6' : 'grid-cols-5'} gap-0.5`}>
          
          {/* Tab 1: Dashboard */}
          <button
            onClick={() => handleTabNavigation('dashboard')}
            id="tab-btn-dashboard"
            className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'dashboard' && !selectedCustomer
                ? 'text-[#5A5A40] bg-[#5A5A40]/10 font-bold'
                : 'text-[#2c2c26]/50 hover:text-[#2c2c26] hover:bg-[#5A5A40]/5'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 mb-0.5" />
            <span className="text-[9px] tracking-tight">Dashboard</span>
          </button>

          {/* Tab 2: Customers */}
          <button
            onClick={() => handleTabNavigation('customers')}
            id="tab-btn-customers"
            className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'customers' || selectedCustomer
                ? 'text-[#5A5A40] bg-[#5A5A40]/10 font-bold'
                : 'text-[#2c2c26]/50 hover:text-[#2c2c26] hover:bg-[#5A5A40]/5'
            }`}
          >
            <Users className="w-4 h-4 mb-0.5" />
            <span className="text-[9px] tracking-tight">Customers</span>
          </button>

          {/* Tab 3: Tickets */}
          <button
            onClick={() => handleTabNavigation('tickets')}
            id="tab-btn-tickets"
            className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'tickets'
                ? 'text-[#5A5A40] bg-[#5A5A40]/10 font-bold'
                : 'text-[#2c2c26]/50 hover:text-[#2c2c26] hover:bg-[#5A5A40]/5'
            }`}
          >
            <TicketIcon className="w-4 h-4 mb-0.5" />
            <span className="text-[9px] tracking-tight">Tickets</span>
          </button>

          {/* Tab 4: Follow-ups */}
          <button
            onClick={() => handleTabNavigation('followups')}
            id="tab-btn-followups"
            className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'followups'
                ? 'text-[#5A5A40] bg-[#5A5A40]/10 font-bold'
                : 'text-[#2c2c26]/50 hover:text-[#2c2c26] hover:bg-[#5A5A40]/5'
            }`}
          >
            <Calendar className="w-4 h-4 mb-0.5" />
            <span className="text-[9px] tracking-tight">Follow-ups</span>
          </button>

          {/* Tab 5: Users (Admin Only) */}
          {AUTH_ENABLED && effectiveUser?.role === 'Admin' && (
            <button
              onClick={() => handleTabNavigation('users')}
              id="tab-btn-users"
              className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'users'
                  ? 'text-emerald-700 bg-emerald-50 font-bold border border-emerald-100'
                  : 'text-[#2c2c26]/50 hover:text-[#2c2c26] hover:bg-[#5A5A40]/5'
              }`}
            >
              <UserCheck className="w-4 h-4 mb-0.5" />
              <span className="text-[9px] tracking-tight">Users</span>
            </button>
          )}

          {/* Tab 5/6: Settings */}
          <button
            onClick={() => handleTabNavigation('settings')}
            id="tab-btn-settings"
            className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'text-[#5A5A40] bg-[#5A5A40]/10 font-bold'
                : 'text-[#2c2c26]/50 hover:text-[#2c2c26] hover:bg-[#5A5A40]/5'
            }`}
          >
            <Settings className="w-4 h-4 mb-0.5" />
            <span className="text-[9px] tracking-tight">Settings</span>
          </button>

        </div>
      </nav>

      {/* Floating Toast Notifications */}
      <div className="fixed bottom-24 right-4 sm:right-6 max-w-sm w-full sm:w-80 flex flex-col gap-2 z-50 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
              className="pointer-events-auto w-full bg-slate-900/95 dark:bg-black/95 text-white py-3 px-4 rounded-xl shadow-xl flex items-center justify-between border border-slate-800 backdrop-blur-xs text-xs font-semibold"
            >
              <span>{toast.message}</span>
              <button 
                type="button" 
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                className="text-white/60 hover:text-white ml-3 transition-colors text-xs font-bold px-1.5 py-0.5 rounded-md hover:bg-white/10"
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Sync Center Sidebar Panel */}
      <SyncCenter
        isOpen={showSyncCenter}
        onClose={() => setShowSyncCenter(false)}
        syncQueue={syncQueue}
        isOnline={isOnline}
        syncStatus={syncStatus}
        lastSyncTime={lastSyncTime}
        syncHistory={syncHistory}
        config={config}
        isDeveloperMode={isDeveloperMode}
        onOpenLogs={() => {
          setShowSyncCenter(false);
          setActiveTab('debug');
        }}
      />
    </div>
  );
}
