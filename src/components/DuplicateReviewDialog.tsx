import React from 'react';
import { Customer, User } from '../types';
import { DuplicateMatchResult } from '../utils/duplicateDetector';
import { 
  AlertTriangle, 
  User as UserIcon, 
  GitMerge, 
  Archive, 
  Users, 
  PlusCircle, 
  X, 
  Calendar, 
  Phone, 
  MessageSquare, 
  Tag, 
  ShieldAlert 
} from 'lucide-react';
import { motion } from 'motion/react';

interface DuplicateReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  matchResult: DuplicateMatchResult;
  proposedCustomerData: {
    name: string;
    mobileNumber: string;
    whatsAppNumber?: string;
    imoNumber?: string;
    customerCategory?: string;
    address?: string;
    gender?: string;
    remarks?: string;
  };
  currentUser: User | null;
  onOpenExisting: (customer: Customer) => void;
  onMerge: (existingCustomer: Customer) => void;
  onArchiveExisting: (existingCustomer: Customer) => void;
  onKeepBoth: () => void;
  onCreateAnyway: () => void;
}

export default function DuplicateReviewDialog({
  isOpen,
  onClose,
  matchResult,
  currentUser,
  onOpenExisting,
  onMerge,
  onArchiveExisting,
  onKeepBoth,
  onCreateAnyway
}: DuplicateReviewDialogProps) {
  if (!isOpen || !matchResult.isDuplicate || !matchResult.existingCustomer) return null;

  const existing = matchResult.existingCustomer;
  const isAdmin = !currentUser || currentUser.role === 'Admin';

  const confidenceColor = matchResult.confidenceScore >= 95
    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300'
    : matchResult.confidenceScore >= 85
    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300'
    : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300';

  const formattedCreatedDate = existing.createdAt
    ? new Date(existing.createdAt).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    : 'N/A';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in" id="duplicate-review-dialog-overlay">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2 }}
        id="duplicate-review-dialog"
        className="relative w-full max-w-2xl bg-white dark:bg-[#1a1a15] rounded-3xl border border-amber-200 dark:border-amber-800/50 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b border-amber-200/80 dark:border-amber-800/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-[#1F2937] dark:text-[#ecece5]">
                Possible Duplicate Customer Found
              </h2>
              <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                An existing customer with matching contact info was detected in the database.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            id="btn-close-duplicate-dialog"
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs text-[#1F2937] dark:text-[#ecece5]">
          
          {/* Match Banner with Confidence Score */}
          <div className="flex items-center justify-between p-3.5 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-900/40">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                Matched By: <span className="font-extrabold">{matchResult.matchedByLabel}</span>
              </span>
              <p className="text-[11px] text-amber-800 dark:text-amber-400 font-medium">
                Matched Value: <span className="font-mono font-bold">{matchResult.matchedValue}</span>
              </p>
            </div>
            <div className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border ${confidenceColor} flex items-center gap-1.5`}>
              <span>{matchResult.confidenceScore}% MATCH</span>
            </div>
          </div>

          {/* Customer Record Card */}
          <div className="bg-[#F8FAFC] dark:bg-[#151510] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-[#8a8a70]/20 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#8a8a70]/15">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-[11px] rounded-lg">
                  {existing.id}
                </span>
                <h3 className="text-sm font-bold uppercase text-[#1F2937] dark:text-[#ecece5]">
                  {existing.name}
                </h3>
              </div>
              {existing.customerCategory && (
                <span className="px-2.5 py-1 bg-primary-olive/10 text-primary-olive dark:bg-amber-400/20 dark:text-amber-300 font-bold text-[10px] rounded-lg uppercase flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {existing.customerCategory}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-medium text-slate-400">Mobile:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{existing.mobileNumber}</span>
              </div>

              {existing.whatsAppNumber && (
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="font-medium text-slate-400">WhatsApp:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{existing.whatsAppNumber}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-medium text-slate-400">Created Date:</span>
                <span className="font-semibold">{formattedCreatedDate}</span>
              </div>

              {existing.gender && (
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <span className="font-medium text-slate-400">Gender:</span>
                  <span className="font-semibold uppercase">{existing.gender}</span>
                </div>
              )}
            </div>

            {existing.remarks && (
              <div className="pt-2.5 border-t border-slate-200/60 dark:border-[#8a8a70]/10 text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                <span className="font-bold text-slate-600 dark:text-slate-300">Notes: </span>
                {existing.remarks}
              </div>
            )}
          </div>

          {!isAdmin && (
            <div className="p-3 bg-slate-100 dark:bg-zinc-800/60 rounded-xl text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-2 border border-slate-200 dark:border-zinc-700">
              <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Admin privileges required for Merge and Archive operations. Staff can view existing or request admin approval.</span>
            </div>
          )}
        </div>

        {/* Action Buttons Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-[#151510] border-t border-slate-200 dark:border-[#8a8a70]/20 flex flex-wrap items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            id="btn-dialog-cancel"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-[#8a8a70]/30 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            id="btn-dialog-open-existing"
            onClick={() => onOpenExisting(existing)}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Open Existing</span>
          </button>

          {isAdmin && (
            <>
              <button
                type="button"
                id="btn-dialog-merge"
                onClick={() => onMerge(existing)}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <GitMerge className="w-3.5 h-3.5" />
                <span>Merge Customers</span>
              </button>

              <button
                type="button"
                id="btn-dialog-archive"
                onClick={() => onArchiveExisting(existing)}
                className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Archive Existing</span>
              </button>

              <button
                type="button"
                id="btn-dialog-keep-both"
                onClick={onKeepBoth}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Keep Both</span>
              </button>
            </>
          )}

          <button
            type="button"
            id="btn-dialog-create-anyway"
            onClick={onCreateAnyway}
            className="px-4 py-2.5 rounded-xl bg-accent-green hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create Anyway</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
