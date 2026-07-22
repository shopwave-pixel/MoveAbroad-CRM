import React, { useState } from 'react';
import { Customer, Ticket, FollowUp, AdditionalNumber } from '../types';
import { GitMerge, ArrowRight, Check, X, ShieldAlert, FileText, Calendar, Phone } from 'lucide-react';
import { motion } from 'motion/react';

interface MergeCustomersModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingCustomer: Customer;
  newCustomerData: {
    name: string;
    mobileNumber: string;
    whatsAppNumber?: string;
    imoNumber?: string;
    customerCategory?: string;
    address?: string;
    gender?: string;
    remarks?: string;
    additionalNumbers?: AdditionalNumber[];
  };
  tickets: Ticket[];
  followUps: FollowUp[];
  onConfirmMerge: (
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
    },
    duplicateToArchiveId?: string
  ) => Promise<void>;
}

export default function MergeCustomersModal({
  isOpen,
  onClose,
  existingCustomer,
  newCustomerData,
  tickets,
  followUps,
  onConfirmMerge
}: MergeCustomersModalProps) {
  if (!isOpen) return null;

  // Selected primary source: 'EXISTING' or 'NEW'
  const [primarySource, setPrimarySource] = useState<'EXISTING' | 'NEW'>('EXISTING');
  const [isMerging, setIsMerging] = useState(false);

  // Field selections for merging
  const [selectedName, setSelectedName] = useState(existingCustomer.name || newCustomerData.name);
  const [selectedMobile, setSelectedMobile] = useState(existingCustomer.mobileNumber || newCustomerData.mobileNumber);
  const [selectedWhatsApp, setSelectedWhatsApp] = useState(existingCustomer.whatsAppNumber || newCustomerData.whatsAppNumber || '');
  const [selectedImo, setSelectedImo] = useState(existingCustomer.imoNumber || newCustomerData.imoNumber || '');
  const [selectedCategory, setSelectedCategory] = useState(existingCustomer.customerCategory || newCustomerData.customerCategory || '');
  const [selectedAddress, setSelectedAddress] = useState(existingCustomer.address || newCustomerData.address || '');
  const [selectedGender, setSelectedGender] = useState(existingCustomer.gender || newCustomerData.gender || '');

  // Combined Remarks
  const combinedRemarks = [existingCustomer.remarks, newCustomerData.remarks]
    .filter(Boolean)
    .join('\n---\nMerged Note: ');

  const [selectedRemarks, setSelectedRemarks] = useState(combinedRemarks);

  // Associated items count for existing customer
  const existingTickets = tickets.filter(t => t.customerId === existingCustomer.id);
  const existingFollowUps = followUps.filter(f => f.customerId === existingCustomer.id);

  const handleMergeSubmit = async () => {
    setIsMerging(true);
    try {
      // Collect all unique additional numbers
      const addNumsMap = new Map<string, AdditionalNumber>();
      (existingCustomer.additionalNumbers || []).forEach(an => {
        if (an.number) addNumsMap.set(an.number, an);
      });
      (newCustomerData.additionalNumbers || []).forEach(an => {
        if (an.number) addNumsMap.set(an.number, an);
      });

      const mergedDetails = {
        name: selectedName,
        mobileNumber: selectedMobile,
        whatsAppNumber: selectedWhatsApp,
        imoNumber: selectedImo,
        customerCategory: selectedCategory,
        address: selectedAddress,
        gender: selectedGender,
        remarks: selectedRemarks,
        additionalNumbers: Array.from(addNumsMap.values())
      };

      await onConfirmMerge(existingCustomer, mergedDetails);
      setIsMerging(false);
      onClose();
    } catch (err) {
      console.error('Failed to execute merge', err);
      setIsMerging(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in" id="merge-customers-modal-overlay">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2 }}
        id="merge-customers-modal"
        className="relative w-full max-w-3xl bg-white dark:bg-[#1a1a15] rounded-3xl border border-purple-200 dark:border-purple-800/50 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-transparent border-b border-purple-200/80 dark:border-purple-800/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <GitMerge className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-[#1F2937] dark:text-[#ecece5]">
                Merge Customers Wizard
              </h2>
              <p className="text-xs text-purple-800 dark:text-purple-300 font-medium">
                Combine records, tickets, follow-ups, and notes into a single master profile.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            id="btn-close-merge-modal"
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs">
          
          {/* Primary Selection Header */}
          <div className="space-y-2">
            <label className="block text-xs font-extrabold uppercase text-slate-500 tracking-wider">
              1. Select Primary Record Source
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Existing Record Option */}
              <div
                onClick={() => {
                  setPrimarySource('EXISTING');
                  setSelectedName(existingCustomer.name);
                  setSelectedMobile(existingCustomer.mobileNumber);
                }}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  primarySource === 'EXISTING'
                    ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/20'
                    : 'bg-[#F8FAFC] dark:bg-[#151510] border-slate-200 dark:border-[#8a8a70]/20 hover:border-purple-300'
                }`}
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-purple-200/60 dark:border-purple-900/40">
                  <span className="font-mono font-bold text-[11px] text-purple-700 dark:text-purple-300 uppercase">
                    EXISTING RECORD ({existingCustomer.id})
                  </span>
                  {primarySource === 'EXISTING' && (
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-sm text-[#1F2937] dark:text-[#ecece5] uppercase">{existingCustomer.name}</p>
                  <p className="text-slate-500 dark:text-slate-400 font-mono">{existingCustomer.mobileNumber}</p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-2">
                    <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {existingTickets.length} Tickets</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {existingFollowUps.length} Follow-ups</span>
                  </div>
                </div>
              </div>

              {/* Proposed New Record Option */}
              <div
                onClick={() => {
                  setPrimarySource('NEW');
                  setSelectedName(newCustomerData.name);
                  setSelectedMobile(newCustomerData.mobileNumber);
                }}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  primarySource === 'NEW'
                    ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/20'
                    : 'bg-[#F8FAFC] dark:bg-[#151510] border-slate-200 dark:border-[#8a8a70]/20 hover:border-purple-300'
                }`}
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-purple-200/60 dark:border-purple-900/40">
                  <span className="font-mono font-bold text-[11px] text-purple-700 dark:text-purple-300 uppercase">
                    PROPOSED NEW INPUT
                  </span>
                  {primarySource === 'NEW' && (
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-sm text-[#1F2937] dark:text-[#ecece5] uppercase">{newCustomerData.name}</p>
                  <p className="text-slate-500 dark:text-slate-400 font-mono">{newCustomerData.mobileNumber}</p>
                  <span className="inline-block text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-2 py-0.5 rounded-md mt-2 uppercase">
                    New Entry
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Merge Field Configuration */}
          <div className="space-y-3">
            <label className="block text-xs font-extrabold uppercase text-slate-500 tracking-wider">
              2. Review Final Merged Master Values
            </label>

            <div className="bg-[#F8FAFC] dark:bg-[#151510] p-4 rounded-2xl border border-slate-200 dark:border-[#8a8a70]/20 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Full Name</label>
                  <input
                    type="text"
                    value={selectedName}
                    onChange={(e) => setSelectedName(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-200 dark:border-[#8a8a70]/30 bg-white dark:bg-[#20201a] text-[#1F2937] dark:text-[#ecece5] uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Primary Mobile Number</label>
                  <input
                    type="text"
                    value={selectedMobile}
                    onChange={(e) => setSelectedMobile(e.target.value)}
                    className="w-full text-xs font-bold font-mono px-3 py-2.5 rounded-xl border border-slate-200 dark:border-[#8a8a70]/30 bg-white dark:bg-[#20201a] text-[#1F2937] dark:text-[#ecece5]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">WhatsApp Number</label>
                  <input
                    type="text"
                    value={selectedWhatsApp}
                    onChange={(e) => setSelectedWhatsApp(e.target.value)}
                    className="w-full text-xs font-bold font-mono px-3 py-2.5 rounded-xl border border-slate-200 dark:border-[#8a8a70]/30 bg-white dark:bg-[#20201a] text-[#1F2937] dark:text-[#ecece5]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Customer Category</label>
                  <input
                    type="text"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-200 dark:border-[#8a8a70]/30 bg-white dark:bg-[#20201a] text-[#1F2937] dark:text-[#ecece5] uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Merged Customer Notes & History</label>
                <textarea
                  rows={4}
                  value={selectedRemarks}
                  onChange={(e) => setSelectedRemarks(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2.5 rounded-xl border border-slate-200 dark:border-[#8a8a70]/30 bg-white dark:bg-[#20201a] text-[#1F2937] dark:text-[#ecece5]"
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-xl text-[11px] text-purple-900 dark:text-purple-300 flex items-center gap-2 border border-purple-200 dark:border-purple-800/40">
            <ShieldAlert className="w-4 h-4 text-purple-600 shrink-0" />
            <span>Merging will consolidate all associated tickets ({existingTickets.length}), follow-ups ({existingFollowUps.length}), and customer notes into the master record.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-[#151510] border-t border-slate-200 dark:border-[#8a8a70]/20 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isMerging}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-[#8a8a70]/30 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            id="btn-confirm-merge"
            onClick={handleMergeSubmit}
            disabled={isMerging}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isMerging ? (
              <span>Merging Records...</span>
            ) : (
              <>
                <GitMerge className="w-4 h-4" />
                <span>Confirm & Complete Merge</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
