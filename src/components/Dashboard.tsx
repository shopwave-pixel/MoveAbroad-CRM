import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Customer, Ticket, FollowUp, User } from '../types';
import SmartContactActions from './SmartContactActions';
import InlineCopy from './InlineCopy';
import { getLoggedActivities } from '../utils/activityLogger';
import { 
  Users, 
  Ticket as TicketIcon, 
  Clock, 
  Calendar, 
  UserPlus, 
  Plus, 
  Search, 
  ChevronRight, 
  AlertCircle,
  Inbox,
  AlertTriangle,
  CheckCircle2,
  Settings,
  ArrowRight,
  Sparkles,
  Wifi,
  Phone,
  MessageSquare,
  ClipboardList
} from 'lucide-react';

interface DashboardProps {
  customers: Customer[];
  tickets: Ticket[];
  followUps: FollowUp[];
  onNavigate: (tab: 'dashboard' | 'customers' | 'tickets' | 'followups' | 'settings') => void;
  onSelectCustomer: (customer: Customer) => void;
  onQuickAddTicket: () => void;
  onQuickAddCustomer: () => void;
  currentUser?: User | null;
  onCategorySelect?: (category: string) => void;
  newlyUpdatedIds?: Set<string>;
}

const Dashboard = React.memo(function Dashboard({
  customers,
  tickets,
  followUps,
  onNavigate,
  onSelectCustomer,
  onQuickAddTicket,
  onQuickAddCustomer,
  currentUser,
  onCategorySelect,
  newlyUpdatedIds
}: DashboardProps) {
  
  const todayStr = new Date().toISOString().split('T')[0];

  const [activityRefreshKey, setActivityRefreshKey] = useState(0);

  useEffect(() => {
    const handleActivity = () => {
      setActivityRefreshKey(prev => prev + 1);
    };
    window.addEventListener('crm-activity-logged', handleActivity);
    return () => window.removeEventListener('crm-activity-logged', handleActivity);
  }, []);

  // Search Bar States
  const [searchValue, setSearchValue] = useState('');
  const [debouncedValue, setDebouncedValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(searchValue);
    }, 200);
    return () => clearTimeout(handler);
  }, [searchValue]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCustomersSearch = useMemo(() => {
    if (!debouncedValue.trim()) return [];
    const lower = debouncedValue.toLowerCase();
    return customers.filter(c => 
      c.name.toLowerCase().includes(lower) ||
      c.mobileNumber.toLowerCase().includes(lower) ||
      c.id.toLowerCase().includes(lower)
    );
  }, [debouncedValue, customers]);

  // Statistics Calculations
  const totalCustomersCount = customers.length;
  const openTicketsCount = tickets.filter(t => t.status === 'Open').length;
  const closedTicketsCount = tickets.filter(t => t.status === 'Closed').length;
  const pendingFollowUpsCount = followUps.filter(f => f.status === 'Pending').length;
  const todaysFollowUpsCount = followUps.filter(f => f.status === 'Pending' && f.followUpDate === todayStr).length;

  // Dynamic calculation for Category statistics of ACTIVE customers (at least one non-closed ticket)
  const categoryActiveCounts = useMemo(() => {
    const activeCustomerIds = new Set<string>();
    tickets.forEach(t => {
      if (t.status !== 'Closed') {
        activeCustomerIds.add(t.customerId);
      }
    });

    const counts: Record<string, number> = {
      'AGENT': 0,
      'SUPERVISOR (PRODUCTION)': 0,
      'SUPERVISOR (QUALITY)': 0,
      'IRON MAN': 0,
      'OPERATOR': 0,
      'CHECKER': 0,
      'DELICATOR': 0
    };

    customers.forEach(c => {
      if (c.customerCategory) {
        const catUpper = c.customerCategory.toUpperCase();
        if (catUpper in counts && activeCustomerIds.has(c.id)) {
          counts[catUpper]++;
        }
      }
    });

    return counts;
  }, [customers, tickets]);

  // Let's sort activities and events for the Vertical Timeline
  const timelineEvents = useMemo(() => {
    const events: {
      id: string;
      type: 'customer' | 'ticket' | 'followup' | 'closed-ticket' | 'call' | 'whatsapp' | 'imo' | 'updated' | 'status-changed';
      title: string;
      description: string;
      time: string;
      rawDate: string;
      meta?: string;
    }[] = [];

    // 1. New customer events
    customers.forEach(c => {
      events.push({
        id: `c-${c.id}`,
        type: 'customer',
        title: 'New Customer Registered',
        description: `${c.name} was added to the directory`,
        time: new Date(c.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        rawDate: c.createdAt,
        meta: `ID: ${c.id}`
      });
    });

    // 2. Ticket events
    tickets.forEach(t => {
      events.push({
        id: `t-${t.id}`,
        type: t.status === 'Open' ? 'ticket' : 'closed-ticket',
        title: t.status === 'Open' ? 'Support Ticket Opened' : 'Support Ticket Resolved',
        description: `${t.name} - ${t.conversationDescription}`,
        time: new Date(t.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        rawDate: t.createdAt,
        meta: `Ticket ID: ${t.id}`
      });
    });

    // 3. Follow up events
    followUps.forEach(f => {
      events.push({
        id: `f-${f.id}`,
        type: 'followup',
        title: f.status === 'Pending' ? 'Follow-up Scheduled' : 'Follow-up Completed',
        description: `Callback request for ${f.name} - ${f.notes}`,
        time: `${new Date(f.followUpDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} @ ${f.followUpTime}`,
        rawDate: f.createdAt || f.followUpDate,
        meta: `Ref: ${f.id}`
      });
    });

    // 4. Custom Logged Activities
    try {
      const logged = getLoggedActivities();
      logged.forEach(act => {
        const cust = customers.find(c => c.id === act.customerId);
        const name = cust ? cust.name : 'Unknown';
        
        let mappedType: 'customer' | 'ticket' | 'followup' | 'closed-ticket' | 'call' | 'whatsapp' | 'imo' | 'updated' | 'status-changed' = 'call';
        let title = 'Activity Logged';

        if (act.type === 'CREATED') {
          mappedType = 'customer';
          title = `Profile Created`;
        } else if (act.type === 'TICKET_CREATED') {
          mappedType = 'ticket';
          title = `Ticket Filed`;
        } else if (act.type === 'TICKET_CLOSED') {
          mappedType = 'closed-ticket';
          title = `Ticket Resolved`;
        } else if (act.type === 'FOLLOWUP_ADDED') {
          mappedType = 'followup';
          title = `Followup Added`;
        } else if (act.type === 'FOLLOWUP_COMPLETED') {
          mappedType = 'followup';
          title = `Followup Finished`;
        } else if (act.type === 'CALL_LOGGED') {
          mappedType = 'call';
          title = `Voice Call`;
        } else if (act.type === 'WHATSAPP_CONTACTED') {
          mappedType = 'whatsapp';
          title = `WhatsApp Contact`;
        } else if (act.type === 'IMO_CONTACTED') {
          mappedType = 'imo';
          title = `IMO Contact`;
        } else if (act.type === 'UPDATED') {
          mappedType = 'updated';
          title = `Profile Updated`;
        } else if (act.type === 'STATUS_CHANGED') {
          mappedType = 'status-changed';
          title = `Status Changed`;
        }

        events.push({
          id: act.id,
          type: mappedType,
          title: `${title} - ${name}`,
          description: act.activity,
          time: new Date(act.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          rawDate: act.timestamp,
          meta: `Cust ID: ${act.customerId}`
        });
      });
    } catch (e) {
      console.error('Error listing custom logged activities in dashboard:', e);
    }

    // Sort newest first
    return events
      .sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime())
      .slice(0, 2);
  }, [customers, tickets, followUps, activityRefreshKey]);

  // Recent data sets (sorted newest first)
  const recentCustomers = useMemo(() => {
    return [...customers]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 4);
  }, [customers]);

  const recentTickets = useMemo(() => {
    return [...tickets]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 4);
  }, [tickets]);

  const upcomingFollowUps = useMemo(() => {
    return [...followUps]
      .filter(f => f.status === 'Pending')
      .sort((a, b) => {
        const dateA = `${a.followUpDate}T${a.followUpTime}`;
        const dateB = `${b.followUpDate}T${b.followUpTime}`;
        return new Date(dateA).getTime() - new Date(dateB).getTime();
      })
      .slice(0, 4);
  }, [followUps]);

  const getRelativeDateLabel = (dateStr: string) => {
    if (dateStr === todayStr) return 'Today';
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    if (dateStr === tomorrowStr) return 'Tomorrow';
    
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const isFollowUpOverdue = (f: FollowUp) => {
    return f.status === 'Pending' && f.followUpDate < todayStr;
  };

  return (
    <div className="space-y-4 pb-6" id="dashboard-view-panel">
      
      {/* 1. Large Sticky Search Bar with Orange Accent & Soft Shadow */}
      <div 
        ref={searchRef}
        className="sticky top-[52px] z-20 bg-[#F8FAFC]/90 backdrop-blur-md py-1.5"
        id="sticky-dashboard-search-bar"
      >
        <div className="relative max-w-4xl mx-auto rounded-full bg-white border border-[#E5E7EB] shadow-sm hover:shadow-md focus-within:ring-2 focus-within:ring-[#F59E0B]/30 focus-within:border-[#F59E0B] transition-all overflow-visible">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-[#F59E0B]" />
          </div>
          <input
            type="text"
            className="w-full pl-10 pr-10 py-2 sm:py-2.5 text-[13px] bg-transparent border-none focus:outline-none text-[#1F2937] dark:text-[#f5f5f0] placeholder-gray-400 font-medium min-h-[44px]"
            placeholder="Search customers by name, mobile suffix, customer ID..."
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
          />
          {searchValue && (
            <button
              onClick={() => {
                setSearchValue('');
                setIsOpen(false);
              }}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-[#EF4444] transition-colors"
            >
              <span className="text-base font-bold">&times;</span>
            </button>
          )}

          {/* Autocomplete Dropdown */}
          {isOpen && searchValue.trim() !== '' && (
            <div className="absolute left-0 right-0 z-30 mt-1 max-h-60 overflow-y-auto bg-white border border-[#E5E7EB] rounded-xl shadow-lg divide-y divide-[#E5E7EB] animate-fade-in">
              {filteredCustomersSearch.length > 0 ? (
                filteredCustomersSearch.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      onSelectCustomer(c);
                      setIsOpen(false);
                    }}
                    className="p-3 hover:bg-[#F9FAFB] cursor-pointer transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#6B705C]/10 text-[#6B705C] flex items-center justify-center text-[12px] font-bold">
                        {c.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="text-[13px] font-bold text-[#1F2937] dark:text-[#f5f5f0] uppercase">{c.name}</span>
                        <p className="text-[11px] text-gray-500 font-mono mt-0">{c.id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-[12px] text-[#6B7280] dark:text-[#959585] font-semibold">
                      <span className="flex items-center gap-1">
                        <span>📱</span>
                        <span>{c.mobileNumber}</span>
                      </span>
                      <span className="text-[#3B82F6] dark:text-[#60A5FA] hover:underline font-bold flex items-center gap-0.5">
                        OPEN PROFILE <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500 text-xs uppercase font-medium">
                  No customers found matching "{searchValue}"
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. Top Hero Card: Olive Green to Green Gradient, Rounded 16px */}
      <div 
        className="relative overflow-hidden bg-gradient-to-br from-[#6B705C] to-[#2E4F32] rounded-[16px] p-4 sm:p-5 text-white shadow-md shadow-[#6B705C]/10"
        id="dashboard-top-hero-card"
      >
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white/10 backdrop-blur-md rounded-full border border-white/10 text-[11px] font-bold tracking-widest uppercase">
              <Sparkles className="w-3 h-3 text-[#F59E0B]" />
              <span>ENTERPRISE SYSTEM ACTIVE</span>
            </div>
            
            <h2 className="text-[18px] sm:text-[22px] font-serif font-bold text-white tracking-tight uppercase leading-tight mt-1">
              WELCOME BACK
            </h2>
            
            <p className="text-[12px] sm:text-[13.5px] text-white/85 font-normal max-w-xl leading-snug uppercase">
              TODAY IS {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}. YOU HAVE <span className="font-bold text-[#F59E0B]">{todaysFollowUpsCount} PENDING FOLLOW-UPS</span> FOR TODAY.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Today's Summary statistics badge list inside hero */}
            <div className="bg-black/15 backdrop-blur-sm rounded-lg p-2 border border-white/5 flex items-center gap-3 text-center">
              <div>
                <span className="block text-[15px] sm:text-[17px] font-bold text-white font-serif leading-none">{totalCustomersCount}</span>
                <span className="text-[10px] text-white/70 font-semibold tracking-wider">CUSTOMERS</span>
              </div>
              <div className="w-[1px] h-4 bg-white/10" />
              <div>
                <span className="block text-[15px] sm:text-[17px] font-bold text-[#3B82F6] font-serif leading-none">{openTicketsCount}</span>
                <span className="text-[10px] text-white/70 font-semibold tracking-wider">OPEN TKTS</span>
              </div>
              <div className="w-[1px] h-4 bg-white/10" />
              <div>
                <span className="block text-[15px] sm:text-[17px] font-bold text-[#F59E0B] font-serif leading-none">{todaysFollowUpsCount}</span>
                <span className="text-[10px] text-white/70 font-semibold tracking-wider">TODAY'S FUP</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Colorful KPI Cards Section */}
      <div className="space-y-2.5" id="colorful-kpi-cards-section">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full bg-[#6B705C]" />
          <h3 className="font-serif font-bold text-[#1F2937] dark:text-[#f5f5f0] text-[13px] tracking-tight uppercase">
            LIVE PERFORMANCE TRACKERS
          </h3>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-2.5" id="stats-widgets-grid">
          
          {/* Card 1: Customers (Green Gradient) */}
          <div 
            onClick={() => onNavigate('customers')}
            className="group relative overflow-hidden bg-gradient-to-br from-[#22C55E]/10 to-[#15803D]/5 border-t-4 border-t-[#22C55E] p-3 rounded-xl border border-[#E5E7EB] text-left shadow-xs hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-[#15803D] uppercase tracking-wider">Customers</span>
              <div className="p-1 bg-[#22C55E]/20 text-[#22C55E] rounded-lg">
                <Users className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-[24px] sm:text-[28px] font-serif font-bold text-[#1F2937] leading-none">{totalCustomersCount}</p>
            <p className="text-[11px] text-[#6B7280] font-semibold mt-0.5 uppercase">Total Directory</p>
          </div>

          {/* Card 2: Open Tickets (Blue Gradient) */}
          <div 
            onClick={() => onNavigate('tickets')}
            className="group relative overflow-hidden bg-gradient-to-br from-[#3B82F6]/10 to-[#1D4ED8]/5 border-t-4 border-t-[#3B82F6] p-3 rounded-xl border border-[#E5E7EB] text-left shadow-xs hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-[#1D4ED8] uppercase tracking-wider">Open Tickets</span>
              <div className="p-1 bg-[#3B82F6]/20 text-[#3B82F6] rounded-lg">
                <TicketIcon className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-[24px] sm:text-[28px] font-serif font-bold text-[#1F2937] leading-none">{openTicketsCount}</p>
            <p className="text-[11px] text-[#6B7280] font-semibold mt-0.5 uppercase">Awaiting Action</p>
          </div>

          {/* Card 3: Closed Tickets (Red Gradient) */}
          <div 
            onClick={() => onNavigate('tickets')}
            className="group relative overflow-hidden bg-gradient-to-br from-[#EF4444]/10 to-[#B91C1C]/5 border-t-4 border-t-[#EF4444] p-3 rounded-xl border border-[#E5E7EB] text-left shadow-xs hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-[#B91C1C] uppercase tracking-wider">Closed Tickets</span>
              <div className="p-1 bg-[#EF4444]/20 text-[#EF4444] rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-[24px] sm:text-[28px] font-serif font-bold text-[#1F2937] leading-none">{closedTicketsCount}</p>
            <p className="text-[11px] text-[#6B7280] font-semibold mt-0.5 uppercase">Completed Cases</p>
          </div>

          {/* Card 4: Follow Ups (Purple Gradient) */}
          <div 
            onClick={() => onNavigate('followups')}
            className="group relative overflow-hidden bg-gradient-to-br from-[#8B5CF6]/10 to-[#6D28D9]/5 border-t-4 border-t-[#8B5CF6] p-3 rounded-xl border border-[#E5E7EB] text-left shadow-xs hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-[#6D28D9] uppercase tracking-wider">Follow Ups</span>
              <div className="p-1 bg-[#8B5CF6]/20 text-[#8B5CF6] rounded-lg">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-[24px] sm:text-[28px] font-serif font-bold text-[#1F2937] leading-none">{pendingFollowUpsCount}</p>
            <p className="text-[11px] text-[#6B7280] font-semibold mt-0.5 uppercase">Reminders Pending</p>
          </div>

          {/* Card 5: Today (Orange Gradient) */}
          <div 
            onClick={() => onNavigate('followups')}
            className="group relative overflow-hidden bg-gradient-to-br from-[#F59E0B]/10 to-[#C2410C]/5 border-t-4 border-t-[#F59E0B] p-3 rounded-xl border border-[#E5E7EB] text-left shadow-xs hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-[#C2410C] uppercase tracking-wider">Today</span>
              <div className="p-1 bg-[#F59E0B]/20 text-[#F59E0B] rounded-lg">
                <Calendar className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-[24px] sm:text-[28px] font-serif font-bold text-[#1F2937] leading-none">{todaysFollowUpsCount}</p>
            <p className="text-[13px] text-[#6B7280] font-semibold mt-1 uppercase">Callback Reminders</p>
          </div>

          {/* Card 6: Live Sync (Emerald Gradient) */}
          <div 
            onClick={() => onNavigate('settings')}
            className="group relative overflow-hidden bg-gradient-to-br from-[#06B6D4]/10 to-[#0369A1]/5 border-t-4 border-t-[#06B6D4] p-3 rounded-xl border border-[#E5E7EB] text-left shadow-xs hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-[#0369A1] uppercase tracking-wider">Database</span>
              <div className="p-1 bg-[#06B6D4]/20 text-[#06B6D4] rounded-lg">
                <Wifi className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-[24px] sm:text-[28px] font-serif font-bold text-[#1F2937] leading-none">LIVE</p>
            <p className="text-[11px] text-[#6B7280] font-semibold mt-0.5 uppercase">Status Verified</p>
          </div>

        </div>
      </div>



      {/* 4. Quick Actions (Replace plain white with colorful action cards) */}
      <div className="space-y-2.5" id="quick-actions-section">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full bg-[#3B82F6]" />
          <h3 className="font-serif font-bold text-[#1F2937] dark:text-[#f5f5f0] text-[13px] tracking-tight uppercase">
            OPERATIONAL LAUNCHPAD
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          
          {/* Action 1: Add Customer (Green) */}
          <button
            onClick={onQuickAddCustomer}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-gradient-to-br from-[#22C55E] to-[#15803D] text-white text-center shadow-md shadow-[#22C55E]/10 hover:scale-105 active:scale-[0.98] transition-all duration-200 cursor-pointer group min-h-[96px]"
          >
            <UserPlus className="w-6 h-6 text-white mb-1.5 transition-transform group-hover:rotate-12 duration-200 shrink-0" />
            <span className="text-[13px] font-bold uppercase tracking-wider">Add Customer</span>
            <span className="text-[11px] text-white/80 font-normal mt-0.5 uppercase shrink-0">Register profile</span>
          </button>

          {/* Action 2: Create Ticket (Blue) */}
          <button
            onClick={onQuickAddTicket}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#1D4ED8] text-white text-center shadow-md shadow-[#3B82F6]/10 hover:scale-105 active:scale-[0.98] transition-all duration-200 cursor-pointer group min-h-[96px]"
          >
            <Plus className="w-6 h-6 text-white mb-1.5 transition-transform group-hover:rotate-90 duration-200 shrink-0" />
            <span className="text-[13px] font-bold uppercase tracking-wider">Create Ticket</span>
            <span className="text-[11px] text-white/80 font-normal mt-0.5 uppercase shrink-0">File assistance</span>
          </button>

          {/* Action 3: Search Customer (Purple) */}
          <button
            onClick={() => onNavigate('customers')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] text-white text-center shadow-md shadow-[#8B5CF6]/10 hover:scale-105 active:scale-[0.98] transition-all duration-200 cursor-pointer group min-h-[96px]"
          >
            <Search className="w-6 h-6 text-white mb-1.5 transition-transform group-hover:translate-x-0.5 duration-200 shrink-0" />
            <span className="text-[13px] font-bold uppercase tracking-wider">Search Customer</span>
            <span className="text-[11px] text-white/80 font-normal mt-0.5 uppercase shrink-0">Lookup database</span>
          </button>

          {/* Action 4: Follow Ups (Orange) */}
          <button
            onClick={() => onNavigate('followups')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#D97706] text-white text-center shadow-md shadow-[#F59E0B]/10 hover:scale-105 active:scale-[0.98] transition-all duration-200 cursor-pointer group min-h-[96px]"
          >
            <Clock className="w-6 h-6 text-white mb-1.5 transition-transform group-hover:scale-110 duration-200 shrink-0" />
            <span className="text-[13px] font-bold uppercase tracking-wider">Follow Ups</span>
            <span className="text-[11px] text-white/80 font-normal mt-0.5 uppercase shrink-0">Call logs</span>
          </button>

          {/* Action 5: Settings (Slate) */}
          <button
            onClick={() => onNavigate('settings')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-gradient-to-br from-[#475569] to-[#334155] text-white text-center shadow-md shadow-[#475569]/10 hover:scale-105 active:scale-[0.98] transition-all duration-200 cursor-pointer group min-h-[96px] col-span-2 sm:col-span-1"
          >
            <Settings className="w-6 h-6 text-white mb-1.5 transition-transform group-hover:rotate-45 duration-200 shrink-0" />
            <span className="text-[13px] font-bold uppercase tracking-wider">Settings</span>
            <span className="text-[11px] text-white/80 font-normal mt-0.5 uppercase shrink-0">Configurations</span>
          </button>

        </div>
      </div>

      {/* 5. Split Bento Layout: Activities & Unified Vertical Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4" id="dashboard-recent-activity-section">
        
        {/* Left Column (SPAN 7): Reminders and Registered Customers */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Upcoming Callbacks / Follow ups */}
          <div 
            className="bg-white rounded-xl border border-[#E5E7EB] border-t-4 border-t-[#8B5CF6] p-3.5 sm:p-4 space-y-3 shadow-xs"
            id="dashboard-upcoming-followups"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-3.5 bg-[#8B5CF6] rounded" />
                <h3 className="font-serif font-bold text-[#1F2937] dark:text-[#f5f5f0] text-[13px] uppercase tracking-tight">
                  UPCOMING CALLBACK REMINDERS
                </h3>
              </div>
              <button 
                onClick={() => onNavigate('followups')}
                className="text-[11px] font-bold text-[#6B705C] dark:text-[#A3A895] hover:underline uppercase cursor-pointer"
              >
                View All
              </button>
            </div>

            <div className="space-y-2">
              {upcomingFollowUps.length > 0 ? (
                upcomingFollowUps.map(f => {
                  const overdue = isFollowUpOverdue(f);
                  const customer = customers.find(c => c.id === f.customerId);
                  return (
                    <div 
                      key={f.id}
                      className="p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB] hover:border-[#8B5CF6]/40 hover:-translate-y-0.5 transition-all duration-150 flex flex-col gap-1.5"
                    >
                      <div className="flex items-start justify-between gap-2.5 w-full">
                        <div className="space-y-0.5">
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="font-bold text-[#1F2937] dark:text-[#f5f5f0] text-[13px] uppercase">{f.name}</span>
                            <InlineCopy type="name" value={f.name} className="min-w-[18px] min-h-[18px] p-0" />
                            {overdue ? (
                              <span className="text-[11px] px-1.5 py-0.1 rounded-full bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] font-bold uppercase tracking-wider">
                                OVERDUE ({getRelativeDateLabel(f.followUpDate)})
                              </span>
                            ) : (
                              <span className="text-[11px] px-1.5 py-0.1 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#F59E0B] font-bold uppercase tracking-wider">
                                {getRelativeDateLabel(f.followUpDate)} @ {f.followUpTime}
                              </span>
                            )}
                          </div>
                          <p className="text-[12px] text-[#6B7280] dark:text-[#959585] italic leading-relaxed">
                            "{f.notes}"
                          </p>
                        </div>
                      </div>
                      {customer && (
                        <div className="mt-1 pt-1 border-t border-gray-200/60 flex justify-end">
                          <SmartContactActions
                            customerName={customer.name}
                            mobileNumber={customer.mobileNumber}
                            whatsAppNumber={customer.whatsAppNumber}
                            imoNumber={customer.imoNumber}
                            customerId={customer.id}
                            additionalNumbers={customer.additionalNumbers}
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-6 text-center text-gray-400 text-[11px] flex flex-col items-center justify-center gap-1.5">
                  <Inbox className="w-6 h-6 opacity-30 text-gray-500" />
                  <span className="font-bold uppercase tracking-wide">NO PENDING CALLBACK REMINDERS</span>
                </div>
              )}
            </div>
          </div>

          {/* Premium Recent Registered Customers */}
          <div 
            className="bg-white rounded-xl border border-[#E5E7EB] border-t-4 border-t-[#22C55E] p-3.5 sm:p-4 space-y-3 shadow-xs"
            id="dashboard-recent-customers"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-3.5 bg-[#22C55E] rounded" />
                <h3 className="font-serif font-bold text-[#1F2937] dark:text-[#f5f5f0] text-[13px] uppercase tracking-tight">
                  RECENTLY REGISTERED CLIENTS
                </h3>
              </div>
              <button 
                onClick={() => onNavigate('customers')}
                className="text-[11px] font-bold text-[#6B705C] dark:text-[#A3A895] hover:underline uppercase cursor-pointer"
              >
                View All
              </button>
            </div>

            <div className="space-y-2">
              {recentCustomers.length > 0 ? (
                recentCustomers.map(c => {
                  const initials = c.name
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();

                  const custTickets = tickets.filter(t => t.customerId === c.id);
                  const custFollowups = followUps.filter(f => f.customerId === f.customerId);
                  const isHighlighted = newlyUpdatedIds?.has(c.id);

                  return (
                    <div
                      key={c.id}
                      className={`p-2.5 rounded-lg border transition-all duration-500 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isHighlighted ? 'bg-emerald-50/20 dark:bg-emerald-950/25 border-emerald-500 ring-2 ring-emerald-500/50 animate-pulse scale-[1.01] shadow-md' : 'bg-[#F9FAFB] dark:bg-[#1C1C14] border-[#E5E7EB] hover:border-[#22C55E]/40 hover:-translate-y-0.5'}`}
                    >
                      <div 
                        onClick={() => onSelectCustomer(c)}
                        className="flex items-center gap-2.5 cursor-pointer flex-1"
                      >
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6B705C] to-[#2E4F32] text-white text-[12px] font-bold flex items-center justify-center shrink-0 shadow-xs uppercase">
                          {initials}
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                            <p className="text-[13px] font-bold text-[#1F2937] dark:text-[#f5f5f0] hover:underline uppercase leading-tight">{c.name}</p>
                            <InlineCopy type="name" value={c.name} className="min-w-[16px] min-h-[16px] p-0" />
                            <span className="font-mono text-[11px] font-bold text-gray-500 bg-gray-100 dark:bg-zinc-800 border border-gray-200 px-1 py-0.1 rounded">
                              {c.id}
                            </span>
                            <InlineCopy type="customerId" value={c.id} className="min-w-[16px] min-h-[16px] p-0" />
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-gray-500 dark:text-[#959585] font-semibold">
                            <span className="flex items-center gap-0.5">
                              <span>📱</span>
                              <span>{c.mobileNumber}</span>
                              <InlineCopy type="mobile" value={c.mobileNumber} className="min-w-[16px] min-h-[16px] p-0" />
                            </span>
                            <span className="inline-flex items-center gap-0.5 px-1 py-0.1 bg-[#3B82F6]/10 text-[#3B82F6] rounded text-[11px] font-bold uppercase">
                              TKT: {custTickets.length}
                            </span>
                            <span className="inline-flex items-center gap-0.5 px-1 py-0.1 bg-[#8B5CF6]/10 text-[#8B5CF6] rounded text-[11px] font-bold uppercase">
                              FUP: {custFollowups.length}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 justify-end">
                        <SmartContactActions
                          customerName={c.name}
                          mobileNumber={c.mobileNumber}
                          whatsAppNumber={c.whatsAppNumber}
                          imoNumber={c.imoNumber}
                          customerId={c.id}
                          additionalNumbers={c.additionalNumbers}
                        />
                        <button 
                          onClick={() => onSelectCustomer(c)}
                          className="text-[#6B705C] hover:bg-[#6B705C]/10 p-1.5 rounded-full cursor-pointer transition-colors shrink-0"
                          title="View Profile Details"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-gray-400 text-xs flex flex-col items-center justify-center gap-2">
                  <Inbox className="w-8 h-8 opacity-30 text-gray-500" />
                  <span className="font-bold uppercase tracking-wide">NO RECENTLY REGISTERED CLIENTS</span>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column (SPAN 5): Unified Vertical Timeline */}
        <div className="lg:col-span-5 space-y-4">
          
          <div 
            className="bg-white rounded-xl border border-[#E5E7EB] border-t-4 border-t-[#06B6D4] p-3.5 sm:p-4 space-y-3 shadow-xs"
            id="dashboard-activity-timeline"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-3.5 bg-[#06B6D4] rounded" />
                <h3 className="font-serif font-bold text-[#1F2937] dark:text-[#f5f5f0] text-[13px] uppercase tracking-tight">
                  LIVE ACTIVITY FEED TIMELINE
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/30 rounded-full animate-pulse uppercase">
                REAL-TIME
              </span>
            </div>

            <div className="relative pl-5 border-l border-gray-200 dark:border-zinc-800 space-y-4 py-1" id="vertical-timeline-container">
              {timelineEvents.length > 0 ? (
                timelineEvents.map((evt) => {
                  
                  // Pick colored dot based on event type
                  let dotColor = 'bg-gray-400';
                  let iconTag = '📝';
                  if (evt.type === 'customer') {
                    dotColor = 'bg-[#22C55E] ring-4 ring-[#22C55E]/20';
                    iconTag = '👤';
                  } else if (evt.type === 'ticket') {
                    dotColor = 'bg-[#3B82F6] ring-4 ring-[#3B82F6]/20';
                    iconTag = '🎫';
                  } else if (evt.type === 'closed-ticket') {
                    dotColor = 'bg-[#EF4444] ring-4 ring-[#EF4444]/20';
                    iconTag = '✅';
                  } else if (evt.type === 'followup') {
                    dotColor = 'bg-[#F59E0B] ring-4 ring-[#F59E0B]/20';
                    iconTag = '📅';
                  } else if (evt.type === 'call') {
                    dotColor = 'bg-emerald-500 ring-4 ring-emerald-500/20';
                    iconTag = '📞';
                  } else if (evt.type === 'whatsapp') {
                    dotColor = 'bg-[#25D366] ring-4 ring-[#25D366]/20';
                    iconTag = '💬';
                  } else if (evt.type === 'imo') {
                    dotColor = 'bg-sky-500 ring-4 ring-sky-500/20';
                    iconTag = '🔵';
                  } else if (evt.type === 'updated') {
                    dotColor = 'bg-purple-500 ring-4 ring-purple-500/20';
                    iconTag = '🔄';
                  } else if (evt.type === 'status-changed') {
                    dotColor = 'bg-amber-500 ring-4 ring-amber-500/20';
                    iconTag = '⚠️';
                  }

                  return (
                    <div key={evt.id} className="relative group/item">
                      {/* Timeline Dot */}
                      <span className={`absolute -left-[28px] top-1 w-2.5 h-2.5 rounded-full ${dotColor} flex items-center justify-center transition-all duration-200 group-hover/item:scale-125`} />
                      
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-[12px] font-bold text-[#1F2937] dark:text-[#f5f5f0] uppercase tracking-wide flex items-center gap-1">
                            <span>{iconTag}</span>
                            <span>{evt.title}</span>
                          </span>
                          <span className="text-[11px] font-mono text-gray-500 dark:text-[#959585] font-bold uppercase">{evt.time}</span>
                        </div>
                        <p className="text-[12px] text-gray-600 dark:text-[#C4C4B5] font-medium leading-normal uppercase">{evt.description}</p>
                        {evt.meta && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[11px] font-mono font-bold text-gray-400 bg-gray-50 dark:bg-zinc-800 border border-gray-200/50 px-1 rounded">
                              {evt.meta}
                            </span>
                            <InlineCopy type={evt.type === 'ticket' || evt.type === 'closed-ticket' ? 'ticketId' : 'customerId'} value={evt.meta.replace(/Ref:|ID:|Ticket ID:/i, '').trim()} className="min-w-[14px] min-h-[14px] p-0" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-6 text-center text-gray-400 text-[11px] flex flex-col items-center justify-center gap-1.5">
                  <Inbox className="w-6 h-6 opacity-30 text-gray-500" />
                  <span className="font-bold uppercase tracking-wide">NO LOGGED ACTIVITY RECORDED YET</span>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* 6. Desktop Zebra Table: Latest Filed Support Tickets */}
      <div 
        className="bg-white rounded-xl border border-[#E5E7EB] border-t-4 border-t-[#3B82F6] p-3.5 sm:p-4 space-y-3 shadow-xs"
        id="dashboard-recent-tickets"
      >
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <div className="flex items-center gap-1.5">
            <div className="w-1 h-3.5 bg-[#3B82F6] rounded" />
            <h3 className="font-serif font-bold text-[#1F2937] text-[13px] uppercase tracking-tight">
              DESKTOP SUPPORT TICKETS LOG
            </h3>
          </div>
          <button 
            onClick={() => onNavigate('tickets')}
            className="text-[11px] font-bold text-[#6B705C] hover:underline uppercase cursor-pointer"
          >
            View All
          </button>
        </div>

        {/* Responsive Desktop Table / Mobile Cards */}
        <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-100" id="desktop-tickets-table-container">
          <table className="w-full text-left text-[11.5px] border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold tracking-wider uppercase">
                <th className="py-2.5 px-3 font-bold rounded-tl-lg">TICKET ID</th>
                <th className="py-2.5 px-3 font-bold">CLIENT NAME</th>
                <th className="py-2.5 px-3 font-bold">CONVERSATION DETAIL</th>
                <th className="py-2.5 px-3 font-bold">STATUS</th>
                <th className="py-2.5 px-3 font-bold rounded-tr-lg text-right">INTERACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentTickets.length > 0 ? (
                recentTickets.map((t, idx) => {
                  const customer = customers.find(c => c.id === t.customerId);
                  return (
                    <tr 
                      key={t.id} 
                      className={`hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                    >
                      <td className="py-2 px-3 font-mono font-bold text-[#6B705C]">{t.id}</td>
                      <td className="py-2 px-3">
                        <div className="font-bold text-[#1F2937] uppercase">{t.name}</div>
                        <div className="text-[10px] text-gray-500 mt-0">{t.mobileNumber}</div>
                      </td>
                      <td className="py-2 px-3 max-w-xs truncate text-gray-600 font-medium uppercase">
                        {t.conversationDescription}
                      </td>
                      <td className="py-2 px-3">
                        <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.1 rounded-full border uppercase ${
                          t.status === 'Open'
                            ? 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20'
                            : 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {customer && (
                          <div className="flex justify-end items-center gap-1">
                            <SmartContactActions
                              customerName={customer.name}
                              mobileNumber={customer.mobileNumber}
                              whatsAppNumber={customer.whatsAppNumber}
                              imoNumber={customer.imoNumber}
                              customerId={customer.id}
                              ticketId={t.id}
                              additionalNumbers={customer.additionalNumbers}
                            />
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400 font-bold uppercase">
                    NO REGISTERED TICKETS IN SYSTEM
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View Support Tickets Cards */}
        <div className="block md:hidden space-y-3" id="mobile-tickets-list-container">
          {recentTickets.length > 0 ? (
            recentTickets.map(t => {
              const customer = customers.find(c => c.id === t.customerId);
              return (
                <div 
                  key={t.id}
                  className="p-4 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB] space-y-3"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-[13px] font-bold text-[#6B705C]">{t.id}</span>
                    <span className={`text-[13px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                      t.status === 'Open'
                        ? 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20'
                        : 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20'
                    }`}>
                      {t.status}
                    </span>
                  </div>

                  <div>
                    <h5 className="font-bold text-[14px] text-[#1F2937] dark:text-[#f5f5f0] uppercase">{t.name}</h5>
                    <p className="text-[13px] text-gray-500">{t.mobileNumber}</p>
                    <p className="text-[14px] text-gray-600 dark:text-[#C4C4B5] mt-1.5 uppercase italic">"{t.conversationDescription}"</p>
                  </div>

                  {customer && (
                    <div className="pt-2 border-t border-gray-200/60 flex justify-end">
                      <SmartContactActions
                        customerName={customer.name}
                        mobileNumber={customer.mobileNumber}
                        whatsAppNumber={customer.whatsAppNumber}
                        imoNumber={customer.imoNumber}
                        customerId={customer.id}
                        ticketId={t.id}
                        additionalNumbers={customer.additionalNumbers}
                      />
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="py-6 text-center text-gray-400 text-[13px] font-bold uppercase">
              NO SUPPORT TICKETS LOGGED
            </div>
          )}
        </div>

      </div>

    </div>
  );
});

export default Dashboard;
