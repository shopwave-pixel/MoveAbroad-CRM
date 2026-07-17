import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Customer, Ticket, FollowUp, User } from '../types';
import SmartContactActions from './SmartContactActions';
import InlineCopy from './InlineCopy';
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
  onCategorySelect
}: DashboardProps) {
  
  const todayStr = new Date().toISOString().split('T')[0];

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
      type: 'customer' | 'ticket' | 'followup' | 'closed-ticket';
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

    // Sort newest first
    return events
      .sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime())
      .slice(0, 8);
  }, [customers, tickets, followUps]);

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
    <div className="space-y-8 pb-10" id="dashboard-view-panel">
      
      {/* 1. Large Sticky Search Bar with Orange Accent & Soft Shadow */}
      <div 
        ref={searchRef}
        className="sticky top-[68px] z-20 bg-[#F8FAFC]/90 backdrop-blur-md py-2"
        id="sticky-dashboard-search-bar"
      >
        <div className="relative max-w-4xl mx-auto rounded-full bg-white border border-[#E5E7EB] shadow-md hover:shadow-lg focus-within:ring-2 focus-within:ring-[#F59E0B]/30 focus-within:border-[#F59E0B] transition-all overflow-visible">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-[#F59E0B]" />
          </div>
          <input
            type="text"
            className="w-full pl-12 pr-12 py-3.5 text-xs bg-transparent border-none focus:outline-none text-[#1F2937] placeholder-gray-400 font-medium"
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
              className="absolute inset-y-0 right-0 pr-5 flex items-center text-gray-400 hover:text-[#EF4444] transition-colors"
            >
              <span className="text-lg font-bold">&times;</span>
            </button>
          )}

          {/* Autocomplete Dropdown */}
          {isOpen && searchValue.trim() !== '' && (
            <div className="absolute left-0 right-0 z-30 mt-2 max-h-72 overflow-y-auto bg-white border border-[#E5E7EB] rounded-2xl shadow-xl divide-y divide-[#E5E7EB] animate-fade-in">
              {filteredCustomersSearch.length > 0 ? (
                filteredCustomersSearch.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      onSelectCustomer(c);
                      setIsOpen(false);
                    }}
                    className="p-4 hover:bg-[#F9FAFB] cursor-pointer transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#6B705C]/10 text-[#6B705C] flex items-center justify-center text-xs font-bold">
                        {c.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-[#1F2937] uppercase">{c.name}</span>
                        <p className="text-[10px] text-gray-500 font-mono mt-0.5">{c.id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] text-[#6B7280] font-semibold">
                      <span className="flex items-center gap-1">
                        <span>📱</span>
                        <span>{c.mobileNumber}</span>
                      </span>
                      <span className="text-[#3B82F6] hover:underline font-bold flex items-center gap-0.5">
                        OPEN PROFILE <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-5 text-center text-gray-500 text-xs uppercase font-medium">
                  No customers found matching "{searchValue}"
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. Top Hero Card: Olive Green to Green Gradient, Rounded 24px */}
      <div 
        className="relative overflow-hidden bg-gradient-to-br from-[#6B705C] to-[#2E4F32] rounded-[24px] p-6 sm:p-8 text-white shadow-xl shadow-[#6B705C]/15"
        id="dashboard-top-hero-card"
      >
        <div className="absolute -top-10 -right-10 w-44 h-44 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-52 h-52 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10 text-[9px] font-bold tracking-widest uppercase">
              <Sparkles className="w-3 h-3 text-[#F59E0B]" />
              <span>ENTERPRISE SYSTEM IS ACTIVE</span>
            </div>
            
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-white tracking-tight uppercase leading-tight">
              WELCOME BACK
            </h2>
            
            <p className="text-xs sm:text-sm text-white/85 font-normal max-w-xl leading-relaxed uppercase">
              TODAY IS {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}. YOU HAVE <span className="font-bold text-[#F59E0B]">{todaysFollowUpsCount} PENDING FOLLOW-UPS</span> SCHEDULED FOR TODAY.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Today's Summary statistics badge list inside hero */}
            <div className="bg-black/15 backdrop-blur-sm rounded-xl p-3 border border-white/5 flex items-center gap-4 text-center">
              <div>
                <span className="block text-[18px] font-bold text-white font-serif">{totalCustomersCount}</span>
                <span className="text-[8px] text-white/70 font-semibold tracking-wider">CUSTOMERS</span>
              </div>
              <div className="w-[1px] h-6 bg-white/10" />
              <div>
                <span className="block text-[18px] font-bold text-[#3B82F6] font-serif">{openTicketsCount}</span>
                <span className="text-[8px] text-white/70 font-semibold tracking-wider">OPEN TKTS</span>
              </div>
              <div className="w-[1px] h-6 bg-white/10" />
              <div>
                <span className="block text-[18px] font-bold text-[#F59E0B] font-serif">{todaysFollowUpsCount}</span>
                <span className="text-[8px] text-white/70 font-semibold tracking-wider">TODAY'S FUP</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Colorful KPI Cards Section */}
      <div className="space-y-4" id="colorful-kpi-cards-section">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 rounded-full bg-[#6B705C]" />
          <h3 className="font-serif font-bold text-[#1F2937] dark:text-[#f5f5f0] text-sm tracking-tight uppercase">
            LIVE PERFORMANCE TRACKERS
          </h3>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4" id="stats-widgets-grid">
          
          {/* Card 1: Customers (Green Gradient) */}
          <div 
            onClick={() => onNavigate('customers')}
            className="group relative overflow-hidden bg-gradient-to-br from-[#22C55E]/10 to-[#15803D]/5 border-t-4 border-t-[#22C55E] p-4 rounded-[20px] border border-[#E5E7EB] text-left shadow-xs hover:-translate-y-1 hover:shadow-md transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-[#15803D] uppercase tracking-wider">Customers</span>
              <div className="p-1.5 bg-[#22C55E]/20 text-[#22C55E] rounded-xl">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-serif font-bold text-[#1F2937]">{totalCustomersCount}</p>
            <p className="text-[8px] text-[#6B7280] font-semibold mt-1 uppercase">Total Directory</p>
          </div>

          {/* Card 2: Open Tickets (Blue Gradient) */}
          <div 
            onClick={() => onNavigate('tickets')}
            className="group relative overflow-hidden bg-gradient-to-br from-[#3B82F6]/10 to-[#1D4ED8]/5 border-t-4 border-t-[#3B82F6] p-4 rounded-[20px] border border-[#E5E7EB] text-left shadow-xs hover:-translate-y-1 hover:shadow-md transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-[#1D4ED8] uppercase tracking-wider">Open Tickets</span>
              <div className="p-1.5 bg-[#3B82F6]/20 text-[#3B82F6] rounded-xl">
                <TicketIcon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-serif font-bold text-[#1F2937]">{openTicketsCount}</p>
            <p className="text-[8px] text-[#6B7280] font-semibold mt-1 uppercase">Awaiting Action</p>
          </div>

          {/* Card 3: Closed Tickets (Red Gradient) */}
          <div 
            onClick={() => onNavigate('tickets')}
            className="group relative overflow-hidden bg-gradient-to-br from-[#EF4444]/10 to-[#B91C1C]/5 border-t-4 border-t-[#EF4444] p-4 rounded-[20px] border border-[#E5E7EB] text-left shadow-xs hover:-translate-y-1 hover:shadow-md transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-[#B91C1C] uppercase tracking-wider">Closed Tickets</span>
              <div className="p-1.5 bg-[#EF4444]/20 text-[#EF4444] rounded-xl">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-serif font-bold text-[#1F2937]">{closedTicketsCount}</p>
            <p className="text-[8px] text-[#6B7280] font-semibold mt-1 uppercase">Completed Cases</p>
          </div>

          {/* Card 4: Follow Ups (Purple Gradient) */}
          <div 
            onClick={() => onNavigate('followups')}
            className="group relative overflow-hidden bg-gradient-to-br from-[#8B5CF6]/10 to-[#6D28D9]/5 border-t-4 border-t-[#8B5CF6] p-4 rounded-[20px] border border-[#E5E7EB] text-left shadow-xs hover:-translate-y-1 hover:shadow-md transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-[#6D28D9] uppercase tracking-wider">Follow Ups</span>
              <div className="p-1.5 bg-[#8B5CF6]/20 text-[#8B5CF6] rounded-xl">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-serif font-bold text-[#1F2937]">{pendingFollowUpsCount}</p>
            <p className="text-[8px] text-[#6B7280] font-semibold mt-1 uppercase">Reminders Pending</p>
          </div>

          {/* Card 5: Today (Orange Gradient) */}
          <div 
            onClick={() => onNavigate('followups')}
            className="group relative overflow-hidden bg-gradient-to-br from-[#F59E0B]/10 to-[#C2410C]/5 border-t-4 border-t-[#F59E0B] p-4 rounded-[20px] border border-[#E5E7EB] text-left shadow-xs hover:-translate-y-1 hover:shadow-md transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-[#C2410C] uppercase tracking-wider">Today</span>
              <div className="p-1.5 bg-[#F59E0B]/20 text-[#F59E0B] rounded-xl">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-serif font-bold text-[#1F2937]">{todaysFollowUpsCount}</p>
            <p className="text-[8px] text-[#6B7280] font-semibold mt-1 uppercase">Callback Reminders</p>
          </div>

          {/* Card 6: Live Sync (Emerald Gradient) */}
          <div 
            onClick={() => onNavigate('settings')}
            className="group relative overflow-hidden bg-gradient-to-br from-[#06B6D4]/10 to-[#0369A1]/5 border-t-4 border-t-[#06B6D4] p-4 rounded-[20px] border border-[#E5E7EB] text-left shadow-xs hover:-translate-y-1 hover:shadow-md transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-[#0369A1] uppercase tracking-wider">Database</span>
              <div className="p-1.5 bg-[#06B6D4]/20 text-[#06B6D4] rounded-xl">
                <Wifi className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-serif font-bold text-[#1F2937]">LIVE</p>
            <p className="text-[8px] text-[#6B7280] font-semibold mt-1 uppercase">Status Verified</p>
          </div>

        </div>
      </div>

      {/* 3.5. Customer Category Statistics Bento Grid */}
      <div className="space-y-4" id="customer-category-statistics-section">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 rounded-full bg-[#10B981]" />
          <h3 className="font-serif font-bold text-[#1F2937] dark:text-[#f5f5f0] text-sm tracking-tight uppercase">
            CUSTOMER CATEGORY STATISTICS
          </h3>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="category-stats-widgets-grid">
          {Object.entries(categoryActiveCounts).map(([cat, count]) => {
            let colorClasses = "";
            
            if (cat === 'AGENT') {
              colorClasses = "from-emerald-500/10 to-emerald-600/5 border-t-[#10B981] text-[#10B981]";
            } else if (cat.includes('PRODUCTION')) {
              colorClasses = "from-blue-500/10 to-blue-600/5 border-t-[#3B82F6] text-[#3B82F6]";
            } else if (cat.includes('QUALITY')) {
              colorClasses = "from-purple-500/10 to-purple-600/5 border-t-[#8B5CF6] text-[#8B5CF6]";
            } else if (cat === 'IRON MAN') {
              colorClasses = "from-amber-500/10 to-amber-600/5 border-t-[#F59E0B] text-[#F59E0B]";
            } else if (cat === 'OPERATOR') {
              colorClasses = "from-cyan-500/10 to-cyan-600/5 border-t-[#06B6D4] text-[#06B6D4]";
            } else if (cat === 'CHECKER') {
              colorClasses = "from-rose-500/10 to-rose-600/5 border-t-[#EF4444] text-[#EF4444]";
            } else {
              colorClasses = "from-teal-500/10 to-teal-600/5 border-t-[#14B8A6] text-[#14B8A6]";
            }

            return (
              <div
                key={cat}
                onClick={() => onCategorySelect?.(cat)}
                className={`group relative overflow-hidden bg-gradient-to-br border-t-4 p-5 rounded-[20px] border border-[#E5E7EB] text-left shadow-xs hover:-translate-y-1 hover:shadow-md transition-all duration-200 cursor-pointer ${colorClasses}`}
              >
                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500 truncate mb-1">
                  {cat}
                </p>
                <div className="flex items-baseline gap-1.5 mt-2">
                  <span className="text-2xl font-serif font-bold text-[#1F2937]">
                    {count}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider opacity-90">
                    ACTIVE
                  </span>
                </div>
                <div className="absolute bottom-3 right-4 opacity-5 group-hover:opacity-15 transition-opacity">
                  <Users className="w-12 h-12" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Quick Actions (Replace plain white with colorful action cards) */}
      <div className="space-y-4" id="quick-actions-section">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 rounded-full bg-[#3B82F6]" />
          <h3 className="font-serif font-bold text-[#1F2937] dark:text-[#f5f5f0] text-sm tracking-tight uppercase">
            OPERATIONAL LAUNCHPAD
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          
          {/* Action 1: Add Customer (Green) */}
          <button
            onClick={onQuickAddCustomer}
            className="flex flex-col items-center justify-center p-5 rounded-[20px] bg-gradient-to-br from-[#22C55E] to-[#15803D] text-white text-center shadow-lg shadow-[#22C55E]/10 hover:scale-105 active:scale-[0.98] transition-all duration-200 cursor-pointer group min-h-[120px]"
          >
            <UserPlus className="w-8 h-8 text-white mb-2 transition-transform group-hover:rotate-12 duration-200" />
            <span className="text-xs font-bold uppercase tracking-wider">Add Customer</span>
            <span className="text-[9px] text-white/80 font-normal mt-0.5 uppercase">Register profile</span>
          </button>

          {/* Action 2: Create Ticket (Blue) */}
          <button
            onClick={onQuickAddTicket}
            className="flex flex-col items-center justify-center p-5 rounded-[20px] bg-gradient-to-br from-[#3B82F6] to-[#1D4ED8] text-white text-center shadow-lg shadow-[#3B82F6]/10 hover:scale-105 active:scale-[0.98] transition-all duration-200 cursor-pointer group min-h-[120px]"
          >
            <Plus className="w-8 h-8 text-white mb-2 transition-transform group-hover:rotate-90 duration-200" />
            <span className="text-xs font-bold uppercase tracking-wider">Create Ticket</span>
            <span className="text-[9px] text-white/80 font-normal mt-0.5 uppercase">File assistance</span>
          </button>

          {/* Action 3: Search Customer (Purple) */}
          <button
            onClick={() => onNavigate('customers')}
            className="flex flex-col items-center justify-center p-5 rounded-[20px] bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] text-white text-center shadow-lg shadow-[#8B5CF6]/10 hover:scale-105 active:scale-[0.98] transition-all duration-200 cursor-pointer group min-h-[120px]"
          >
            <Search className="w-8 h-8 text-white mb-2 transition-transform group-hover:translate-x-0.5 duration-200" />
            <span className="text-xs font-bold uppercase tracking-wider">Search Customer</span>
            <span className="text-[9px] text-white/80 font-normal mt-0.5 uppercase">Lookup database</span>
          </button>

          {/* Action 4: Follow Ups (Orange) */}
          <button
            onClick={() => onNavigate('followups')}
            className="flex flex-col items-center justify-center p-5 rounded-[20px] bg-gradient-to-br from-[#F59E0B] to-[#D97706] text-white text-center shadow-lg shadow-[#F59E0B]/10 hover:scale-105 active:scale-[0.98] transition-all duration-200 cursor-pointer group min-h-[120px]"
          >
            <Clock className="w-8 h-8 text-white mb-2 transition-transform group-hover:scale-110 duration-200" />
            <span className="text-xs font-bold uppercase tracking-wider">Follow Ups</span>
            <span className="text-[9px] text-white/80 font-normal mt-0.5 uppercase">Call logs</span>
          </button>

          {/* Action 5: Settings (Slate) */}
          <button
            onClick={() => onNavigate('settings')}
            className="flex flex-col items-center justify-center p-5 rounded-[20px] bg-gradient-to-br from-[#475569] to-[#334155] text-white text-center shadow-lg shadow-[#475569]/10 hover:scale-105 active:scale-[0.98] transition-all duration-200 cursor-pointer group min-h-[120px] col-span-2 sm:col-span-1"
          >
            <Settings className="w-8 h-8 text-white mb-2 transition-transform group-hover:rotate-45 duration-200" />
            <span className="text-xs font-bold uppercase tracking-wider">Settings</span>
            <span className="text-[9px] text-white/80 font-normal mt-0.5 uppercase">Configurations</span>
          </button>

        </div>
      </div>

      {/* 5. Split Bento Layout: Activities & Unified Vertical Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="dashboard-recent-activity-section">
        
        {/* Left Column (SPAN 7): Reminders and Registered Customers */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Upcoming Callbacks / Follow ups */}
          <div 
            className="bg-white rounded-[20px] border border-[#E5E7EB] border-t-4 border-t-[#8B5CF6] p-5 space-y-4 shadow-sm"
            id="dashboard-upcoming-followups"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-4 bg-[#8B5CF6] rounded" />
                <h3 className="font-serif font-bold text-[#1F2937] text-xs uppercase tracking-tight">
                  UPCOMING CALLBACK REMINDERS
                </h3>
              </div>
              <button 
                onClick={() => onNavigate('followups')}
                className="text-[10px] font-bold text-[#6B705C] hover:underline uppercase"
              >
                View All
              </button>
            </div>

            <div className="space-y-3">
              {upcomingFollowUps.length > 0 ? (
                upcomingFollowUps.map(f => {
                  const overdue = isFollowUpOverdue(f);
                  const customer = customers.find(c => c.id === f.customerId);
                  return (
                    <div 
                      key={f.id}
                      className="p-4 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB] hover:border-[#8B5CF6]/40 hover:-translate-y-0.5 transition-all duration-150 flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-3 w-full">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-bold text-[#1F2937] text-xs uppercase">{f.name}</span>
                            <InlineCopy type="name" value={f.name} className="min-w-[20px] min-h-[20px] p-0" />
                            {overdue ? (
                              <span className="text-[8px] px-2 py-0.5 rounded-full bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] font-bold uppercase tracking-wider">
                                OVERDUE ({getRelativeDateLabel(f.followUpDate)})
                              </span>
                            ) : (
                              <span className="text-[8px] px-2 py-0.5 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#F59E0B] font-bold uppercase tracking-wider">
                                {getRelativeDateLabel(f.followUpDate)} @ {f.followUpTime}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#6B7280] italic leading-relaxed">
                            "{f.notes}"
                          </p>
                        </div>
                      </div>
                      {customer && (
                        <div className="mt-2 pt-2 border-t border-gray-200/60 flex justify-end">
                          <SmartContactActions
                            customerName={customer.name}
                            mobileNumber={customer.mobileNumber}
                            whatsAppNumber={customer.whatsAppNumber}
                            imoNumber={customer.imoNumber}
                            customerId={customer.id}
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-gray-400 text-xs flex flex-col items-center justify-center gap-2">
                  <Inbox className="w-8 h-8 opacity-30 text-gray-500" />
                  <span className="font-bold uppercase tracking-wide">NO PENDING CALLBACK REMINDERS</span>
                </div>
              )}
            </div>
          </div>

          {/* Premium Recent Registered Customers */}
          <div 
            className="bg-white rounded-[20px] border border-[#E5E7EB] border-t-4 border-t-[#22C55E] p-5 space-y-4 shadow-sm"
            id="dashboard-recent-customers"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-4 bg-[#22C55E] rounded" />
                <h3 className="font-serif font-bold text-[#1F2937] text-xs uppercase tracking-tight">
                  RECENTLY REGISTERED CLIENTS
                </h3>
              </div>
              <button 
                onClick={() => onNavigate('customers')}
                className="text-[10px] font-bold text-[#6B705C] hover:underline uppercase"
              >
                View All
              </button>
            </div>

            <div className="space-y-3">
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

                  return (
                    <div
                      key={c.id}
                      className="p-3.5 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB] hover:border-[#22C55E]/40 hover:-translate-y-0.5 transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div 
                        onClick={() => onSelectCustomer(c)}
                        className="flex items-center gap-3 cursor-pointer flex-1"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6B705C] to-[#2E4F32] text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-xs uppercase">
                          {initials}
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <p className="text-xs font-bold text-[#1F2937] hover:underline uppercase leading-tight">{c.name}</p>
                            <InlineCopy type="name" value={c.name} className="min-w-[18px] min-h-[18px] p-0" />
                            <span className="font-mono text-[9px] font-bold text-gray-500 bg-gray-100 border border-gray-200 px-1.5 py-0.1 rounded-md">
                              {c.id}
                            </span>
                            <InlineCopy type="customerId" value={c.id} className="min-w-[18px] min-h-[18px] p-0" />
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-gray-500 font-semibold">
                            <span className="flex items-center gap-1">
                              <span>📱</span>
                              <span>{c.mobileNumber}</span>
                              <InlineCopy type="mobile" value={c.mobileNumber} className="min-w-[18px] min-h-[18px] p-0" />
                            </span>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.1 bg-[#3B82F6]/10 text-[#3B82F6] rounded-md text-[8px] font-bold uppercase">
                              TKT: {custTickets.length}
                            </span>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.1 bg-[#8B5CF6]/10 text-[#8B5CF6] rounded-md text-[8px] font-bold uppercase">
                              FUP: {custFollowups.length}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 justify-end">
                        <SmartContactActions
                          customerName={c.name}
                          mobileNumber={c.mobileNumber}
                          whatsAppNumber={c.whatsAppNumber}
                          imoNumber={c.imoNumber}
                          customerId={c.id}
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
            className="bg-white rounded-[20px] border border-[#E5E7EB] border-t-4 border-t-[#06B6D4] p-5 space-y-4 shadow-sm"
            id="dashboard-activity-timeline"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-4 bg-[#06B6D4] rounded" />
                <h3 className="font-serif font-bold text-[#1F2937] text-xs uppercase tracking-tight">
                  LIVE ACTIVITY FEED TIMELINE
                </h3>
              </div>
              <span className="text-[9px] font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full animate-pulse uppercase">
                REAL-TIME UPDATES
              </span>
            </div>

            <div className="relative pl-6 border-l border-gray-200 space-y-6 py-2" id="vertical-timeline-container">
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
                  }

                  return (
                    <div key={evt.id} className="relative group/item">
                      {/* Timeline Dot */}
                      <span className={`absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full ${dotColor} flex items-center justify-center text-[8px] text-white font-bold transition-all duration-200 group-hover/item:scale-125`} />
                      
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-[#1F2937] uppercase tracking-wide flex items-center gap-1.5">
                            <span>{iconTag}</span>
                            <span>{evt.title}</span>
                          </span>
                          <span className="text-[9px] font-mono text-gray-500 font-bold uppercase">{evt.time}</span>
                        </div>
                        <p className="text-xs text-gray-600 font-medium leading-relaxed uppercase">{evt.description}</p>
                        {evt.meta && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[8px] font-mono font-bold text-gray-400 bg-gray-50 border border-gray-200/50 px-1.5 rounded-md">
                              {evt.meta}
                            </span>
                            <InlineCopy type={evt.type === 'ticket' || evt.type === 'closed-ticket' ? 'ticketId' : 'customerId'} value={evt.meta.replace(/Ref:|ID:|Ticket ID:/i, '').trim()} className="min-w-[16px] min-h-[16px] p-0" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-gray-400 text-xs flex flex-col items-center justify-center gap-2">
                  <Inbox className="w-8 h-8 opacity-30 text-gray-500" />
                  <span className="font-bold uppercase tracking-wide">NO LOGGED ACTIVITY RECORDED YET</span>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* 6. Desktop Zebra Table: Latest Filed Support Tickets */}
      <div 
        className="bg-white rounded-[20px] border border-[#E5E7EB] border-t-4 border-t-[#3B82F6] p-5 space-y-4 shadow-sm"
        id="dashboard-recent-tickets"
      >
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 bg-[#3B82F6] rounded" />
            <h3 className="font-serif font-bold text-[#1F2937] text-xs uppercase tracking-tight">
              DESKTOP SUPPORT TICKETS LOG
            </h3>
          </div>
          <button 
            onClick={() => onNavigate('tickets')}
            className="text-[10px] font-bold text-[#6B705C] hover:underline uppercase"
          >
            View All
          </button>
        </div>

        {/* Responsive Desktop Table / Mobile Cards */}
        <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-100" id="desktop-tickets-table-container">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold tracking-wider uppercase">
                <th className="py-3 px-4 font-bold rounded-tl-xl">TICKET ID</th>
                <th className="py-3 px-4 font-bold">CLIENT NAME</th>
                <th className="py-3 px-4 font-bold">CONVERSATION DETAIL</th>
                <th className="py-3 px-4 font-bold">STATUS</th>
                <th className="py-3 px-4 font-bold rounded-tr-xl text-right">INTERACTION</th>
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
                      <td className="py-3.5 px-4 font-mono font-bold text-[#6B705C]">{t.id}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#1F2937] uppercase">{t.name}</div>
                        <div className="text-[10px] text-gray-500">{t.mobileNumber}</div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate text-gray-600 font-medium uppercase">
                        {t.conversationDescription}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase ${
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
                    <span className="font-mono text-xs font-bold text-[#6B705C]">{t.id}</span>
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                      t.status === 'Open'
                        ? 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20'
                        : 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20'
                    }`}>
                      {t.status}
                    </span>
                  </div>

                  <div>
                    <h5 className="font-bold text-xs text-[#1F2937] uppercase">{t.name}</h5>
                    <p className="text-[10px] text-gray-500">{t.mobileNumber}</p>
                    <p className="text-xs text-gray-600 mt-1.5 uppercase italic">"{t.conversationDescription}"</p>
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
                      />
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="py-6 text-center text-gray-400 text-xs font-bold uppercase">
              NO SUPPORT TICKETS LOGGED
            </div>
          )}
        </div>

      </div>

    </div>
  );
});

export default Dashboard;
