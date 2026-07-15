import React, { useState } from 'react';
import { Customer, Ticket, TicketStatus, FollowUp } from '../types';
import { 
  ArrowLeft, 
  Phone, 
  Calendar, 
  History, 
  Plus, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  User,
  Trash2,
  Edit2,
  X,
  Check,
  Loader2,
  CalendarCheck,
  FileText,
  Globe,
  Share2,
  MessageSquare,
  AlignLeft,
  ExternalLink
} from 'lucide-react';

interface CustomerDetailsProps {
  customer: Customer;
  tickets: Ticket[];
  followUps: FollowUp[];
  existingCustomers: Customer[];
  onBack: () => void;
  onAddTicket: (customerId: string) => void;
  onAddFollowUp: (customerId: string) => void;
  onUpdateCustomer: (
    id: string, 
    name: string, 
    mobileNumber: string,
    whatsAppNumber?: string,
    destinationCountry?: string,
    source?: string,
    remarks?: string
  ) => Promise<{ success: boolean; error?: string }>;
  onDeleteCustomer: (id: string) => Promise<{ success: boolean; error?: string }>;
}

const POPULAR_COUNTRIES = [
  "Saudi Arabia",
  "United Arab Emirates",
  "Qatar",
  "Oman",
  "Malaysia",
  "Singapore",
  "United Kingdom",
  "Japan",
  "Canada",
  "Italy",
  "Germany",
  "South Korea"
];

const SOURCES = [
  "Walk-in",
  "Facebook",
  "Reference",
  "Website",
  "Other"
];

