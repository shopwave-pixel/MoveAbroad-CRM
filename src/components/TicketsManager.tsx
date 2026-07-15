import React, { useState, useEffect } from 'react';
import { Customer, Ticket, TicketStatus } from '../types';
import { 
  FilePlus2, 
  User, 
  Phone, 
  AlignLeft, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Search, 
  SlidersHorizontal, 
  Trash2, 
  Edit2, 
  X, 
  Check, 
  Clock, 
  Plus, 
  AlertTriangle,
  History,
  Info
} from 'lucide-react';

interface TicketsManagerProps {
  customers: Customer[];
  tickets: Ticket[];
  onAddCustomer: (
    name: string, 
    mobileNumber: string,
    whatsAppNumber?: string,
    destinationCountry?: string,
    source?: string,
    remarks?: string
  ) => Promise<{ success: boolean; customer?: Customer; error?: string }>;
  onCreateTicket: (
    customerId: string,
    name: string,
    mobileNumber: string,
    conversationDescription: string,
    status: TicketStatus
  ) => Promise<{ success: boolean; ticket?: Ticket; error?: string }>;
  onUpdateTicket: (id: string, updates: Partial<Ticket>) => Promise<{ success: boolean; message?: string; error?: string }>;
  onDeleteTicket: (id: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  preselectedCustomerId?: string;
}

export default function TicketsManager({
  customers,
  tickets,
  onAddCustomer,
  onCreateTicket,
  onUpdateTicket,
  onDeleteTicket,
  preselectedCustomerId
}: TicketsManagerProps) {
  // Mode toggles
  const [subView, setSubView] = useState<'list' | 'create'>('list');
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing');
  
  // Create Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerMobile, setNewCustomerMobile] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TicketStatus>('Open');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | TicketStatus>('All');

  // Edit / Action States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState<TicketStatus>('Open');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Status indicator
  const [alert, setAlert] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message: string }>({
    type: 'idle',
    message: ''
  });

  // Handle pre-selection of candidate profile
  useEffect(() => {
    if (preselectedCustomerId) {
      setSubView('create');
      setCustomerMode('existing');
      setSelectedCustomerId(preselectedCustomerId);
    } else if (customers.length > 0 && !selectedCustomerId) {
      setSelectedCustomerId(customers[0].id);
    }
  }, [preselectedCustomerId, customers]);

