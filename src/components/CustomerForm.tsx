import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Customer, AdditionalNumber, User, Ticket, FollowUp, SyncConfig } from '../types';
import { AlignLeft, Search, MapPin, Plus, X, User as UserIcon, AlertTriangle, GitMerge, Check, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Button, 
  Input, 
  TextArea, 
  FormGroup, 
  Card, 
  Alert 
} from './ui';
import { detectDuplicateCustomer, DuplicateMatchResult } from '../utils/duplicateDetector';
import { recordDuplicateGroup } from '../utils/duplicateGroupStore';
import DuplicateReviewDialog from './DuplicateReviewDialog';
import MergeCustomersModal from './MergeCustomersModal';

export function normalizeMobileNumber(phone: string): string {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('880')) {
    digits = '0' + digits.slice(3);
  } else if (digits.length === 10 && digits.startsWith('1')) {
    digits = '0' + digits;
  }
  return digits;
}

interface CustomerFormProps {
  onAddCustomer: (
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
  ) => Promise<{ success: boolean; customer?: Customer; error?: string }>;
  existingCustomers: Customer[];
  onSelectCustomer?: (customer: Customer) => void;
  currentUser?: User | null;
  tickets?: Ticket[];
  followUps?: FollowUp[];
  onArchiveCustomer?: (id: string) => Promise<any>;
  onUpdateCustomer?: (
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
  ) => Promise<any>;
  syncConfig?: SyncConfig;
}