export default function CustomerDetails({
  customer,
  tickets,
  followUps,
  existingCustomers,
  onBack,
  onAddTicket,
  onAddFollowUp,
  onUpdateCustomer,
  onDeleteCustomer
}: CustomerDetailsProps) {
  // Filters
  const [statusFilter, setStatusFilter] = useState<'All' | TicketStatus>('All');

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(customer.name);
  const [editMobile, setEditMobile] = useState(customer.mobileNumber);
  const [editWhatsApp, setEditWhatsApp] = useState(customer.whatsAppNumber || '');
  const [isSameAsMobile, setIsSameAsMobile] = useState(customer.whatsAppNumber === customer.mobileNumber);
  const [editDestinationCountry, setEditDestinationCountry] = useState(customer.destinationCountry || '');
  const [editSource, setEditSource] = useState(customer.source || 'Walk-in');
  const [editRemarks, setEditRemarks] = useState(customer.remarks || '');
  
  // Deleting State
  const [isConfirmDeleting, setIsConfirmDeleting] = useState(false);

  // Status Alerts
  const [alert, setAlert] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message: string }>({
    type: 'idle',
    message: ''
  });

  // Filter and sort tickets for this specific customer, newest first
  const customerTickets = tickets
    .filter(t => t.customerId === customer.id)
    .filter(t => statusFilter === 'All' || t.status === statusFilter)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Filter and sort follow-ups for this specific customer
  const customerFollowUps = followUps
    .filter(f => f.customerId === customer.id)
    .sort((a, b) => {
      const dateA = `${a.followUpDate}T${a.followUpTime}`;
      const dateB = `${b.followUpDate}T${b.followUpTime}`;
      return new Date(dateB).getTime() - new Date(dateA).getTime(); // Newest first
    });

  // Date formatting helper
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

  const getRelativeDateLabel = (dateStr: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
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

  const initials = customer.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const getWhatsAppUrl = (num: string) => {
    const cleanNum = num.replace(/\D/g, '');
    return `https://wa.me/${cleanNum}`;
  };

  // Save changes
  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = editName.trim();
    const trimmedMobile = editMobile.trim();
    const finalWhatsApp = isSameAsMobile ? trimmedMobile : editWhatsApp.trim();
    const finalCountry = editDestinationCountry.trim();
    const finalRemarks = editRemarks.trim();

    if (!trimmedName || !trimmedMobile) {
      setAlert({ type: 'error', message: 'Name and mobile number are required.' });
      return;
    }

    // Check duplicate mobile numbers, ignoring current customer
    const digitsOnly = trimmedMobile.replace(/\D/g, '');
    const isDuplicate = existingCustomers.some(c => c.id !== customer.id && c.mobileNumber.replace(/\D/g, '') === digitsOnly);
    if (isDuplicate) {
      setAlert({ type: 'error', message: 'Another candidate with this mobile number already exists.' });
      return;
    }

    setAlert({ type: 'loading', message: 'Saving candidate profile changes...' });

    try {
      const res = await onUpdateCustomer(
        customer.id, 
        trimmedName, 
        trimmedMobile,
        finalWhatsApp,
        finalCountry,
        editSource,
        finalRemarks
      );
      if (res.success) {
        setAlert({ type: 'success', message: 'Candidate details updated successfully!' });
        setIsEditing(false);
        setTimeout(() => setAlert({ type: 'idle', message: '' }), 3000);
      } else {
        setAlert({ type: 'error', message: res.error || 'Failed to update candidate profile.' });
      }
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'An unexpected error occurred.' });
    }
  };

  // Perform Delete
  const handleDeleteCustomer = async () => {
    setAlert({ type: 'loading', message: 'Deleting candidate and purging logs...' });
    try {
      const res = await onDeleteCustomer(customer.id);
      if (res.success) {
        setAlert({ type: 'success', message: 'Candidate and all associated history deleted.' });
        setTimeout(() => {
          onBack();
        }, 1500);
      } else {
        setAlert({ type: 'error', message: res.error || 'Failed to delete candidate.' });
        setIsConfirmDeleting(false);
      }
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'An unexpected error occurred.' });
      setIsConfirmDeleting(false);
    }
  };

  return (
    <div className="space-y-6" id="customer-details-view">
      
      {/* Header action panel */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={onBack}
          id="btn-details-back"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5A5A40] dark:text-[#ecece5] hover:bg-[#5A5A40]/5 dark:hover:bg-[#8a8a70]/10 bg-white dark:bg-[#20201a] border border-[#5A5A40]/15 dark:border-[#8a8a70]/30 px-4 py-2 rounded-full transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to list
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onAddFollowUp(customer.id)}
            id="btn-details-new-followup"
            className="inline-flex items-center gap-1 bg-[#5A5A40]/10 dark:bg-[#8a8a70]/20 text-[#5A5A40] dark:text-[#ecece5] hover:bg-[#5A5A40]/15 dark:hover:bg-[#8a8a70]/30 font-bold text-xs px-3 py-2 rounded-full border border-[#5A5A40]/25 dark:border-[#8a8a70]/40 transition-colors cursor-pointer"
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            Add Reminder
          </button>
          
          <button
            onClick={() => onAddTicket(customer.id)}
            id="btn-details-new-ticket"
            className="inline-flex items-center gap-1 bg-[#5A5A40] hover:bg-[#4a4a34] dark:bg-[#5A5A40] dark:hover:bg-[#6c6c4e] text-white font-medium text-xs px-4 py-2 rounded-full shadow-md shadow-[#5A5A40]/10 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            New Ticket
          </button>
        </div>
      </div>

      {/* Action alerts */}
      {alert.type === 'error' && (
        <div id="details-alert-error" className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl flex items-start gap-2 text-xs text-rose-800 dark:text-rose-300 leading-tight">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
          <span>{alert.message}</span>
        </div>
      )}

      {alert.type === 'success' && (
        <div id="details-alert-success" className="p-3 bg-[#5A5A40]/10 dark:bg-[#5A5A40]/25 border border-[#5A5A40]/20 dark:border-[#8a8a70]/30 rounded-xl flex items-start gap-2 text-xs text-[#5A5A40] dark:text-[#ecece5] leading-tight">
          <CheckCircle className="w-4 h-4 shrink-0 text-[#5A5A40] dark:text-[#ecece5] mt-0.5" />
          <span>{alert.message}</span>
        </div>
      )}

      {alert.type === 'loading' && (
        <div id="details-alert-loading" className="p-3 bg-[#5A5A40]/5 dark:bg-[#5A5A40]/10 border border-[#5A5A40]/10 dark:border-[#8a8a70]/15 rounded-xl flex items-start gap-2 text-xs text-[#5A5A40]/80 dark:text-[#ecece5]/80 leading-tight">
          <Loader2 className="w-4 h-4 shrink-0 text-[#5A5A40] dark:text-[#ecece5] animate-spin mt-0.5" />
          <span>{alert.message}</span>
        </div>
      )}

      {/* Customer Information/Edit Card */}
      <div className="bg-white dark:bg-[#20201a] rounded-3xl border border-[#5A5A40]/10 dark:border-[#8a8a70]/20 p-5 space-y-4" id="customer-info-card">
        
        {isEditing ? (
          <form onSubmit={handleSaveChanges} className="space-y-4" id="customer-edit-form">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#5A5A40]/60 dark:text-[#8a8a70] block">Edit Profile details</span>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Name */}
              <div>
                <label htmlFor="edit-name-input" className="block text-xs font-semibold text-[#5A5A40]/85 dark:text-[#8a8a70] mb-1">Name</label>
                <input
                  type="text"
                  id="edit-name-input"
                  required
                  className="w-full text-xs bg-[#f5f5f0]/50 dark:bg-[#151510]/50 border border-[#5A5A40]/15 dark:border-[#8a8a70]/30 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#5A5A40] text-[#2c2c26] dark:text-[#f5f5f0]"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              {/* Mobile */}
              <div>
                <label htmlFor="edit-mobile-input" className="block text-xs font-semibold text-[#5A5A40]/85 dark:text-[#8a8a70] mb-1">Mobile Number</label>
                <input
                  type="tel"
                  id="edit-mobile-input"
                  required
                  className="w-full text-xs bg-[#f5f5f0]/50 dark:bg-[#151510]/50 border border-[#5A5A40]/15 dark:border-[#8a8a70]/30 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#5A5A40] text-[#2c2c26] dark:text-[#f5f5f0]"
                  value={editMobile}
                  onChange={(e) => {
                    setEditMobile(e.target.value);
                    if (isSameAsMobile) setEditWhatsApp(e.target.value);
                  }}
                />
              </div>

              {/* WhatsApp */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="edit-whatsapp-input" className="block text-xs font-semibold text-[#5A5A40]/85 dark:text-[#8a8a70]">WhatsApp Number</label>
                  <label className="inline-flex items-center gap-1 text-[10px] text-[#5A5A40]/80 dark:text-[#8a8a70]/90 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-[#5A5A40]/30 text-[#5A5A40] focus:ring-[#5A5A40] w-3 h-3 accent-[#5A5A40]"
                      checked={isSameAsMobile}
                      onChange={(e) => {
                        setIsSameAsMobile(e.target.checked);
                        if (e.target.checked) setEditWhatsApp(editMobile);
                      }}
                    />
                    <span>Same as Mobile</span>
                  </label>
                </div>
                <input
                  type="tel"
                  id="edit-whatsapp-input"
                  className="w-full text-xs bg-[#f5f5f0]/50 dark:bg-[#151510]/50 border border-[#5A5A40]/15 dark:border-[#8a8a70]/30 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#5A5A40] text-[#2c2c26] dark:text-[#f5f5f0] disabled:opacity-60"
                  value={isSameAsMobile ? editMobile : editWhatsApp}
                  onChange={(e) => setEditWhatsApp(e.target.value)}
                  disabled={isSameAsMobile}
                />
              </div>

              {/* Destination Country */}
              <div>
                <label htmlFor="edit-destination-input" className="block text-xs font-semibold text-[#5A5A40]/85 dark:text-[#8a8a70] mb-1">Destination Country</label>
                <input
                  list="edit-countries"
                  type="text"
                  id="edit-destination-input"
                  className="w-full text-xs bg-[#f5f5f0]/50 dark:bg-[#151510]/50 border border-[#5A5A40]/15 dark:border-[#8a8a70]/30 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#5A5A40] text-[#2c2c26] dark:text-[#f5f5f0]"
                  placeholder="e.g. United Arab Emirates"
                  value={editDestinationCountry}
                  onChange={(e) => setEditDestinationCountry(e.target.value)}
                />
                <datalist id="edit-countries">
                  {POPULAR_COUNTRIES.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>

              {/* Acquisition Source */}
              <div>
                <label htmlFor="edit-source-select" className="block text-xs font-semibold text-[#5A5A40]/85 dark:text-[#8a8a70] mb-1">Acquisition Source</label>
                <select
                  id="edit-source-select"
                  className="w-full text-xs bg-[#f5f5f0]/50 dark:bg-[#151510]/50 border border-[#5A5A40]/15 dark:border-[#8a8a70]/30 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#5A5A40] text-[#2c2c26] dark:text-[#f5f5f0] cursor-pointer"
                  value={editSource}
                  onChange={(e) => setEditSource(e.target.value)}
                >
                  {SOURCES.map(src => <option key={src} value={src}>{src}</option>)}
                </select>
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label htmlFor="edit-remarks-textarea" className="block text-xs font-semibold text-[#5A5A40]/85 dark:text-[#8a8a70] mb-1">Remarks / Case Notes</label>
              <textarea
                id="edit-remarks-textarea"
                rows={3}
                className="w-full text-xs bg-[#f5f5f0]/50 dark:bg-[#151510]/50 border border-[#5A5A40]/15 dark:border-[#8a8a70]/30 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#5A5A40] text-[#2c2c26] dark:text-[#f5f5f0] resize-none"
                placeholder="Candidate background details, passport info, etc..."
                value={editRemarks}
                onChange={(e) => setEditRemarks(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setEditName(customer.name);
                  setEditMobile(customer.mobileNumber);
                  setEditWhatsApp(customer.whatsAppNumber || '');
                  setIsSameAsMobile(customer.whatsAppNumber === customer.mobileNumber);
                  setEditDestinationCountry(customer.destinationCountry || '');
                  setEditSource(customer.source || 'Walk-in');
                  setEditRemarks(customer.remarks || '');
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2c2c26]/60 dark:text-[#ecece5]/60 border border-black/10 dark:border-white/10 px-3.5 py-2 rounded-full hover:bg-[#f5f5f0] dark:hover:bg-[#1e1e18]"
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </button>

              <button
                type="submit"
                className="inline-flex items-center gap-1.5 bg-[#5A5A40] text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-[#4a4a34] cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                Save Changes
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {/* Primary Profile Details */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#f5f5f0] dark:bg-[#252520] text-[#5A5A40] dark:text-[#ecece5] flex items-center justify-center font-bold text-lg tracking-wider shrink-0 border border-[#5A5A40]/10 dark:border-[#8a8a70]/20">
                  {initials || 'CU'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-serif font-bold text-[#5A5A40] dark:text-[#ecece5] leading-tight" id="customer-detail-name">{customer.name}</h1>
                    <span className="font-mono text-[10px] font-bold text-[#5A5A40]/50 dark:text-[#8a8a70]/70 bg-[#f5f5f0] dark:bg-[#151510] px-1.5 py-0.5 rounded-md">
                      {customer.id}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1.5 text-xs text-[#2c2c26]/60 dark:text-[#8a8a70]">
                    <span className="flex items-center gap-1.5 font-semibold text-[#2c2c26]/85 dark:text-[#ecece5]/95">
                      <Phone className="w-3.5 h-3.5 text-[#5A5A40]/45" />
                      <a href={`tel:${customer.mobileNumber}`} className="hover:underline text-[#5A5A40] dark:text-[#b8b89e]" id="customer-detail-mobile">{customer.mobileNumber}</a>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#5A5A40]/45" />
                      <span>Onboarded: {formatDateTime(customer.createdAt)}</span>
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 justify-end sm:justify-start">
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setIsConfirmDeleting(false);
                  }}
                  id="btn-edit-customer"
                  className="p-2 text-[#5A5A40]/75 hover:text-[#5A5A40] hover:bg-[#5A5A40]/10 rounded-xl border border-[#5A5A40]/10 dark:border-[#8a8a70]/30 transition-colors"
                  title="Edit Candidate Info"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    setIsConfirmDeleting(true);
                    setIsEditing(false);
                  }}
                  id="btn-delete-customer-trigger"
                  className="p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl border border-rose-100 dark:border-rose-900/30 transition-colors"
                  title="Delete Candidate Record"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Secondary recruitment data bento display */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-3 border-t border-[#5A5A40]/10 dark:border-[#8a8a70]/20">
              {/* WhatsApp Quick Link */}
              <div className="p-3 bg-[#f5f5f0]/50 dark:bg-[#151510]/50 rounded-2xl border border-[#5A5A40]/10 dark:border-[#8a8a70]/15 space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#5A5A40]/60 dark:text-[#8a8a70] block">WhatsApp Chat</span>
                {customer.whatsAppNumber ? (
                  <div className="flex items-center justify-between gap-1 text-xs">
                    <span className="font-semibold text-[#2c2c26]/90 dark:text-[#f5f5f0]">{customer.whatsAppNumber}</span>
                    <a 
                      href={getWhatsAppUrl(customer.whatsAppNumber)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#22C55E] hover:underline font-bold text-[11px]"
                    >
                      <span>Connect</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ) : (
                  <span className="text-xs text-[#2c2c26]/40 dark:text-[#8a8a70]/60 italic">Not provided</span>
                )}
              </div>

              {/* Destination Country */}
              <div className="p-3 bg-[#f5f5f0]/50 dark:bg-[#151510]/50 rounded-2xl border border-[#5A5A40]/10 dark:border-[#8a8a70]/15 space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#5A5A40]/60 dark:text-[#8a8a70] block">Destination</span>
                {customer.destinationCountry ? (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#2c2c26]/90 dark:text-[#f5f5f0]">
                    <Globe className="w-3.5 h-3.5 text-[#5A5A40]/60" />
                    <span>{customer.destinationCountry}</span>
                  </div>
                ) : (
                  <span className="text-xs text-[#2c2c26]/40 dark:text-[#8a8a70]/60 italic">Not set</span>
                )}
              </div>

              {/* Acquisition Source */}
              <div className="p-3 bg-[#f5f5f0]/50 dark:bg-[#151510]/50 rounded-2xl border border-[#5A5A40]/10 dark:border-[#8a8a70]/15 space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#5A5A40]/60 dark:text-[#8a8a70] block">Lead Source</span>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#2c2c26]/90 dark:text-[#f5f5f0]">
                  <Share2 className="w-3.5 h-3.5 text-[#5A5A40]/60" />
                  <span>{customer.source || 'Walk-in'}</span>
                </div>
              </div>
            </div>

            {/* Case Remarks Section */}
            {customer.remarks && (
              <div className="p-4 bg-[#f5f5f0]/40 dark:bg-[#151510]/30 rounded-2xl border border-[#5A5A40]/10 dark:border-[#8a8a70]/15 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#5A5A40]/65 dark:text-[#8a8a70] uppercase">
                  <AlignLeft className="w-3.5 h-3.5" />
                  <span>Recruitment Remarks / Notes</span>
                </div>
                <p className="text-xs text-[#2c2c26]/90 dark:text-[#ecece5] leading-relaxed break-words whitespace-pre-wrap font-sans">
                  {customer.remarks}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Confirmation Block for deleting Candidate */}
        {isConfirmDeleting && (
          <div className="p-4 border border-rose-200 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/10 rounded-2xl space-y-2 animate-fade-in" id="delete-confirmation-banner">
            <h4 className="text-xs font-bold text-rose-950 dark:text-rose-300 flex items-center gap-1.5">
              <AlertCircle className="w-4.5 h-4.5 text-rose-600 dark:text-rose-400" />
              Danger: Confirm Candidate Deletion
            </h4>
            <p className="text-xs text-rose-800 dark:text-rose-400 leading-normal">
              Deleting this candidate will **permanently wipe** their profile and **cascade delete** all associated support tickets ({tickets.filter(t => t.customerId === customer.id).length}) and embassy follow-up reminders ({followUps.filter(f => f.customerId === customer.id).length}) from your Google Sheets records!
            </p>
            <div className="flex items-center gap-2 justify-end pt-2">
              <button
                onClick={() => setIsConfirmDeleting(false)}
                className="px-3 py-1.5 text-xs font-semibold text-[#2c2c26]/70 dark:text-[#ecece5]/70 border border-black/10 dark:border-white/10 rounded-lg bg-white dark:bg-[#20201a]"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCustomer}
                id="btn-delete-customer-confirm"
                className="px-4 py-1.5 text-xs font-bold bg-rose-600 text-white rounded-lg hover:bg-rose-700"
              >
                Purge All Records
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Dual Tabs layout: Tickets History & Scheduled Follow-ups */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Column: Scheduled Follow-up history */}
        <div className="space-y-4" id="customer-followups-panel">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-[#5A5A40] dark:text-[#ecece5] text-sm flex items-center gap-2">
              <CalendarCheck className="w-4.5 h-4.5 text-[#5A5A40] dark:text-[#ecece5]" />
              <span>Follow-up History</span>
            </h3>
            <span className="text-[10px] font-bold text-[#5A5A40]/65 dark:text-[#ecece5]/80 bg-[#5A5A40]/10 dark:bg-[#8a8a70]/20 px-2.5 py-0.5 rounded-full uppercase">
              {customerFollowUps.length} Reminders
            </span>
          </div>

          <div className="space-y-2.5 max-h-[400px] overflow-y-auto">
            {customerFollowUps.length > 0 ? (
              customerFollowUps.map(f => {
                const todayStr = new Date().toISOString().split('T')[0];
                const overdue = f.status === 'Pending' && f.followUpDate < todayStr;
                let statusBadgeStyle = '';
                if (f.status === 'Completed') {
                  statusBadgeStyle = 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20';
                } else if (overdue) {
                  statusBadgeStyle = 'bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/20 font-bold';
                } else {
                  statusBadgeStyle = 'bg-[#F97316]/10 text-[#F97316] border-[#F97316]/20';
                }

                return (
                  <div 
                    key={f.id}
                    className={`p-3 rounded-xl border text-xs space-y-1.5 bg-white dark:bg-[#20201a] ${
                      f.status === 'Completed' 
                        ? 'border-[#5A5A40]/10 dark:border-[#8a8a70]/10 bg-gray-50/50 dark:bg-[#252520]/20 opacity-80' 
                        : overdue
                          ? 'border-[#DC2626]/30'
                          : 'border-amber-200 dark:border-amber-900/55'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono font-bold">
                      <span className="text-[#5A5A40] dark:text-[#ecece5]">{f.id}</span>
                      <span className={`px-1.5 py-0.5 rounded-md border ${statusBadgeStyle}`}>
                        {overdue ? 'OVERDUE: ' : ''}{getRelativeDateLabel(f.followUpDate)} @ {f.followUpTime}
                      </span>
                    </div>
                    <p className="italic text-[#2c2c26]/90 dark:text-[#ecece5] font-sans">
                      "{f.notes}"
                    </p>
                    <div className="flex justify-between items-center text-[9px] text-[#5A5A40]/55 dark:text-[#8a8a70] pt-1.5 border-t border-[#f5f5f0] dark:border-[#151510]">
                      <span>Status: {f.status}</span>
                      <span>Created: {new Date(f.createdAt || '').toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 bg-white dark:bg-[#20201a] border border-[#5A5A40]/10 dark:border-[#8a8a70]/20 rounded-2xl text-center text-xs text-[#5A5A40]/55 dark:text-[#8a8a70]/60">
                No follow-ups logged for this candidate.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Ticket Logs / History Section */}
        <div className="space-y-4" id="ticket-history-section">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#5A5A40] dark:text-[#ecece5]" />
              <h2 className="font-serif font-bold text-[#5A5A40] dark:text-[#ecece5] text-sm">Visa Support Tickets</h2>
            </div>
            
            {/* Simple Dropdown Filter */}
            <select
              className="text-xs font-semibold bg-white dark:bg-[#20201a] border border-[#5A5A40]/15 dark:border-[#8a8a70]/30 rounded-lg px-2 py-1 text-[#5A5A40] dark:text-[#ecece5]"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="All">All Statuses</option>
              <option value="Open">Open</option>
              <option value="Pending">Pending</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          {/* Ticket List */}
          <div className="space-y-3 max-h-[400px] overflow-y-auto" id="customer-ticket-logs">
            {customerTickets.length > 0 ? (
              customerTickets.map((ticket) => {
                // Status Styling
                let badgeColor = '';
                let statusIcon = null;
                if (ticket.status === 'Open') {
                  badgeColor = 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20';
                  statusIcon = <Clock className="w-3.5 h-3.5" />;
                } else if (ticket.status === 'Pending') {
                  badgeColor = 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20';
                  statusIcon = <AlertCircle className="w-3.5 h-3.5" />;
                } else if (ticket.status === 'Closed') {
                  badgeColor = 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20';
                  statusIcon = <CheckCircle className="w-3.5 h-3.5" />;
                }

                return (
                  <div
                    key={ticket.id}
                    id={`ticket-card-${ticket.id}`}
                    className="bg-white dark:bg-[#20201a] p-3 rounded-xl border border-[#5A5A40]/10 dark:border-[#8a8a70]/20 shadow-xs space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] font-bold text-[#5A5A40] dark:text-[#ecece5] bg-[#f5f5f0] dark:bg-[#151510] border border-[#5A5A40]/10 dark:border-[#8a8a70]/20 px-1.5 py-0.5 rounded-md">
                        {ticket.id}
                      </span>
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1 ${badgeColor}`}>
                        {statusIcon}
                        {ticket.status}
                      </span>
                    </div>

                    <p className="text-xs text-[#2c2c26]/90 dark:text-[#ecece5] leading-relaxed break-words whitespace-pre-wrap font-sans">
                      {ticket.conversationDescription}
                    </p>

                    <div className="pt-1.5 border-t border-[#f5f5f0] dark:border-[#151510] text-[9px] text-[#5A5A40]/55 dark:text-[#8a8a70]">
                      Opened: {formatDateTime(ticket.createdAt)}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-white dark:bg-[#20201a] rounded-2xl border border-[#5A5A40]/10 dark:border-[#8a8a70]/20 p-6 text-center text-xs text-[#5A5A40]/55 dark:text-[#8a8a70]/60" id="no-tickets-fallback">
                No visa support tickets found matching selection.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