  // Handle Form Submission (Create Ticket)
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      setAlert({ type: 'error', message: 'Ticket description is required.' });
      return;
    }

    setAlert({ type: 'loading', message: 'Generating visa support ticket...' });

    try {
      let finalCustomerId = '';
      let finalName = '';
      let finalMobile = '';

      if (customerMode === 'new') {
        const trimmedName = newCustomerName.trim();
        const trimmedMobile = newCustomerMobile.trim();

        if (!trimmedName || !trimmedMobile) {
          setAlert({ type: 'error', message: 'Candidate name and mobile number are required.' });
          return;
        }

        // Quick duplicate check
        const digitsInput = trimmedMobile.replace(/\D/g, '');
        const duplicate = customers.some(c => c.mobileNumber.replace(/\D/g, '') === digitsInput);
        if (duplicate) {
          setAlert({ type: 'error', message: 'A candidate with this mobile number already exists.' });
          return;
        }

        // Create Customer
        const custResult = await onAddCustomer(trimmedName, trimmedMobile);
        if (!custResult.success || !custResult.customer) {
          setAlert({ 
            type: 'error', 
            message: custResult.error || 'Failed to register candidate profile. Ticket aborted.' 
          });
          return;
        }

        finalCustomerId = custResult.customer.id;
        finalName = custResult.customer.name;
        finalMobile = custResult.customer.mobileNumber;
      } else {
        const existing = customers.find(c => c.id === selectedCustomerId);
        if (!existing) {
          setAlert({ type: 'error', message: 'Please select a valid candidate.' });
          return;
        }
        finalCustomerId = existing.id;
        finalName = existing.name;
        finalMobile = existing.mobileNumber;
      }

      // Create Ticket
      const res = await onCreateTicket(
        finalCustomerId,
        finalName,
        finalMobile,
        description.trim(),
        status
      );

      if (res.success && res.ticket) {
        setAlert({
          type: 'success',
          message: `Visa Ticket ${res.ticket.id} created successfully!`
        });
        
        // Reset inputs
        setDescription('');
        setNewCustomerName('');
        setNewCustomerMobile('');
        setStatus('Open');
        
        if (customerMode === 'new') {
          setCustomerMode('existing');
          setSelectedCustomerId(finalCustomerId);
        }
        
        // Transition back to list after a brief delay
        setTimeout(() => {
          setSubView('list');
          setAlert({ type: 'idle', message: '' });
        }, 1500);
      } else {
        setAlert({ type: 'error', message: res.error || 'Failed to generate ticket.' });
      }

    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'An unexpected error occurred.' });
    }
  };

  // Handle Updates
  const handleSaveEdit = async (id: string) => {
    if (!editDescription.trim()) return;
    setAlert({ type: 'loading', message: 'Updating ticket records...' });
    try {
      const res = await onUpdateTicket(id, { 
        conversationDescription: editDescription.trim(), 
        status: editStatus 
      });
      if (res.success) {
        setAlert({ type: 'success', message: 'Ticket updated successfully!' });
        setEditingId(null);
        setTimeout(() => setAlert({ type: 'idle', message: '' }), 3000);
      } else {
        setAlert({ type: 'error', message: res.error || 'Failed to update ticket.' });
      }
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'An unexpected error occurred.' });
    }
  };

  // Handle Deletes
  const handleDeleteTicket = async (id: string) => {
    setAlert({ type: 'loading', message: 'Deleting support ticket...' });
    try {
      const res = await onDeleteTicket(id);
      if (res.success) {
        setAlert({ type: 'success', message: 'Ticket deleted successfully!' });
        setDeletingId(null);
        setTimeout(() => setAlert({ type: 'idle', message: '' }), 3000);
      } else {
        setAlert({ type: 'error', message: res.error || 'Failed to delete ticket.' });
      }
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'An unexpected error occurred.' });
    }
  };

  // Filter & Search Tickets list
  const filteredTickets = tickets
    .filter(t => {
      // Filter status
      if (statusFilter !== 'All' && t.status !== statusFilter) return false;
      
      // Search text matches (Ticket ID, Customer Name, Mobile)
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        t.id.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.mobileNumber.includes(q)
      );
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // Newest first

  const formatDateTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6" id="tickets-manager-container">
      
      {/* Dynamic Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-serif font-bold text-[#5A5A40] dark:text-[#ecece5] tracking-tight">Visa Support Tickets</h2>
          <p className="text-xs text-[#5A5A40]/60 dark:text-[#8a8a70]">Track candidate documentation, embassy appointments & interview notes</p>
        </div>

        {/* Mode Switcher */}
        <button
          onClick={() => {
            setSubView(subView === 'list' ? 'create' : 'list');
            setAlert({ type: 'idle', message: '' });
          }}
          id="btn-toggle-ticket-view"
          className="inline-flex items-center gap-1.5 bg-[#5A5A40] hover:bg-[#4a4a34] dark:bg-[#5A5A40] dark:hover:bg-[#6c6c4e] text-white font-medium text-xs px-4 py-2 rounded-full shadow-lg shadow-[#5A5A40]/10 transition-colors cursor-pointer"
        >
          {subView === 'list' ? (
            <>
              <Plus className="w-4 h-4" />
              <span>File Ticket</span>
            </>
          ) : (
            <>
              <History className="w-4 h-4" />
              <span>View Logs</span>
            </>
          )}
        </button>
      </div>

      {/* Global Status Banner */}
      {alert.type === 'error' && (
        <div id="ticket-alert-error" className="p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-300 leading-tight">
          <AlertCircle className="w-4.5 h-4.5 shrink-0 text-rose-500 mt-0.5" />
          <span>{alert.message}</span>
        </div>
      )}

      {alert.type === 'success' && (
        <div id="ticket-alert-success" className="p-3.5 bg-[#5A5A40]/10 dark:bg-[#5A5A40]/20 border border-[#5A5A40]/20 dark:border-[#8a8a70]/30 rounded-2xl flex items-start gap-2.5 text-xs text-[#5A5A40] dark:text-[#ecece5] leading-tight">
          <CheckCircle2 className="w-4.5 h-4.5 shrink-0 text-[#5A5A40] dark:text-[#ecece5] mt-0.5" />
          <span>{alert.message}</span>
        </div>
      )}

      {alert.type === 'loading' && (
        <div id="ticket-alert-loading" className="p-3.5 bg-[#5A5A40]/5 dark:bg-[#5A5A40]/10 border border-[#5A5A40]/10 dark:border-[#8a8a70]/20 rounded-2xl flex items-start gap-2.5 text-xs text-[#5A5A40]/85 dark:text-[#ecece5]/80 leading-tight">
          <Loader2 className="w-4.5 h-4.5 shrink-0 text-[#5A5A40] dark:text-[#ecece5] animate-spin mt-0.5" />
          <span>{alert.message}</span>
        </div>
      )}

      {/* VIEW 1: FILE NEW TICKET FORM */}
      {subView === 'create' && (
        <div className="bg-white dark:bg-[#20201a] rounded-3xl border border-[#5A5A40]/10 dark:border-[#8a8a70]/20 p-5 space-y-5 animate-fade-in" id="ticket-form-card">
          <div className="flex items-center gap-2 pb-3 border-b border-[#5A5A40]/10 dark:border-[#8a8a70]/20">
            <FilePlus2 className="w-5 h-5 text-[#5A5A40] dark:text-[#ecece5]" />
            <h3 className="font-serif font-bold text-sm text-[#5A5A40] dark:text-[#ecece5]">Log New Candidate Activity</h3>
          </div>

          <form onSubmit={handleCreate} className="space-y-4" id="ticket-form">
            
            {/* Customer Selection Mode Toggle */}
            <div className="bg-[#f5f5f0] dark:bg-[#151510] p-1 rounded-xl grid grid-cols-2 text-center border border-[#5A5A40]/5 dark:border-[#8a8a70]/10" id="customer-mode-switch">
              <button
                type="button"
                id="btn-mode-existing"
                onClick={() => setCustomerMode('existing')}
                className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  customerMode === 'existing' 
                    ? 'bg-white dark:bg-[#20201a] text-[#5A5A40] dark:text-[#ecece5] shadow-xs' 
                    : 'text-[#2c2c26]/60 dark:text-[#8a8a70]/60 hover:text-[#2c2c26] dark:hover:text-[#ecece5]'
                }`}
              >
                Existing Candidate
              </button>
              <button
                type="button"
                id="btn-mode-new"
                onClick={() => setCustomerMode('new')}
                className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  customerMode === 'new' 
                    ? 'bg-white dark:bg-[#20201a] text-[#5A5A40] dark:text-[#ecece5] shadow-xs' 
                    : 'text-[#2c2c26]/60 dark:text-[#8a8a70]/60 hover:text-[#2c2c26] dark:hover:text-[#ecece5]'
                }`}
              >
                Register New Candidate
              </button>
            </div>

            {/* Mode: Existing Customer Selector */}
            {customerMode === 'existing' ? (
              <div>
                <label htmlFor="ticket-customer-select" className="block text-xs font-semibold text-[#5A5A40]/85 dark:text-[#8a8a70] mb-1.5">
                  Select Candidate <span className="text-rose-500">*</span>
                </label>
                {customers.length > 0 ? (
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5A5A40]/45">
                      <User className="w-4 h-4" />
                    </div>
                    <select
                      id="ticket-customer-select"
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
                  <div className="text-xs text-amber-850 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/45 rounded-xl p-3">
                    No candidates registered yet. Please use the "Register New Candidate" tab to add one.
                  </div>
                )}
              </div>
            ) : (
              /* Mode: New Candidate Profile Inputs */
              <div className="space-y-3 p-4 bg-[#f5f5f0]/50 dark:bg-[#151510]/40 rounded-2xl border border-[#5A5A40]/10 dark:border-[#8a8a70]/15">
                <span className="text-[10px] font-bold tracking-wider text-[#5A5A40]/60 dark:text-[#8a8a70] uppercase block mb-1">New Candidate Details</span>
                <div>
                  <label htmlFor="new-customer-name" className="block text-[11px] font-semibold text-[#5A5A40]/75 dark:text-[#8a8a70] mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="new-customer-name"
                    className="w-full text-sm bg-white dark:bg-[#20201a] border border-[#5A5A40]/15 dark:border-[#8a8a70]/30 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#5A5A40] text-[#2c2c26] dark:text-[#f5f5f0] transition-colors"
                    placeholder="e.g. Abul Kalam"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="new-customer-mobile" className="block text-[11px] font-semibold text-[#5A5A40]/75 dark:text-[#8a8a70] mb-1">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#5A5A40]/45">
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="tel"
                      id="new-customer-mobile"
                      className="w-full text-sm bg-white dark:bg-[#20201a] border border-[#5A5A40]/15 dark:border-[#8a8a70]/30 rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#5A5A40] text-[#2c2c26] dark:text-[#f5f5f0] transition-colors"
                      placeholder="e.g. +880 1712-345678"
                      value={newCustomerMobile}
                      onChange={(e) => setNewCustomerMobile(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Status Selector */}
            <div>
              <label htmlFor="ticket-status" className="block text-xs font-semibold text-[#5A5A40]/85 dark:text-[#8a8a70] mb-1.5">
                Ticket Status <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2" id="ticket-status-grid">
                {(['Open', 'Pending', 'Closed'] as TicketStatus[]).map((st) => {
                  const isActive = status === st;
                  let activeColor = '';
                  let normalBorder = 'bg-white dark:bg-[#20201a] border-[#5A5A40]/15 dark:border-[#8a8a70]/30 text-[#5A5A40]/80 dark:text-[#ecece5]/80 hover:bg-[#5A5A40]/5';
                  
                  if (isActive) {
                    if (st === 'Open') activeColor = 'bg-[#22C55E] text-white border-[#22C55E] shadow-xs';
                    if (st === 'Pending') activeColor = 'bg-[#F59E0B] text-white border-[#F59E0B] shadow-xs';
                    if (st === 'Closed') activeColor = 'bg-[#EF4444] text-white border-[#EF4444] shadow-xs';
                  }

                  return (
                    <button
                      key={st}
                      type="button"
                      id={`btn-status-${st.toLowerCase()}`}
                      onClick={() => setStatus(st)}
                      className={`py-2.5 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                        isActive 
                          ? activeColor 
                          : normalBorder
                      }`}
                    >
                      {st}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Conversation Notes */}
            <div>
              <label htmlFor="ticket-description" className="block text-xs font-semibold text-[#5A5A40]/85 dark:text-[#8a8a70] mb-1.5">
                Activity Conversation Description <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute top-3 left-3 text-[#5A5A40]/45">
                  <AlignLeft className="w-4 h-4" />
                </div>
                <textarea
                  id="ticket-description"
                  required
                  rows={4}
                  className="w-full text-sm bg-[#f5f5f0]/50 dark:bg-[#151510]/50 border border-[#5A5A40]/15 dark:border-[#8a8a70]/30 rounded-xl pl-10 pr-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-[#5A5A40] focus:bg-white dark:focus:bg-[#1e1e18] text-[#2c2c26] dark:text-[#f5f5f0] resize-none transition-all"
                  placeholder="e.g. Completed intake questionnaire. Provided the standard document checklist for Saudi Arabia employment visa. Needs to provide certified translation of transcripts by next Monday."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              id="btn-submit-ticket"
              disabled={customerMode === 'existing' && customers.length === 0}
              className="w-full bg-[#5A5A40] hover:bg-[#4a4a34] dark:bg-[#5A5A40] dark:hover:bg-[#6c6c4e] disabled:opacity-50 text-white font-medium text-sm py-3 px-4 rounded-full shadow-lg shadow-[#5A5A40]/10 transition-colors flex items-center justify-center gap-2 focus:outline-none cursor-pointer h-12"
            >
              <FilePlus2 className="w-4.5 h-4.5" />
              Generate Visa Ticket
            </button>
          </form>
        </div>
      )}

      {/* VIEW 2: SEARCHABLE ALL TICKETS LIST */}
      {subView === 'list' && (
        <div className="space-y-4" id="tickets-history-list-view">
          
          {/* Search bar & filter controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            
            {/* Search Input */}
            <div className="relative sm:col-span-2">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#5A5A40]/55 dark:text-[#8a8a70]/70">
                <Search className="w-4.5 h-4.5" />
              </div>
              <input
                type="text"
                placeholder="Search ticket ID, candidate name, mobile..."
                className="w-full text-xs bg-white dark:bg-[#20201a] border border-[#5A5A40]/20 dark:border-[#8a8a70]/30 rounded-xl pl-9 pr-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-[#5A5A40] text-[#2c2c26] dark:text-[#f5f5f0]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#5A5A40]/40 hover:text-[#5A5A40]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Dropdown */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#5A5A40]/55 dark:text-[#8a8a70]/70">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <select
                className="w-full text-xs bg-white dark:bg-[#20201a] border border-[#5A5A40]/20 dark:border-[#8a8a70]/30 rounded-xl pl-9 pr-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-[#5A5A40] appearance-none cursor-pointer text-[#2c2c26] dark:text-[#f5f5f0] font-semibold"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="All">All Ticket Statuses</option>
                <option value="Open">Open</option>
                <option value="Pending">Pending</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

          </div>

          {/* Table / List representation */}
          <div className="space-y-3.5" id="ticket-items-feed">
            {filteredTickets.length > 0 ? (
              filteredTickets.map(t => {
                const isEditing = editingId === t.id;
                const isConfirmDeleting = deletingId === t.id;

                let badgeStyle = '';
                if (t.status === 'Open') badgeStyle = 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20';
                else if (t.status === 'Pending') badgeStyle = 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20';
                else badgeStyle = 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20';

                return (
                  <div
                    key={t.id}
                    id={`ticket-card-${t.id}`}
                    className="bg-white dark:bg-[#20201a] p-4 rounded-2xl border border-[#5A5A40]/10 dark:border-[#8a8a70]/20 shadow-xs space-y-3 hover:border-[#5A5A40]/20 dark:hover:border-[#8a8a70]/30 transition-all"
                  >
                    
                    {/* Header line of card */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="font-serif font-bold text-sm text-[#5A5A40] dark:text-[#ecece5]">{t.name}</h4>
                          <span className="font-mono text-[9px] font-bold text-[#5A5A40]/65 dark:text-[#8a8a70] bg-[#f5f5f0] dark:bg-[#151510] border border-[#5A5A40]/10 dark:border-[#8a8a70]/20 px-1.5 py-0.2 rounded-md">
                            {t.id}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-[#5A5A40]/60 dark:text-[#8a8a70]/80">
                          <Phone className="w-3 h-3 text-[#5A5A40]/30" />
                          <span>{t.mobileNumber}</span>
                        </div>
                      </div>

                      {/* Status select toggle or badge */}
                      {isEditing ? (
                        <div className="flex gap-1">
                          {(['Open', 'Pending', 'Closed'] as TicketStatus[]).map(st => {
                            let selectStyle = 'bg-white dark:bg-[#20201a] text-[#2c2c26]/60 dark:text-[#8a8a70] border-black/10 dark:border-white/10';
                            if (editStatus === st) {
                              if (st === 'Open') selectStyle = 'bg-[#22C55E] text-white border-[#22C55E]';
                              if (st === 'Pending') selectStyle = 'bg-[#F59E0B] text-white border-[#F59E0B]';
                              if (st === 'Closed') selectStyle = 'bg-[#EF4444] text-white border-[#EF4444]';
                            }
                            return (
                              <button
                                key={st}
                                type="button"
                                onClick={() => setEditStatus(st)}
                                className={`text-[9px] font-bold px-2 py-1 rounded-md border transition-colors cursor-pointer ${selectStyle}`}
                              >
                                {st}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border flex items-center gap-1 shrink-0 ${badgeStyle}`}>
                          {t.status === 'Open' && <Clock className="w-3 h-3 shrink-0" />}
                          {t.status}
                        </span>
                      )}
                    </div>

                    {/* Description Notes Text */}
                    <div className="bg-[#f5f5f0]/45 dark:bg-[#151510]/40 p-3 rounded-xl border border-[#5A5A40]/5 dark:border-[#8a8a70]/10">
                      {isEditing ? (
                        <div className="space-y-2">
                          <textarea
                            className="w-full text-xs bg-white dark:bg-[#20201a] border border-[#5A5A40]/15 dark:border-[#8a8a70]/30 rounded-xl p-2.5 focus:outline-none text-[#2c2c26] dark:text-[#f5f5f0]"
                            rows={3}
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                          />
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-2 py-1 text-[10px] font-bold border border-black/10 dark:border-white/10 rounded-md bg-white dark:bg-[#20201a] text-[#2c2c26] dark:text-[#ecece5]"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveEdit(t.id)}
                              className="px-3 py-1 text-[10px] font-bold bg-[#5A5A40] text-white rounded-md cursor-pointer"
                            >
                              Save Ticket
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-[#2c2c26]/90 dark:text-[#ecece5] whitespace-pre-wrap leading-relaxed break-words font-sans">
                          {t.conversationDescription}
                        </p>
                      )}
                    </div>

                    {/* Inline Confirmation for Ticket delete */}
                    {isConfirmDeleting && (
                      <div className="p-3 border border-rose-200 dark:border-rose-900 bg-rose-50/30 dark:bg-rose-950/10 rounded-xl space-y-2">
                        <p className="text-xs font-semibold text-rose-950 dark:text-rose-300 flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4 text-rose-500" />
                          Delete support record {t.id}?
                        </p>
                        <div className="flex items-center gap-1.5 justify-end">
                          <button
                            onClick={() => setDeletingId(null)}
                            className="px-2.5 py-1 text-[10px] font-bold border border-black/10 rounded-md bg-white dark:bg-[#20201a] text-black dark:text-white"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleDeleteTicket(t.id)}
                            className="px-3.5 py-1 text-[10px] font-bold bg-rose-600 text-white rounded-md cursor-pointer"
                          >
                            Confirm Delete
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Card Actions Footer */}
                    {!isConfirmDeleting && (
                      <div className="flex items-center justify-between pt-2 border-t border-[#f5f5f0] dark:border-[#151510] text-[9px] text-[#5A5A40]/55 dark:text-[#8a8a70] uppercase tracking-wider font-semibold font-sans">
                        <span>Opened: {formatDateTime(t.createdAt)}</span>
                        
                        <div className="flex items-center gap-1.5">
                          {!isEditing && (
                            <button
                              onClick={() => {
                                setEditingId(t.id);
                                setEditDescription(t.conversationDescription);
                                setEditStatus(t.status);
                                setDeletingId(null);
                              }}
                              className="p-1.5 hover:bg-[#5A5A40]/5 dark:hover:bg-[#8a8a70]/10 rounded-lg border border-black/5 dark:border-white/5 active:scale-95 transition-all text-[#5A5A40] dark:text-[#ecece5] cursor-pointer"
                              title="Edit Ticket Description / Status"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setDeletingId(t.id);
                              setEditingId(null);
                            }}
                            className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg border border-black/5 dark:border-white/5 active:scale-95 transition-all text-[#5A5A40] hover:text-rose-600 cursor-pointer"
                            title="Delete Ticket Record"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                );
              })
            ) : (
              <div className="bg-white dark:bg-[#20201a] rounded-3xl border border-[#5A5A40]/10 dark:border-[#8a8a70]/20 p-12 text-center space-y-4" id="tickets-empty-state">
                <div className="w-12 h-12 bg-[#f5f5f0] dark:bg-[#151510] rounded-full flex items-center justify-center mx-auto text-[#5A5A40]/40 dark:text-[#8a8a70]/60">
                  <AlignLeft className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-[#5A5A40] dark:text-[#ecece5] text-sm">No tickets found</h4>
                  <p className="text-xs text-[#5A5A40]/60 dark:text-[#8a8a70]/80 mt-1 max-w-xs mx-auto">
                    {searchQuery 
                      ? `No logged visa support tickets match your search for "${searchQuery}".` 
                      : 'You do not have any logged visa support tickets.'}
                  </p>
                </div>
                {!searchQuery && (
                  <button
                    onClick={() => setSubView('create')}
                    className="inline-flex items-center gap-1.5 bg-[#5A5A40] hover:bg-[#4a4a34] dark:bg-[#5A5A40] dark:hover:bg-[#6c6c4e] text-white font-medium text-xs px-5 py-2.5 rounded-full shadow-lg shadow-[#5A5A40]/10 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    File First Ticket
                  </button>
                )}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
