import React, { useState, useEffect } from 'react';
import { Customer, AdditionalNumber, Ticket, TicketStatus, FollowUp, User as UserType } from '../types';
import SmartContactActions from './SmartContactActions';
import InlineCopy from './InlineCopy';
import { getCustomerTimeline } from '../utils/activityLogger';
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
  Copy,
  Archive,
  RotateCcw,
  ShieldAlert,
  AlertTriangle,
  MoreVertical,
  Download,
  Eye
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
    gender?: string,
    additionalNumbers?: AdditionalNumber[]
  ) => Promise<{ success: boolean; error?: string }>;
  onDeleteCustomer: (id: string) => Promise<{ success: boolean; error?: string }>;
  onArchiveCustomer?: (id: string) => Promise<{ success: boolean; error?: string }>;
  onRestoreCustomer?: (id: string) => Promise<{ success: boolean; error?: string }>;
  onPermanentDeleteCustomer?: (id: string) => Promise<{ success: boolean; error?: string }>;
  currentUser?: UserType | null;
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
  onDeleteCustomer,
  onArchiveCustomer,
  onRestoreCustomer,
  onPermanentDeleteCustomer,
  currentUser
}: CustomerDetailsProps) {
  // Filters
  const [statusFilter, setStatusFilter] = useState<'All' | TicketStatus>('All');

  // Archive / Restore / Permanent Delete Modals
  const [isConfirmArchiving, setIsConfirmArchiving] = useState(false);
  const [isConfirmRestoring, setIsConfirmRestoring] = useState(false);
  const [isConfirmPermanentDeleting, setIsConfirmPermanentDeleting] = useState(false);

  // More Actions Dropdown & Active Record Validation State
  const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false);
  const moreActionsRef = React.useRef<HTMLDivElement>(null);
  const [isBlockedArchiveModalOpen, setIsBlockedArchiveModalOpen] = useState(false);
  const [activeRecordCounts, setActiveRecordCounts] = useState<{ openTickets: number; pendingFollowUps: number }>({ openTickets: 0, pendingFollowUps: 0 });
  const [copiedIdToast, setCopiedIdToast] = useState(false);

  // Close More Actions dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreActionsRef.current && !moreActionsRef.current.contains(event.target as Node)) {
        setIsMoreActionsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Smart Visibility Rules for Archive Action
  const canArchiveCustomer = React.useMemo(() => {
    const isAdmin = currentUser?.role === 'Admin';
    const isNotArchived = !customer.isArchived;
    return isAdmin && isNotArchived;
  }, [currentUser, customer]);

  // Initiate Archive with Active Records Check
  const handleInitiateArchive = () => {
    setIsMoreActionsOpen(false);
    
    // Check for Open tickets
    const openTicketsCount = tickets.filter(
      t => t.customerId === customer.id && t.status === 'Open'
    ).length;

    // Check for Pending follow-ups
    const pendingFollowUpsCount = followUps.filter(
      f => f.customerId === customer.id && f.status === 'Pending'
    ).length;

    if (openTicketsCount > 0 || pendingFollowUpsCount > 0) {
      setActiveRecordCounts({
        openTickets: openTicketsCount,
        pendingFollowUps: pendingFollowUpsCount
      });
      setIsBlockedArchiveModalOpen(true);
      return;
    }

    setIsConfirmArchiving(true);
  };

  const handleViewDetails = () => {
    setIsMoreActionsOpen(false);
    const element = document.getElementById('customer-info-card');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCopyCustomerId = () => {
    setIsMoreActionsOpen(false);
    navigator.clipboard.writeText(customer.id);
    setCopiedIdToast(true);
    setTimeout(() => setCopiedIdToast(false), 2500);
  };

  const handleExportCustomer = () => {
    setIsMoreActionsOpen(false);
    const exportData = {
      id: customer.id,
      name: customer.name,
      mobileNumber: customer.mobileNumber,
      whatsAppNumber: customer.whatsAppNumber || '',
      imoNumber: customer.imoNumber || '',
      customerCategory: customer.customerCategory || '',
      destinationCountry: customer.destinationCountry || '',
      address: customer.address || '',
      gender: customer.gender || '',
      source: customer.source || '',
      remarks: customer.remarks || '',
      createdAt: customer.createdAt,
      tickets: tickets.filter(t => t.customerId === customer.id),
      followUps: followUps.filter(f => f.customerId === customer.id)
    };

    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Customer_${customer.id}_${customer.name.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(customer.name);
  const [editMobile, setEditMobile] = useState(customer.mobileNumber);
  const [editAdditionalNumbers, setEditAdditionalNumbers] = useState<{ id: string; suffix: string }[]>([]);

  const handleAddEditAdditionalNumberRow = () => {
    const id = `AN-TEMP-${Math.floor(100000 + Math.random() * 900000)}`;
    setEditAdditionalNumbers(prev => [...prev, { id, suffix: '' }]);
  };

  const handleRemoveEditAdditionalNumberRow = (id: string) => {
    setEditAdditionalNumbers(prev => prev.filter(item => item.id !== id));
  };

  const handleEditAdditionalNumberChange = (id: string, value: string) => {
    setEditAdditionalNumbers(prev => prev.map(item => item.id === id ? { ...item, suffix: value } : item));
  };

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
    if (customer.additionalNumbers) {
      setEditAdditionalNumbers(customer.additionalNumbers.map(an => ({
        id: an.id,
        suffix: an.number.startsWith('+880') ? an.number.slice(4) : an.number
      })));
    } else {
      setEditAdditionalNumbers([]);
    }
    setEditWhatsApp(customer.whatsAppNumber || '');
    setIsSameAsMobile(customer.whatsAppNumber === customer.mobileNumber);
    setEditImo(customer.imoNumber || '');
    setIsImoSameAsMobile(customer.imoNumber === customer.mobileNumber && !!customer.imoNumber);
    setEditRemarks(customer.remarks || '');
    setEditCategory(customer.customerCategory || '');
    setEditGender(customer.gender || '');
    setCategorySearchQuery(customer.customerCategory || '');
    setEditAddress(customer.address || '');
  }, [customer, isEditing]);

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
  const [activeSubTab, setActiveSubTab] = useState<'timeline' | 'tickets' | 'followups'>('timeline');
  const [newNumLabel, setNewNumLabel] = useState('');
  const [newNumVal, setNewNumVal] = useState('');

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

  // Add additional number
  const handleAddAdditionalNumber = async () => {
    const label = newNumLabel.trim();
    const value = newNumVal.trim();
    if (!label || !value) return;

    const type = (label.toLowerCase() === 'secondary' || label.toLowerCase() === 'additional') 
      ? (label.charAt(0).toUpperCase() + label.slice(1).toLowerCase()) as 'Secondary' | 'Additional' 
      : 'Additional';

    const updatedNumbers = [...(customer.additionalNumbers || [])];
    const exists = updatedNumbers.some(n => n.number.replace(/\D/g, '') === value.replace(/\D/g, '')) || 
                   customer.mobileNumber.replace(/\D/g, '') === value.replace(/\D/g, '');
    if (exists) {
      setAlert({ type: 'error', message: 'Number already registered for this customer.' });
      return;
    }

    const newNum: AdditionalNumber = {
      id: `AN-${Math.floor(100000 + Math.random() * 900000)}`,
      type,
      number: value
    };
    updatedNumbers.push(newNum);

    setAlert({ type: 'loading', message: 'Adding additional number...' });
    const res = await onUpdateCustomer(
      customer.id,
      customer.name,
      customer.mobileNumber,
      customer.whatsAppNumber || '',
      customer.destinationCountry || '',
      customer.source || 'Other',
      customer.remarks || '',
      customer.imoNumber || '',
      customer.customerCategory || '',
      customer.address || '',
      customer.gender || '',
      updatedNumbers
    );

    if (res.success) {
      setNewNumLabel('');
      setNewNumVal('');
      setAlert({ type: 'success', message: 'Additional contact number added!' });
      setTimeout(() => setAlert({ type: 'idle', message: '' }), 1500);
    } else {
      setAlert({ type: 'error', message: res.error || 'Failed to add contact number' });
    }
  };

  // Remove additional number
  const handleRemoveAdditionalNumber = async (numToRemove: string) => {
    const updatedNumbers = (customer.additionalNumbers || []).filter(n => n.number !== numToRemove);
    
    setAlert({ type: 'loading', message: 'Removing contact number...' });
    const res = await onUpdateCustomer(
      customer.id,
      customer.name,
      customer.mobileNumber,
      customer.whatsAppNumber || '',
      customer.destinationCountry || '',
      customer.source || 'Other',
      customer.remarks || '',
      customer.imoNumber || '',
      customer.customerCategory || '',
      customer.address || '',
      customer.gender || '',
      updatedNumbers
    );

    if (res.success) {
      setAlert({ type: 'success', message: 'Contact number removed.' });
      setTimeout(() => setAlert({ type: 'idle', message: '' }), 1500);
    } else {
      setAlert({ type: 'error', message: res.error || 'Failed to remove contact number' });
    }
  };

  // Set an additional number as primary (Swaps with current primary/main mobile)
  const handleSetPrimaryNumber = async (numToMakePrimary: AdditionalNumber) => {
    const oldPrimaryMobile = customer.mobileNumber;
    const oldPrimaryType: 'Secondary' | 'Additional' = 'Secondary';

    const updatedNumbers = (customer.additionalNumbers || [])
      .filter(n => n.number !== numToMakePrimary.number)
      .concat({ 
        id: `AN-${Math.floor(100000 + Math.random() * 900000)}`,
        type: oldPrimaryType, 
        number: oldPrimaryMobile 
      });

    setAlert({ type: 'loading', message: 'Updating primary contact number...' });
    const res = await onUpdateCustomer(
      customer.id,
      customer.name,
      numToMakePrimary.number,
      customer.whatsAppNumber || '',
      customer.destinationCountry || '',
      customer.source || 'Other',
      customer.remarks || '',
      customer.imoNumber || '',
      customer.customerCategory || '',
      customer.address || '',
      customer.gender || '',
      updatedNumbers
    );

    if (res.success) {
      setAlert({ type: 'success', message: 'Primary mobile number updated successfully!' });
      setTimeout(() => setAlert({ type: 'idle', message: '' }), 1500);
    } else {
      setAlert({ type: 'error', message: res.error || 'Failed to update primary mobile number' });
    }
  };

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

    // Validate and check duplicate numbers within the same customer
    const suffixesSeen = new Set<string>();
    const digitsOnlyPrimary = trimmedMobile.replace(/\D/g, '');
    if (digitsOnlyPrimary) {
      suffixesSeen.add(digitsOnlyPrimary);
    }

    let invalidFormatFound = false;
    let duplicateFoundInside = false;

    for (const addNum of editAdditionalNumbers) {
      const s = addNum.suffix.trim();
      const digits = s.replace(/\D/g, '');
      if (!s || digits.length < 9) {
        invalidFormatFound = true;
      }
      if (suffixesSeen.has(digits)) {
        duplicateFoundInside = true;
      }
      suffixesSeen.add(digits);
    }

    if (invalidFormatFound) {
      setAlert({ type: 'error', message: 'Valid mobile number required for all fields.' });
      return;
    } else if (duplicateFoundInside) {
      setAlert({ type: 'error', message: 'Duplicate mobile numbers found for this customer.' });
      return;
    }

    // Check duplicate mobile numbers, ignoring current customer
    let existsInDb = false;
    for (const suffix of Array.from(suffixesSeen)) {
      const isDuplicate = existingCustomers.some(c => {
        if (c.id === customer.id) return false;
        const mainDigits = c.mobileNumber.replace(/\D/g, '');
        if (mainDigits === suffix) return true;
        const addDigits = (c.additionalNumbers || []).map(an => an.number.replace(/\D/g, ''));
        if (addDigits.includes(suffix)) return true;
        return false;
      });
      if (isDuplicate) {
        existsInDb = true;
        break;
      }
    }

    if (existsInDb) {
      setAlert({ type: 'error', message: 'Another customer with one of these mobile numbers already exists.' });
      return;
    }

    setAlert({ type: 'loading', message: 'Saving customer profile changes...' });

    try {
      const updatedAdditionalNumbers: AdditionalNumber[] = editAdditionalNumbers.map(an => {
        const cleanSuffix = an.suffix.trim();
        const normalized = cleanSuffix.startsWith('0') ? cleanSuffix.slice(1) : cleanSuffix;
        const formattedNum = `+880${normalized}`;
        return {
          id: an.id,
          type: 'Additional',
          number: formattedNum
        };
      });

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
        editGender,
        updatedAdditionalNumbers
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

  // Archive / Restore / Permanent Delete Handlers
  const handleArchive = async () => {
    if (!onArchiveCustomer) return;
    setAlert({ type: 'loading', message: 'Archiving customer profile...' });
    const res = await onArchiveCustomer(customer.id);
    setIsConfirmArchiving(false);
    if (res.success) {
      setAlert({ type: 'success', message: 'Customer profile moved to Archive.' });
      setTimeout(() => setAlert({ type: 'idle', message: '' }), 3000);
    } else {
      setAlert({ type: 'error', message: res.error || 'Failed to archive customer profile.' });
    }
  };

  const handleRestore = async () => {
    if (!onRestoreCustomer) return;
    setAlert({ type: 'loading', message: 'Restoring customer profile...' });
    const res = await onRestoreCustomer(customer.id);
    setIsConfirmRestoring(false);
    if (res.success) {
      setAlert({ type: 'success', message: 'Customer profile restored to active directory.' });
      setTimeout(() => setAlert({ type: 'idle', message: '' }), 3000);
    } else {
      setAlert({ type: 'error', message: res.error || 'Failed to restore customer profile.' });
    }
  };

  const handlePermanentDelete = async () => {
    if (!onPermanentDeleteCustomer) return;
    setAlert({ type: 'loading', message: 'Permanently deleting customer record...' });
    const res = await onPermanentDeleteCustomer(customer.id);
    setIsConfirmPermanentDeleting(false);
    if (res.success) {
      setAlert({ type: 'success', message: 'Customer record permanently deleted.' });
      setTimeout(() => {
        onBack();
      }, 1000);
    } else {
      setAlert({ type: 'error', message: res.error || 'Failed to permanently delete customer.' });
    }
  };

  return (
    <div className="space-y-6" id="customer-details-view">
      
      {/* Archive Status Banner */}
      {customer.isArchived && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between text-xs font-bold text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-amber-600" />
            <span>THIS CUSTOMER PROFILE IS ARCHIVED (Hidden from active directory)</span>
          </div>
          {customer.archivedAt && (
            <span className="font-mono text-[11px] text-amber-800 dark:text-amber-300">
              Archived: {new Date(customer.archivedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      )}
      
      {/* Header action panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" id="details-header-panel">
        <button
          onClick={onBack}
          id="btn-details-back"
          className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#6B705C] hover:text-[#2E4F32] hover:bg-gray-100 bg-white border border-gray-200 px-4 py-2.5 rounded-full transition-all cursor-pointer shadow-xs active:scale-95 dark:bg-[#1a1a15] dark:border-[#8a8a70]/30 dark:text-[#C4C4B5] dark:hover:bg-[#2a2a20] dark:hover:text-[#f5f5f0] self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>BACK TO DIRECTORY</span>
        </button>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => onAddFollowUp(customer.id)}
            id="btn-details-new-followup"
            className="inline-flex items-center justify-center gap-2 bg-[#8B5CF6]/10 text-[#8B5CF6] hover:bg-[#8B5CF6]/20 border border-[#8B5CF6]/25 font-bold text-[13px] px-4 h-10 rounded-full transition-all cursor-pointer active:scale-95 dark:bg-[#8B5CF6]/20 dark:text-[#c084fc] dark:border-[#8B5CF6]/30 dark:hover:bg-[#8B5CF6]/30"
          >
            <CalendarCheck className="w-4 h-4" />
            <span>ADD REMINDER</span>
          </button>
          
          <button
            onClick={() => onAddTicket(customer.id)}
            id="btn-details-new-ticket"
            className="inline-flex items-center justify-center gap-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold text-[13px] px-5 h-10 rounded-full shadow-md shadow-[#3B82F6]/10 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>NEW TICKET</span>
          </button>
        </div>
      </div>

      {/* Action alerts */}
      {alert.type === 'error' && (
        <div id="details-alert-error" className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2.5 text-[13px] text-rose-800 leading-tight dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400">
          <AlertCircle className="w-4.5 h-4.5 shrink-0 text-rose-500 mt-0.5" />
          <span className="font-semibold uppercase">{alert.message}</span>
        </div>
      )}

      {alert.type === 'success' && (
        <div id="details-alert-success" className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-2.5 text-[13px] text-emerald-800 leading-tight dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400">
          <CheckCircle className="w-4.5 h-4.5 shrink-0 text-emerald-500 mt-0.5" />
          <span className="font-semibold uppercase">{alert.message}</span>
        </div>
      )}

      {alert.type === 'loading' && (
        <div id="details-alert-loading" className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-2.5 text-[13px] text-blue-800 leading-tight dark:bg-blue-950/20 dark:border-blue-900/30 dark:text-blue-400">
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
                <div className="flex justify-between items-center h-5 mb-0.5">
                  <label htmlFor="edit-mobile-input" className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Mobile Number</label>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="tel"
                      id="edit-mobile-input"
                      required
                      className="flex-1 text-xs bg-[#F8FAFC] border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 focus:border-[#10B981] transition-all font-medium text-[#1F2937]"
                      value={editMobile}
                      onChange={(e) => {
                        setEditMobile(e.target.value);
                        if (isSameAsMobile) setEditWhatsApp(e.target.value);
                        if (isImoSameAsMobile) setEditImo(e.target.value);
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddEditAdditionalNumberRow}
                      className="w-[42px] h-[42px] rounded-xl bg-accent-green hover:bg-emerald-600 text-white flex items-center justify-center active:scale-95 transition-all shadow-xs shrink-0 cursor-pointer"
                      title="Add Additional Mobile Number"
                    >
                      <Plus className="w-5 h-5 text-white" />
                    </button>
                  </div>

                  {editAdditionalNumbers.map((field) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <div className="flex-1 flex rounded-xl bg-[#F8FAFC] dark:bg-[#151510]/50 border border-gray-200 dark:border-[#8a8a70]/30 overflow-hidden focus-within:ring-2 focus-within:ring-[#10B981]/20 focus-within:border-[#10B981] transition-all">
                        <div className="bg-gray-100 dark:bg-zinc-800 px-3 flex items-center justify-center text-[11px] font-bold text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-[#8a8a70]/20 select-none">
                          +880
                        </div>
                        <input
                          type="tel"
                          pattern="[0-9]*"
                          inputMode="numeric"
                          className="w-full text-xs bg-transparent border-none px-3 py-2.5 focus:outline-none font-medium text-[#1F2937] dark:text-[#ecece5] uppercase placeholder-gray-400"
                          placeholder="17XXXXXXXX"
                          value={field.suffix}
                          onChange={(e) => handleEditAdditionalNumberChange(field.id, e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveEditAdditionalNumberRow(field.id)}
                        className="w-[42px] h-[42px] flex items-center justify-center text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl active:scale-95 transition-all shrink-0 cursor-pointer border border-transparent hover:border-rose-100"
                        title="Remove this number"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
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
                    <h1 className="text-xl font-serif font-bold text-[#1F2937] dark:text-[#f5f5f0] leading-tight uppercase" id="customer-detail-name">
                      {customer.name}
                    </h1>
                    <InlineCopy type="name" value={customer.name} className="min-w-[20px] min-h-[20px] p-0" />
                    
                    <span className="inline-flex items-center gap-1 font-mono text-[13px] font-bold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md dark:bg-[#1a1a15] dark:border-[#8a8a70]/20 dark:text-[#a0a085]">
                      {customer.id}
                      <InlineCopy type="customerId" value={customer.id} className="min-w-[16px] min-h-[16px] p-0" />
                    </span>

                    {customer.customerCategory && (
                      <span className="inline-flex items-center font-mono text-[13px] font-bold px-2.5 py-0.5 rounded-md border bg-[#5A5A40]/10 text-[#5A5A40] border-[#5A5A40]/20 dark:bg-[#5A5A40]/20 dark:text-[#c0c090] dark:border-[#5A5A40]/30 uppercase tracking-wide" id="profile-badge-category">
                        {customer.customerCategory}
                      </span>
                    )}
                    {customer.gender && (
                      <span className={`inline-flex items-center font-mono text-[13px] font-bold px-2.5 py-0.5 rounded-md border uppercase tracking-wide ${
                        customer.gender.toUpperCase() === 'MALE'
                          ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/30'
                          : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/30'
                      }`} id="profile-badge-gender">
                        {customer.gender}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-center sm:justify-start gap-y-1.5 gap-x-4 text-[13px] text-gray-500 dark:text-[#a0a085] font-semibold">
                    <span className="flex items-center justify-center sm:justify-start gap-1 text-[#1F2937] dark:text-[#ecece5]">
                      <Phone className="w-3.5 h-3.5 text-[#10B981]" />
                      <a href={`tel:${customer.mobileNumber}`} className="hover:underline font-bold text-[13px]" id="customer-detail-mobile">{customer.mobileNumber}</a>
                      <InlineCopy type="mobile" value={customer.mobileNumber} className="min-w-[16px] min-h-[16px] p-0" />
                    </span>
                    <span className="flex items-center justify-center sm:justify-start gap-1">
                      <span className="text-[13px] uppercase font-bold text-gray-400 dark:text-[#8a8a70]">LATEST TICKET:</span>
                      <span className="font-mono font-bold text-gray-700 dark:text-[#ecece5]">{latestTicketId || 'NONE'}</span>
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
                      additionalNumbers={customer.additionalNumbers}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 justify-center md:justify-end">
                {!customer.isArchived ? (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      id="btn-edit-customer"
                      className="inline-flex items-center justify-center gap-2 px-5 h-10 bg-[#10B981] hover:bg-[#059669] text-white font-bold text-[13px] rounded-full shadow-md shadow-[#10B981]/15 transition-all cursor-pointer active:scale-95"
                      title="Edit Customer Info"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>EDIT PROFILE</span>
                    </button>

                    {/* More Actions Dropdown */}
                    <div className="relative" ref={moreActionsRef}>
                      <button
                        onClick={() => setIsMoreActionsOpen(prev => !prev)}
                        id="btn-more-actions"
                        className="inline-flex items-center justify-center gap-1.5 px-4 h-10 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-[#1a1a15] dark:hover:bg-[#25251e] dark:text-[#ecece5] font-bold text-[13px] rounded-full border border-gray-200 dark:border-[#8a8a70]/30 transition-all cursor-pointer active:scale-95"
                        title="More Actions"
                      >
                        <span>MORE</span>
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      <AnimatePresence>
                        {isMoreActionsOpen && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -5 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#1a1a15] rounded-2xl border border-gray-200 dark:border-[#8a8a70]/30 shadow-xl z-50 overflow-hidden py-1.5 text-[13px] font-bold"
                            id="dropdown-more-actions"
                          >
                            <button
                              onClick={handleViewDetails}
                              id="action-view-details"
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-gray-700 dark:text-[#ecece5] hover:bg-gray-50 dark:hover:bg-[#25251e] transition-colors text-left cursor-pointer"
                            >
                              <Eye className="w-4 h-4 text-gray-400" />
                              <span>VIEW DETAILS</span>
                            </button>

                            <button
                              onClick={handleCopyCustomerId}
                              id="action-copy-customer-id"
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-gray-700 dark:text-[#ecece5] hover:bg-gray-50 dark:hover:bg-[#25251e] transition-colors text-left cursor-pointer"
                            >
                              <Copy className="w-4 h-4 text-gray-400" />
                              <span>COPY CUSTOMER ID</span>
                            </button>

                            <button
                              onClick={handleExportCustomer}
                              id="action-export-customer"
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-gray-700 dark:text-[#ecece5] hover:bg-gray-50 dark:hover:bg-[#25251e] transition-colors text-left cursor-pointer"
                            >
                              <Download className="w-4 h-4 text-gray-400" />
                              <span>EXPORT CUSTOMER</span>
                            </button>

                            {canArchiveCustomer && (
                              <>
                                <div className="my-1 border-t border-gray-100 dark:border-[#8a8a70]/10" />
                                <button
                                  onClick={handleInitiateArchive}
                                  id="btn-archive-customer"
                                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors text-left cursor-pointer"
                                >
                                  <Archive className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                  <span>ARCHIVE CUSTOMER</span>
                                </button>
                              </>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold text-[13px] rounded-full border border-amber-300 dark:border-amber-800/50" id="badge-customer-archived">
                      <Archive className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>ARCHIVED</span>
                    </span>

                    {currentUser?.role === 'Admin' && (
                      <button
                        onClick={() => setIsConfirmPermanentDeleting(true)}
                        id="btn-permanent-delete-customer"
                        className="inline-flex items-center justify-center gap-2 px-5 h-10 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[13px] rounded-full shadow-md shadow-rose-600/15 transition-all cursor-pointer active:scale-95"
                        title="Admin Only: Permanently Delete Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>PERMANENTLY DELETE</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Secondary recruitment data display */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100/60 dark:border-[#8a8a70]/10">
              {/* WhatsApp Quick Link */}
              <div className="p-4 bg-[#F8FAFC] dark:bg-[#151512] rounded-xl border border-gray-100 dark:border-[#8a8a70]/10 space-y-1.5">
                <span className="text-[13px] uppercase font-bold tracking-wider text-gray-400 dark:text-[#8a8a70] block">WhatsApp Chat</span>
                {customer.whatsAppNumber ? (
                  <div className="flex items-center justify-between gap-1 text-[13px]">
                    <span className="font-bold text-gray-700 dark:text-[#ecece5]">{customer.whatsAppNumber}</span>
                    <a 
                      href={getWhatsAppUrl(customer.whatsAppNumber)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#22C55E] hover:underline font-bold text-[13px]"
                    >
                      <span>CONNECT</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ) : (
                  <span className="text-[13px] text-gray-400 dark:text-[#8a8a70] italic uppercase">Not provided</span>
                )}
              </div>

              {/* IMO Number Card */}
              <div className="p-4 bg-[#F8FAFC] dark:bg-[#151512] rounded-xl border border-gray-100 dark:border-[#8a8a70]/10 space-y-1.5">
                <span className="text-[13px] uppercase font-bold tracking-wider text-gray-400 dark:text-[#8a8a70] block">IMO Number</span>
                {customer.imoNumber ? (
                  <div className="flex items-center justify-between gap-1 text-[13px]">
                    <span className="font-bold text-gray-700 dark:text-[#ecece5]">{customer.imoNumber}</span>
                    <button 
                      onClick={handleCopyImo}
                      className="inline-flex items-center gap-1 text-[#10B981] hover:underline font-bold text-[13px] cursor-pointer"
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
                  <span className="text-[13px] text-gray-400 dark:text-[#8a8a70] italic uppercase">Not provided</span>
                )}
              </div>
            </div>

            {/* Display Customer Category, Gender and Address if present */}
            {(customer.customerCategory || customer.gender || customer.address) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100/60 dark:border-[#8a8a70]/10">
                {customer.customerCategory && (
                  <div className="p-4 bg-[#F8FAFC] dark:bg-[#151512] rounded-xl border border-gray-100 dark:border-[#8a8a70]/10 space-y-1.5">
                    <span className="text-[13px] uppercase font-bold tracking-wider text-[#5A5A40] dark:text-[#c0c090] block">Customer Category</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[13px] font-bold bg-[#5A5A40]/10 text-[#5A5A40] border border-[#5A5A40]/20 dark:bg-[#5A5A40]/20 dark:text-[#c0c090] dark:border-[#5A5A40]/30 uppercase">
                      {customer.customerCategory}
                    </span>
                  </div>
                )}
                {customer.gender && (
                  <div className="p-4 bg-[#F8FAFC] dark:bg-[#151512] rounded-xl border border-gray-100 dark:border-[#8a8a70]/10 space-y-1.5">
                    <span className="text-[13px] uppercase font-bold tracking-wider text-gray-400 dark:text-[#8a8a70] block">Gender</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[13px] font-bold border uppercase ${
                      customer.gender.toUpperCase() === 'MALE'
                        ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/30'
                        : 'bg-[#FDF2F8] dark:bg-[#500e2e]/20 text-[#D01C6D] dark:text-[#F472B6] border-[#FBCFE8] dark:border-[#9D174D]/30'
                    }`}>
                      {customer.gender}
                    </span>
                  </div>
                )}
                {customer.address && (
                  <div className="p-4 bg-[#F8FAFC] dark:bg-[#151512] rounded-xl border border-gray-100 dark:border-[#8a8a70]/10 space-y-1.5 sm:col-span-1">
                    <span className="text-[13px] uppercase font-bold tracking-wider text-gray-400 dark:text-[#8a8a70] block">Address</span>
                    <span className="text-[13px] font-medium text-gray-700 dark:text-[#ecece5] whitespace-pre-wrap uppercase leading-relaxed block">
                      {customer.address}
                    </span>
                  </div>
                )}
              </div>
            )}



            {/* Case Remarks Section with Inline Auto-Save */}
            <div className="p-5 bg-emerald-50/30 dark:bg-[#1b3a24]/10 rounded-2xl border border-emerald-100 dark:border-[#10b981]/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[13px] font-bold text-emerald-800 dark:text-emerald-400 uppercase">
                  <AlignLeft className="w-4 h-4" />
                  <span>Remarks & Case Notes</span>
                </div>
                {/* Save Status Indicators */}
                <span className="text-[13px] font-bold uppercase tracking-wider">
                  {remarksSaveStatus === 'EDITING' && <span className="text-amber-500 animate-pulse">✏ EDITING...</span>}
                  {remarksSaveStatus === 'SAVING' && <span className="text-blue-500 animate-pulse">💾 SAVING...</span>}
                  {remarksSaveStatus === 'SAVED' && <span className="text-emerald-500">✅ SAVED</span>}
                  {remarksSaveStatus === 'FAILED' && <span className="text-red-500">❌ SAVE FAILED</span>}
                </span>
              </div>
              <textarea
                className="w-full text-[13px] bg-white dark:bg-[#1a1a15] border border-gray-200 dark:border-[#8a8a70]/20 rounded-xl px-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 focus:border-[#10B981] transition-all text-[#1F2937] dark:text-[#f5f5f0] resize-none font-sans leading-relaxed"
                rows={3}
                placeholder="TYPE BACKGROUND DETAILS AND CASE NOTES HERE. AUTOSAVES AS YOU TYPE..."
                value={remarksInput}
                onChange={(e) => setRemarksInput(e.target.value)}
              />
            </div>
          </div>
        )}

      </div>

      {/* Three Sub-Tabs Switcher */}
      <div className="flex border-b border-gray-200 dark:border-[#8a8a70]/20 mb-6">
        <button
          onClick={() => setActiveSubTab('timeline')}
          className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider border-b-2 text-center transition-all cursor-pointer ${
            activeSubTab === 'timeline'
              ? 'border-[#10B981] text-[#10B981]'
              : 'border-transparent text-gray-400 hover:text-gray-600 dark:text-[#8a8a70] dark:hover:text-[#ecece5]'
          }`}
        >
          🕒 Activity Timeline ({getCustomerTimeline(customer.id, customer, tickets, followUps).length})
        </button>
        <button
          onClick={() => setActiveSubTab('tickets')}
          className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider border-b-2 text-center transition-all cursor-pointer ${
            activeSubTab === 'tickets'
              ? 'border-[#3B82F6] text-[#3B82F6]'
              : 'border-transparent text-gray-400 hover:text-gray-600 dark:text-[#8a8a70] dark:hover:text-[#ecece5]'
          }`}
        >
          🎫 Ticket Logs ({customerTickets.length})
        </button>
        <button
          onClick={() => setActiveSubTab('followups')}
          className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider border-b-2 text-center transition-all cursor-pointer ${
            activeSubTab === 'followups'
              ? 'border-[#8B5CF6] text-[#8B5CF6]'
              : 'border-transparent text-gray-400 hover:text-gray-600 dark:text-[#8a8a70] dark:hover:text-[#ecece5]'
          }`}
        >
          📅 Follow-up History ({customerFollowUps.length})
        </button>
      </div>

      {/* Tab Panels */}
      <div className="bg-white dark:bg-[#20201a] p-6 rounded-[24px] border border-gray-200 dark:border-[#8a8a70]/20 shadow-md">
        {/* 🕒 Activity Timeline Tab */}
        {activeSubTab === 'timeline' && (
          <div className="space-y-6" id="customer-timeline-panel">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-4 bg-[#10B981] rounded" />
                <h3 className="font-serif font-bold text-[#1F2937] dark:text-[#f5f5f0] text-[16px] uppercase tracking-tight flex items-center gap-1.5">
                  <span>Customer Activity History</span>
                </h3>
              </div>
              <span className="text-[13px] font-bold text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/25 px-2.5 py-1 rounded-full uppercase dark:bg-[#10B981]/20 dark:text-[#a7f3d0] dark:border-[#10B981]/30">
                {getCustomerTimeline(customer.id, customer, tickets, followUps).length} EVENTS
              </span>
            </div>

            <div className="relative border-l-2 border-gray-100 dark:border-[#8a8a70]/10 pl-6 ml-3 space-y-6 max-h-[500px] overflow-y-auto pr-2">
              {getCustomerTimeline(customer.id, customer, tickets, followUps).length > 0 ? (
                getCustomerTimeline(customer.id, customer, tickets, followUps).map((item, idx) => {
                  let icon = '📝';
                  let iconBg = 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400';
                  const act = item.activity.toLowerCase();
                  
                  if (act.includes('create') || act.includes('onboard') || item.type === 'CREATED') {
                    icon = '✨';
                    iconBg = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400';
                  } else if (act.includes('ticket') || item.type === 'TICKET_CREATED' || item.type === 'TICKET_CLOSED') {
                    if (act.includes('closed') || act.includes('close') || item.type === 'TICKET_CLOSED') {
                      icon = '✅';
                      iconBg = 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400';
                    } else {
                      icon = '🎫';
                      iconBg = 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400';
                    }
                  } else if (act.includes('follow-up') || act.includes('followup') || item.type === 'FOLLOWUP_ADDED' || item.type === 'FOLLOWUP_COMPLETED') {
                    if (act.includes('completed') || item.type === 'FOLLOWUP_COMPLETED') {
                      icon = '✓';
                      iconBg = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400';
                    } else {
                      icon = '📅';
                      iconBg = 'bg-purple-50 text-purple-600 dark:bg-purple-950/20 dark:text-purple-400';
                    }
                  } else if (act.includes('call') || item.type === 'CALL_LOGGED') {
                    icon = '📞';
                    iconBg = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400/80';
                  } else if (act.includes('whatsapp') || item.type === 'WHATSAPP_CONTACTED') {
                    icon = '💬';
                    iconBg = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400/80';
                  } else if (act.includes('imo') || item.type === 'IMO_CONTACTED') {
                    icon = '🔵';
                    iconBg = 'bg-sky-50 text-sky-600 dark:bg-sky-950/20 dark:text-sky-400/80';
                  } else if (act.includes('update') || item.type === 'UPDATED') {
                    icon = '✏️';
                    iconBg = 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400';
                  }

                  const dateObj = new Date(item.timestamp);
                  const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const dateStr = dateObj.toISOString().split('T')[0];
                  const typeLabel = item.type.replace('_', ' ');

                  return (
                    <div key={item.id || idx} className="relative group">
                      <span className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white dark:bg-[#1a1a15] ring-2 ring-gray-200 dark:ring-zinc-800 group-hover:scale-110 transition-transform">
                        <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                      </span>

                      <div className="bg-white dark:bg-[#1a1a15] p-4 rounded-xl border border-gray-100 dark:border-[#8a8a70]/10 shadow-xs hover:shadow-md transition-all duration-150 space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] ${iconBg}`}>{icon} {typeLabel}</span>
                            <span className="text-gray-400 dark:text-[#8a8a70] font-mono text-[11px]">BY {item.user}</span>
                          </div>
                          <span className="text-gray-400 dark:text-[#8a8a70] font-semibold uppercase">{getRelativeDateLabel(dateStr)} @ {timeStr}</span>
                        </div>
                        <p className="text-[13px] text-gray-700 dark:text-[#ecece5] break-words uppercase font-medium leading-relaxed">
                          {item.activity}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 bg-white dark:bg-[#1a1a15] border border-gray-200 dark:border-[#8a8a70]/20 rounded-[20px] text-center text-[13px] space-y-3 shadow-xs">
                  <div className="text-3xl">🕒</div>
                  <h4 className="font-serif font-bold text-[#1F2937] dark:text-[#f5f5f0] text-[13px] uppercase">NO ACTIVITY LOGS</h4>
                  <p className="text-[13px] text-gray-400 dark:text-[#8a8a70] font-semibold uppercase">History logs will show up here as interaction occurs.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 🎫 Tickets History Tab */}
        {activeSubTab === 'tickets' && (
          <div className="space-y-4" id="ticket-history-section">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-4 bg-[#3B82F6] rounded" />
                <h2 className="font-serif font-bold text-[#1F2937] dark:text-[#f5f5f0] text-[16px] uppercase tracking-tight flex items-center gap-1.5">
                  <History className="w-4 h-4" />
                  <span>Support Tickets Log</span>
                </h2>
              </div>
              
              <select
                className="text-[13px] font-bold bg-white dark:bg-[#1a1a15] border border-gray-200 dark:border-[#8a8a70]/30 rounded-lg px-2 py-1 text-gray-600 dark:text-[#C4C4B5] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="All">ALL STATUS</option>
                <option value="Open">OPEN</option>
                <option value="Pending">PENDING</option>
                <option value="Closed">CLOSED</option>
              </select>
            </div>

            <div className="space-y-3 max-h-[420px] overflow-y-auto" id="customer-ticket-logs">
              {customerTickets.length > 0 ? (
                customerTickets.map((ticket) => {
                  let badgeColor = '';
                  let statusIcon = null;
                  if (ticket.status === 'Open') {
                    badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30';
                    statusIcon = <Clock className="w-3.5 h-3.5" />;
                  } else if (ticket.status === 'Closed') {
                    badgeColor = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30';
                    statusIcon = <CheckCircle className="w-3.5 h-3.5" />;
                  } else {
                    badgeColor = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30';
                    statusIcon = <Clock className="w-3.5 h-3.5" />;
                  }

                  return (
                    <div
                      key={ticket.id}
                      id={`ticket-card-${ticket.id}`}
                      className="bg-white dark:bg-[#1a1a15] p-4 rounded-xl border border-gray-200 dark:border-[#8a8a70]/20 space-y-2.5 text-[13px] shadow-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[13px] font-bold text-gray-500 dark:text-[#a0a085] bg-gray-100 dark:bg-[#151512] border border-gray-200 dark:border-[#8a8a70]/10 px-1.5 py-0.5 rounded-md">
                          {ticket.id}
                        </span>
                        <span className={`text-[13px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${badgeColor}`}>
                          {statusIcon}
                          {ticket.status}
                        </span>
                      </div>

                      <p className="text-[13px] text-gray-700 dark:text-[#ecece5] leading-relaxed break-words whitespace-pre-wrap font-sans uppercase">
                        {ticket.conversationDescription}
                      </p>

                      <div className="pt-2 border-t border-gray-100 dark:border-[#8a8a70]/10 text-[13px] font-bold text-gray-400 dark:text-[#8a8a70] uppercase">
                        Opened: {formatDateTime(ticket.createdAt)}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 bg-white dark:bg-[#1a1a15] border border-gray-200 dark:border-[#8a8a70]/20 rounded-[20px] text-center text-[13px] space-y-3 shadow-xs" id="no-tickets-fallback">
                  <div className="text-3xl">🎫</div>
                  <h4 className="font-serif font-bold text-[#1F2937] dark:text-[#f5f5f0] text-[13px] uppercase">NO TICKETS AVAILABLE</h4>
                  <p className="text-[13px] text-gray-400 dark:text-[#8a8a70] font-semibold uppercase">Open a ticket if support requests are submitted.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 📅 Scheduled Follow-up Tab */}
        {activeSubTab === 'followups' && (
          <div className="space-y-4" id="customer-followups-panel">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-4 bg-[#8B5CF6] rounded" />
                <h3 className="font-serif font-bold text-[#1F2937] dark:text-[#f5f5f0] text-[16px] uppercase tracking-tight flex items-center gap-1.5">
                  <CalendarCheck className="w-4.5 h-4.5" />
                  <span>Follow-up History</span>
                </h3>
              </div>
              <span className="text-[13px] font-bold text-[#8B5CF6] bg-[#8B5CF6]/10 border border-[#8B5CF6]/25 px-2.5 py-1 rounded-full uppercase dark:bg-[#8B5CF6]/20 dark:text-[#c084fc] dark:border-[#8B5CF6]/30">
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
                    statusBadgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30';
                  } else if (overdue) {
                    statusBadgeStyle = 'bg-rose-50 text-rose-700 border-rose-200 font-bold dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30';
                  } else {
                    statusBadgeStyle = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30';
                  }

                  return (
                    <div 
                      key={f.id}
                      className={`p-4 rounded-xl border text-[13px] space-y-2 bg-white dark:bg-[#1a1a15] ${
                        f.status === 'Completed' 
                          ? 'border-gray-200 dark:border-[#8a8a70]/20 opacity-80' 
                          : overdue
                            ? 'border-rose-300 dark:border-rose-800'
                            : 'border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[13px] font-mono font-bold">
                        <span className="text-gray-400 dark:text-[#8a8a70]">{f.id}</span>
                        <span className={`px-2 py-0.5 rounded-full border uppercase ${statusBadgeStyle}`}>
                          {overdue ? 'OVERDUE: ' : ''}{getRelativeDateLabel(f.followUpDate)} @ {f.followUpTime}
                        </span>
                      </div>
                      <p className="italic text-gray-700 dark:text-[#ecece5] font-sans uppercase">
                        "{f.notes}"
                      </p>
                      <div className="flex justify-between items-center text-[13px] text-gray-400 dark:text-[#8a8a70] font-bold uppercase pt-2 border-t border-gray-100 dark:border-[#8a8a70]/10">
                        <span>Status: {f.status}</span>
                        <span>Created: {new Date(f.createdAt || '').toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 bg-white dark:bg-[#1a1a15] border border-gray-200 dark:border-[#8a8a70]/20 rounded-[20px] text-center text-[13px] space-y-3 shadow-xs">
                  <div className="text-3xl">📅</div>
                  <h4 className="font-serif font-bold text-[#1F2937] dark:text-[#f5f5f0] text-[13px] uppercase">NO REMINDERS</h4>
                  <p className="text-[13px] text-gray-400 dark:text-[#8a8a70] font-semibold uppercase">Schedule followups or reminders to never miss call back.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Copied Customer ID Toast */}
      {copiedIdToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200" id="toast-copied-customer-id">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>Customer ID copied to clipboard!</span>
        </div>
      )}

      {/* Active Records Warning Modal (Prevents Archiving) */}
      {isBlockedArchiveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1c1c16] rounded-2xl border border-rose-500/40 max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2.5 bg-rose-100 dark:bg-rose-950/50 rounded-xl shrink-0">
                <ShieldAlert className="w-6 h-6 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h2 className="text-base font-bold uppercase tracking-wide text-gray-900 dark:text-white">
                  Cannot Archive Customer
                </h2>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-bold uppercase mt-0.5">
                  Active Records Still Exist
                </p>
              </div>
            </div>

            <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-xl space-y-2">
              <p className="text-xs text-gray-700 dark:text-gray-200 font-semibold leading-relaxed">
                This customer cannot be archived because active records still exist.
              </p>
              
              <div className="pt-2 border-t border-rose-200/60 dark:border-rose-900/40 text-xs font-mono font-bold space-y-1 text-rose-900 dark:text-rose-300">
                {activeRecordCounts.openTickets > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>{activeRecordCounts.openTickets} OPEN TICKET(S)</span>
                  </div>
                )}
                {activeRecordCounts.pendingFollowUps > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>{activeRecordCounts.pendingFollowUps} PENDING FOLLOW-UP(S)</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#8a8a70]/20">
              <button
                onClick={() => setIsBlockedArchiveModalOpen(false)}
                id="btn-cancel-blocked-archive"
                className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 cursor-pointer"
              >
                Cancel
              </button>
              
              {activeRecordCounts.openTickets > 0 && (
                <button
                  onClick={() => {
                    setIsBlockedArchiveModalOpen(false);
                    setActiveSubTab('tickets');
                    const el = document.getElementById('ticket-history-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  id="btn-view-tickets-blocked-archive"
                  className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all cursor-pointer shadow-md active:scale-95 flex items-center gap-1.5"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>View Tickets</span>
                </button>
              )}

              {activeRecordCounts.pendingFollowUps > 0 && (
                <button
                  onClick={() => {
                    setIsBlockedArchiveModalOpen(false);
                    setActiveSubTab('followups');
                    const el = document.getElementById('customer-followups-panel');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  id="btn-view-followups-blocked-archive"
                  className="px-4 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-full transition-all cursor-pointer shadow-md active:scale-95 flex items-center gap-1.5"
                >
                  <CalendarCheck className="w-3.5 h-3.5" />
                  <span>View Follow-ups</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Archive Confirmation Modal */}
      {isConfirmArchiving && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1c1c16] rounded-2xl border border-amber-500/30 max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <Archive className="w-6 h-6 shrink-0" />
              <h2 className="text-base font-bold uppercase tracking-wide">Archive Customer Profile?</h2>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
              This customer profile will be removed from the active customer directory. It can be viewed or restored at any time from the <strong className="text-amber-700 dark:text-amber-300 uppercase">Archived Customers</strong> section.
            </p>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-100 dark:border-amber-900/30 text-xs font-mono text-amber-800 dark:text-amber-300 space-y-1">
              <div>Name: {customer.name}</div>
              <div>Customer ID: {customer.id}</div>
              <div>Mobile: {customer.mobileNumber}</div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100 dark:border-[#8a8a70]/20">
              <button
                onClick={() => setIsConfirmArchiving(false)}
                className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleArchive}
                className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-full transition-all cursor-pointer shadow-md active:scale-95"
              >
                Confirm Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {isConfirmRestoring && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1c1c16] rounded-2xl border border-emerald-500/30 max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
              <RotateCcw className="w-6 h-6 shrink-0" />
              <h2 className="text-base font-bold uppercase tracking-wide">Restore Customer Profile?</h2>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
              This will restore <strong className="text-gray-900 dark:text-white uppercase">{customer.name}</strong> ({customer.id}) back to the active Customer Directory.
            </p>

            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/30 text-xs font-mono text-emerald-800 dark:text-emerald-300 space-y-1">
              <div>Customer ID: {customer.id}</div>
              <div>Mobile: {customer.mobileNumber}</div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100 dark:border-[#8a8a70]/20">
              <button
                onClick={() => setIsConfirmRestoring(false)}
                className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRestore}
                className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-full transition-all cursor-pointer shadow-md active:scale-95"
              >
                Confirm Restore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Modal (Admin Only) */}
      {isConfirmPermanentDeleting && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1c1c16] rounded-2xl border border-rose-500/40 max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h2 className="text-base font-bold uppercase tracking-wide">Permanently Delete Customer?</h2>
            </div>

            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-800 dark:text-rose-300 font-bold uppercase tracking-wider">
              ⚠️ WARNING: THIS ACTION IS PERMANENT AND CANNOT BE UNDONE.
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
              You are about to permanently remove <strong className="text-gray-900 dark:text-white uppercase">{customer.name}</strong> ({customer.id}) from local database and Google Sheets.
            </p>

            <div className="p-3 bg-gray-50 dark:bg-zinc-900 rounded-xl border text-xs font-mono space-y-1 text-gray-700 dark:text-gray-300">
              <div>Customer ID: {customer.id}</div>
              <div>Name: {customer.name}</div>
              <div>Mobile: {customer.mobileNumber}</div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100 dark:border-[#8a8a70]/20">
              <button
                onClick={() => setIsConfirmPermanentDeleting(false)}
                className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handlePermanentDelete}
                className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-full transition-all cursor-pointer shadow-md active:scale-95"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
});

export default CustomerDetails;
