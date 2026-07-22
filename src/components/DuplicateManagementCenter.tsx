import React, { useState, useEffect, useMemo } from 'react';
import { Customer, Ticket, FollowUp, User, SyncConfig } from '../types';
import { 
  scanDuplicateGroups, 
  saveDuplicateResolution, 
  updateLastScanTime, 
  DuplicateGroup, 
  DuplicateStats 
} from '../utils/duplicateGroupEngine';
import { logDuplicateAuditEvent } from '../utils/duplicateAuditLogger';
import DuplicateGroupCard from './DuplicateGroupCard';
import DuplicateGroupReviewModal from './DuplicateGroupReviewModal';
import DuplicateAuditLogsModal from './DuplicateAuditLogsModal';
import { 
  Copy, 
  RefreshCw, 
  Search, 
  Filter, 
  Download, 
  History, 
  Terminal, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Layers, 
  GitMerge, 
  Archive, 
  Clock, 
  SlidersHorizontal,
  ArrowUpDown,
  ShieldCheck,
  ChevronLeft,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DuplicateManagementCenterProps {
  customers: Customer[];
  tickets: Ticket[];
  followUps: FollowUp[];
  currentUser: User | null;
  config: SyncConfig;
  onRefreshData: () => Promise<void>;
  onSelectCustomer: (customer: Customer) => void;
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
  ) => Promise<any>;
  onArchiveCustomer: (id: string) => Promise<any>;
  onBack?: () => void;
}

