import React, { useState } from 'react';
import { Customer, Ticket, FollowUp, User } from '../types';
import { DuplicateGroup } from '../utils/duplicateGroupEngine';
import { 
  GitMerge, 
  Archive, 
  Eye, 
  Check, 
  X, 
  ShieldAlert, 
  Calendar, 
  Phone, 
  MessageSquare, 
  MapPin, 
  User as UserIcon, 
  Sparkles, 
  AlertTriangle,
  ArrowRight,
  FileText,
  History,
  CheckCircle2,
  Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DuplicateGroupReviewModalProps {
  isOpen: boolean;
  group: DuplicateGroup | null;
  currentUser: User | null;
  tickets: Ticket[];
  followUps: FollowUp[];
  onClose: () => void;
  onViewCustomer: (customer: Customer) => void;
  onMergeGroup: (
    primaryCustomer: Customer,
    mergedCustomerData: Partial<Customer>,
    duplicateToArchiveIds: string[]
  ) => Promise<void>;
  onArchiveDuplicate: (customerToArchive: Customer) => Promise<void>;
  onKeepBoth: (group: DuplicateGroup) => void;
  onIgnoreGroup: (group: DuplicateGroup) => void;
}

export default function DuplicateGroupReviewModal({
  isOpen,
  group,
  currentUser,
  tickets,
  followUps,
  onClose,
  onViewCustomer,
  onMergeGroup,
  onArchiveDuplicate,
  onKeepBoth,
  onIgnoreGroup
}: DuplicateGroupReviewModalProps) {
  if (!isOpen || !group) return null;

  const isAdmin = currentUser?.role === 'Admin';
  const customers = group.customers;

  // Selected Primary Customer ID (Defaults to first customer or stored primary)
  const [primaryCustomerId, setPrimaryCustomerId] = useState<string>(
    group.primaryCustomerId || customers[0]?.id || ''
  );

  // Wizard mode toggle: 'COMPARE' | 'MERGE_WIZARD'
  const [mode, setMode] = useState<'COMPARE' | 'MERGE_WIZARD'>('COMPARE');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const primaryCust = customers.find(c => c.id === primaryCustomerId) || customers[0];
  const secondaryCusts = customers.filter(c => c.id !== primaryCustomerId);
  const secondaryCust = secondaryCusts[0] || customers[1] || primaryCust;

  // Field selection states for Merge Wizard
  const [selectedName, setSelectedName] = useState<string>(primaryCust.name);
  const [selectedMobile, setSelectedMobile] = useState<string>(primaryCust.mobileNumber);
  const [selectedWhatsApp, setSelectedWhatsApp] = useState<string>(primaryCust.whatsAppNumber || secondaryCust.whatsAppNumber || '');
  const [selectedImo, setSelectedImo] = useState<string>(primaryCust.imoNumber || secondaryCust.imoNumber || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(primaryCust.customerCategory || secondaryCust.customerCategory || '');
  const [selectedGender, setSelectedGender] = useState<string>(primaryCust.gender || secondaryCust.gender || '');
  const [selectedAddress, setSelectedAddress] = useState<string>(primaryCust.address || secondaryCust.address || '');
  const [selectedDestination, setSelectedDestination] = useState<string>(primaryCust.destinationCountry || secondaryCust.destinationCountry || '');
  const [selectedRemarks, setSelectedRemarks] = useState<string>(
    [primaryCust.remarks, secondaryCust.remarks].filter(Boolean).join('\n---\nMerged Notes: ')
  );

  // Helper to extract email
  const getEmail = (c: Customer) => {
    if (!c.remarks) return '';
    const m = c.remarks.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    return m ? m[0] : '';
  };

  // Helper function to check if field values differ across group customers
  const isFieldDifferent = (getter: (c: Customer) => string) => {
    if (customers.length < 2) return false;
    const first = (getter(customers[0]) || '').trim().toLowerCase();
    return customers.some(c => (getter(c) || '').trim().toLowerCase() !== first);
  };

  const nameDiff = isFieldDifferent(c => c.name);
  const mobileDiff = isFieldDifferent(c => c.mobileNumber);
  const waDiff = isFieldDifferent(c => c.whatsAppNumber || '');
  const imoDiff = isFieldDifferent(c => c.imoNumber || '');
  const categoryDiff = isFieldDifferent(c => c.customerCategory || '');
  const genderDiff = isFieldDifferent(c => c.gender || '');
  const addressDiff = isFieldDifferent(c => c.address || '');
  const destDiff = isFieldDifferent(c => c.destinationCountry || '');

  const handleExecuteMerge = async () => {
    setIsSubmitting(true);
    try {
      const mergedDetails: Partial<Customer> = {
        name: selectedName,
        mobileNumber: selectedMobile,
        whatsAppNumber: selectedWhatsApp,
        imoNumber: selectedImo,
        customerCategory: selectedCategory,
        gender: selectedGender,
        address: selectedAddress,
        destinationCountry: selectedDestination,
        remarks: selectedRemarks
      };

      const duplicatesToArchive = secondaryCusts.map(c => c.id);
      await onMergeGroup(primaryCust, mergedDetails, duplicatesToArchive);
      setIsSubmitting(false);
      onClose();
    } catch (err) {
      console.error('Failed to merge customers:', err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-fade-in" id="dup-review-modal-overlay">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2 }}
        id="dup-review-modal"
        className="relative w-full max-w-5xl bg-white dark:bg-[#1a1a15] rounded-3xl border border-amber-200 dark:border-amber-800/50 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b border-amber-200/80 dark:border-amber-800/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <GitMerge className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-serif font-bold text-gray-900 dark:text-white">
                  Duplicate Resolution Center
                </h2>
                <span className="font-mono text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800/50">
                  {group.id} ({group.confidenceScore}% Confidence)
                </span>
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                Matched on {group.matchType}: <span className="font-mono font-bold">{group.matchedValue}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            id="btn-close-dup-modal"
            className="w-9 h-9 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Mode Sub-header */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-[#20201a] border-b border-gray-200 dark:border-[#8a8a70]/20 flex items-center justify-between flex-wrap gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode('COMPARE')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-all ${
                mode === 'COMPARE'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
              }`}
            >
              Side-by-Side Comparison
            </button>

            <button
              onClick={() => setMode('MERGE_WIZARD')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-all ${
                mode === 'MERGE_WIZARD'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
              }`}
            >
              Merge Wizard
            </button>
          </div>

          <div className="text-xs font-bold text-gray-500 dark:text-gray-400">
            Select Primary Customer to maintain record history
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {mode === 'COMPARE' ? (
            /* SIDE BY SIDE COMPARISON VIEW */
            <div className="space-y-6">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl text-xs text-amber-900 dark:text-amber-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Highlighted fields indicate differences between duplicate records. Click <strong>"Set Primary"</strong> on any customer card to designate it as the master profile.
                </span>
              </div>

              {/* Grid of Customers in Group */}
              <div className={`grid grid-cols-1 ${customers.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-4`}>
                {customers.map((cust) => {
                  const isPrimary = cust.id === primaryCustomerId;
                  const custTickets = tickets.filter(t => t.customerId === cust.id);
                  const custFollowUps = followUps.filter(f => f.customerId === cust.id);

                  return (
                    <div
                      key={cust.id}
                      className={`relative bg-white dark:bg-[#1f1f1a] rounded-2xl border-2 transition-all p-5 space-y-4 ${
                        isPrimary
                          ? 'border-amber-500 shadow-lg ring-2 ring-amber-500/20'
                          : 'border-gray-200 dark:border-[#8a8a70]/30 hover:border-gray-300'
                      }`}
                    >
                      {/* Primary Badge or Select Button */}
                      <div className="flex items-center justify-between">
                        {isPrimary ? (
                          <span className="inline-flex items-center gap-1 bg-amber-500 text-white font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-wider shadow-xs">
                            <CheckCircle2 className="w-3.5 h-3.5" /> PRIMARY RECORD
                          </span>
                        ) : (
                          isAdmin && (
                            <button
                              onClick={() => setPrimaryCustomerId(cust.id)}
                              className="text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
                            >
                              Set as Primary &rarr;
                            </button>
                          )
                        )}

                        <button
                          onClick={() => onViewCustomer(cust)}
                          className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                          title="View Full Customer Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Header Info */}
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white font-serif font-bold text-lg flex items-center justify-center shrink-0 shadow-md">
                          {cust.name.substring(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-base text-gray-900 dark:text-white truncate">
                            {cust.name}
                          </h3>
                          <p className="font-mono text-xs text-gray-400">{cust.id}</p>
                        </div>
                      </div>

                      {/* Field Comparisons */}
                      <div className="space-y-2.5 text-xs">
                        {/* Mobile */}
                        <div className={`p-2 rounded-lg border ${mobileDiff ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40' : 'bg-gray-50 dark:bg-[#25251e] border-gray-100 dark:border-[#8a8a70]/15'}`}>
                          <span className="text-[10px] font-bold text-gray-400 uppercase block">Mobile Number</span>
                          <span className="font-mono font-bold text-gray-900 dark:text-white">{cust.mobileNumber || 'N/A'}</span>
                        </div>

                        {/* WhatsApp */}
                        <div className={`p-2 rounded-lg border ${waDiff ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40' : 'bg-gray-50 dark:bg-[#25251e] border-gray-100 dark:border-[#8a8a70]/15'}`}>
                          <span className="text-[10px] font-bold text-gray-400 uppercase block">WhatsApp Number</span>
                          <span className="font-mono font-bold text-gray-900 dark:text-white">{cust.whatsAppNumber || 'None'}</span>
                        </div>

                        {/* IMO */}
                        <div className={`p-2 rounded-lg border ${imoDiff ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40' : 'bg-gray-50 dark:bg-[#25251e] border-gray-100 dark:border-[#8a8a70]/15'}`}>
                          <span className="text-[10px] font-bold text-gray-400 uppercase block">IMO Number</span>
                          <span className="font-mono font-bold text-gray-900 dark:text-white">{cust.imoNumber || 'None'}</span>
                        </div>

                        {/* Category */}
                        <div className={`p-2 rounded-lg border ${categoryDiff ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40' : 'bg-gray-50 dark:bg-[#25251e] border-gray-100 dark:border-[#8a8a70]/15'}`}>
                          <span className="text-[10px] font-bold text-gray-400 uppercase block">Category</span>
                          <span className="font-bold text-gray-900 dark:text-white">{cust.customerCategory || 'Uncategorized'}</span>
                        </div>

                        {/* Destination */}
                        <div className={`p-2 rounded-lg border ${destDiff ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40' : 'bg-gray-50 dark:bg-[#25251e] border-gray-100 dark:border-[#8a8a70]/15'}`}>
                          <span className="text-[10px] font-bold text-gray-400 uppercase block">Destination</span>
                          <span className="font-bold text-gray-900 dark:text-white">{cust.destinationCountry || 'N/A'}</span>
                        </div>

                        {/* Address */}
                        <div className={`p-2 rounded-lg border ${addressDiff ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40' : 'bg-gray-50 dark:bg-[#25251e] border-gray-100 dark:border-[#8a8a70]/15'}`}>
                          <span className="text-[10px] font-bold text-gray-400 uppercase block">Address</span>
                          <span className="text-gray-900 dark:text-white leading-relaxed">{cust.address || 'No address logged'}</span>
                        </div>

                        {/* Metrics Summary */}
                        <div className="pt-2 border-t border-gray-100 dark:border-[#8a8a70]/20 flex items-center justify-between text-[11px] font-bold text-gray-600 dark:text-gray-300">
                          <span>{custTickets.length} Tickets</span>
                          <span>{custFollowUps.length} Follow-ups</span>
                          <span>Created {new Date(cust.createdAt || Date.now()).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* MERGE WIZARD STEP */
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="p-4 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40 rounded-2xl text-xs text-purple-900 dark:text-purple-300 space-y-1">
                <p className="font-bold uppercase tracking-wide">Merge Configuration Wizard</p>
                <p className="leading-relaxed">
                  Merging will combine all associated tickets, follow-ups, and notes into <strong>{primaryCust.name} ({primaryCust.id})</strong>. The secondary record(s) will be automatically moved to <strong>Archived Customers</strong>.
                </p>
              </div>

              {/* Field Selectors */}
              <div className="space-y-4 bg-gray-50 dark:bg-[#20201a] p-5 rounded-2xl border border-gray-200 dark:border-[#8a8a70]/20">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Fields to Keep</h4>

                {/* Name */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={selectedName}
                    onChange={(e) => setSelectedName(e.target.value)}
                    className="w-full text-xs bg-white dark:bg-[#1a1a15] border border-gray-200 dark:border-[#8a8a70]/30 rounded-xl px-3 py-2 font-bold text-gray-900 dark:text-white"
                  />
                </div>

                {/* Mobile */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">Mobile Number</label>
                  <input
                    type="text"
                    value={selectedMobile}
                    onChange={(e) => setSelectedMobile(e.target.value)}
                    className="w-full text-xs font-mono bg-white dark:bg-[#1a1a15] border border-gray-200 dark:border-[#8a8a70]/30 rounded-xl px-3 py-2 font-bold text-gray-900 dark:text-white"
                  />
                </div>

                {/* WhatsApp & IMO */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">WhatsApp</label>
                    <input
                      type="text"
                      value={selectedWhatsApp}
                      onChange={(e) => setSelectedWhatsApp(e.target.value)}
                      className="w-full text-xs font-mono bg-white dark:bg-[#1a1a15] border border-gray-200 dark:border-[#8a8a70]/30 rounded-xl px-3 py-2 font-bold text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">IMO</label>
                    <input
                      type="text"
                      value={selectedImo}
                      onChange={(e) => setSelectedImo(e.target.value)}
                      className="w-full text-xs font-mono bg-white dark:bg-[#1a1a15] border border-gray-200 dark:border-[#8a8a70]/30 rounded-xl px-3 py-2 font-bold text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Category & Destination */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">Category</label>
                    <input
                      type="text"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full text-xs bg-white dark:bg-[#1a1a15] border border-gray-200 dark:border-[#8a8a70]/30 rounded-xl px-3 py-2 font-bold text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">Destination Country</label>
                    <input
                      type="text"
                      value={selectedDestination}
                      onChange={(e) => setSelectedDestination(e.target.value)}
                      className="w-full text-xs bg-white dark:bg-[#1a1a15] border border-gray-200 dark:border-[#8a8a70]/30 rounded-xl px-3 py-2 font-bold text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">Address</label>
                  <input
                    type="text"
                    value={selectedAddress}
                    onChange={(e) => setSelectedAddress(e.target.value)}
                    className="w-full text-xs bg-white dark:bg-[#1a1a15] border border-gray-200 dark:border-[#8a8a70]/30 rounded-xl px-3 py-2 font-medium text-gray-900 dark:text-white"
                  />
                </div>

                {/* Combined Remarks / Notes */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">Merged Remarks & Notes</label>
                  <textarea
                    rows={3}
                    value={selectedRemarks}
                    onChange={(e) => setSelectedRemarks(e.target.value)}
                    className="w-full text-xs bg-white dark:bg-[#1a1a15] border border-gray-200 dark:border-[#8a8a70]/30 rounded-xl p-3 font-medium text-gray-900 dark:text-white resize-y"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions Bar */}
        <div className="p-4 sm:p-5 bg-gray-50 dark:bg-[#20201a] border-t border-gray-200 dark:border-[#8a8a70]/20 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            onClick={onClose}
            id="btn-cancel-dup-modal"
            className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-800 dark:hover:text-white cursor-pointer"
          >
            Cancel
          </button>

          {isAdmin ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => onKeepBoth(group)}
                id="btn-keep-both-modal"
                className="px-4 py-2 text-xs font-bold bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 text-gray-800 dark:text-gray-200 rounded-xl transition-all cursor-pointer"
              >
                Keep Both
              </button>

              <button
                onClick={() => onIgnoreGroup(group)}
                id="btn-ignore-modal"
                className="px-4 py-2 text-xs font-bold bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl transition-all cursor-pointer"
              >
                Ignore
              </button>

              {mode === 'COMPARE' ? (
                <button
                  onClick={() => setMode('MERGE_WIZARD')}
                  id="btn-proceed-merge-wizard"
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <GitMerge className="w-4 h-4" />
                  <span>Open Merge Wizard</span>
                </button>
              ) : (
                <button
                  onClick={handleExecuteMerge}
                  disabled={isSubmitting}
                  id="btn-confirm-execute-merge"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Executing Merge...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm & Complete Merge</span>
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
              View Only Mode (Administrator privileges required to execute actions)
            </span>
          )}
        </div>
      </motion.div>
    </div>
  );
}
