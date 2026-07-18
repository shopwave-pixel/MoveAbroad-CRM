import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Customer, AdditionalNumber } from '../types';
import { AlignLeft, Search, MapPin, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Button, 
  Input, 
  TextArea, 
  FormGroup, 
  Card, 
  Alert 
} from './ui';

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
}

export default function CustomerForm({ onAddCustomer, existingCustomers }: CustomerFormProps) {
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

  // Format Helper for submitting
  const formatPhoneNumber = (suffix: string) => {
    const cleanSuffix = suffix.trim();
    if (!cleanSuffix) return '';
    // Strip leading 0 if any to format with standard +880
    const normalized = cleanSuffix.startsWith('0') ? cleanSuffix.slice(1) : cleanSuffix;
    return `+880${normalized}`;
  };

  const handleRemarksChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setRemarks(val);
    if (status.type !== 'idle') setStatus({ type: 'idle', message: '' });

    // Auto expand remarks row calculation up to 10 rows
    const newlines = (val.match(/\n/g) || []).length;
    const computedRows = Math.min(10, Math.max(4, newlines + 1));
    setRemarksRows(computedRows);
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setAddress(val);
    if (status.type !== 'idle') setStatus({ type: 'idle', message: '' });

    // Auto expand address row calculation up to 8 rows (min 4 rows)
    const newlines = (val.match(/\n/g) || []).length;
    const computedRows = Math.min(8, Math.max(4, newlines + 1));
    setAddressRows(computedRows);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous inline validation errors
    setNameError('');
    setMobileError('');

    const trimmedName = name.trim();
    const cleanMobileSuffix = mobileNumberSuffix.trim();
    const cleanWhatsAppSuffix = isSameAsMobile ? cleanMobileSuffix : whatsAppNumberSuffix.trim();
    const cleanImoSuffix = isImoSameAsMobile ? cleanMobileSuffix : imoNumberSuffix.trim();

    let hasValidationError = false;

    // Validate Name
    if (!trimmedName) {
      setNameError('FULL NAME IS REQUIRED');
      hasValidationError = true;
    }

    // Validate Mobile Number Suffix
    const digitsOnlyMobile = cleanMobileSuffix.replace(/\D/g, '');
    if (!cleanMobileSuffix || digitsOnlyMobile.length < 9) {
      setMobileError('VALID MOBILE NUMBER REQUIRED');
      hasValidationError = true;
    }

    // Validate and check duplicate numbers within the same customer
    const suffixesSeen = new Set<string>();
    if (digitsOnlyMobile) {
      suffixesSeen.add(digitsOnlyMobile);
    }

    let invalidFormatFound = false;
    let duplicateFoundInside = false;

    for (const addNum of additionalNumbers) {
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
      setMobileError('VALID MOBILE NUMBER REQUIRED FOR ALL FIELDS');
      hasValidationError = true;
    } else if (duplicateFoundInside) {
      setMobileError('DUPLICATE MOBILE NUMBERS FOUND FOR THIS CUSTOMER');
      hasValidationError = true;
    }

    if (hasValidationError) {
      return;
    }

    // Compute the full formatted mobile number for API check
    const formattedMobile = formatPhoneNumber(cleanMobileSuffix);
    const formattedWhatsApp = cleanWhatsAppSuffix ? formatPhoneNumber(cleanWhatsAppSuffix) : '';
    const formattedImo = cleanImoSuffix ? formatPhoneNumber(cleanImoSuffix) : '';

    // Check database duplicates
    const allNormalizedInputNumbers = Array.from(suffixesSeen).map(suffix => `+880${suffix}`);
    let existsInDb = false;
    for (const num of allNormalizedInputNumbers) {
      const digits = num.replace(/\D/g, '');
      const duplicateCustomer = existingCustomers.find(c => {
        const mainDigits = c.mobileNumber.replace(/\D/g, '');
        if (mainDigits === digits) return true;
        const addDigits = (c.additionalNumbers || []).map(an => an.number.replace(/\D/g, ''));
        if (addDigits.includes(digits)) return true;
        return false;
      });
      if (duplicateCustomer) {
        existsInDb = true;
        break;
      }
    }

    if (existsInDb) {
      setMobileError('A MOBILE NUMBER ENTERED ALREADY EXISTS IN THE DATABASE');
      return;
    }

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
        '', // Destination country (defaulted)
        'Walk-in', // Source (defaulted)
        remarks.trim(),
        formattedImo,
        customerCategory,
        address.trim(),
        gender,
        formattedAdditional
      );

      if (result.success) {
        // Show "Saving..." for less than one second (400ms)
        await new Promise(resolve => setTimeout(resolve, 400));
        setIsSavingLocal(false);
        setIsSavedLocal(true);

        // Automatically clear all form states
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

        // Keep focus on Name field for next customer entry
        setTimeout(() => {
          nameInputRef.current?.focus();
        }, 50);

        // Automatically reset success message banner after 1.5 seconds
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

  return (
    <Card 
      id="customer-form-container"
      borderTopColor="green"
      className="space-y-6"
    >
      {/* Status Messages using alert design system */}
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

      <form onSubmit={handleSubmit} className="space-y-5" id="customer-form">
        
        {/* Full Name Field using FormGroup and Input components */}
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
              <button
                type="button"
                onClick={handleAddAdditionalNumberField}
                className="w-5.5 h-5.5 rounded-full bg-accent-green hover:bg-emerald-600 text-white flex items-center justify-center active:scale-95 transition-all shadow-xs shrink-0 cursor-pointer"
                title="Add Additional Mobile Number"
              >
                <Plus className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
            
            <div className="space-y-2">
              <div className={`flex rounded-xl bg-[#F8FAFC] dark:bg-[#151510]/50 border ${mobileError ? 'border-rose-400 focus-within:ring-rose-400/20' : 'border-gray-200 dark:border-[#8a8a70]/30 focus-within:ring-accent-blue/20 focus-within:border-accent-blue'} overflow-hidden focus-within:ring-2 transition-all`}>
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
                    className="p-1.5 text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg active:scale-95 transition-all shrink-0 cursor-pointer"
                    title="Remove this number"
                  >
                    <X className="w-4 h-4" />
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
              
              {/* Toggle Switch */}
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
              
              {/* Toggle Switch */}
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

        {/* Customer Category and Address (Optional fields added) */}
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

        {/* Primary Submit Button using design system Button */}
        <Button
          type="submit"
          id="btn-submit-customer"
          tabIndex={6}
          loading={status.type === 'loading'}
          variant={status.type === 'success' ? 'success' : 'success'}
          size="lg"
          className="w-full mt-6"
        >
          {status.type === 'success' ? '✅ CUSTOMER ONBOARDED' : 'ONBOARD CUSTOMER'}
        </Button>
      </form>
    </Card>
  );
}