export default function CustomerForm({ 
  onAddCustomer, 
  existingCustomers, 
  onSelectCustomer,
  currentUser = null,
  tickets = [],
  followUps = [],
  onArchiveCustomer,
  onUpdateCustomer,
  syncConfig
}: CustomerFormProps) {
  const [name, setName] = useState('');
  const [mobileNumberSuffix, setMobileNumberSuffix] = useState('');
  const [additionalNumbers, setAdditionalNumbers] = useState<{ id: string; suffix: string }[]>([]);

  const handleAddAdditionalNumberField = () => {
    const id = `AN-TEMP-${Math.floor(100000 + Math.random() * 900000)}`;
    setAdditionalNumbers(prev => [...prev, { id, suffix: '' }]);
  };

  const handleRemoveAdditionalNumberField = (id: string) => {
    setAdditionalNumbers(prev => prev.filter(item => item.id !== id));
  };

  const handleAdditionalNumberChange = (id: string, value: string) => {
    setAdditionalNumbers(prev => prev.map(item => item.id === id ? { ...item, suffix: value } : item));
  };

  const [whatsAppNumberSuffix, setWhatsAppNumberSuffix] = useState('');
  const [isSameAsMobile, setIsSameAsMobile] = useState(false);
  const [imoNumberSuffix, setImoNumberSuffix] = useState('');
  const [isImoSameAsMobile, setIsImoSameAsMobile] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [remarksRows, setRemarksRows] = useState(4);
  
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
  const [customerCategory, setCustomerCategory] = useState('');
  const [gender, setGender] = useState('');

  // Duplicate Warning & Dialog states
  const [isWarningDismissed, setIsWarningDismissed] = useState(false);
  const [overrideDuplicate, setOverrideDuplicate] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  
  // Reset dismissed state if inputs change significantly
  useEffect(() => {
    setIsWarningDismissed(false);
    setOverrideDuplicate(false);
  }, [name, mobileNumberSuffix, whatsAppNumberSuffix, imoNumberSuffix]);

  // If CUSTOMER CATEGORY becomes blank, automatically hide and clear GENDER
  useEffect(() => {
    if (!customerCategory) {
      setGender('');
    }
  }, [customerCategory]);

  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  const [address, setAddress] = useState('');
  const [addressRows, setAddressRows] = useState(4);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCategories = useMemo(() => {
    const q = categorySearchQuery.toLowerCase().trim();
    if (!q) return CATEGORIES;
    return CATEGORIES.filter(cat => cat.toLowerCase().includes(q));
  }, [categorySearchQuery]);

  // Sync category search query when option is selected/changed
  useEffect(() => {
    if (customerCategory && !isCategoryDropdownOpen) {
      setCategorySearchQuery(customerCategory);
    } else if (!customerCategory && !isCategoryDropdownOpen) {
      setCategorySearchQuery('');
    }
  }, [customerCategory, isCategoryDropdownOpen]);
  
  // Validation Errors
  const [nameError, setNameError] = useState('');
  const [mobileError, setMobileError] = useState('');

  // Main status banner
  const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message: string }>({
    type: 'idle',
    message: ''
  });
  const [isSavingLocal, setIsSavingLocal] = useState(false);
  const [isSavedLocal, setIsSavedLocal] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Format Helper for numbers
  const formatPhoneNumber = (suffix: string) => {
    const cleanSuffix = suffix.trim();
    if (!cleanSuffix) return '';
    const normalized = cleanSuffix.startsWith('0') ? cleanSuffix.slice(1) : cleanSuffix;
    return `+880${normalized}`;
  };

  // Enterprise Duplicate Detection Engine (<50ms execution time)
  const matchResult: DuplicateMatchResult = useMemo(() => {
    const cleanMobile = mobileNumberSuffix.trim();
    if (!cleanMobile && !name.trim()) {
      return {
        isDuplicate: false,
        existingCustomer: null,
        matchType: null,
        confidenceScore: 0,
        matchedValue: '',
        matchedByLabel: '',
        priority: 999
      };
    }

    const formattedMobile = cleanMobile ? formatPhoneNumber(cleanMobile) : '';
    const cleanWhatsApp = isSameAsMobile ? cleanMobile : whatsAppNumberSuffix.trim();
    const formattedWhatsApp = cleanWhatsApp ? formatPhoneNumber(cleanWhatsApp) : '';
    const cleanImo = isImoSameAsMobile ? cleanMobile : imoNumberSuffix.trim();
    const formattedImo = cleanImo ? formatPhoneNumber(cleanImo) : '';

    const formattedAdditional = additionalNumbers.map(an => ({
      suffix: an.suffix ? formatPhoneNumber(an.suffix) : ''
    }));

    return detectDuplicateCustomer(
      {
        name,
        mobileNumber: formattedMobile,
        whatsAppNumber: formattedWhatsApp,
        imoNumber: formattedImo,
        remarks,
        additionalNumbers: formattedAdditional
      },
      existingCustomers
    );
  }, [name, mobileNumberSuffix, whatsAppNumberSuffix, isSameAsMobile, imoNumberSuffix, isImoSameAsMobile, remarks, additionalNumbers, existingCustomers]);

  // Sync WhatsApp number if toggle is enabled
  useEffect(() => {
    if (isSameAsMobile) {
      setWhatsAppNumberSuffix(mobileNumberSuffix);
    }
  }, [isSameAsMobile, mobileNumberSuffix]);

  // Sync IMO number if toggle is enabled
  useEffect(() => {
    if (isImoSameAsMobile) {
      setImoNumberSuffix(mobileNumberSuffix);
    }
  }, [isImoSameAsMobile, mobileNumberSuffix]);

  // Focus Name Input on Initial Mount
  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  const handleRemarksChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setRemarks(val);
    if (status.type !== 'idle') setStatus({ type: 'idle', message: '' });

    const newlines = (val.match(/\n/g) || []).length;
    const computedRows = Math.min(10, Math.max(4, newlines + 1));
    setRemarksRows(computedRows);
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setAddress(val);
    if (status.type !== 'idle') setStatus({ type: 'idle', message: '' });

    const newlines = (val.match(/\n/g) || []).length;
    const computedRows = Math.min(8, Math.max(4, newlines + 1));
    setAddressRows(computedRows);
  };

  // Internal Customer Creation Logic
  const executeCreateCustomer = async () => {
    const trimmedName = name.trim();
    const cleanMobileSuffix = mobileNumberSuffix.trim();
    const cleanWhatsAppSuffix = isSameAsMobile ? cleanMobileSuffix : whatsAppNumberSuffix.trim();
    const cleanImoSuffix = isImoSameAsMobile ? cleanMobileSuffix : imoNumberSuffix.trim();

    const formattedMobile = formatPhoneNumber(cleanMobileSuffix);
    const formattedWhatsApp = cleanWhatsAppSuffix ? formatPhoneNumber(cleanWhatsAppSuffix) : '';
    const formattedImo = cleanImoSuffix ? formatPhoneNumber(cleanImoSuffix) : '';

    setIsSavingLocal(true);
    setIsSavedLocal(false);

    try {
      const formattedAdditional: AdditionalNumber[] = additionalNumbers.map(an => ({
        id: `AN-${Math.floor(100000 + Math.random() * 900000)}`,
        number: formatPhoneNumber(an.suffix),
        type: 'Additional'
      }));

      const result = await onAddCustomer(
        trimmedName, 
        formattedMobile, 
        formattedWhatsApp, 
        '', 
        'Walk-in', 
        remarks.trim(),
        formattedImo,
        customerCategory,
        address.trim(),
        gender,
        formattedAdditional
      );

      if (result.success) {
        await new Promise(resolve => setTimeout(resolve, 300));
        setIsSavingLocal(false);
        setIsSavedLocal(true);

        // Clear all form fields
        setName('');
        setMobileNumberSuffix('');
        setAdditionalNumbers([]);
        setWhatsAppNumberSuffix('');
        setIsSameAsMobile(false);
        setImoNumberSuffix('');
        setIsImoSameAsMobile(false);
        setRemarks('');
        setRemarksRows(4);
        setCustomerCategory('');
        setCategorySearchQuery('');
        setAddress('');
        setAddressRows(4);
        setGender('');
        setIsWarningDismissed(false);
        setOverrideDuplicate(false);

        setTimeout(() => {
          nameInputRef.current?.focus();
        }, 50);

        setTimeout(() => {
          setIsSavedLocal(false);
        }, 1500);

      } else {
        setIsSavingLocal(false);
        setIsSavedLocal(false);
        setStatus({
          type: 'error',
          message: result.error || 'FAILED TO ADD CUSTOMER. PLEASE TRY AGAIN.'
        });
      }
    } catch (err: any) {
      setIsSavingLocal(false);
      setIsSavedLocal(false);
      setStatus({
        type: 'error',
        message: err.message || 'AN UNEXPECTED ERROR OCCURRED.'
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setNameError('');
    setMobileError('');

    const trimmedName = name.trim();
    const cleanMobileSuffix = mobileNumberSuffix.trim();

    let hasValidationError = false;

    if (!trimmedName) {
      setNameError('FULL NAME IS REQUIRED');
      hasValidationError = true;
    }

    const digitsOnlyMobile = cleanMobileSuffix.replace(/\D/g, '');
    if (!cleanMobileSuffix || digitsOnlyMobile.length < 9) {
      setMobileError('VALID MOBILE NUMBER REQUIRED');
      hasValidationError = true;
    }

    if (hasValidationError) return;

    // Check Duplicate Detection
    if (matchResult.isDuplicate && !overrideDuplicate) {
      // Open Duplicate Review Dialog
      setIsReviewDialogOpen(true);
      return;
    }

    await executeCreateCustomer();
  };

  // Dialog Handlers
  const handleOpenExisting = (customer: Customer) => {
    setIsReviewDialogOpen(false);
    if (onSelectCustomer) {
      onSelectCustomer(customer);
    } else {
      window.dispatchEvent(new CustomEvent('select-customer', { detail: customer }));
    }
  };

  const handleMergeDialog = (existingCustomer: Customer) => {
    setIsReviewDialogOpen(false);
    setIsMergeModalOpen(true);
  };

  const handleArchiveExistingDialog = async (existingCustomer: Customer) => {
    setIsReviewDialogOpen(false);
    const performedBy = currentUser?.fullName || 'Staff';

    if (onArchiveCustomer) {
      await onArchiveCustomer(existingCustomer.id);
    }

    // Record Duplicate Group and Audit Log
    recordDuplicateGroup(
      {
        matchType: matchResult.matchType || 'Manual Archive',
        confidenceScore: matchResult.confidenceScore,
        matchedValue: matchResult.matchedValue,
        primaryCustomerId: 'NEW_PENDING',
        duplicateCustomerIds: [existingCustomer.id],
        status: 'Archived',
        reviewedBy: performedBy
      },
      performedBy,
      'ARCHIVED',
      `Archived existing customer ${existingCustomer.id} to onboarding new customer`,
      syncConfig
    );

    await executeCreateCustomer();
  };

  const handleKeepBothDialog = async () => {
    setIsReviewDialogOpen(false);
    const performedBy = currentUser?.fullName || 'Staff';

    if (matchResult.existingCustomer) {
      recordDuplicateGroup(
        {
          matchType: matchResult.matchType || 'Manual Resolution',
          confidenceScore: matchResult.confidenceScore,
          matchedValue: matchResult.matchedValue,
          primaryCustomerId: matchResult.existingCustomer.id,
          duplicateCustomerIds: ['NEW_PENDING'],
          status: 'Resolved',
          reviewedBy: performedBy
        },
        performedBy,
        'KEEP_BOTH',
        'Administrator selected Keep Both',
        syncConfig
      );
    }

    setOverrideDuplicate(true);
    await executeCreateCustomer();
  };

  const handleCreateAnywayDialog = async () => {
    setIsReviewDialogOpen(false);
    const performedBy = currentUser?.fullName || 'Staff';

    if (matchResult.existingCustomer) {
      recordDuplicateGroup(
        {
          matchType: matchResult.matchType || 'Override',
          confidenceScore: matchResult.confidenceScore,
          matchedValue: matchResult.matchedValue,
          primaryCustomerId: matchResult.existingCustomer.id,
          duplicateCustomerIds: ['NEW_PENDING'],
          status: 'Pending',
          reviewedBy: performedBy
        },
        performedBy,
        'CREATED_ANYWAY',
        'Administrator selected Create Anyway override',
        syncConfig
      );
    }

    setOverrideDuplicate(true);
    await executeCreateCustomer();
  };

  const handleConfirmMergeModal = async (
    primaryCustomer: Customer,
    mergedDetails: {
      name: string;
      mobileNumber: string;
      whatsAppNumber: string;
      imoNumber: string;
      customerCategory: string;
      address: string;
      gender: string;
      remarks: string;
      additionalNumbers: AdditionalNumber[];
    }
  ) => {
    const performedBy = currentUser?.fullName || 'Staff';

    if (onUpdateCustomer) {
      await onUpdateCustomer(
        primaryCustomer.id,
        mergedDetails.name,
        mergedDetails.mobileNumber,
        mergedDetails.whatsAppNumber,
        '',
        'Walk-in',
        mergedDetails.remarks,
        mergedDetails.imoNumber,
        mergedDetails.customerCategory,
        mergedDetails.address,
        mergedDetails.gender,
        mergedDetails.additionalNumbers
      );
    }

    recordDuplicateGroup(
      {
        matchType: matchResult.matchType || 'Merge',
        confidenceScore: matchResult.confidenceScore,
        matchedValue: matchResult.matchedValue,
        primaryCustomerId: primaryCustomer.id,
        duplicateCustomerIds: ['PROPOSED_NEW_INPUT'],
        status: 'Merged',
        reviewedBy: performedBy
      },
      performedBy,
      'MERGED',
      `Merged proposed input into existing customer ${primaryCustomer.id}`,
      syncConfig
    );

    // Clear form
    setName('');
    setMobileNumberSuffix('');
    setAdditionalNumbers([]);
    setWhatsAppNumberSuffix('');
    setIsSameAsMobile(false);
    setImoNumberSuffix('');
    setIsImoSameAsMobile(false);
    setRemarks('');
    setRemarksRows(4);
    setCustomerCategory('');
    setCategorySearchQuery('');
    setAddress('');
    setAddressRows(4);
    setGender('');
    setIsWarningDismissed(false);
    setOverrideDuplicate(false);

    setStatus({
      type: 'success',
      message: `CUSTOMER MERGED SUCCESSFULLY INTO ${primaryCustomer.id}`
    });

    setTimeout(() => {
      setStatus({ type: 'idle', message: '' });
    }, 2000);
  };

  return (
    <>
      <Card 
        id="customer-form-container"
        borderTopColor="green"
        className="space-y-6"
      >
        {/* Status Messages */}
        {status.type === 'error' && (
          <Alert variant="error" id="customer-form-error">
            <span className="font-semibold uppercase">{status.message}</span>
          </Alert>
        )}

        {status.type === 'success' && (
          <Alert variant="success" id="customer-form-success">
            <span className="font-semibold uppercase">{status.message}</span>
          </Alert>
        )}

        {/* REAL-TIME DUPLICATE WARNING CARD (Shown while typing if duplicate detected) */}
        {matchResult.isDuplicate && matchResult.existingCustomer && !isWarningDismissed && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/50 rounded-2xl space-y-3 animate-fade-in" id="duplicate-warning-card">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 text-amber-900 dark:text-amber-200">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm">⚠ Possible Existing Customer</p>
                    <span className="px-2 py-0.5 bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 font-extrabold text-[10px] rounded-full uppercase">
                      {matchResult.confidenceScore}% {matchResult.matchType} Match
                    </span>
                  </div>
                  <p className="text-xs text-amber-800 dark:text-amber-300/80 mt-0.5">
                    Matching customer <span className="font-bold font-mono">{matchResult.existingCustomer.id}</span> found in CRM database.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsWarningDismissed(true)}
                className="text-amber-600 hover:text-amber-800 dark:text-amber-400 text-xs font-bold px-2 py-1 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-lg transition-colors cursor-pointer"
                title="Dismiss warning"
              >
                Dismiss
              </button>
            </div>

            <div className="p-3 bg-white dark:bg-[#1a1a15] rounded-xl border border-amber-200/80 dark:border-amber-800/40 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs space-y-0.5">
                <p className="font-bold text-[#1F2937] dark:text-[#ecece5] uppercase">{matchResult.existingCustomer.name}</p>
                <p className="text-[#5A5A40] dark:text-[#8a8a70] font-mono">{matchResult.existingCustomer.mobileNumber}</p>
                {matchResult.existingCustomer.customerCategory && (
                  <span className="inline-block text-[10px] font-bold bg-[#5A5A40]/10 text-[#5A5A40] dark:bg-[#8a8a70]/20 dark:text-[#ecece5] px-2 py-0.5 rounded-md mt-0.5 uppercase">
                    {matchResult.existingCustomer.customerCategory}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  id="btn-warning-view"
                  onClick={() => handleOpenExisting(matchResult.existingCustomer!)}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-[11px] font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  <span>View Customer</span>
                </button>

                <button
                  type="button"
                  id="btn-warning-merge"
                  onClick={() => setIsReviewDialogOpen(true)}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1 shadow-xs"
                >
                  <GitMerge className="w-3 h-3" />
                  <span>Review & Merge</span>
                </button>

                <button
                  type="button"
                  id="btn-warning-create-anyway"
                  onClick={() => setOverrideDuplicate(true)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1 shadow-xs"
                >
                  <Check className="w-3 h-3" />
                  <span>Create Anyway</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" id="customer-form">
          
          {/* Full Name Field */}
          <FormGroup
            label="Full Name"
            required
            htmlFor="customer-name"
            error={nameError}
          >
            <Input
              type="text"
              id="customer-name"
              name="customer-name"
              ref={nameInputRef}
              required
              autoFocus
              tabIndex={1}
              error={!!nameError}
              placeholder="ENTER CUSTOMER FULL NAME"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameError('');
                if (status.type !== 'idle') setStatus({ type: 'idle', message: '' });
              }}
              disabled={status.type === 'loading'}
            />
          </FormGroup>

          {/* Mobile, WhatsApp & IMO Column Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            
            {/* Mobile Number Field */}
            <FormGroup error={mobileError}>
              <div className="flex justify-between items-center h-5 mb-1.5">
                <label htmlFor="customer-mobile" className="block text-sm font-bold text-gray-500 dark:text-gray-400 tracking-wider uppercase">
                  Mobile Number <span className="text-rose-500">*</span>
                </label>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`flex-1 flex rounded-xl bg-[#F8FAFC] dark:bg-[#151510]/50 border ${mobileError ? 'border-rose-400 focus-within:ring-rose-400/20' : 'border-gray-200 dark:border-[#8a8a70]/30 focus-within:ring-accent-blue/20 focus-within:border-accent-blue'} overflow-hidden focus-within:ring-2 transition-all`}>
                    <div className="bg-gray-100 dark:bg-zinc-800 px-3.5 flex items-center justify-center text-[13px] font-bold text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-[#8a8a70]/20 select-none">
                      +880
                    </div>
                    <input
                      type="tel"
                      id="customer-mobile"
                      name="customer-mobile"
                      required
                      tabIndex={2}
                      pattern="[0-9]*"
                      inputMode="numeric"
                      className="w-full text-[13px] bg-transparent border-none px-3.5 py-3 focus:outline-none font-medium text-[#1F2937] dark:text-[#ecece5] uppercase placeholder-gray-400"
                      placeholder="17XXXXXXXX"
                      value={mobileNumberSuffix}
                      onChange={(e) => {
                        setMobileNumberSuffix(e.target.value);
                        setMobileError('');
                        if (status.type !== 'idle') setStatus({ type: 'idle', message: '' });
                      }}
                      disabled={status.type === 'loading'}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddAdditionalNumberField}
                    className="w-[42px] h-[42px] rounded-xl bg-accent-green hover:bg-emerald-600 text-white flex items-center justify-center active:scale-95 transition-all shadow-xs shrink-0 cursor-pointer"
                    title="Add Additional Mobile Number"
                  >
                    <Plus className="w-5 h-5 text-white" />
                  </button>
                </div>

                {additionalNumbers.map((field) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <div className="flex-1 flex rounded-xl bg-[#F8FAFC] dark:bg-[#151510]/50 border border-gray-200 dark:border-[#8a8a70]/30 overflow-hidden focus-within:ring-2 focus-within:ring-accent-blue/20 focus-within:border-accent-blue transition-all">
                      <div className="bg-gray-100 dark:bg-zinc-800 px-3.5 flex items-center justify-center text-[13px] font-bold text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-[#8a8a70]/20 select-none">
                        +880
                      </div>
                      <input
                        type="tel"
                        pattern="[0-9]*"
                        inputMode="numeric"
                        className="w-full text-[13px] bg-transparent border-none px-3.5 py-3 focus:outline-none font-medium text-[#1F2937] dark:text-[#ecece5] uppercase placeholder-gray-400"
                        placeholder="17XXXXXXXX"
                        value={field.suffix}
                        onChange={(e) => handleAdditionalNumberChange(field.id, e.target.value)}
                        disabled={status.type === 'loading'}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAdditionalNumberField(field.id)}
                      className="w-[42px] h-[42px] flex items-center justify-center text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl active:scale-95 transition-all shrink-0 cursor-pointer border border-transparent hover:border-rose-100"
                      title="Remove this number"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </FormGroup>

            {/* WhatsApp Field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center h-4">
                <label htmlFor="customer-whatsapp" className="block text-[13px] font-bold text-gray-500 dark:text-gray-400 tracking-wider uppercase">
                  WhatsApp Number
                </label>
                
                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={isSameAsMobile}
                      onChange={(e) => {
                        setIsSameAsMobile(e.target.checked);
                        if (status.type !== 'idle') setStatus({ type: 'idle', message: '' });
                      }}
                      disabled={status.type === 'loading'}
                      className="sr-only peer"
                    />
                    <div className="w-7 h-4 bg-gray-200 dark:bg-zinc-700 rounded-full peer peer-checked:bg-accent-green transition-colors duration-200"></div>
                    <div className="absolute top-[2px] left-[2px] w-3 h-3 bg-white rounded-full transition-transform duration-200 peer-checked:translate-x-3"></div>
                  </div>
                  <span className="text-[13px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    USE MOBILE
                  </span>
                </label>
              </div>
              
              <div className={`flex rounded-xl bg-[#F8FAFC] dark:bg-[#151510]/50 border border-gray-200 dark:border-[#8a8a70]/30 overflow-hidden focus-within:ring-2 focus-within:ring-accent-blue/20 focus-within:border-accent-blue transition-all ${isSameAsMobile ? 'opacity-60 bg-gray-50 dark:bg-zinc-900/30' : ''}`}>
                <div className="bg-gray-100 dark:bg-zinc-800 px-3.5 flex items-center justify-center text-[13px] font-bold text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-[#8a8a70]/20 select-none">
                  +880
                </div>
                <input
                  type="tel"
                  id="customer-whatsapp"
                  name="customer-whatsapp"
                  tabIndex={3}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  className="w-full text-[13px] bg-transparent border-none px-3.5 py-3 focus:outline-none font-medium text-[#1F2937] dark:text-[#ecece5] uppercase placeholder-gray-400"
                  placeholder="17XXXXXXXX"
                  value={isSameAsMobile ? mobileNumberSuffix : whatsAppNumberSuffix}
                  onChange={(e) => {
                    setWhatsAppNumberSuffix(e.target.value);
                    if (status.type !== 'idle') setStatus({ type: 'idle', message: '' });
                  }}
                  disabled={isSameAsMobile || status.type === 'loading'}
                />
              </div>
            </div>

            {/* IMO Field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center h-4">
                <label htmlFor="customer-imo" className="block text-[13px] font-bold text-gray-500 dark:text-gray-400 tracking-wider uppercase">
                  IMO Number
                </label>
                
                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={isImoSameAsMobile}
                      onChange={(e) => {
                        setIsImoSameAsMobile(e.target.checked);
                        if (status.type !== 'idle') setStatus({ type: 'idle', message: '' });
                      }}
                      disabled={status.type === 'loading'}
                      className="sr-only peer"
                    />
                    <div className="w-7 h-4 bg-gray-200 dark:bg-zinc-700 rounded-full peer peer-checked:bg-accent-green transition-colors duration-200"></div>
                    <div className="absolute top-[2px] left-[2px] w-3 h-3 bg-white rounded-full transition-transform duration-200 peer-checked:translate-x-3"></div>
                  </div>
                  <span className="text-[13px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    USE MOBILE
                  </span>
                </label>
              </div>
              
              <div className={`flex rounded-xl bg-[#F8FAFC] dark:bg-[#151510]/50 border border-gray-200 dark:border-[#8a8a70]/30 overflow-hidden focus-within:ring-2 focus-within:ring-accent-blue/20 focus-within:border-accent-blue transition-all ${isImoSameAsMobile ? 'opacity-60 bg-gray-50 dark:bg-zinc-900/30' : ''}`}>
                <div className="bg-gray-100 dark:bg-zinc-800 px-3.5 flex items-center justify-center text-[13px] font-bold text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-[#8a8a70]/20 select-none">
                  +880
                </div>
                <input
                  type="tel"
                  id="customer-imo"
                  name="customer-imo"
                  tabIndex={4}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  className="w-full text-[13px] bg-transparent border-none px-3.5 py-3 focus:outline-none font-medium text-[#1F2937] dark:text-[#ecece5] uppercase placeholder-gray-400"
                  placeholder="17XXXXXXXX"
                  value={isImoSameAsMobile ? mobileNumberSuffix : imoNumberSuffix}
                  onChange={(e) => {
                    setImoNumberSuffix(e.target.value);
                    if (status.type !== 'idle') setStatus({ type: 'idle', message: '' });
                  }}
                  disabled={isImoSameAsMobile || status.type === 'loading'}
                />
              </div>
            </div>
          </div>

          {/* Customer Category and Address */}
          <div className="space-y-5">
            {/* CUSTOMER CATEGORY Searchable Dropdown */}
            <FormGroup
              label="CUSTOMER CATEGORY (OPTIONAL)"
              htmlFor="customer-category-search"
            >
              <div ref={categoryDropdownRef} className="relative w-full">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Search className="w-4 h-4" />
                  </div>
                   <input
                    type="text"
                    id="customer-category-search"
                    name="customer-category-search"
                    className="w-full text-[13px] pl-10 pr-8 py-3 bg-white dark:bg-[#20201a] border border-[#5A5A40]/20 dark:border-[#8a8a70]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5A5A40] text-[#1F2937] dark:text-[#ecece5] font-medium placeholder-gray-400 uppercase"
                    placeholder="SELECT CUSTOMER CATEGORY"
                    value={categorySearchQuery}
                    onChange={(e) => {
                      setCategorySearchQuery(e.target.value);
                      setIsCategoryDropdownOpen(true);
                    }}
                    onFocus={() => setIsCategoryDropdownOpen(true)}
                    disabled={status.type === 'loading'}
                  />
                  {categorySearchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerCategory('');
                        setCategorySearchQuery('');
                      }}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-white"
                    >
                      <span className="text-sm font-bold">&times;</span>
                    </button>
                  )}
                </div>

                {isCategoryDropdownOpen && (
                  <div className="absolute left-0 right-0 z-40 mt-1 max-h-52 overflow-y-auto bg-white dark:bg-[#1a1a15] border border-[#5A5A40]/15 dark:border-[#8a8a70]/25 rounded-xl shadow-lg divide-y divide-[#5A5A40]/10 dark:divide-[#8a8a70]/20">
                    {filteredCategories.length > 0 ? (
                      filteredCategories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setCustomerCategory(cat);
                            setCategorySearchQuery(cat);
                            setIsCategoryDropdownOpen(false);
                            if (status.type !== 'idle') setStatus({ type: 'idle', message: '' });
                          }}
                          className={`w-full text-left p-2.5 text-[13px] font-semibold transition-colors flex items-center justify-between hover:bg-[#5A5A40]/5 dark:hover:bg-[#8a8a70]/5 ${
                            customerCategory === cat ? 'bg-[#5A5A40]/10 dark:bg-[#8a8a70]/10 text-primary-olive dark:text-white' : 'text-[#1F2937] dark:text-[#ecece5]'
                          }`}
                        >
                          <span className="uppercase">{cat}</span>
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-center text-[13px] text-gray-400 dark:text-[#8a8a70] italic">
                        No categories found matching query.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </FormGroup>

            {/* DYNAMIC GENDER FIELD */}
            <AnimatePresence initial={false}>
              {customerCategory && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  style={{ overflow: "hidden" }}
                  id="customer-gender-wrapper"
                >
                  <FormGroup
                    label="GENDER (OPTIONAL)"
                    htmlFor="customer-gender"
                  >
                    <select
                      id="customer-gender"
                      name="customer-gender"
                      className="w-full text-[13px] bg-[#F8FAFC] dark:bg-[#151510]/50 border border-gray-200 dark:border-[#8a8a70]/30 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue text-[#1F2937] dark:text-[#ecece5] font-bold uppercase cursor-pointer"
                      value={gender}
                      onChange={(e) => {
                        setGender(e.target.value);
                        if (status.type !== 'idle') setStatus({ type: 'idle', message: '' });
                      }}
                      disabled={status.type === 'loading'}
                    >
                      <option value="">SELECT GENDER</option>
                      <option value="MALE">MALE</option>
                      <option value="FEMALE">FEMALE</option>
                    </select>
                  </FormGroup>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ADDRESS Field */}
            <FormGroup
              label="ADDRESS (OPTIONAL)"
              htmlFor="customer-address"
            >
              <div className="relative">
                <div className="absolute top-3.5 left-3.5 pointer-events-none text-gray-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <TextArea
                  id="customer-address"
                  name="customer-address"
                  rows={addressRows}
                  className="pl-10"
                  placeholder="ENTER CUSTOMER ADDRESS"
                  value={address}
                  onChange={handleAddressChange}
                  disabled={status.type === 'loading'}
                />
              </div>
            </FormGroup>
          </div>

          {/* Remarks Field (Customer Notes) */}
          <FormGroup
            label="Customer Notes"
            htmlFor="customer-remarks"
          >
            <div className="relative">
              <div className="absolute top-3.5 left-3.5 pointer-events-none text-gray-400">
                <AlignLeft className="w-4 h-4" />
              </div>
              <TextArea
                id="customer-remarks"
                name="customer-remarks"
                tabIndex={5}
                rows={remarksRows}
                className="pl-10"
                placeholder="ENTER RECRUITMENT BACKGROUND DETAILS AND EXTRA CASE NOTES..."
                value={remarks}
                onChange={handleRemarksChange}
                disabled={status.type === 'loading'}
              />
            </div>
          </FormGroup>

          {/* Primary Submit Button */}
          <Button
            type="submit"
            id="btn-submit-customer"
            tabIndex={6}
            loading={isSavingLocal}
            variant="success"
            size="lg"
            className="w-full mt-6 cursor-pointer"
          >
            {isSavedLocal ? '✅ CUSTOMER ONBOARDED' : 'ONBOARD CUSTOMER'}
          </Button>
        </form>
      </Card>

      {/* DUPLICATE REVIEW DIALOG */}
      <DuplicateReviewDialog
        isOpen={isReviewDialogOpen}
        onClose={() => setIsReviewDialogOpen(false)}
        matchResult={matchResult}
        proposedCustomerData={{
          name,
          mobileNumber: mobileNumberSuffix,
          whatsAppNumber: whatsAppNumberSuffix,
          imoNumber: imoNumberSuffix,
          customerCategory,
          address,
          gender,
          remarks
        }}
        currentUser={currentUser}
        onOpenExisting={handleOpenExisting}
        onMerge={handleMergeDialog}
        onArchiveExisting={handleArchiveExistingDialog}
        onKeepBoth={handleKeepBothDialog}
        onCreateAnyway={handleCreateAnywayDialog}
      />

      {/* MERGE CUSTOMERS MODAL */}
      {matchResult.existingCustomer && (
        <MergeCustomersModal
          isOpen={isMergeModalOpen}
          onClose={() => setIsMergeModalOpen(false)}
          existingCustomer={matchResult.existingCustomer}
          newCustomerData={{
            name,
            mobileNumber: formatPhoneNumber(mobileNumberSuffix),
            whatsAppNumber: whatsAppNumberSuffix ? formatPhoneNumber(whatsAppNumberSuffix) : '',
            imoNumber: imoNumberSuffix ? formatPhoneNumber(imoNumberSuffix) : '',
            customerCategory,
            address,
            gender,
            remarks,
            additionalNumbers: additionalNumbers.map(an => ({
              id: an.id,
              number: formatPhoneNumber(an.suffix),
              type: 'Additional'
            }))
          }}
          tickets={tickets}
          followUps={followUps}
          onConfirmMerge={handleConfirmMergeModal}
        />
      )}
    </>
  );
}
