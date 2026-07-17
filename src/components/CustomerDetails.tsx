import React, { useState, useEffect } from 'react';
import { Customer, Ticket, TicketStatus, FollowUp } from '../types';
import SmartContactActions from './SmartContactActions';
import InlineCopy from './InlineCopy';
import { motion, AnimatePresence } from 'motion/react';
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
  ExternalLink,
  Copy
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
    remarks?: string,
    imoNumber?: string,
    customerCategory?: string,
    address?: string,
    gender?: string
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

const CustomerDetails = React.memo(function CustomerDetails({
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
  const [editImo, setEditImo] = useState(customer.imoNumber || '');
  const [isImoSameAsMobile, setIsImoSameAsMobile] = useState(customer.imoNumber === customer.mobileNumber && !!customer.imoNumber);
  const [editRemarks, setEditRemarks] = useState(customer.remarks || '');
  
  // Category & Address
  const CATEGORIES = [
    'AGENT',
    'SUPERVISOR (PRODUCTION)',
    'SUPERVISOR (QUALITY)',
    'IRON MAN',
    'OPERATOR',
    'CHECKER',
    'DELICATOR'
  ];
  const [editCategory, setEditCategory] = useState(customer.customerCategory || '');
  const [editGender, setEditGender] = useState(customer.gender || '');
  
  // If editCategory becomes blank, automatically hide and clear editGender
  useEffect(() => {
    if (!editCategory) {
      setEditGender('');
    }
  }, [editCategory]);

  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState(customer.customerCategory || '');
  const [editAddress, setEditAddress] = useState(customer.address || '');
  const [addressRows, setAddressRows] = useState(4);
  const categoryDropdownRef = React.useRef<HTMLDivElement>(null);

  // Sync edit states when customer prop changes
  useEffect(() => {
    setEditName(customer.name);
    setEditMobile(customer.mobileNumber);
    setEditWhatsApp(customer.whatsAppNumber || '');
    setIsSameAsMobile(customer.whatsAppNumber === customer.mobileNumber);
    setEditImo(customer.imoNumber || '');
    setIsImoSameAsMobile(customer.imoNumber === customer.mobileNumber && !!customer.imoNumber);
    setEditRemarks(customer.remarks || '');
    setEditCategory(customer.customerCategory || '');
    setEditGender(customer.gender || '');
    setCategorySearchQuery(customer.customerCategory || '');
    setEditAddress(customer.address || '');
  }, [customer]);

  // Click outside category dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCategories = React.useMemo(() => {
    const q = categorySearchQuery.toLowerCase().trim();
    if (!q) return CATEGORIES;
    return CATEGORIES.filter(cat => cat.toLowerCase().includes(q));
  }, [categorySearchQuery]);

  useEffect(() => {
    if (editCategory && !isCategoryDropdownOpen) {
      setCategorySearchQuery(editCategory);
    } else if (!editCategory && !isCategoryDropdownOpen) {
      setCategorySearchQuery('');
    }
  }, [editCategory, isCategoryDropdownOpen]);

  const handleAddressChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setEditAddress(val);
    const newlines = (val.match(/\n/g) || []).length;
    setAddressRows(Math.min(8, Math.max(4, newlines + 1)));
  };

  // Remarks Auto-Save Inline States
  const [remarksInput, setRemarksInput] = useState(customer.remarks || '');
  const [remarksSaveStatus, setRemarksSaveStatus] = useState<'IDLE' | 'EDITING' | 'SAVING' | 'SAVED' | 'FAILED'>('IDLE');

  // Sync remarks input when customer remarks changes externally
  useEffect(() => {
    setRemarksInput(customer.remarks || '');
  }, [customer.remarks]);

  // Debounced Auto-Save effect for customer remarks/case notes
  useEffect(() => {
    if (remarksInput === (customer.remarks || '')) {
      return;
    }

    setRemarksSaveStatus('EDITING');
    window.dispatchEvent(new CustomEvent('set-save-status', { detail: { status: 'EDITING' } }));

    const timer = setTimeout(async () => {
      setRemarksSaveStatus('SAVING');
      window.dispatchEvent(new CustomEvent('set-save-status', { detail: { status: 'SAVING' } }));
      try {
        const res = await onUpdateCustomer(
          customer.id,
          customer.name,
          customer.mobileNumber,
          customer.whatsAppNumber || '',
          customer.destinationCountry || '',
          customer.source || 'Other',
          remarksInput,
          customer.imoNumber || '',
          customer.customerCategory || '',
          customer.address || '',
          customer.gender || ''
        );
        if (res.success) {
          setRemarksSaveStatus('SAVED');
          window.dispatchEvent(new CustomEvent('set-save-status', { detail: { status: 'SAVED' } }));
          setTimeout(() => {
            setRemarksSaveStatus('IDLE');
            window.dispatchEvent(new CustomEvent('set-save-status', { detail: { status: 'IDLE' } }));
          }, 1500);
        } else {
          setRemarksSaveStatus('FAILED');
          window.dispatchEvent(new CustomEvent('set-save-status', { detail: { status: 'FAILED' } }));
        }
      } catch (err) {
        setRemarksSaveStatus('FAILED');
        window.dispatchEvent(new CustomEvent('set-save-status', { detail: { status: 'FAILED' } }));
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [remarksInput, customer, onUpdateCustomer]);

  // IMO Copy State
  const [copiedImo, setCopiedImo] = useState(false);

  const handleCopyImo = () => {
    if (!customer.imoNumber) return;
    navigator.clipboard.writeText(customer.imoNumber);
    setCopiedImo(true);
    setTimeout(() => setCopiedImo(false), 2000);
  };
  
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

  // Find absolute latest ticket for the copy actions
  const latestTicket = tickets
    .filter(t => t.customerId === customer.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  const latestTicketId = latestTicket ? latestTicket.id : null;

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
    const finalImo = isImoSameAsMobile ? trimmedMobile : editImo.trim();
    const finalRemarks = editRemarks.trim();

    if (!trimmedName || !trimmedMobile) {
      setAlert({ type: 'error', message: 'Name and mobile number are required.' });
      return;
    }

    // Check duplicate mobile numbers, ignoring current customer
    const digitsOnly = trimmedMobile.replace(/\D/g, '');
    const isDuplicate = existingCustomers.some(c => c.id !== customer.id && c.mobileNumber.replace(/\D/g, '') === digitsOnly);
    if (isDuplicate) {
      setAlert({ type: 'error', message: 'Another customer with this mobile number already exists.' });
      return;
    }

    setAlert({ type: 'loading', message: 'Saving customer profile changes...' });

    try {
      const res = await onUpdateCustomer(
        customer.id, 
        trimmedName, 
        trimmedMobile,
        finalWhatsApp,
        customer.destinationCountry || '',
        customer.source || 'Other',
        finalRemarks,
        finalImo,
        editCategory,
        editAddress.trim(),
        editGender
      );
      if (res.success) {
        setAlert({ type: 'success', message: 'Customer details updated successfully!' });
        setIsEditing(false);
        setTimeout(() => setAlert({ type: 'idle', message: '' }), 3000);
      } else {
        setAlert({ type: 'error', message: res.error || 'Failed to update customer profile.' });
      }
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'An unexpected error occurred.' });
    }
  };

  // Delete is strictly disabled under Permanent Records policy

  return (
    <div className="space-y-6" id="customer-details-view">
      
      {/* Header action panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" id="details-header-panel">
        <button
          onClick={onBack}
          id="btn-details-back"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6B705C] hover:text-[#2E4F32] hover:bg-gray-100 bg-white border border-gray-200 px-4 py-2.5 rounded-full transition-all cursor-pointer shadow-xs active:scale-95 self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>BACK TO DIRECTORY</span>
        </button>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => onAddFollowUp(customer.id)}
            id="btn-details-new-followup"
            className="inline-flex items-center justify-center gap-2 bg-[#8B5CF6]/10 text-[#8B5CF6] hover:bg-[#8B5CF6]/20 border border-[#8B5CF6]/25 font-bold text-xs px-4 h-10 rounded-full transition-all cursor-pointer active:scale-95"
          >
            <CalendarCheck className="w-4 h-4" />
            <span>ADD REMINDER</span>
          </button>
          
          <button
            onClick={() => onAddTicket(customer.id)}
            id="btn-details-new-ticket"
            className="inline-flex items-center justify-center gap-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold text-xs px-5 h-10 rounded-full shadow-md shadow-[#3B82F6]/10 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>NEW TICKET</span>
          </button>
        </div>
      </div>

      {/* Action alerts */}
      {alert.type === 'error' && (
        <div id="details-alert-error" className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 leading-tight">
          <AlertCircle className="w-4.5 h-4.5 shrink-0 text-rose-500 mt-0.5" />
          <span className="font-semibold uppercase">{alert.message}</span>
        </div>
      )}

      {alert.type === 'success' && (
        <div id="details-alert-success" className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800 leading-tight">
          <CheckCircle className="w-4.5 h-4.5 shrink-0 text-emerald-500 mt-0.5" />
          <span className="font-semibold uppercase">{alert.message}</span>
        </div>
      )}

      {alert.type === 'loading' && (
        <div id="details-alert-loading" className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-2.5 text-xs text-blue-800 leading-tight">
          <Loader2 className="w-4.5 h-4.5 shrink-0 text-blue-500 animate-spin mt-0.5" />
          <span className="font-semibold uppercase">{alert.message}</span>
        </div>
      )}

      {/* Customer Information/Edit Card */}
      <div className="bg-white dark:bg-[#20201a] rounded-[24px] border border-t-4 border-t-[#10B981] border-[#E5E7EB] dark:border-[#8a8a70]/20 p-6 sm:p-8 space-y-6 shadow-md transition-all duration-200" id="customer-info-card">
        
        {isEditing ? (
          <form onSubmit={handleSaveChanges} className="space-y-6" id="customer-edit-form">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-4 bg-[#10B981] rounded" />
              <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500">Edit Profile details</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Name */}
              <div className="space-y-1.5">
                <label htmlFor="edit-name-input" className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Full Name</label>
                <input
                  type="text"
                  id="edit-name-input"
                  required
                  className="w-full text-xs bg-[#F8FAFC] border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 focus:border-[#10B981] transition-all font-medium text-[#1F2937]"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              {/* Mobile */}
              <div className="space-y-1.5">
                <label htmlFor="edit-mobile-input" className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Mobile Number</label>
                <input
                  type="tel"
                  id="edit-mobile-input"
                  required
                  className="w-full text-xs bg-[#F8FAFC] border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 focus:border-[#10B981] transition-all font-medium text-[#1F2937]"
                  value={editMobile}
                  onChange={(e) => {
                    setEditMobile(e.target.value);
                    if (isSameAsMobile) setEditWhatsApp(e.target.value);
                    if (isImoSameAsMobile) setEditImo(e.target.value);
                  }}
                />
              </div>

              {/* WhatsApp */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label htmlFor="edit-whatsapp-input" className="block text-xs font-bold text-gray-500 uppercase tracking-wide">WhatsApp Number</label>
                  <label className="inline-flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-[#10B981] focus:ring-[#10B981] w-3.5 h-3.5 accent-[#10B981]"
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
                  className="w-full text-xs bg-[#F8FAFC] border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 focus:border-[#10B981] transition-all font-medium text-[#1F2937] disabled:opacity-60"
                  value={isSameAsMobile ? editMobile : editWhatsApp}
                  onChange={(e) => setEditWhatsApp(e.target.value)}
                  disabled={isSameAsMobile}
                />
              </div>

              {/* IMO Number */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label htmlFor="edit-imo-input" className="block text-xs font-bold text-gray-500 uppercase tracking-wide">IMO Number</label>
                  <label className="inline-flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-[#10B981] focus:ring-[#10B981] w-3.5 h-3.5 accent-[#10B981]"
                      checked={isImoSameAsMobile}
                      onChange={(e) => {
                        setIsImoSameAsMobile(e.target.checked);
                        if (e.target.checked) setEditImo(editMobile);
                      }}
                    />
                    <span>Same as Mobile</span>
                  </label>
                </div>
                <input
                  type="tel"
                  id="edit-imo-input"
                  className="w-full text-xs bg-[#F8FAFC] border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 focus:border-[#10B981] transition-all font-medium text-[#1F2937] disabled:opacity-60"
                  value={isImoSameAsMobile ? editMobile : editImo}
                  onChange={(e) => setEditImo(e.target.value)}
                  disabled={isImoSameAsMobile}
                />
              </div>

              {/* Category Dropdown */}
              <div className="space-y-1.5 relative" ref={categoryDropdownRef}>
                <label htmlFor="edit-category-search" className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Customer Category</label>
                <div className="relative">
                  <input
                    type="text"
                    id="edit-category-search"
                    className="w-full text-xs bg-[#F8FAFC] border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 focus:border-[#10B981] transition-all font-medium text-[#1F2937] placeholder-gray-400 uppercase"
                    placeholder="SELECT CUSTOMER CATEGORY"
                    value={categorySearchQuery}
                    onChange={(e) => {
                      setCategorySearchQuery(e.target.value);
                      setIsCategoryDropdownOpen(true);
                    }}
                    onFocus={() => setIsCategoryDropdownOpen(true)}
                  />
                  {categorySearchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditCategory('');
                        setCategorySearchQuery('');
                      }}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      <span className="text-sm font-bold">&times;</span>
                    </button>
                  )}
                </div>

                {isCategoryDropdownOpen && (
                  <div className="absolute z-50 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-[#1a1a15] border border-gray-200 rounded-xl shadow-lg divide-y divide-gray-100 w-full left-0 right-0">
                    {filteredCategories.length > 0 ? (
                      filteredCategories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setEditCategory(cat);
                            setCategorySearchQuery(cat);
                            setIsCategoryDropdownOpen(false);
                          }}
                          className={`w-full text-left p-2.5 text-xs font-semibold transition-colors flex items-center justify-between hover:bg-gray-50 ${
                            editCategory === cat ? 'bg-emerald-50 text-emerald-700' : 'text-[#1F2937]'
                          }`}
                        >
                          <span className="uppercase">{cat}</span>
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-center text-xs text-gray-400 italic">
                        No categories found matching query.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* DYNAMIC GENDER FIELD FOR EDITING */}
              <div className="sm:col-span-1">
                <AnimatePresence initial={false}>
                  {editCategory && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: "auto", marginTop: 6 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      style={{ overflow: "hidden" }}
                      id="edit-customer-gender-wrapper"
                    >
                      <div className="space-y-1.5">
                        <label htmlFor="edit-gender-select" className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Gender (Optional)</label>
                        <select
                          id="edit-gender-select"
                          className="w-full text-xs bg-[#F8FAFC] border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 focus:border-[#10B981] transition-all font-bold uppercase cursor-pointer text-[#1F2937]"
                          value={editGender}
                          onChange={(e) => setEditGender(e.target.value)}
                        >
                          <option value="">SELECT GENDER</option>
                          <option value="MALE">MALE</option>
                          <option value="FEMALE">FEMALE</option>
                        </select>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Address Area */}
              <div className="space-y-1.5 sm:col-span-2">
                <label htmlFor="edit-address-textarea" className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Address (Optional)</label>
                <textarea
                  id="edit-address-textarea"
                  rows={addressRows}
                  className="w-full text-xs bg-[#F8FAFC] border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 focus:border-[#10B981] transition-all font-medium text-[#1F2937]"
                  placeholder="ENTER CUSTOMER ADDRESS"
                  value={editAddress}
                  onChange={handleAddressChange}
                />
              </div>
            </div>

            {/* Remarks */}
            <div className="space-y-1.5">
              <label htmlFor="edit-remarks-textarea" className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Remarks / Case Notes</label>
              <textarea
                id="edit-remarks-textarea"
                rows={3}
                className="w-full text-xs bg-[#F8FAFC] border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 focus:border-[#10B981] transition-all font-medium text-[#1F2937] resize-none"
                placeholder="CUSTOMER REQUIREMENT OR BACKGROUND REMARKS..."
                value={editRemarks}
                onChange={(e) => setEditRemarks(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setEditName(customer.name);
                  setEditMobile(customer.mobileNumber);
                  setEditWhatsApp(customer.whatsAppNumber || '');
                  setIsSameAsMobile(customer.whatsAppNumber === customer.mobileNumber);
                  setEditImo(customer.imoNumber || '');
                  setIsImoSameAsMobile(customer.imoNumber === customer.mobileNumber && !!customer.imoNumber);
                  setEditRemarks(customer.remarks || '');
                }}
                className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 border border-gray-200 px-4 h-10 rounded-full cursor-pointer transition-all active:scale-95"
              >
                <X className="w-3.5 h-3.5" />
                <span>CANCEL</span>
              </button>

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold px-5 h-10 rounded-full cursor-pointer transition-all shadow-md shadow-[#10B981]/15 active:scale-95"
              >
                <Check className="w-3.5 h-3.5" />
                <span>SAVE CHANGES</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            {/* Primary Profile Details */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#10B981] to-[#047857] text-white flex items-center justify-center font-bold text-xl tracking-wider shrink-0 shadow-lg shadow-[#10B981]/15 uppercase">
                  {initials || 'CU'}
                </div>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h1 className="text-xl font-serif font-bold text-[#1F2937] leading-tight uppercase" id="customer-detail-name">
                      {customer.name}
                    </h1>
                    <InlineCopy type="name" value={customer.name} className="min-w-[20px] min-h-[20px] p-0" />
                    
                    <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md">
                      {customer.id}
                      <InlineCopy type="customerId" value={customer.id} className="min-w-[16px] min-h-[16px] p-0" />
                    </span>

                    {customer.customerCategory && (
                      <span className="inline-flex items-center font-mono text-[9px] font-bold px-2.5 py-0.5 rounded-md border bg-[#5A5A40]/10 text-[#5A5A40] border-[#5A5A40]/20 uppercase tracking-wide" id="profile-badge-category">
                        {customer.customerCategory}
                      </span>
                    )}
                    {customer.gender && (
                      <span className={`inline-flex items-center font-mono text-[9px] font-bold px-2.5 py-0.5 rounded-md border uppercase tracking-wide ${
                        customer.gender.toUpperCase() === 'MALE'
                          ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/30'
                          : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/30'
                      }`} id="profile-badge-gender">
                        {customer.gender}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-center sm:justify-start gap-y-1.5 gap-x-4 text-xs text-gray-500 font-semibold">
                    <span className="flex items-center justify-center sm:justify-start gap-1 text-[#1F2937]">
                      <Phone className="w-3.5 h-3.5 text-[#10B981]" />
                      <a href={`tel:${customer.mobileNumber}`} className="hover:underline font-bold text-xs" id="customer-detail-mobile">{customer.mobileNumber}</a>
                      <InlineCopy type="mobile" value={customer.mobileNumber} className="min-w-[16px] min-h-[16px] p-0" />
                    </span>
                    <span className="flex items-center justify-center sm:justify-start gap-1">
                      <span className="text-[10px] uppercase font-bold text-gray-400">LATEST TICKET:</span>
                      <span className="font-mono font-bold text-gray-700">{latestTicketId || 'NONE'}</span>
                      {latestTicketId && <InlineCopy type="ticketId" value={latestTicketId} className="min-w-[16px] min-h-[16px] p-0" />}
                    </span>
                    <span className="flex items-center justify-center sm:justify-start gap-1">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span>ONBOARDED: {formatDateTime(customer.createdAt)}</span>
                    </span>
                  </div>

                  <div className="flex justify-center sm:justify-start">
                    <SmartContactActions
                      customerName={customer.name}
                      mobileNumber={customer.mobileNumber}
                      whatsAppNumber={customer.whatsAppNumber}
                      imoNumber={customer.imoNumber}
                      customerId={customer.id}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 justify-center md:justify-end">
                <button
                  onClick={() => setIsEditing(true)}
                  id="btn-edit-customer"
                  className="inline-flex items-center justify-center gap-2 px-5 h-10 bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs rounded-full shadow-md shadow-[#10B981]/15 transition-all cursor-pointer active:scale-95"
                  title="Edit Customer Info"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>EDIT PROFILE</span>
                </button>
              </div>
            </div>

            {/* Secondary recruitment data display */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
              {/* WhatsApp Quick Link */}
              <div className="p-4 bg-[#F8FAFC] rounded-xl border border-gray-100 space-y-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">WhatsApp Chat</span>
                {customer.whatsAppNumber ? (
                  <div className="flex items-center justify-between gap-1 text-xs">
                    <span className="font-bold text-gray-700">{customer.whatsAppNumber}</span>
                    <a 
                      href={getWhatsAppUrl(customer.whatsAppNumber)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#22C55E] hover:underline font-bold text-[11px]"
                    >
                      <span>CONNECT</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 italic uppercase">Not provided</span>
                )}
              </div>

              {/* IMO Number Card */}
              <div className="p-4 bg-[#F8FAFC] rounded-xl border border-gray-100 space-y-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">IMO Number</span>
                {customer.imoNumber ? (
                  <div className="flex items-center justify-between gap-1 text-xs">
                    <span className="font-bold text-gray-700">{customer.imoNumber}</span>
                    <button 
                      onClick={handleCopyImo}
                      className="inline-flex items-center gap-1 text-[#10B981] hover:underline font-bold text-[11px] cursor-pointer"
                    >
                      {copiedImo ? (
                        <>
                          <span>COPIED</span>
                          <Check className="w-3 h-3 text-[#10B981]" />
                        </>
                      ) : (
                        <>
                          <span>COPY NUMBER</span>
                          <Copy className="w-3 h-3" />
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 italic uppercase">Not provided</span>
                )}
              </div>
            </div>

            {/* Display Customer Category, Gender and Address if present */}
            {(customer.customerCategory || customer.gender || customer.address) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                {customer.customerCategory && (
                  <div className="p-4 bg-[#F8FAFC] rounded-xl border border-gray-100 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#5A5A40] block">Customer Category</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#5A5A40]/10 text-[#5A5A40] border border-[#5A5A40]/20 uppercase">
                      {customer.customerCategory}
                    </span>
                  </div>
                )}
                {customer.gender && (
                  <div className="p-4 bg-[#F8FAFC] rounded-xl border border-gray-100 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">Gender</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase ${
                      customer.gender.toUpperCase() === 'MALE'
                        ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/30'
                        : 'bg-[#FDF2F8] dark:bg-[#500e2e]/20 text-[#D01C6D] dark:text-[#F472B6] border-[#FBCFE8] dark:border-[#9D174D]/30'
                    }`}>
                      {customer.gender}
                    </span>
                  </div>
                )}
                {customer.address && (
                  <div className="p-4 bg-[#F8FAFC] rounded-xl border border-gray-100 space-y-1.5 sm:col-span-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">Address</span>
                    <span className="text-xs font-medium text-gray-700 whitespace-pre-wrap uppercase leading-relaxed block">
                      {customer.address}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Case Remarks Section with Inline Auto-Save */}
            <div className="p-5 bg-emerald-50/30 rounded-2xl border border-emerald-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-800 uppercase">
                  <AlignLeft className="w-4 h-4" />
                  <span>Remarks & Case Notes</span>
                </div>
                {/* Save Status Indicators */}
                <span className="text-[9px] font-bold uppercase tracking-wider">
                  {remarksSaveStatus === 'EDITING' && <span className="text-amber-500 animate-pulse">✏ EDITING...</span>}
                  {remarksSaveStatus === 'SAVING' && <span className="text-blue-500 animate-pulse">💾 SAVING...</span>}
                  {remarksSaveStatus === 'SAVED' && <span className="text-emerald-500">✅ SAVED</span>}
                  {remarksSaveStatus === 'FAILED' && <span className="text-red-500">❌ SAVE FAILED</span>}
                </span>
              </div>
              <textarea
                className="w-full text-xs bg-white border border-gray-200 rounded-xl px-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 focus:border-[#10B981] transition-all text-[#1F2937] resize-none font-sans leading-relaxed"
                rows={3}
                placeholder="TYPE BACKGROUND DETAILS AND CASE NOTES HERE. AUTOSAVES AS YOU TYPE..."
                value={remarksInput}
                onChange={(e) => setRemarksInput(e.target.value)}
              />
            </div>
          </div>
        )}

      </div>

      {/* Dual Tabs layout: Tickets History & Scheduled Follow-ups */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Column: Scheduled Follow-up history */}
        <div className="space-y-4" id="customer-followups-panel">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-4 bg-[#8B5CF6] rounded" />
              <h3 className="font-serif font-bold text-[#1F2937] text-xs uppercase tracking-tight flex items-center gap-1.5">
                <CalendarCheck className="w-4.5 h-4.5" />
                <span>Follow-up History</span>
              </h3>
            </div>
            <span className="text-[9px] font-bold text-[#8B5CF6] bg-[#8B5CF6]/10 border border-[#8B5CF6]/25 px-2.5 py-1 rounded-full uppercase">
              {customerFollowUps.length} REMINDERS
            </span>
          </div>

          <div className="space-y-3 max-h-[420px] overflow-y-auto">
            {customerFollowUps.length > 0 ? (
              customerFollowUps.map(f => {
                const todayStr = new Date().toISOString().split('T')[0];
                const overdue = f.status === 'Pending' && f.followUpDate < todayStr;
                let statusBadgeStyle = '';
                if (f.status === 'Completed') {
                  statusBadgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                } else if (overdue) {
                  statusBadgeStyle = 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
                } else {
                  statusBadgeStyle = 'bg-amber-50 text-amber-700 border-amber-200';
                }

                return (
                  <div 
                    key={f.id}
                    className={`p-4 rounded-xl border text-xs space-y-2 bg-white ${
                      f.status === 'Completed' 
                        ? 'border-gray-200 opacity-80' 
                        : overdue
                          ? 'border-rose-300'
                          : 'border-amber-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono font-bold">
                      <span className="text-gray-400">{f.id}</span>
                      <span className={`px-2 py-0.5 rounded-full border uppercase ${statusBadgeStyle}`}>
                        {overdue ? 'OVERDUE: ' : ''}{getRelativeDateLabel(f.followUpDate)} @ {f.followUpTime}
                      </span>
                    </div>
                    <p className="italic text-gray-700 font-sans uppercase">
                      "{f.notes}"
                    </p>
                    <div className="flex justify-between items-center text-[9px] text-gray-400 font-bold uppercase pt-2 border-t border-gray-100">
                      <span>Status: {f.status}</span>
                      <span>Created: {new Date(f.createdAt || '').toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 bg-white border border-gray-200 rounded-[20px] text-center text-xs space-y-3 shadow-xs">
                <div className="text-3xl">📅</div>
                <h4 className="font-serif font-bold text-[#1F2937] text-xs uppercase">NO REMINDERS</h4>
                <p className="text-[10px] text-gray-400 font-semibold uppercase">Schedule followups or reminders to never miss call back.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Ticket Logs / History Section */}
        <div className="space-y-4" id="ticket-history-section">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-4 bg-[#3B82F6] rounded" />
              <h2 className="font-serif font-bold text-[#1F2937] text-xs uppercase tracking-tight flex items-center gap-1.5">
                <History className="w-4 h-4" />
                <span>Support Tickets Log</span>
              </h2>
            </div>
            
            {/* Simple Dropdown Filter */}
            <select
              className="text-xs font-bold bg-white border border-gray-200 rounded-lg px-2 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="All">ALL STATUS</option>
              <option value="Open">OPEN</option>
              <option value="Pending">PENDING</option>
              <option value="Closed">CLOSED</option>
            </select>
          </div>

          {/* Ticket List */}
          <div className="space-y-3 max-h-[420px] overflow-y-auto" id="customer-ticket-logs">
            {customerTickets.length > 0 ? (
              customerTickets.map((ticket) => {
                // Status Styling
                let badgeColor = '';
                let statusIcon = null;
                if (ticket.status === 'Open') {
                  badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                  statusIcon = <Clock className="w-3.5 h-3.5" />;
                } else if (ticket.status === 'Closed') {
                  badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
                  statusIcon = <CheckCircle className="w-3.5 h-3.5" />;
                } else {
                  badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
                  statusIcon = <Clock className="w-3.5 h-3.5" />;
                }

                return (
                  <div
                    key={ticket.id}
                    id={`ticket-card-${ticket.id}`}
                    className="bg-white p-4 rounded-xl border border-gray-200 space-y-2.5 text-xs shadow-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[9px] font-bold text-gray-500 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded-md">
                        {ticket.id}
                      </span>
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${badgeColor}`}>
                        {statusIcon}
                        {ticket.status}
                      </span>
                    </div>

                    <p className="text-xs text-gray-700 leading-relaxed break-words whitespace-pre-wrap font-sans uppercase">
                      {ticket.conversationDescription}
                    </p>

                    <div className="pt-2 border-t border-gray-100 text-[9px] font-bold text-gray-400 uppercase">
                      Opened: {formatDateTime(ticket.createdAt)}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 bg-white border border-gray-200 rounded-[20px] text-center text-xs space-y-3 shadow-xs" id="no-tickets-fallback">
                <div className="text-3xl">🎫</div>
                <h4 className="font-serif font-bold text-[#1F2937] text-xs uppercase">NO TICKETS AVAILABLE</h4>
                <p className="text-[10px] text-gray-400 font-semibold uppercase">Open a ticket if support requests are submitted.</p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
});

export default CustomerDetails;
