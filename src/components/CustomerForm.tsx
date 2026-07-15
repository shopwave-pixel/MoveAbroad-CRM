import React, { useState, useEffect } from 'react';
import { Customer } from '../types';
import { UserPlus, Phone, Loader2, AlertCircle, CheckCircle2, Globe, Share2, AlignLeft, MessageSquare } from 'lucide-react';

interface CustomerFormProps {
  onAddCustomer: (
    name: string, 
    mobileNumber: string,
    whatsAppNumber?: string,
    destinationCountry?: string,
    source?: string,
    remarks?: string
  ) => Promise<{ success: boolean; customer?: Customer; error?: string }>;
  existingCustomers: Customer[];
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

export default function CustomerForm({ onAddCustomer, existingCustomers }: CustomerFormProps) {
  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [whatsAppNumber, setWhatsAppNumber] = useState('');
  const [isSameAsMobile, setIsSameAsMobile] = useState(false);
  const [destinationCountry, setDestinationCountry] = useState('');
  const [source, setSource] = useState('Walk-in');
  const [remarks, setRemarks] = useState('');
  
  const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message: string }>({
    type: 'idle',
    message: ''
  });

  // Sync WhatsApp number if checkmark is toggled
  useEffect(() => {
    if (isSameAsMobile) {
      setWhatsAppNumber(mobileNumber);
    }
  }, [isSameAsMobile, mobileNumber]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedName = name.trim();
    const trimmedMobile = mobileNumber.trim();
    const finalWhatsApp = isSameAsMobile ? trimmedMobile : whatsAppNumber.trim();
    const trimmedCountry = destinationCountry.trim();
    const trimmedRemarks = remarks.trim();

    if (!trimmedName) {
      setStatus({ type: 'error', message: 'Customer name is required.' });
      return;
    }

    if (!trimmedMobile) {
      setStatus({ type: 'error', message: 'Mobile number is required.' });
      return;
    }

    // Client-side quick duplicate check before submitting
    const digitsOnlyInput = trimmedMobile.replace(/\D/g, '');
    const isDuplicate = existingCustomers.some(c => c.mobileNumber.replace(/\D/g, '') === digitsOnlyInput);
    if (isDuplicate) {
      setStatus({ type: 'error', message: 'A customer with this mobile number already exists.' });
      return;
    }

    setStatus({ type: 'loading', message: 'Saving customer details...' });

    try {
      const result = await onAddCustomer(
        trimmedName, 
        trimmedMobile, 
        finalWhatsApp, 
        trimmedCountry, 
        source, 
        trimmedRemarks
      );
      if (result.success) {
        setStatus({
          type: 'success',
          message: `Customer "${trimmedName}" has been added successfully!`
        });
        setName('');
        setMobileNumber('');
        setWhatsAppNumber('');
        setIsSameAsMobile(false);
        setDestinationCountry('');
        setSource('Walk-in');
        setRemarks('');
      } else {
        setStatus({
          type: 'error',
          message: result.error || 'Failed to add customer. Please try again.'
        });
      }
    } catch (err: any) {
      setStatus({
        type: 'error',
        message: err.message || 'An unexpected error occurred.'
      });
    }
  };

