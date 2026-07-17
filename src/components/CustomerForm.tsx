import React, { useState, useEffect, useRef } from 'react';
import { Customer } from '../types';
import { AlignLeft } from 'lucide-react';
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
    imoNumber?: string
  ) => Promise<{ success: boolean; customer?: Customer; error?: string }>;
  existingCustomers: Customer[];
}

export default function CustomerForm({ onAddCustomer, existingCustomers }: CustomerFormProps) {
  const [name, setName] = useState('');
  const [mobileNumberSuffix, setMobileNumberSuffix] = useState('');
  const [whatsAppNumberSuffix, setWhatsAppNumberSuffix] = useState('');
  const [isSameAsMobile, setIsSameAsMobile] = useState(false);
  const [imoNumberSuffix, setImoNumberSuffix] = useState('');
  const [isImoSameAsMobile, setIsImoSameAsMobile] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [remarksRows, setRemarksRows] = useState(4);
  
  // Validation Errors
  const [nameError, setNameError] = useState('');
  const [mobileError, setMobileError] = useState('');

  // Main status banner
  const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message: string }>({
    type: 'idle',
    message: ''
  });

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

    if (hasValidationError) {
      return;
    }

    // Compute the full formatted mobile number for API check
    const formattedMobile = formatPhoneNumber(cleanMobileSuffix);
    const formattedWhatsApp = cleanWhatsAppSuffix ? formatPhoneNumber(cleanWhatsAppSuffix) : '';
    const formattedImo = cleanImoSuffix ? formatPhoneNumber(cleanImoSuffix) : '';

    // Client-side quick duplicate check before submitting
    const digitsOnlyInput = formattedMobile.replace(/\D/g, '');
    const isDuplicate = existingCustomers.some(c => c.mobileNumber.replace(/\D/g, '') === digitsOnlyInput);
    if (isDuplicate) {
      setMobileError('A CUSTOMER WITH THIS MOBILE NUMBER ALREADY EXISTS');
      return;
    }

    setStatus({ type: 'loading', message: 'CREATING...' });

    try {
      const result = await onAddCustomer(
        trimmedName, 
        formattedMobile, 
        formattedWhatsApp, 
        '', // Destination country (defaulted)
        'Walk-in', // Source (defaulted)
        remarks.trim(),
        formattedImo
      );

      if (result.success) {
        setStatus({
          type: 'success',
          message: '✅ CUSTOMER CREATED SUCCESSFULLY'
        });

        // Automatically clear all form states
        setName('');
        setMobileNumberSuffix('');
        setWhatsAppNumberSuffix('');
        setIsSameAsMobile(false);
        setImoNumberSuffix('');
        setIsImoSameAsMobile(false);
        setRemarks('');
        setRemarksRows(4);

        // Keep focus on Name field for next customer entry
        setTimeout(() => {
          nameInputRef.current?.focus();
        }, 50);

        // Automatically reset success message banner after 3 seconds
        setTimeout(() => {
          setStatus(prev => prev.type === 'success' ? { type: 'idle', message: '' } : prev);
        }, 3000);

      } else {
        setStatus({
          type: 'error',
          message: result.error || 'FAILED TO ADD CUSTOMER. PLEASE TRY AGAIN.'
        });
      }
    } catch (err: any) {
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
          <FormGroup
            label="Mobile Number"
            required
            htmlFor="customer-mobile"
            error={mobileError}
          >
            <div className={`flex rounded-xl bg-[#F8FAFC] dark:bg-[#151510]/50 border ${mobileError ? 'border-rose-400 focus-within:ring-rose-400/20' : 'border-gray-200 dark:border-[#8a8a70]/30 focus-within:ring-accent-blue/20 focus-within:border-accent-blue'} overflow-hidden focus-within:ring-2 transition-all`}>
              <div className="bg-gray-100 dark:bg-zinc-800 px-3.5 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-[#8a8a70]/20 select-none">
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
                className="w-full text-xs bg-transparent border-none px-3.5 py-3 focus:outline-none font-medium text-[#1F2937] dark:text-[#ecece5] uppercase placeholder-gray-400"
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
          </FormGroup>

          {/* WhatsApp Field */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center h-4">
              <label htmlFor="customer-whatsapp" className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 tracking-wider uppercase">
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
                <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  USE MOBILE
                </span>
              </label>
            </div>
            
            <div className={`flex rounded-xl bg-[#F8FAFC] dark:bg-[#151510]/50 border border-gray-200 dark:border-[#8a8a70]/30 overflow-hidden focus-within:ring-2 focus-within:ring-accent-blue/20 focus-within:border-accent-blue transition-all ${isSameAsMobile ? 'opacity-60 bg-gray-50 dark:bg-zinc-900/30' : ''}`}>
              <div className="bg-gray-100 dark:bg-zinc-800 px-3.5 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-[#8a8a70]/20 select-none">
                +880
              </div>
              <input
                type="tel"
                id="customer-whatsapp"
                name="customer-whatsapp"
                tabIndex={3}
                pattern="[0-9]*"
                inputMode="numeric"
                className="w-full text-xs bg-transparent border-none px-3.5 py-3 focus:outline-none font-medium text-[#1F2937] dark:text-[#ecece5] uppercase placeholder-gray-400"
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
              <label htmlFor="customer-imo" className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 tracking-wider uppercase">
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
                <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  USE MOBILE
                </span>
              </label>
            </div>
            
            <div className={`flex rounded-xl bg-[#F8FAFC] dark:bg-[#151510]/50 border border-gray-200 dark:border-[#8a8a70]/30 overflow-hidden focus-within:ring-2 focus-within:ring-accent-blue/20 focus-within:border-accent-blue transition-all ${isImoSameAsMobile ? 'opacity-60 bg-gray-50 dark:bg-zinc-900/30' : ''}`}>
              <div className="bg-gray-100 dark:bg-zinc-800 px-3.5 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-[#8a8a70]/20 select-none">
                +880
              </div>
              <input
                type="tel"
                id="customer-imo"
                name="customer-imo"
                tabIndex={4}
                pattern="[0-9]*"
                inputMode="numeric"
                className="w-full text-xs bg-transparent border-none px-3.5 py-3 focus:outline-none font-medium text-[#1F2937] dark:text-[#ecece5] uppercase placeholder-gray-400"
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
