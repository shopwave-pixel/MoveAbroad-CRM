import React from 'react';
import { Customer, Ticket, FollowUp } from '../types';
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
  TrendingUp,
  Inbox,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

interface DashboardProps {
  customers: Customer[];
  tickets: Ticket[];
  followUps: FollowUp[];
  onNavigate: (tab: 'dashboard' | 'customers' | 'tickets' | 'followups' | 'settings') => void;
  onSelectCustomer: (customer: Customer) => void;
  onQuickAddTicket: () => void;
  onQuickAddCustomer: () => void;
}

export default function Dashboard({
  customers,
  tickets,
  followUps,
  onNavigate,
  onSelectCustomer,
  onQuickAddTicket,
  onQuickAddCustomer
}: DashboardProps) {
  
  const todayStr = new Date().toISOString().split('T')[0];

  // Calculated Stats
  const totalCustomers = customers.length;
  const openTickets = tickets.filter(t => t.status === 'Open').length;
  const pendingFollowUps = followUps.filter(f => f.status === 'Pending').length;
  const todaysFollowUpsCount = followUps.filter(f => f.status === 'Pending' && f.followUpDate === todayStr).length;

  // Recent data sets (sorted newest first)
  const recentCustomers = [...customers]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  const recentTickets = [...tickets]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  // Filter upcoming follow-ups (today or in the future, status pending, sorted by date & time ascending)
  const upcomingFollowUps = [...followUps]
    .filter(f => f.status === 'Pending')
    .sort((a, b) => {
      const dateA = `${a.followUpDate}T${a.followUpTime}`;
      const dateB = `${b.followUpDate}T${b.followUpTime}`;
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    })
    .slice(0, 4);

  // Date/Time Formatter
  const formatDateTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return isoString;
    }
  };

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
    <div className="space-y-6" id="dashboard-view-panel">
      
      {/* Welcome Hero Banner */}
      <div className="bg-[#5A5A40] dark:bg-[#4a4a34] text-white rounded-3xl p-6 relative overflow-hidden shadow-sm animate-fade-in" id="dashboard-hero">
        <div className="relative z-10 space-y-2">
          <span className="text-[10px] uppercase font-bold tracking-widest bg-white/20 px-2.5 py-1 rounded-full text-white">
            Visa & Immigration Hub
          </span>
          <h2 className="text-2xl font-serif font-bold tracking-tight">Bangladesh Recruitment Portal</h2>
          <p className="text-xs text-white/80 max-w-sm">
            Manage overseas manpower workflows, visa candidate directories, document support tickets, and follow-ups with ease.
          </p>
        </div>
        <div className="absolute right-[-10px] bottom-[-20px] opacity-10 pointer-events-none">
          <TrendingUp className="w-48 h-48" />
        </div>
      </div>

      {/* Grid of Key CRM Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="stats-widgets-grid">
        
        {/* Widget 1: Total Candidates (Blue #3B82F6) */}
        <button 
          onClick={() => onNavigate('customers')}
          className="bg-white dark:bg-[#20201a] p-4 rounded-2xl border border-[#5A5A40]/10 dark:border-[#8a8a70]/20 text-left hover:shadow-md transition-all active:scale-[0.98] group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#5A5A40]/65 dark:text-[#8a8a70] uppercase tracking-wider">Total Candidates</span>
            <div className="p-1.5 bg-[#3B82F6]/10 text-[#3B82F6] rounded-xl dark:bg-[#3B82F6]/20">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-serif text-[#3B82F6]">{totalCustomers}</p>
          <p className="text-[10px] text-[#3B82F6]/80 font-semibold mt-1 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#3B82F6]"></span>
            <span>Active pipeline</span>
          </p>
        </button>

        {/* Widget 2: Open Tickets (Green #22C55E) */}
        <button 
          onClick={() => onNavigate('tickets')}
          className="bg-white dark:bg-[#20201a] p-4 rounded-2xl border border-[#5A5A40]/10 dark:border-[#8a8a70]/20 text-left hover:shadow-md transition-all active:scale-[0.98]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#5A5A40]/65 dark:text-[#8a8a70] uppercase tracking-wider">Open Tickets</span>
            <div className="p-1.5 bg-[#22C55E]/10 text-[#22C55E] rounded-xl dark:bg-[#22C55E]/20">
              <TicketIcon className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-serif text-[#22C55E]">{openTickets}</p>
          <p className="text-[10px] text-[#22C55E]/85 font-semibold mt-1">
            Requires attention
          </p>
        </button>

        {/* Widget 3: Pending Reminders (Amber #F59E0B) */}
        <button 
          onClick={() => onNavigate('followups')}
          className="bg-white dark:bg-[#20201a] p-4 rounded-2xl border border-[#5A5A40]/10 dark:border-[#8a8a70]/20 text-left hover:shadow-md transition-all active:scale-[0.98]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#5A5A40]/65 dark:text-[#8a8a70] uppercase tracking-wider">Pending Reminders</span>
            <div className="p-1.5 bg-[#F59E0B]/10 text-[#F59E0B] rounded-xl dark:bg-[#F59E0B]/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-serif text-[#F59E0B]">{pendingFollowUps}</p>
          <p className="text-[10px] text-[#F59E0B]/85 font-semibold mt-1">
            Scheduled callbacks
          </p>
        </button>

        {/* Widget 4: Due Today (Purple #8B5CF6) */}
        <button 
          onClick={() => onNavigate('followups')}
          className="bg-white dark:bg-[#20201a] p-4 rounded-2xl border border-[#5A5A40]/10 dark:border-[#8a8a70]/20 text-left hover:shadow-md transition-all active:scale-[0.98]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#5A5A40]/65 dark:text-[#8a8a70] uppercase tracking-wider">Due Today</span>
            <div className="p-1.5 bg-[#8B5CF6]/10 text-[#8B5CF6] rounded-xl dark:bg-[#8B5CF6]/20">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-serif text-[#8B5CF6]">{todaysFollowUpsCount}</p>
          <p className="text-[10px] text-[#8B5CF6]/85 font-bold mt-1">
            Urgent today
          </p>
        </button>
      </div>

      {/* Quick Actions Panel */}
      <div className="bg-white dark:bg-[#20201a] rounded-3xl border border-[#5A5A40]/10 dark:border-[#8a8a70]/20 p-5 space-y-4" id="quick-actions-card">
        <h3 className="font-serif font-bold text-[#5A5A40] dark:text-[#ecece5] text-sm flex items-center gap-2">
          <span>⚡ Quick Actions</span>
        </h3>
        <div className="grid grid-cols-3 gap-3">
          
          <button
            onClick={onQuickAddCustomer}
            id="btn-quick-add-customer"
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#f5f5f0]/70 dark:bg-[#151510]/60 border border-[#5A5A40]/10 dark:border-[#8a8a70]/15 hover:border-[#5A5A40]/30 hover:bg-[#5A5A40]/5 dark:hover:bg-[#8a8a70]/10 transition-all cursor-pointer text-center group"
          >
            <div className="w-10 h-10 rounded-full bg-[#5A5A40]/10 text-[#5A5A40] dark:text-[#ecece5] flex items-center justify-center mb-1.5 transition-colors group-hover:bg-[#5A5A40] group-hover:text-white">
              <UserPlus className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-[#2c2c26]/90 dark:text-[#f5f5f0] leading-tight">Add Candidate</span>
          </button>

          <button
            onClick={onQuickAddTicket}
            id="btn-quick-add-ticket"
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#f5f5f0]/70 dark:bg-[#151510]/60 border border-[#5A5A40]/10 dark:border-[#8a8a70]/15 hover:border-[#5A5A40]/30 hover:bg-[#5A5A40]/5 dark:hover:bg-[#8a8a70]/10 transition-all cursor-pointer text-center group"
          >
            <div className="w-10 h-10 rounded-full bg-[#5A5A40]/10 text-[#5A5A40] dark:text-[#ecece5] flex items-center justify-center mb-1.5 transition-colors group-hover:bg-[#5A5A40] group-hover:text-white">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-[#2c2c26]/90 dark:text-[#f5f5f0] leading-tight">Create Ticket</span>
          </button>

          <button
            onClick={() => onNavigate('customers')}
            id="btn-quick-search"
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#f5f5f0]/70 dark:bg-[#151510]/60 border border-[#5A5A40]/10 dark:border-[#8a8a70]/15 hover:border-[#5A5A40]/30 hover:bg-[#5A5A40]/5 dark:hover:bg-[#8a8a70]/10 transition-all cursor-pointer text-center group"
          >
            <div className="w-10 h-10 rounded-full bg-[#5A5A40]/10 text-[#5A5A40] dark:text-[#ecece5] flex items-center justify-center mb-1.5 transition-colors group-hover:bg-[#5A5A40] group-hover:text-white">
              <Search className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-[#2c2c26]/90 dark:text-[#f5f5f0] leading-tight">Search Directory</span>
          </button>

        </div>
      </div>

      {/* Bento Grid layout for lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="dashboard-recent-activity-section">
        
        {/* Left Column: Upcoming Follow-ups */}
        <div className="bg-white dark:bg-[#20201a] rounded-3xl border border-[#5A5A40]/10 dark:border-[#8a8a70]/20 p-5 space-y-4" id="dashboard-upcoming-followups">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-[#5A5A40] dark:text-[#ecece5] text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#5A5A40] dark:text-[#ecece5]" />
              <span>Upcoming Follow-ups</span>
            </h3>
            <button 
              onClick={() => onNavigate('followups')}
              className="text-[10px] font-bold text-[#5A5A40] dark:text-[#b8b89e] hover:underline"
            >
              View All
            </button>
          </div>

          <div className="space-y-2.5">
            {upcomingFollowUps.length > 0 ? (
              upcomingFollowUps.map(f => {
                const overdue = isFollowUpOverdue(f);
                return (
                  <div 
                    key={f.id}
                    className="p-3 bg-[#f5f5f0]/30 dark:bg-[#151510]/40 rounded-xl border border-[#5A5A40]/5 dark:border-[#8a8a70]/15 hover:border-[#5A5A40]/15 dark:hover:border-[#8a8a70]/30 transition-all flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#2c2c26] dark:text-[#f5f5f0]">{f.name}</span>
                        {overdue ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#DC2626]/10 border border-[#DC2626]/20 text-[#DC2626] font-bold">
                            OVERDUE ({getRelativeDateLabel(f.followUpDate)})
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#F97316]/10 border border-[#F97316]/20 text-[#F97316] font-bold">
                            {getRelativeDateLabel(f.followUpDate)} @ {f.followUpTime}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#2c2c26]/75 dark:text-[#8a8a70] line-clamp-2 italic leading-relaxed">
                        "{f.notes}"
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-6 text-center text-[#5A5A40]/50 dark:text-[#8a8a70]/60 text-xs flex flex-col items-center justify-center gap-1">
                <Inbox className="w-5 h-5 opacity-40 mb-1" />
                <span>No pending follow-up reminders.</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recently Added Customers */}
        <div className="bg-white dark:bg-[#20201a] rounded-3xl border border-[#5A5A40]/10 dark:border-[#8a8a70]/20 p-5 space-y-4" id="dashboard-recent-customers">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-[#5A5A40] dark:text-[#ecece5] text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-[#5A5A40] dark:text-[#ecece5]" />
              <span>Recently Registered</span>
            </h3>
            <button 
              onClick={() => onNavigate('customers')}
              className="text-[10px] font-bold text-[#5A5A40] dark:text-[#b8b89e] hover:underline"
            >
              View All
            </button>
          </div>

          <div className="space-y-2.5">
            {recentCustomers.length > 0 ? (
              recentCustomers.map(c => {
                const initials = c.name
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      onSelectCustomer(c);
                    }}
                    className="w-full text-left p-2.5 bg-[#f5f5f0]/30 dark:bg-[#151510]/40 rounded-xl border border-[#5A5A40]/5 dark:border-[#8a8a70]/15 hover:border-[#5A5A40]/25 dark:hover:border-[#8a8a70]/30 transition-all flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#f5f5f0] dark:bg-[#252520] text-[#5A5A40] dark:text-[#ecece5] text-xs font-bold flex items-center justify-center shrink-0 border border-[#5A5A40]/5">
                        {initials}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#2c2c26] dark:text-[#f5f5f0] leading-tight">{c.name}</p>
                        <p className="text-[10px] text-[#5A5A40]/60 dark:text-[#8a8a70] mt-0.5">{c.mobileNumber}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#5A5A40]/40 dark:text-[#8a8a70]/40" />
                  </button>
                );
              })
            ) : (
              <div className="py-6 text-center text-[#5A5A40]/50 dark:text-[#8a8a70]/60 text-xs flex flex-col items-center justify-center gap-1">
                <Inbox className="w-5 h-5 opacity-40 mb-1" />
                <span>No registered candidates yet.</span>
              </div>
            )}
          </div>
        </div>

        {/* Latest Filed Tickets (Full Width on desktop) */}
        <div className="bg-white dark:bg-[#20201a] rounded-3xl border border-[#5A5A40]/10 dark:border-[#8a8a70]/20 p-5 space-y-4 md:col-span-2" id="dashboard-recent-tickets">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-[#5A5A40] dark:text-[#ecece5] text-sm flex items-center gap-2">
              <TicketIcon className="w-4 h-4 text-[#5A5A40] dark:text-[#ecece5]" />
              <span>Latest Visa Support Tickets</span>
            </h3>
            <button 
              onClick={() => onNavigate('tickets')}
              className="text-[10px] font-bold text-[#5A5A40] dark:text-[#b8b89e] hover:underline"
            >
              View All
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recentTickets.length > 0 ? (
              recentTickets.map(t => {
                let badgeStyle = '';
                if (t.status === 'Open') badgeStyle = 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20';
                else if (t.status === 'Pending') badgeStyle = 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20';
                else badgeStyle = 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20';

                return (
                  <div 
                    key={t.id}
                    className="p-3 bg-[#f5f5f0]/30 dark:bg-[#151510]/40 rounded-2xl border border-[#5A5A40]/5 dark:border-[#8a8a70]/15 space-y-1.5 hover:border-[#5A5A40]/20 dark:hover:border-[#8a8a70]/30 transition-all text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-[10px] text-[#5A5A40] dark:text-[#ecece5] bg-[#f5f5f0] dark:bg-[#151510] border border-[#5A5A40]/10 dark:border-[#8a8a70]/20 px-1.5 py-0.5 rounded-md">
                        {t.id}
                      </span>
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${badgeStyle}`}>
                        {t.status}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-bold text-[#2c2c26] dark:text-[#f5f5f0]">{t.name}</p>
                      <p className="text-[11px] text-[#2c2c26]/75 dark:text-[#8a8a70] line-clamp-1 font-sans">
                        {t.conversationDescription}
                      </p>
                    </div>
                    <p className="text-[9px] text-[#5A5A40]/55 dark:text-[#8a8a70] pt-1 border-t border-[#5A5A40]/5 dark:border-[#8a8a70]/10">
                      Filed: {formatDateTime(t.createdAt)}
                    </p>
                  </div>
                );
              })
            ) : (
              <div className="md:col-span-2 py-6 text-center text-[#5A5A40]/50 dark:text-[#8a8a70]/60 text-xs flex flex-col items-center justify-center gap-1">
                <Inbox className="w-5 h-5 opacity-40 mb-1" />
                <span>No support tickets filed yet.</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
