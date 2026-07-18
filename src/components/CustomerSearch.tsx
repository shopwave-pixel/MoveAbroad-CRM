import React, { useState, useMemo, useEffect } from 'react';
import { Customer, Ticket, FollowUp } from '../types';
import { ChevronRight, UserPlus, Phone, MessageSquare } from 'lucide-react';
import SmartContactActions from './SmartContactActions';
import InlineCopy from './InlineCopy';
import CustomerFilterBar from './CustomerFilterBar';
import SwipeableCustomerCard from './SwipeableCustomerCard';
import { 
  Card, 
  Badge, 
  Button 
} from './ui';

interface CustomerSearchProps {
  customers: Customer[];
  tickets: Ticket[];
  followUps: FollowUp[];
  onSelectCustomer: (customer: Customer) => void;
  onNavigateToAddCustomer: () => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (category: string) => void;
  genderFilter: string;
  onGenderFilterChange: (gender: string) => void;
  onAddTicket: (customerId: string) => void;
  isLoading?: boolean;
  newlyUpdatedIds?: Set<string>;
}

const SkeletonCard = () => (
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

export default React.memo(function CustomerSearch({
  customers,
  tickets,
  followUps,
  onSelectCustomer,
  onNavigateToAddCustomer,
  searchQuery,
  onSearchQueryChange,
  categoryFilter,
  onCategoryFilterChange,
  genderFilter,
  onGenderFilterChange,
  onAddTicket,
  isLoading = false,
  newlyUpdatedIds
}: CustomerSearchProps) {
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(20);

  // 300ms debounce for search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  // Reset pagination when filter or search query changes
  useEffect(() => {
    setVisibleCount(20);
  }, [debouncedQuery, categoryFilter, genderFilter]);

  // Real-time filtering by Name, Mobile, Customer ID, WhatsApp, IMO, or Ticket ID, combined with category & gender
  const filteredCustomers = useMemo(() => {
    let result = customers;

    if (categoryFilter) {
      result = result.filter(c => c.customerCategory && c.customerCategory.toUpperCase() === categoryFilter.toUpperCase());
    }

    if (genderFilter) {
      result = result.filter(c => c.gender && c.gender.toUpperCase() === genderFilter.toUpperCase());
    }

    const q = debouncedQuery.toLowerCase().trim();
    if (!q) return result;

    return result.filter(c => {
      // 1. Check Name
      if (c.name.toLowerCase().includes(q)) return true;
      // 2. Check Mobile
      if (c.mobileNumber.toLowerCase().includes(q)) return true;
      // 3. Check Customer ID
      if (c.id.toLowerCase().includes(q)) return true;
      // 4. Check WhatsApp
      if ((c.whatsAppNumber || '').toLowerCase().includes(q)) return true;
      // 5. Check IMO
      if ((c.imoNumber || '').toLowerCase().includes(q)) return true;
      // 6. Check Ticket ID
      const customerTickets = tickets.filter(t => t.customerId === c.id);
      const matchesTicket = customerTickets.some(t => t.id.toLowerCase().includes(q));
      if (matchesTicket) return true;
      // 7. Check Additional Numbers
      if ((c.additionalNumbers || []).some(an => an.number.toLowerCase().includes(q))) return true;

      return false;
    });
  }, [debouncedQuery, customers, tickets, categoryFilter, genderFilter]);

  // Slice filtered customers for pagination / list virtualization
  const visibleCustomers = useMemo(() => {
    return filteredCustomers.slice(0, visibleCount);
  }, [filteredCustomers, visibleCount]);

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 20);
  };

  // Highlighting text helper for matched characters
  const highlightText = (text: string | undefined, query: string) => {
    if (!text) return '';
    if (!query) return <>{text}</>;
    
    const parts = text.split(new RegExp(`(${query.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-amber-100 text-amber-900 font-bold px-0.5 rounded-sm">{part}</mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <div className="space-y-6" id="customer-search-container">
      {/* Enterprise Customer Filter Bar */}
      <CustomerFilterBar
        searchQuery={searchQuery}
        setSearchQuery={onSearchQueryChange}
        categoryFilter={categoryFilter}
        setCategoryFilter={onCategoryFilterChange}
        genderFilter={genderFilter}
        setGenderFilter={onGenderFilterChange}
        customers={customers}
      />

      {/* Customer Profile Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5" id="customers-grid-loading">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : visibleCustomers.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5" id="customers-grid">
            {visibleCustomers.map((c) => (
              <SwipeableCustomerCard
                key={c.id}
                customer={c}
                tickets={tickets}
                followUps={followUps}
                onSelectCustomer={onSelectCustomer}
                onEditCustomer={onSelectCustomer}
                onAddTicket={onAddTicket}
                onArchiveCustomer={(id) => {
                  import('../utils/toast').then(({ showToast }) => {
                    showToast("ℹ Archive action is only allowed for Administrators");
                  });
                }}
                isHighlighted={newlyUpdatedIds?.has(c.id)}
              />
            ))}
          </div>

          {filteredCustomers.length > visibleCount && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={handleLoadMore}
                className="px-6 py-2.5 text-xs font-bold rounded-full bg-[#5A5A40] text-white hover:bg-[#4a4a34] transition-all cursor-pointer shadow-sm uppercase tracking-wider"
              >
                Show More Customers (showing {visibleCount} of {filteredCustomers.length})
              </button>
            </div>
          )}
        </div>
      ) : (
        <Card className="text-center p-12 space-y-4 flex flex-col items-center">
          <div className="text-4xl select-none">👥</div>
          <h3 className="font-serif font-bold text-[#1F2937] dark:text-[#ecece5] text-xs uppercase tracking-wide">NO CUSTOMERS FOUND</h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase">Onboard your first customer to begin managing profiles</p>
          <Button
            onClick={onNavigateToAddCustomer}
            variant="success"
            size="lg"
            icon={<UserPlus className="w-4 h-4" />}
          >
            ADD CUSTOMER
          </Button>
        </Card>
      )}
    </div>
  );
});
