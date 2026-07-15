import React, { useState } from 'react';
import { Customer, FollowUp } from '../types';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  Check, 
  Edit, 
  Search, 
  User, 
  Phone, 
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Loader2,
  CalendarDays,
  X,
  FileText
} from 'lucide-react';

interface FollowUpsProps {
  customers: Customer[];
  followUps: FollowUp[];
  onCreateFollowUp: (
    customerId: string,
    name: string,
    mobileNumber: string,
    followUpDate: string,
    followUpTime: string,
    notes: string,
    status: 'Pending' | 'Completed'
  ) => Promise<{ success: boolean; followUp?: FollowUp; error?: string }>;
  onUpdateFollowUp: (id: string, updates: Partial<FollowUp>) => Promise<{ success: boolean; message?: string; error?: string }>;
  onDeleteFollowUp: (id: string) => Promise<{ success: boolean; message?: string; error?: string }>;
}

type FilterTab = 'today' | 'upcoming' | 'completed';

export default function FollowUps({
  customers,
  followUps,
  onCreateFollowUp,
  onUpdateFollowUp,
  onDeleteFollowUp
}: FollowUpsProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<FilterTab>('today');
  
  // Create state
  const [isAdding, setIsAdding] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [followUpDate, setFollowUpDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [followUpTime, setFollowUpTime] = useState('10:00');
  const [notes, setNotes] = useState('');
  
  // Edit & Reschedule & Delete states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');
  
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Status indicators
  const [actionStatus, setActionStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message: string }>({
    type: 'idle',
    message: ''
  });

  const todayStr = new Date().toISOString().split('T')[0];

  const isFollowUpOverdue = (f: FollowUp) => {
    return f.status === 'Pending' && f.followUpDate < todayStr;
  };

  // Filters based on dates
  const filteredFollowUps = followUps.filter(f => {
    if (activeTab === 'today') {
      return f.status === 'Pending' && f.followUpDate === todayStr;
    }
    if (activeTab === 'upcoming') {
      // Upcoming is today or future
      return f.status === 'Pending' && f.followUpDate >= todayStr;
    }
    if (activeTab === 'completed') {
      return f.status === 'Completed';
    }
    return true;
  }).sort((a, b) => {
    // Upcoming / Today sorted by date & time ascending, Completed sorted newest first
    if (activeTab === 'completed') {
      return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
    }
    const dateA = `${a.followUpDate}T${a.followUpTime}`;
    const dateB = `${b.followUpDate}T${b.followUpTime}`;
    return new Date(dateA).getTime() - new Date(dateB).getTime();
  });

  // Action helpers
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCustomerId) {
      setActionStatus({ type: 'error', message: 'Please select a customer.' });
      return;
    }
    if (!followUpDate || !followUpTime) {
      setActionStatus({ type: 'error', message: 'Please provide both Date and Time.' });
      return;
    }
    if (!notes.trim()) {
      setActionStatus({ type: 'error', message: 'Please write a descriptive note for the follow-up.' });
      return;
    }

    const customer = customers.find(c => c.id === selectedCustomerId);
    if (!customer) {
      setActionStatus({ type: 'error', message: 'Selected customer profile is invalid.' });
      return;
    }

    setActionStatus({ type: 'loading', message: 'Scheduling follow-up reminder...' });

    try {
      const res = await onCreateFollowUp(
        customer.id,
        customer.name,
        customer.mobileNumber,
        followUpDate,
        followUpTime,
        notes.trim(),
        'Pending'
      );

      if (res.success) {
        setActionStatus({
          type: 'success',
          message: `Follow-up scheduled for ${customer.name}!`
        });
        setNotes('');
        setIsAdding(false);
        // Clear message after 3 seconds
        setTimeout(() => setActionStatus({ type: 'idle', message: '' }), 3000);
      } else {
        setActionStatus({ type: 'error', message: res.error || 'Failed to schedule follow-up.' });
      }
    } catch (err: any) {
      setActionStatus({ type: 'error', message: err.message || 'An unexpected error occurred.' });
    }
  };

  const handleMarkComplete = async (f: FollowUp) => {
    setActionStatus({ type: 'loading', message: 'Marking follow-up as Completed...' });
    try {
      const res = await onUpdateFollowUp(f.id, { status: 'Completed' });
      if (res.success) {
        setActionStatus({ type: 'success', message: 'Follow-up marked as Completed!' });
        setTimeout(() => setActionStatus({ type: 'idle', message: '' }), 3000);
      } else {
        setActionStatus({ type: 'error', message: res.error || 'Failed to update follow-up.' });
      }
    } catch (err: any) {
      setActionStatus({ type: 'error', message: err.message || 'An unexpected error occurred.' });
    }
  };

  const handleSaveNotes = async (id: string) => {
    if (!editNotes.trim()) return;
    setActionStatus({ type: 'loading', message: 'Updating follow-up notes...' });
    try {
      const res = await onUpdateFollowUp(id, { notes: editNotes.trim() });
      if (res.success) {
        setActionStatus({ type: 'success', message: 'Notes updated successfully!' });
        setEditingId(null);
        setTimeout(() => setActionStatus({ type: 'idle', message: '' }), 3000);
      } else {
        setActionStatus({ type: 'error', message: res.error || 'Failed to update notes.' });
      }
    } catch (err: any) {
      setActionStatus({ type: 'error', message: err.message || 'An unexpected error occurred.' });
    }
  };

  const handleSaveReschedule = async (id: string) => {
    if (!rescheduleDate || !rescheduleTime) return;
    setActionStatus({ type: 'loading', message: 'Rescheduling follow-up...' });
    try {
      const res = await onUpdateFollowUp(id, { 
        followUpDate: rescheduleDate, 
        followUpTime: rescheduleTime 
      });
      if (res.success) {
        setActionStatus({ type: 'success', message: 'Follow-up rescheduled successfully!' });
        setReschedulingId(null);
        setTimeout(() => setActionStatus({ type: 'idle', message: '' }), 3000);
      } else {
        setActionStatus({ type: 'error', message: res.error || 'Failed to reschedule.' });
      }
    } catch (err: any) {
      setActionStatus({ type: 'error', message: err.message || 'An unexpected error occurred.' });
    }
  };

  const handleDelete = async (id: string) => {
    setActionStatus({ type: 'loading', message: 'Deleting follow-up reminder...' });
    try {
      const res = await onDeleteFollowUp(id);
      if (res.success) {
        setActionStatus({ type: 'success', message: 'Follow-up reminder deleted successfully!' });
        setDeletingId(null);
        setTimeout(() => setActionStatus({ type: 'idle', message: '' }), 3000);
      } else {
        setActionStatus({ type: 'error', message: res.error || 'Failed to delete follow-up.' });
      }
    } catch (err: any) {
      setActionStatus({ type: 'error', message: err.message || 'An unexpected error occurred.' });
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
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6" id="followups-view-container">
      
      {/* View Header with Title and Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-serif font-bold text-[#5A5A40] dark:text-[#ecece5] tracking-tight">Embassy & Candidate Follow-ups</h2>
          <p className="text-xs text-[#5A5A40]/60 dark:text-[#8a8a70]">Schedule callbacks, embassy document reviews, and check-ins</p>
        </div>
        <button
          onClick={() => {
            setIsAdding(!isAdding);
            if (customers.length > 0 && !selectedCustomerId) {
              setSelectedCustomerId(customers[0].id);
            }
          }}
          id="btn-toggle-add-followup"
          className="inline-flex items-center gap-1.5 bg-[#5A5A40] hover:bg-[#4a4a34] dark:bg-[#5A5A40] dark:hover:bg-[#6c6c4e] text-white font-medium text-xs px-4 py-2 rounded-full shadow-lg shadow-[#5A5A40]/10 transition-colors cursor-pointer"
        >
          {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {isAdding ? 'Close' : 'Schedule'}
        </button>
      </div>

      {/* Global Status Alerts */}
      {actionStatus.type === 'error' && (
        <div id="followup-alert-error" className="p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-300 leading-tight">
          <AlertCircle className="w-4.5 h-4.5 shrink-0 text-rose-500 mt-0.5" />
          <span>{actionStatus.message}</span>
        </div>
      )}

      {actionStatus.type === 'success' && (
        <div id="followup-alert-success" className="p-3.5 bg-[#5A5A40]/10 dark:bg-[#5A5A40]/20 border border-[#5A5A40]/20 dark:border-[#8a8a70]/30 rounded-2xl flex items-start gap-2.5 text-xs text-[#5A5A40] dark:text-[#ecece5] leading-tight">
          <CheckCircle2 className="w-4.5 h-4.5 shrink-0 text-[#5A5A40] dark:text-[#ecece5] mt-0.5" />
          <span>{actionStatus.message}</span>
        </div>
      )}

      {actionStatus.type === 'loading' && (
        <div id="followup-alert-loading" className="p-3.5 bg-[#5A5A40]/5 dark:bg-[#5A5A40]/10 border border-[#5A5A40]/10 dark:border-[#8a8a70]/20 rounded-2xl flex items-start gap-2.5 text-xs text-[#5A5A40]/85 dark:text-[#ecece5]/80 leading-tight">
          <Loader2 className="w-4.5 h-4.5 shrink-0 text-[#5A5A40] dark:text-[#ecece5] animate-spin mt-0.5" />
          <span>{actionStatus.message}</span>
        </div>
      )}

      {/* Expandable Add Follow-up Form */}
      {isAdding && (
        <div className="bg-white dark:bg-[#20201a] rounded-3xl border border-[#5A5A40]/10 dark:border-[#8a8a70]/20 p-5 space-y-4 animate-fade-in" id="add-followup-form-container">
          <div className="flex items-center gap-2 pb-3 border-b border-[#5A5A40]/10 dark:border-[#8a8a70]/20">
            <CalendarDays className="w-4.5 h-4.5 text-[#5A5A40] dark:text-[#ecece5]" />
            <h3 className="font-serif font-bold text-sm text-[#5A5A40] dark:text-[#ecece5]">Schedule Follow-up Task</h3>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            
            {/* Candidate Selector */}
            <div>
              <label htmlFor="followup-candidate" className="block text-xs font-semibold text-[#5A5A40]/85 dark:text-[#8a8a70] mb-1.5">
                Candidate <span className="text-rose-500">*</span>
              </label>
              {customers.length > 0 ? (
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5A5A40]/45">
                    <User className="w-4 h-4" />
                  </div>
                  <select
                    id="followup-candidate"
                    className="w-full text-sm bg-[#f5f5f0]/50 dark:bg-[#151510]/50 border border-[#5A5A40]/15 dark:border-[#8a8a70]/30 rounded-xl pl-10 pr-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-[#5A5A40] focus:bg-white dark:focus:bg-[#1e1e18] text-[#2c2c26] dark:text-[#f5f5f0] appearance-none cursor-pointer transition-all"
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.mobileNumber})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="text-xs text-amber-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 rounded-xl p-3">
                  No candidates registered. Please add a candidate profile first!
                </div>
              )}
            </div>

            {/* Date & Time Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="followup-date" className="block text-xs font-semibold text-[#5A5A40]/85 dark:text-[#8a8a70] mb-1.5">
                  Follow-up Date <span className="text-rose-500">*</span>
                </label>
                <div className="relative font-mono">
                  <input
                    type="date"
                    id="followup-date"
                    required
                    className="w-full text-xs bg-[#f5f5f0]/50 dark:bg-[#151510]/50 border border-[#5A5A40]/15 dark:border-[#8a8a70]/30 rounded-xl px-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-[#5A5A40] focus:bg-white dark:focus:bg-[#1e1e18] text-[#2c2c26] dark:text-[#f5f5f0] transition-all"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="followup-time" className="block text-xs font-semibold text-[#5A5A40]/85 dark:text-[#8a8a70] mb-1.5">
                  Time <span className="text-rose-500">*</span>
                </label>
                <div className="relative font-mono">
                  <input
                    type="time"
                    id="followup-time"
                    required
                    className="w-full text-xs bg-[#f5f5f0]/50 dark:bg-[#151510]/50 border border-[#5A5A40]/15 dark:border-[#8a8a70]/30 rounded-xl px-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-[#5A5A40] focus:bg-white dark:focus:bg-[#1e1e18] text-[#2c2c26] dark:text-[#f5f5f0] transition-all"
                    value={followUpTime}
                    onChange={(e) => setFollowUpTime(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Task Description Notes */}
            <div>
              <label htmlFor="followup-notes" className="block text-xs font-semibold text-[#5A5A40]/85 dark:text-[#8a8a70] mb-1.5">
                Notes / Reminder Objective <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute top-3 left-3 text-[#5A5A40]/45">
                  <FileText className="w-4 h-4" />
                </div>
                <textarea
                  id="followup-notes"
                  required
                  rows={3}
                  className="w-full text-sm bg-[#f5f5f0]/50 dark:bg-[#151510]/50 border border-[#5A5A40]/15 dark:border-[#8a8a70]/30 rounded-xl pl-10 pr-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-[#5A5A40] focus:bg-white dark:focus:bg-[#1e1e18] text-[#2c2c26] dark:text-[#f5f5f0] resize-none transition-all"
                  placeholder="e.g. Call to verify passport details and checklist of embassy documents."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              id="btn-submit-followup"
              disabled={customers.length === 0}
              className="w-full bg-[#5A5A40] hover:bg-[#4a4a34] dark:bg-[#5A5A40] dark:hover:bg-[#6c6c4e] disabled:opacity-50 text-white font-medium text-sm py-3 px-4 rounded-full shadow-lg shadow-[#5A5A40]/10 transition-colors flex items-center justify-center gap-2 focus:outline-none cursor-pointer h-12"
            >
              <CalendarDays className="w-4.5 h-4.5" />
              Schedule Reminder
            </button>

          </form>
        </div>
      )}

      {/* Filter Tabs & Content Section */}
      <div className="space-y-4">
        
        {/* Navigation row for tabs */}
        <div className="bg-[#f5f5f0] dark:bg-[#151510] p-1 rounded-2xl flex border border-[#5A5A40]/10 dark:border-[#8a8a70]/20" id="followups-filter-tabs">
          {[
            { id: 'today', label: "Today's Tasks" },
            { id: 'upcoming', label: 'All Pending' },
            { id: 'completed', label: 'Completed Log' }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as FilterTab);
                  setEditingId(null);
                  setReschedulingId(null);
                  setDeletingId(null);
                }}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl text-center transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-white dark:bg-[#20201a] text-[#5A5A40] dark:text-[#ecece5] shadow-xs' 
                    : 'text-[#2c2c26]/60 dark:text-[#8a8a70]/60 hover:text-[#2c2c26] dark:hover:text-[#ecece5]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* List of Tasks */}
        <div className="space-y-3.5" id="followups-list">
          {filteredFollowUps.length > 0 ? (
            filteredFollowUps.map(f => {
              const isEditing = editingId === f.id;
              const isRescheduling = reschedulingId === f.id;
              const isConfirmDeleting = deletingId === f.id;
              const overdue = isFollowUpOverdue(f);

              // Set the color based on the strict status tags rules
              let statusBadgeStyle = '';
              if (f.status === 'Completed') {
                statusBadgeStyle = 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20';
              } else if (overdue) {
                statusBadgeStyle = 'bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/20 font-bold';
              } else {
                // Pending (Orange #F97316)
                statusBadgeStyle = 'bg-[#F97316]/10 text-[#F97316] border-[#F97316]/20';
              }

              return (
                <div
                  key={f.id}
                  id={`followup-card-${f.id}`}
                  className={`bg-white dark:bg-[#20201a] p-4 rounded-2xl border transition-all ${
                    f.status === 'Completed' 
                      ? 'border-[#5A5A40]/10 dark:border-[#8a8a70]/10 opacity-75' 
                      : overdue
                        ? 'border-[#DC2626]/30 bg-rose-50/10 dark:bg-rose-950/5'
                        : f.followUpDate === todayStr 
                          ? 'border-[#F97316]/30 bg-[#F97316]/5' 
                          : 'border-[#5A5A40]/10 dark:border-[#8a8a70]/20'
                  }`}
                >
                  <div className="space-y-3">
                    
                    {/* Top Row: Info Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <h4 className="font-serif font-bold text-sm text-[#5A5A40] dark:text-[#ecece5]" id={`followup-name-${f.id}`}>{f.name}</h4>
                        <div className="flex items-center gap-2 text-xs text-[#5A5A40]/75 dark:text-[#8a8a70]">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-[#5A5A40]/40" />
                            <a href={`tel:${f.mobileNumber}`} className="hover:underline text-[#5A5A40] dark:text-[#b8b89e] font-semibold">{f.mobileNumber}</a>
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 text-right font-mono text-[10px]">
                        <span className="font-bold text-[#5A5A40] dark:text-[#ecece5] bg-[#f5f5f0] dark:bg-[#151510] border border-[#5A5A40]/10 dark:border-[#8a8a70]/20 px-1.5 py-0.5 rounded-md shrink-0">
                          {f.id}
                        </span>
                        
                        {/* Date and Time values with exact colors */}
                        <span className={`inline-flex items-center gap-1 font-bold border px-1.5 py-0.5 rounded-md ${statusBadgeStyle}`}>
                          <Calendar className="w-3 h-3" />
                          {overdue ? 'OVERDUE: ' : ''}{getRelativeDateLabel(f.followUpDate)} @ {f.followUpTime}
                        </span>
                      </div>
                    </div>

                    {/* Notes Area */}
                    <div className="bg-[#f5f5f0]/45 dark:bg-[#151510]/40 p-3 rounded-xl border border-[#5A5A40]/5 dark:border-[#8a8a70]/10">
                      {isEditing ? (
                        <div className="space-y-2">
                          <textarea
                            className="w-full text-xs bg-white dark:bg-[#20201a] border border-[#5A5A40]/15 dark:border-[#8a8a70]/30 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-[#5A5A40] text-[#2c2c26] dark:text-[#f5f5f0]"
                            rows={3}
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                          />
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-2.5 py-1 text-[10px] font-bold text-[#2c2c26]/60 dark:text-[#ecece5]/60 border border-[#2c2c26]/10 dark:border-white/10 rounded-md hover:bg-black/5"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveNotes(f.id)}
                              className="px-3 py-1 text-[10px] font-bold bg-[#5A5A40] text-white rounded-md hover:bg-[#4a4a34]"
                            >
                              Save Notes
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-[#2c2c26]/90 dark:text-[#ecece5] whitespace-pre-wrap leading-relaxed break-words italic font-sans">
                          "{f.notes}"
                        </p>
                      )}
                    </div>

                    {/* Rescheduling Form Inline */}
                    {isRescheduling && (
                      <div className="p-3 border border-amber-200 dark:border-amber-900/40 bg-amber-50/20 rounded-xl space-y-3 font-mono animate-fade-in">
                        <span className="text-[10px] font-bold text-amber-950 dark:text-amber-400 uppercase block">Reschedule Follow-up</span>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="date"
                            required
                            className="text-xs bg-white dark:bg-[#20201a] border border-[#5A5A40]/15 dark:border-[#8a8a70]/30 rounded-lg p-2 focus:outline-none text-[#2c2c26] dark:text-[#f5f5f0]"
                            value={rescheduleDate}
                            onChange={(e) => setRescheduleDate(e.target.value)}
                          />
                          <input
                            type="time"
                            required
                            className="text-xs bg-white dark:bg-[#20201a] border border-[#5A5A40]/15 dark:border-[#8a8a70]/30 rounded-lg p-2 focus:outline-none text-[#2c2c26] dark:text-[#f5f5f0]"
                            value={rescheduleTime}
                            onChange={(e) => setRescheduleTime(e.target.value)}
                          />
                        </div>
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => setReschedulingId(null)}
                            className="px-2.5 py-1 text-[10px] font-bold text-[#2c2c26]/60 dark:text-[#ecece5]/60 border border-[#2c2c26]/10 dark:border-white/10 rounded-md"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveReschedule(f.id)}
                            className="px-3 py-1 text-[10px] font-bold bg-[#F97316] text-white rounded-md hover:bg-opacity-90"
                          >
                            Reschedule
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Confirmation Dialog Inline for Deletion */}
                    {isConfirmDeleting && (
                      <div className="p-3 border border-rose-200 dark:border-rose-900/40 bg-rose-50/45 dark:bg-rose-950/10 rounded-xl space-y-2 animate-fade-in">
                        <p className="text-xs font-semibold text-rose-950 dark:text-rose-300">Are you absolutely sure you want to delete this follow-up?</p>
                        <p className="text-[10px] text-rose-800 dark:text-rose-400 leading-normal">This action is irreversible and will remove the record permanently.</p>
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => setDeletingId(null)}
                            className="px-2.5 py-1 text-[10px] font-bold text-[#2c2c26]/60 dark:text-[#ecece5]/60 border border-[#2c2c26]/10 dark:border-white/10 rounded-md"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleDelete(f.id)}
                            className="px-3 py-1 text-[10px] font-bold bg-rose-600 text-white rounded-md hover:bg-rose-700"
                          >
                            Delete Permanently
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Footer row of card: Action buttons */}
                    {!isConfirmDeleting && (
                      <div className="flex items-center justify-between pt-2.5 border-t border-[#f5f5f0] dark:border-[#151510]">
                        <span className="text-[9px] text-[#5A5A40]/55 dark:text-[#8a8a70] uppercase font-bold tracking-wider">
                          Created: {new Date(f.createdAt || '').toLocaleDateString()}
                        </span>
                        
                        <div className="flex items-center gap-2">
                          
                          {/* Complete action */}
                          {f.status === 'Pending' && (
                            <button
                              onClick={() => handleMarkComplete(f)}
                              title="Mark Completed"
                              id={`btn-complete-followup-${f.id}`}
                              className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-[#5A5A40] dark:text-[#ecece5] hover:text-emerald-700 dark:hover:text-emerald-400 border border-[#5A5A40]/10 dark:border-[#8a8a70]/30 rounded-lg active:scale-95 transition-all cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Edit Notes action */}
                          {!isEditing && (
                            <button
                              onClick={() => {
                                setEditingId(f.id);
                                setEditNotes(f.notes);
                                setReschedulingId(null);
                                setDeletingId(null);
                              }}
                              title="Edit Notes"
                              id={`btn-edit-notes-${f.id}`}
                              className="p-1.5 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-[#5A5A40] dark:text-[#ecece5] hover:text-amber-700 dark:hover:text-amber-400 border border-[#5A5A40]/10 dark:border-[#8a8a70]/30 rounded-lg active:scale-95 transition-all cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Reschedule action */}
                          {f.status === 'Pending' && !isRescheduling && (
                            <button
                              onClick={() => {
                                setReschedulingId(f.id);
                                setRescheduleDate(f.followUpDate);
                                setRescheduleTime(f.followUpTime);
                                setEditingId(null);
                                setDeletingId(null);
                              }}
                              title="Reschedule Reminder"
                              id={`btn-reschedule-${f.id}`}
                              className="p-1.5 hover:bg-sky-50 dark:hover:bg-sky-950/20 text-[#5A5A40] dark:text-[#ecece5] hover:text-sky-700 dark:hover:text-sky-400 border border-[#5A5A40]/10 dark:border-[#8a8a70]/30 rounded-lg active:scale-95 transition-all cursor-pointer"
                            >
                              <Clock className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete action */}
                          <button
                            onClick={() => {
                              setDeletingId(f.id);
                              setEditingId(null);
                              setReschedulingId(null);
                            }}
                            title="Delete Reminder"
                            id={`btn-delete-followup-${f.id}`}
                            className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-[#5A5A40] dark:text-[#ecece5] hover:text-rose-700 dark:hover:text-rose-400 border border-[#5A5A40]/10 dark:border-[#8a8a70]/30 rounded-lg active:scale-95 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                        </div>
                      </div>
                    )}

                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white dark:bg-[#20201a] rounded-3xl border border-[#5A5A40]/10 dark:border-[#8a8a70]/20 p-8 text-center space-y-4" id="followups-empty-state">
              <div className="w-12 h-12 bg-[#f5f5f0] dark:bg-[#151510] rounded-full flex items-center justify-center mx-auto text-[#5A5A40]/40 dark:text-[#8a8a70]/55">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-[#5A5A40] dark:text-[#ecece5] text-sm">No follow-ups logged</h4>
                <p className="text-xs text-[#5A5A40]/60 dark:text-[#8a8a70]/80 mt-1 max-w-xs mx-auto">
                  {activeTab === 'today' 
                    ? "Hooray! No urgent follow-ups scheduled for today." 
                    : activeTab === 'upcoming' 
                      ? "You don't have any pending follow-ups in the books." 
                      : "No completed follow-ups logged in the record."}
                </p>
              </div>
              {activeTab !== 'completed' && (
                <button
                  onClick={() => setIsAdding(true)}
                  className="inline-flex items-center gap-1.5 bg-[#5A5A40] hover:bg-[#4a4a34] dark:bg-[#5A5A40] dark:hover:bg-[#6c6c4e] text-white font-medium text-xs px-5 py-2.5 rounded-full shadow-lg shadow-[#5A5A40]/10 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Schedule One Now
                </button>
              )}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