  return (
    <div className="bg-white dark:bg-[#20201a] rounded-3xl border border-[#5A5A40]/10 dark:border-[#8a8a70]/20 p-5 space-y-6" id="customer-form-container">
      <div className="flex items-center gap-2.5">
        <div className="p-2.5 bg-[#5A5A40]/10 dark:bg-[#8a8a70]/20 rounded-xl text-[#5A5A40] dark:text-[#ecece5]">
          <UserPlus className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-serif font-bold text-[#5A5A40] dark:text-[#ecece5] text-base">Add New Customer</h2>
          <p className="text-xs text-[#5A5A40]/60 dark:text-[#8a8a70]/80">Create a customer profile to open tickets</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" id="customer-form">
        {/* Status Messages */}
        {status.type === 'error' && (
          <div id="customer-form-error" className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-xl flex items-start gap-2 text-xs text-rose-800 dark:text-rose-300 leading-tight">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
            <span>{status.message}</span>
          </div>
        )}

        {status.type === 'success' && (
          <div id="customer-form-success" className="p-3 bg-[#5A5A40]/10 dark:bg-[#5A5A40]/25 border border-[#5A5A40]/20 dark:border-[#8a8a70]/30 rounded-xl flex items-start gap-2 text-xs text-[#5A5A40] dark:text-[#ecece5] leading-tight">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#5A5A40] dark:text-[#ecece5] mt-0.5" />
            <span>{status.message}</span>
          </div>
        )}

        {/* Name Field */}
        <div>
          <label htmlFor="customer-name" className="block text-xs font-semibold text-[#5A5A40]/80 dark:text-[#8a8a70] mb-1.5">
            Customer Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            id="customer-name"
            name="customer-name"
            required
            className="w-full text-sm bg-[#f5f5f0]/50 dark:bg-[#151510]/50 border border-[#5A5A40]/15 dark:border-[#8a8a70]/30 rounded-xl px-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-[#5A5A40] focus:bg-white dark:focus:bg-[#1e1e18] text-[#2c2c26] dark:text-[#f5f5f0] transition-all"
            placeholder="e.g. Abul Kalam"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (status.type !== 'idle') setStatus({ type: 'idle', message: '' });
            }}
            disabled={status.type === 'loading'}
          />
        </div>