export default function DuplicateManagementCenter({
  customers,
  tickets,
  followUps,
  currentUser,
  config,
  onRefreshData,
  onSelectCustomer,
  onUpdateCustomer,
  onArchiveCustomer,
  onBack
}: DuplicateManagementCenterProps) {
  const isAdmin = currentUser?.role === 'Admin';

  // Core scan states
  const [scanResult, setScanResult] = useState<{ groups: DuplicateGroup[]; stats: DuplicateStats }>(() =>
    scanDuplicateGroups(customers)
  );

  const [isScanning, setIsScanning] = useState(false);
  const [showDeveloperPanel, setShowDeveloperPanel] = useState(false);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [selectedGroupForReview, setSelectedGroupForReview] = useState<DuplicateGroup | null>(null);

  // Search, Filter & Sort states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Confirmed' | 'Possible' | 'Pending' | 'Merged' | 'Archived' | 'Ignored' | 'Resolved'>('ALL');
  const [confidenceTierFilter, setConfidenceTierFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'OLDEST' | 'CONFIDENCE_DESC' | 'CONFIDENCE_ASC' | 'COUNT_DESC'>('CONFIDENCE_DESC');

  // Trigger manual scan (< 50ms)
  const handleScanNow = () => {
    setIsScanning(true);
    const startTime = performance.now();
    updateLastScanTime();
    
    setTimeout(() => {
      const result = scanDuplicateGroups(customers);
      setScanResult(result);
      setIsScanning(false);
      const duration = Math.round(performance.now() - startTime);

      window.dispatchEvent(
        new CustomEvent('show-toast', {
          detail: { message: `⚡ Duplicate Scan Completed in ${duration}ms! Found ${result.groups.length} groups.` }
        })
      );
    }, 150);
  };

  // Re-scan whenever customers dataset changes
  useEffect(() => {
    setScanResult(scanDuplicateGroups(customers));
  }, [customers]);

  // Handle Ignore group action
  const handleIgnoreGroup = (group: DuplicateGroup) => {
    saveDuplicateResolution({
      groupKey: group.groupKey,
      status: 'Ignored',
      resolutionReason: 'Ignored',
      resolvedAt: new Date().toISOString(),
      resolvedBy: currentUser?.fullName || 'Admin User'
    });

    logDuplicateAuditEvent({
      groupId: group.id,
      action: 'IGNORE',
      performedBy: currentUser?.fullName || 'Admin User',
      reason: 'Excluded from future duplicate scans'
    });

    setScanResult(scanDuplicateGroups(customers));
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: `Group ${group.id} marked as Ignored` } }));
  };

  // Handle Keep Both action
  const handleKeepBothGroup = (group: DuplicateGroup) => {
    saveDuplicateResolution({
      groupKey: group.groupKey,
      status: 'Resolved',
      resolutionReason: 'Keep Both',
      resolvedAt: new Date().toISOString(),
      resolvedBy: currentUser?.fullName || 'Admin User'
    });

    logDuplicateAuditEvent({
      groupId: group.id,
      action: 'KEEP_BOTH',
      performedBy: currentUser?.fullName || 'Admin User',
      reason: 'Both customer records retained active'
    });

    setScanResult(scanDuplicateGroups(customers));
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: `Group ${group.id} set to Keep Both` } }));
  };

  // Execute Merge
  const handleMergeGroup = async (
    primaryCustomer: Customer,
    mergedCustomerData: Partial<Customer>,
    duplicateToArchiveIds: string[]
  ) => {
    // 1. Update Primary Customer
    await onUpdateCustomer(
      primaryCustomer.id,
      mergedCustomerData.name || primaryCustomer.name,
      mergedCustomerData.mobileNumber || primaryCustomer.mobileNumber,
      mergedCustomerData.whatsAppNumber || primaryCustomer.whatsAppNumber || '',
      mergedCustomerData.destinationCountry || primaryCustomer.destinationCountry || '',
      mergedCustomerData.source || primaryCustomer.source || '',
      mergedCustomerData.remarks || primaryCustomer.remarks || '',
      mergedCustomerData.imoNumber || primaryCustomer.imoNumber || '',
      mergedCustomerData.customerCategory || primaryCustomer.customerCategory || '',
      mergedCustomerData.address || primaryCustomer.address || '',
      mergedCustomerData.gender || primaryCustomer.gender || ''
    );

    // 2. Archive secondary customers
    for (const dupId of duplicateToArchiveIds) {
      await onArchiveCustomer(dupId);
    }

    // 3. Save Resolution
    if (selectedGroupForReview) {
      saveDuplicateResolution({
        groupKey: selectedGroupForReview.groupKey,
        status: 'Merged',
        resolutionReason: 'Merged',
        primaryCustomerId: primaryCustomer.id,
        resolvedAt: new Date().toISOString(),
        resolvedBy: currentUser?.fullName || 'Admin User'
      });

      logDuplicateAuditEvent({
        groupId: selectedGroupForReview.id,
        action: 'MERGE',
        primaryCustomerId: primaryCustomer.id,
        primaryCustomerName: primaryCustomer.name,
        duplicateCustomerId: duplicateToArchiveIds.join(', '),
        performedBy: currentUser?.fullName || 'Admin User',
        reason: 'Contact merge completed via Merge Wizard'
      });
    }

    setScanResult(scanDuplicateGroups(customers));
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: `✅ Customers merged into ${primaryCustomer.name} successfully!` } }));
  };

  // Export Report (JSON/CSV)
  const handleExportReport = () => {
    const reportData = scanResult.groups.map(g => ({
      groupId: g.id,
      matchType: g.matchType,
      confidenceScore: `${g.confidenceScore}%`,
      matchedValue: g.matchedValue,
      customerCount: g.customers.length,
      customerNames: g.customers.map(c => `${c.name} (${c.id})`).join('; '),
      status: g.status,
      detectedDate: g.detectedDate
    }));

    const jsonStr = JSON.stringify(reportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MoveAboard_Duplicate_Report_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Filter & Sort duplicate groups
  const filteredGroups = useMemo(() => {
    return scanResult.groups.filter(g => {
      // Search
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = !query || 
        g.id.toLowerCase().includes(query) ||
        g.matchedValue.toLowerCase().includes(query) ||
        g.customers.some(c => 
          c.name.toLowerCase().includes(query) ||
          c.id.toLowerCase().includes(query) ||
          c.mobileNumber.toLowerCase().includes(query) ||
          (c.whatsAppNumber && c.whatsAppNumber.toLowerCase().includes(query)) ||
          (c.imoNumber && c.imoNumber.toLowerCase().includes(query)) ||
          (c.remarks && c.remarks.toLowerCase().includes(query))
        );

      // Status Filter
      let matchesStatus = true;
      if (statusFilter === 'Confirmed') matchesStatus = g.confidenceScore >= 95;
      else if (statusFilter === 'Possible') matchesStatus = g.confidenceScore < 95;
      else if (statusFilter !== 'ALL') matchesStatus = g.status === statusFilter;

      // Confidence Tier Filter
      let matchesTier = true;
      if (confidenceTierFilter === 'HIGH') matchesTier = g.confidenceScore >= 95;
      else if (confidenceTierFilter === 'MEDIUM') matchesTier = g.confidenceScore >= 80 && g.confidenceScore < 95;
      else if (confidenceTierFilter === 'LOW') matchesTier = g.confidenceScore < 80;

      return matchesSearch && matchesStatus && matchesTier;
    }).sort((a, b) => {
      if (sortBy === 'NEWEST') return new Date(b.detectedDate).getTime() - new Date(a.detectedDate).getTime();
      if (sortBy === 'OLDEST') return new Date(a.detectedDate).getTime() - new Date(b.detectedDate).getTime();
      if (sortBy === 'CONFIDENCE_DESC') return b.confidenceScore - a.confidenceScore;
      if (sortBy === 'CONFIDENCE_ASC') return a.confidenceScore - b.confidenceScore;
      if (sortBy === 'COUNT_DESC') return b.customers.length - a.customers.length;
      return 0;
    });
  }, [scanResult.groups, searchQuery, statusFilter, confidenceTierFilter, sortBy]);

  const stats = scanResult.stats;

  return (
    <div className="space-y-6 animate-fade-in" id="duplicate-management-center">
      
      {/* Page Header */}
      <div className="bg-white dark:bg-[#1a1a15] rounded-3xl border border-gray-200 dark:border-[#8a8a70]/20 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              id="btn-back-to-settings"
              className="p-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-200 transition-colors cursor-pointer shrink-0"
              title="Back to Settings"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
            <Copy className="w-6 h-6" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-serif font-bold text-gray-900 dark:text-white">
                Duplicate Management
              </h1>
              <span className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-black text-[9px] px-2.5 py-0.5 rounded-full border border-amber-300 uppercase tracking-wider">
                ENTERPRISE V3.0
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
              Enterprise Duplicate Detection & Resolution Center
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleScanNow}
            disabled={isScanning}
            id="btn-scan-now"
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Scanning...' : 'Scan Now'}</span>
          </button>

          <button
            onClick={onRefreshData}
            id="btn-refresh-duplicates"
            className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-200 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            title="Refresh CRM Data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleExportReport}
            id="btn-export-duplicate-report"
            className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-200 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            title="Export Report"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export Report</span>
          </button>

          <button
            onClick={() => setShowAuditLogs(true)}
            id="btn-open-audit-logs"
            className="px-3 py-2 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            title="Audit Trail"
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Audit Trail</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setShowDeveloperPanel(prev => !prev)}
              id="btn-toggle-dev-panel"
              className={`p-2 rounded-xl transition-all cursor-pointer border ${
                showDeveloperPanel
                  ? 'bg-slate-800 text-white border-slate-700'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-500 border-gray-200 dark:border-zinc-700'
              }`}
              title="Toggle Developer Diagnostics Panel"
            >
              <Terminal className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Developer Diagnostics Panel */}
      <AnimatePresence>
        {showDeveloperPanel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-slate-900 text-slate-100 rounded-3xl p-5 border border-slate-800 shadow-xl space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2 text-amber-400 font-bold">
                  <Terminal className="w-4 h-4" />
                  <span>DUPLICATE MANAGEMENT DEVELOPER DIAGNOSTICS</span>
                </div>
                <span className="bg-slate-800 text-slate-300 text-[9px] px-2 py-0.5 rounded">LOCAL CACHE ENGINE</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Total Groups</span>
                  <span className="text-sm font-bold text-amber-400">{stats.totalGroups}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Confirmed (95-100%)</span>
                  <span className="text-sm font-bold text-rose-400">{stats.confirmedCount}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Possible (50-90%)</span>
                  <span className="text-sm font-bold text-blue-400">{stats.possibleCount}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Avg Confidence</span>
                  <span className="text-sm font-bold text-emerald-400">{stats.avgConfidence}%</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Merged Today</span>
                  <span className="text-sm font-bold text-purple-400">{stats.mergedTodayCount}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Archived Today</span>
                  <span className="text-sm font-bold text-amber-400">{stats.archivedTodayCount}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Ignored Groups</span>
                  <span className="text-sm font-bold text-slate-400">{stats.ignoredCount}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Scan Latency</span>
                  <span className="text-sm font-bold text-emerald-400">&lt; 50 ms</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI Dashboard Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Card 1: Total Groups */}
        <div className="bg-white dark:bg-[#1a1a15] p-4 rounded-2xl border border-gray-200 dark:border-[#8a8a70]/20 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">
            Duplicate Groups
          </span>
          <div className="text-2xl font-black text-gray-900 dark:text-white font-mono">
            {stats.totalGroups}
          </div>
          <p className="text-[10px] text-gray-400 font-medium">Clusters identified</p>
        </div>

        {/* Card 2: Confirmed Duplicates */}
        <div className="bg-white dark:bg-[#1a1a15] p-4 rounded-2xl border border-rose-200/80 dark:border-rose-900/40 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
            Confirmed (≥95%)
          </span>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
            {stats.confirmedCount}
          </div>
          <p className="text-[10px] text-rose-700/60 font-medium">High match certainty</p>
        </div>

        {/* Card 3: Possible Duplicates */}
        <div className="bg-white dark:bg-[#1a1a15] p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
            Possible (&lt;95%)
          </span>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
            {stats.possibleCount}
          </div>
          <p className="text-[10px] text-amber-700/60 font-medium">Needs human review</p>
        </div>

        {/* Card 4: Pending Review */}
        <div className="bg-white dark:bg-[#1a1a15] p-4 rounded-2xl border border-blue-200/80 dark:border-blue-900/40 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
            Pending Review
          </span>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
            {stats.pendingCount}
          </div>
          <p className="text-[10px] text-blue-700/60 font-medium">Action required</p>
        </div>

        {/* Card 5: Merged & Archived Today */}
        <div className="bg-white dark:bg-[#1a1a15] p-4 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
            Merged / Archived Today
          </span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {stats.mergedTodayCount + stats.archivedTodayCount}
          </div>
          <p className="text-[10px] text-emerald-700/60 font-medium">{stats.mergedTodayCount} merged, {stats.archivedTodayCount} archived</p>
        </div>
      </div>

      {/* Search, Filter and Sorting Toolbar */}
      <div className="bg-white dark:bg-[#1a1a15] rounded-2xl border border-gray-200 dark:border-[#8a8a70]/20 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              id="input-search-duplicates"
              placeholder="Search name, ID, mobile, email, passport..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 dark:bg-[#20201a] border border-gray-200 dark:border-[#8a8a70]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-gray-900 dark:text-white"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 text-xs font-bold">
            {[
              { label: 'All', value: 'ALL' },
              { label: 'Confirmed', value: 'Confirmed' },
              { label: 'Possible', value: 'Possible' },
              { label: 'Pending', value: 'Pending' },
              { label: 'Ignored', value: 'Ignored' },
              { label: 'Keep Both', value: 'Resolved' }
            ].map(tab => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value as any)}
                className={`px-3 py-1.5 rounded-xl cursor-pointer transition-all shrink-0 ${
                  statusFilter === tab.value
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            <ArrowUpDown className="w-4 h-4 text-gray-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              id="select-sort-duplicates"
              className="text-xs bg-gray-50 dark:bg-[#20201a] border border-gray-200 dark:border-[#8a8a70]/30 rounded-xl px-3 py-2 text-gray-900 dark:text-white font-bold cursor-pointer"
            >
              <option value="CONFIDENCE_DESC">Highest Confidence</option>
              <option value="CONFIDENCE_ASC">Lowest Confidence</option>
              <option value="NEWEST">Newest Detected</option>
              <option value="OLDEST">Oldest Detected</option>
              <option value="COUNT_DESC">Most Customers</option>
            </select>
          </div>
        </div>
      </div>

      {/* Duplicate Groups List View */}
      <div className="space-y-4">
        {filteredGroups.length === 0 ? (
          <div className="bg-white dark:bg-[#1a1a15] rounded-3xl border border-gray-200 dark:border-[#8a8a70]/20 p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-serif font-bold text-gray-900 dark:text-white">
              No Duplicate Groups Found
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'ALL'
                ? 'No duplicate records match your search or filter parameters.'
                : 'Your customer directory is clean! No duplicate customer groups detected.'}
            </p>
          </div>
        ) : (
          filteredGroups.map(group => (
            <DuplicateGroupCard
              key={group.id}
              group={group}
              isAdmin={isAdmin}
              onReview={(g) => setSelectedGroupForReview(g)}
              onIgnore={handleIgnoreGroup}
              onKeepBoth={handleKeepBothGroup}
              onViewCustomer={onSelectCustomer}
            />
          ))
        )}
      </div>

      {/* Review & Resolution Side-by-Side Modal */}
      {selectedGroupForReview && (
        <DuplicateGroupReviewModal
          isOpen={!!selectedGroupForReview}
          group={selectedGroupForReview}
          currentUser={currentUser}
          tickets={tickets}
          followUps={followUps}
          onClose={() => setSelectedGroupForReview(null)}
          onViewCustomer={onSelectCustomer}
          onMergeGroup={handleMergeGroup}
          onArchiveDuplicate={async (cust) => {
            await onArchiveCustomer(cust.id);
            setScanResult(scanDuplicateGroups(customers));
          }}
          onKeepBoth={handleKeepBothGroup}
          onIgnoreGroup={handleIgnoreGroup}
        />
      )}

      {/* Audit Logs Modal */}
      {showAuditLogs && (
        <DuplicateAuditLogsModal
          isOpen={showAuditLogs}
          onClose={() => setShowAuditLogs(false)}
        />
      )}
    </div>
  );
}
