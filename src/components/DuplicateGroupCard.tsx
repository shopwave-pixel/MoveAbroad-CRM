import React from 'react';
import { Customer } from '../types';
import { DuplicateGroup } from '../utils/duplicateGroupEngine';
import { 
  GitMerge, 
  Archive, 
  Eye, 
  Users, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Sparkles, 
  Calendar,
  Phone,
  Mail,
  User,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

interface DuplicateGroupCardProps {
  key?: string;
  group: DuplicateGroup;
  isAdmin: boolean;
  onReview: (group: DuplicateGroup) => void;
  onIgnore: (group: DuplicateGroup) => void;
  onKeepBoth: (group: DuplicateGroup) => void;
  onViewCustomer: (customer: Customer) => void;
}

export default function DuplicateGroupCard({
  group,
  isAdmin,
  onReview,
  onIgnore,
  onKeepBoth,
  onViewCustomer
}: DuplicateGroupCardProps) {
  const isConfirmed = group.confidenceScore >= 95;

  const confidenceBadgeStyle = group.confidenceScore >= 95
    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800/60'
    : group.confidenceScore >= 80
    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800/60'
    : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800/60';

  const statusBadgeStyle = {
    Pending: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800/50',
    Merged: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/50',
    Archived: 'bg-purple-500/10 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800/50',
    Ignored: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700/50',
    Resolved: 'bg-blue-500/10 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800/50'
  }[group.status];

  return (
    <div 
      className="bg-white dark:bg-[#1a1a15] rounded-2xl border border-gray-200 dark:border-[#8a8a70]/20 p-5 shadow-xs hover:shadow-md transition-all space-y-4"
      id={`dup-group-card-${group.id}`}
    >
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-[#8a8a70]/15">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#20201a] px-2.5 py-1 rounded-lg border border-gray-200 dark:border-[#8a8a70]/30">
            {group.id}
          </span>
          
          <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${confidenceBadgeStyle}`}>
            {group.confidenceScore}% {isConfirmed ? 'CONFIRMED' : 'POSSIBLE'}
          </span>

          <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${statusBadgeStyle}`}>
            STATUS: {group.status === 'Resolved' ? 'KEEP BOTH' : group.status}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
          <Calendar className="w-3.5 h-3.5" />
          <span>Detected {new Date(group.detectedDate).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Group Detail Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Match Type:</span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">{group.matchType}</span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-300 font-medium mt-0.5">
            Matched Value: <span className="font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200/60 dark:border-amber-800/40">{group.matchedValue}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-[#20201a] px-3 py-1.5 rounded-xl border border-gray-200 dark:border-[#8a8a70]/30 shrink-0">
          <Users className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span>{group.customers.length} Potential Customers</span>
        </div>
      </div>

      {/* Customer Preview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {group.customers.slice(0, 2).map((cust, idx) => (
          <div 
            key={cust.id}
            onClick={() => onViewCustomer(cust)}
            className="p-3 bg-gray-50/80 dark:bg-[#20201a]/80 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 border border-gray-200 dark:border-[#8a8a70]/30 rounded-xl transition-all cursor-pointer group flex items-start gap-3"
          >
            <div className="w-9 h-9 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold text-sm flex items-center justify-center shrink-0 border border-amber-500/20">
              {cust.name.substring(0, 1).toUpperCase()}
            </div>
            
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-gray-900 dark:text-white truncate group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                  {cust.name}
                </span>
                <span className="text-[9px] font-mono text-gray-400 shrink-0">{cust.id}</span>
              </div>
              
              <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                <span className="font-mono truncate">{cust.mobileNumber}</span>
              </div>

              {cust.customerCategory && (
                <span className="inline-block text-[9px] font-bold bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 px-1.5 py-0.5 rounded uppercase">
                  {cust.customerCategory}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Action Footer Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-100 dark:border-[#8a8a70]/15">
        <button
          onClick={() => onReview(group)}
          id={`btn-review-group-${group.id}`}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
        >
          <GitMerge className="w-3.5 h-3.5" />
          <span>REVIEW & RESOLVE</span>
        </button>

        {isAdmin && group.status === 'Pending' && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onKeepBoth(group)}
              id={`btn-keep-both-${group.id}`}
              className="px-3 py-1.5 text-xs font-bold bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-200 rounded-lg transition-colors cursor-pointer"
              title="Keep Both Customers Active"
            >
              Keep Both
            </button>

            <button
              onClick={() => onIgnore(group)}
              id={`btn-ignore-${group.id}`}
              className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              title="Ignore Duplicate Group"
            >
              Ignore
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