        {/* Mobile & WhatsApp Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Mobile Field */}
          <div>
            <label htmlFor="customer-mobile" className="block text-xs font-semibold text-[#5A5A40]/80 dark:text-[#8a8a70] mb-1.5">
              Mobile Number <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5A5A40]/45">
                <Phone className="w-4 h-4" />
              </div>
              <input
                type="tel"
                id="customer-mobile"
                name="customer-mobile"
                required
                className="w-full text-sm bg-[#f5f5f0]/50 dark:bg-[#151510]/50 border border-[#5A5A40]/15 dark:border-[#8a8a70]/30 rounded-xl pl-10 pr-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-[#5A5A40] focus:bg-white dark:focus:bg-[#1e1e18] text-[#2c2c26] dark:text-[#f5f5f0] transition-all"
                placeholder="e.g. +880 1712-345678"
                value={mobileNumber}
                onChange={(e) => {
                  setMobileNumber(e.target.value);
                  if (status.type !== 'idle') setStatus({ type: 'idle', message: '' });
                }}
                disabled={status.type === 'loading'}
              />
            </div>
          </div>

          {/* WhatsApp Field */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label htmlFor="customer-whatsapp" className="block text-xs font-semibold text-[#5A5A40]/80 dark:text-[#8a8a70]">
                WhatsApp Number
              </label>
              <label className="inline-flex items-center gap-1 text-[10px] text-[#5A5A40]/80 dark:text-[#8a8a70]/90 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-[#5A5A40]/30 text-[#5A5A40] focus:ring-[#5A5A40] w-3 h-3 accent-[#5A5A40]"
                  checked={isSameAsMobile}
                  onChange={(e) => {
                    setIsSameAsMobile(e.target.checked);
                    if (status.type !== 'idle') setStatus({ type: 'idle', message: '' });
                  }}
                  disabled={status.type === 'loading'}
                />
                <span>Same as Mobile</span>
              </label>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5A5A40]/45">
                <MessageSquare className="w-4 h-4" />
              </div>
              <input
                type="tel"
                id="customer-whatsapp"
                name="customer-whatsapp"
                className="w-full text-sm bg-[#f5f5f0]/50 dark:bg-[#151510]/50 border border-[#5A5A40]/15 dark:border-[#8a8a70]/30 rounded-xl pl-10 pr-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-[#5A5A40] focus:bg-white dark:focus:bg-[#1e1e18] text-[#2c2c26] dark:text-[#f5f5f0] transition-all disabled:opacity-60"
                placeholder="e.g. +880 1712-345678"
                value={isSameAsMobile ? mobileNumber : whatsAppNumber}
                onChange={(e) => {
                  setWhatsAppNumber(e.target.value);
                  if (status.type !== 'idle') setStatus({ type: 'idle', message: '' });
                }}
                disabled={isSameAsMobile || status.type === 'loading'}
              />
            </div>
          </div>
        </div>

        {/* Destination & Source Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Destination Country Field */}
          <div>
            <label htmlFor="customer-destination" className="block text-xs font-semibold text-[#5A5A40]/80 dark:text-[#8a8a70] mb-1.5">
              Destination Country
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5A5A40]/45">
                <Globe className="w-4 h-4" />
              </div>
              <input
                list="countries-list"
                type="text"
                id="customer-destination"
                name="customer-destination"
                className="w-full text-sm bg-[#f5f5f0]/50 dark:bg-[#151510]/50 border border-[#5A5A40]/15 dark:border-[#8a8a70]/30 rounded-xl pl-10 pr-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-[#5A5A40] focus:bg-white dark:focus:bg-[#1e1e18] text-[#2c2c26] dark:text-[#f5f5f0] transition-all"
                placeholder="e.g. Saudi Arabia"
                value={destinationCountry}
                onChange={(e) => {
                  setDestinationCountry(e.target.value);
                  if (status.type !== 'idle') setStatus({ type: 'idle', message: '' });
                }}
                disabled={status.type === 'loading'}
              />
              <datalist id="countries-list">
                {POPULAR_COUNTRIES.map(country => (
                  <option key={country} value={country} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Source Field */}
          <div>
            <label htmlFor="customer-source" className="block text-xs font-semibold text-[#5A5A40]/80 dark:text-[#8a8a70] mb-1.5">
              Acquisition Source
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5A5A40]/45">
                <Share2 className="w-4 h-4" />
              </div>
              <select
                id="customer-source"
                name="customer-source"
                className="w-full text-sm bg-[#f5f5f0]/50 dark:bg-[#151510]/50 border border-[#5A5A40]/15 dark:border-[#8a8a70]/30 rounded-xl pl-10 pr-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-[#5A5A40] focus:bg-white dark:focus:bg-[#1e1e18] text-[#2c2c26] dark:text-[#f5f5f0] transition-all cursor-pointer appearance-none"
                value={source}
                onChange={(e) => {
                  setSource(e.target.value);
                  if (status.type !== 'idle') setStatus({ type: 'idle', message: '' });
                }}
                disabled={status.type === 'loading'}
              >
                {SOURCES.map(src => (
                  <option key={src} value={src}>{src}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Remarks Field */}
        <div>
          <label htmlFor="customer-remarks" className="block text-xs font-semibold text-[#5A5A40]/80 dark:text-[#8a8a70] mb-1.5">
            Remarks / Case Notes
          </label>
          <div className="relative">
            <div className="absolute top-3.5 left-3.5 pointer-events-none text-[#5A5A40]/45">
              <AlignLeft className="w-4 h-4" />
            </div>
            <textarea
              id="customer-remarks"
              name="customer-remarks"
              rows={3}
              className="w-full text-sm bg-[#f5f5f0]/50 dark:bg-[#151510]/50 border border-[#5A5A40]/15 dark:border-[#8a8a70]/30 rounded-xl pl-10 pr-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#5A5A40] focus:bg-white dark:focus:bg-[#1e1e18] text-[#2c2c26] dark:text-[#f5f5f0] transition-all resize-none"
              placeholder="Enter special candidate conditions, qualifications, reference details..."
              value={remarks}
              onChange={(e) => {
                setRemarks(e.target.value);
                if (status.type !== 'idle') setStatus({ type: 'idle', message: '' });
              }}
              disabled={status.type === 'loading'}
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          id="btn-submit-customer"
          disabled={status.type === 'loading'}
          className="w-full bg-[#5A5A40] hover:bg-[#4a4a34] dark:bg-[#5A5A40] dark:hover:bg-[#6c6c4e] disabled:opacity-50 text-white font-medium text-sm py-3 px-4 rounded-full shadow-lg shadow-[#5A5A40]/10 transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5A5A40] mt-4 cursor-pointer h-12"
        >
          {status.type === 'loading' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving Customer...
            </>
          ) : (
            'Add Customer Profile'
          )}
        </button>
      </form>
    </div>
  );
}
