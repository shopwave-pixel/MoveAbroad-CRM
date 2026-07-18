import React from 'react';

// Shimmer Background Class Helper
const bgShimmer = "bg-slate-200 dark:bg-zinc-800 animate-pulse rounded-xl";
const bgShimmerSubtle = "bg-slate-100 dark:bg-zinc-800/50 animate-pulse rounded-lg";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6" id="dashboard-skeleton">
      {/* 4 KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-5 bg-white dark:bg-[#1a1a15] rounded-2xl border border-gray-100 dark:border-[#8a8a70]/10 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-3 w-16 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
              <div className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-zinc-800/60 animate-pulse" />
            </div>
            <div className="h-7 w-12 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
            <div className="h-2 w-20 bg-slate-100 dark:bg-zinc-800/50 rounded animate-pulse" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions Shimmer */}
          <div className="p-5 bg-white dark:bg-[#1a1a15] rounded-2xl border border-gray-100 dark:border-[#8a8a70]/10 shadow-xs space-y-4">
            <div className="h-4 w-32 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="h-10 bg-slate-100 dark:bg-zinc-800/60 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>

          {/* Quick Search Shimmer */}
          <div className="h-14 bg-white dark:bg-[#1a1a15] rounded-2xl border border-gray-100 dark:border-[#8a8a70]/10 shadow-xs animate-pulse" />

          {/* Report Shimmer */}
          <div className="p-5 bg-white dark:bg-[#1a1a15] rounded-2xl border border-gray-100 dark:border-[#8a8a70]/10 shadow-xs space-y-4">
            <div className="flex justify-between items-center">
              <div className="h-4 w-40 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
              <div className="h-8 w-24 bg-slate-100 dark:bg-zinc-800/60 rounded-lg animate-pulse" />
            </div>
            <div className="space-y-3 pt-2">
              {[1, 2, 3].map((k) => (
                <div key={k} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-zinc-900/40">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800/60 animate-pulse" />
                    <div className="h-3 w-32 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
                  </div>
                  <div className="h-4 w-12 bg-slate-100 dark:bg-zinc-800/50 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Section */}
        <div className="space-y-6">
          {/* Calendar Shimmer */}
          <div className="p-5 bg-white dark:bg-[#1a1a15] rounded-2xl border border-gray-100 dark:border-[#8a8a70]/10 shadow-xs space-y-4">
            <div className="h-4 w-36 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
            <div className="space-y-3">
              {[1, 2, 3].map((m) => (
                <div key={m} className="p-3 bg-slate-50 dark:bg-zinc-900/40 rounded-xl space-y-2 animate-pulse">
                  <div className="flex justify-between">
                    <div className="h-3 w-20 bg-slate-200 dark:bg-zinc-800 rounded" />
                    <div className="h-3.5 w-10 bg-slate-200 dark:bg-zinc-800 rounded" />
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 dark:bg-zinc-800/50 rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* Activity Shimmer */}
          <div className="p-5 bg-white dark:bg-[#1a1a15] rounded-2xl border border-gray-100 dark:border-[#8a8a70]/10 shadow-xs space-y-4">
            <div className="h-4 w-28 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
            <div className="space-y-4">
              {[1, 2].map((n) => (
                <div key={n} className="flex gap-3">
                  <div className="w-1.5 h-12 bg-slate-200 dark:bg-zinc-800 rounded-full animate-pulse" />
                  <div className="space-y-2 flex-1">
                    <div className="h-3 w-1/3 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
                    <div className="h-2.5 w-full bg-slate-100 dark:bg-zinc-800/50 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CustomerCardSkeleton() {
  return (
    <div className="p-5 bg-white dark:bg-[#1a1a15] rounded-2xl border border-gray-100 dark:border-[#8a8a70]/10 shadow-xs space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-zinc-800" />
          <div className="space-y-2">
            <div className="h-4 w-28 bg-slate-200 dark:bg-zinc-800 rounded-md" />
            <div className="h-3 w-20 bg-slate-100 dark:bg-zinc-800/60 rounded-md" />
          </div>
        </div>
        <div className="h-6 w-16 bg-slate-200 dark:bg-zinc-800 rounded-full" />
      </div>
      <div className="space-y-2.5 pt-2">
        <div className="h-3.5 w-full bg-slate-100 dark:bg-zinc-800/60 rounded-md" />
        <div className="h-3.5 w-5/6 bg-slate-100 dark:bg-zinc-800/60 rounded-md" />
      </div>
      <div className="flex justify-between items-center pt-3 border-t border-slate-50 dark:border-zinc-900/40">
        <div className="h-3 w-24 bg-slate-200 dark:bg-zinc-800 rounded-md" />
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800/60" />
          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800/60" />
        </div>
      </div>
    </div>
  );
}

export function CustomerDirectorySkeleton() {
  return (
    <div className="space-y-6" id="customer-directory-skeleton">
      {/* Search and Filters Shimmer */}
      <div className="p-4 bg-white dark:bg-[#1a1a15] rounded-2xl border border-gray-100 dark:border-[#8a8a70]/10 shadow-xs space-y-3">
        <div className="h-10 bg-slate-100 dark:bg-zinc-800/60 rounded-xl animate-pulse" />
        <div className="flex flex-wrap gap-2 pt-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-7 w-20 bg-slate-100 dark:bg-zinc-800/40 rounded-full animate-pulse" />
          ))}
        </div>
      </div>
      {/* Cards Grid Shimmer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <CustomerCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function CustomerProfileSkeleton() {
  return (
    <div className="space-y-6" id="customer-profile-skeleton">
      {/* Profile Header Card */}
      <div className="p-6 bg-white dark:bg-[#1a1a15] rounded-2xl border border-gray-100 dark:border-[#8a8a70]/10 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-200 dark:bg-zinc-800" />
          <div className="space-y-2">
            <div className="h-5 w-44 bg-slate-200 dark:bg-zinc-800 rounded-md" />
            <div className="h-3 w-28 bg-slate-100 dark:bg-zinc-800/60 rounded-md" />
          </div>
        </div>
        <div className="h-9 w-28 bg-slate-200 dark:bg-zinc-800 rounded-xl" />
      </div>

      {/* Two Columns Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left main details */}
        <div className="lg:col-span-2 p-6 bg-white dark:bg-[#1a1a15] rounded-2xl border border-gray-100 dark:border-[#8a8a70]/10 shadow-xs space-y-5 animate-pulse">
          <div className="h-4.5 w-36 bg-slate-200 dark:bg-zinc-800 rounded" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-2.5 w-16 bg-slate-100 dark:bg-zinc-800/40 rounded" />
                <div className="h-4.5 w-32 bg-slate-200 dark:bg-zinc-800 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Right side contact & timeline */}
        <div className="p-6 bg-white dark:bg-[#1a1a15] rounded-2xl border border-gray-100 dark:border-[#8a8a70]/10 shadow-xs space-y-4 animate-pulse">
          <div className="h-4.5 w-24 bg-slate-200 dark:bg-zinc-800 rounded" />
          <div className="space-y-3 pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800/60" />
                <div className="space-y-2 flex-1">
                  <div className="h-3 w-1/2 bg-slate-200 dark:bg-zinc-800 rounded" />
                  <div className="h-2.5 w-2/3 bg-slate-100 dark:bg-zinc-800/40 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TicketSkeleton() {
  return (
    <div className="p-5 bg-white dark:bg-[#1a1a15] rounded-2xl border border-gray-100 dark:border-[#8a8a70]/10 shadow-xs space-y-4 animate-pulse" id="ticket-skeleton">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-zinc-800" />
          <div className="h-4.5 w-24 bg-slate-200 dark:bg-zinc-800 rounded" />
        </div>
        <div className="h-5 w-16 bg-slate-100 dark:bg-zinc-800/60 rounded" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full bg-slate-100 dark:bg-zinc-800/50 rounded" />
        <div className="h-3 w-5/6 bg-slate-100 dark:bg-zinc-800/50 rounded" />
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-slate-50 dark:border-zinc-900/40 text-xs">
        <div className="h-3 w-28 bg-slate-200 dark:bg-zinc-800 rounded" />
        <div className="h-3.5 w-20 bg-slate-100 dark:bg-zinc-800/60 rounded" />
      </div>
    </div>
  );
}

export function TicketsManagerSkeleton() {
  return (
    <div className="space-y-6" id="tickets-manager-skeleton">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="space-y-2">
          <div className="h-5 w-40 bg-slate-200 dark:bg-zinc-800 rounded" />
          <div className="h-3.5 w-56 bg-slate-100 dark:bg-zinc-800/50 rounded" />
        </div>
        <div className="h-10 w-32 bg-slate-200 dark:bg-zinc-800 rounded-full" />
      </div>
      <div className="h-14 bg-white dark:bg-[#1a1a15] rounded-2xl border border-gray-100 dark:border-[#8a8a70]/10 shadow-xs animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <TicketSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function FollowUpSkeleton() {
  return (
    <div className="p-4 bg-white dark:bg-[#1a1a15] rounded-2xl border border-gray-100 dark:border-[#8a8a70]/10 shadow-xs flex items-center justify-between gap-4 animate-pulse" id="follow-up-skeleton">
      <div className="flex items-start gap-3 flex-1">
        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-800 mt-0.5 shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-3.5 w-1/3 bg-slate-200 dark:bg-zinc-800 rounded" />
          <div className="h-2.5 w-2/3 bg-slate-100 dark:bg-zinc-800/50 rounded" />
          <div className="h-2 w-1/4 bg-slate-100 dark:bg-zinc-800/40 rounded" />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800/60" />
        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800/60" />
      </div>
    </div>
  );
}

export function FollowUpsSkeleton() {
  return (
    <div className="space-y-6" id="follow-ups-skeleton">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="space-y-2">
          <div className="h-5 w-44 bg-slate-200 dark:bg-zinc-800 rounded" />
          <div className="h-3.5 w-60 bg-slate-100 dark:bg-zinc-800/50 rounded" />
        </div>
        <div className="h-10 w-36 bg-slate-200 dark:bg-zinc-800 rounded-full" />
      </div>
      <div className="h-12 bg-white dark:bg-[#1a1a15] rounded-2xl border border-gray-100 dark:border-[#8a8a70]/10 shadow-xs animate-pulse" />
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <FollowUpSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="space-y-6" id="settings-skeleton">
      <div className="space-y-2">
        <div className="h-5 w-32 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
        <div className="h-3.5 w-48 bg-slate-100 dark:bg-zinc-800/50 rounded animate-pulse" />
      </div>

      <div className="p-6 bg-white dark:bg-[#1a1a15] rounded-2xl border border-gray-100 dark:border-[#8a8a70]/10 shadow-xs space-y-6 animate-pulse">
        <div className="h-4.5 w-40 bg-slate-200 dark:bg-zinc-800 rounded" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-28 bg-slate-100 dark:bg-zinc-800/40 rounded" />
              <div className="h-10 w-full bg-slate-100 dark:bg-zinc-800/50 rounded-xl" />
            </div>
          ))}
        </div>
        <div className="h-10 w-32 bg-slate-200 dark:bg-zinc-800 rounded-full" />
      </div>
    </div>
  );
}
