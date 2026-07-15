import React, { useState } from 'react';
import { Customer, Ticket } from '../types';
import { Search, Phone, Calendar, ChevronRight, X, UserMinus, Plus, Globe, MessageSquare } from 'lucide-react';

interface CustomerSearchProps {
  customers: Customer[];
  tickets: Ticket[];
  onSelectCustomer: (customer: Customer) => void;
  onNavigateToAddCustomer: () => void;
}

export default function CustomerSearch({
  customers,
  tickets,
  onSelectCustomer,
  onNavigateToAddCustomer
}: CustomerSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Clear query helper
  const handleClear = () => setSearchQuery('');

  // Filter customers instantly
  const filteredCustomers = customers.filter(customer => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      customer.name.toLowerCase().includes(query) ||
      customer.mobileNumber.replace(/\D/g, '').includes(query) ||
      customer.mobileNumber.includes(query) ||
      (customer.destinationCountry && customer.destinationCountry.toLowerCase().includes(query)) ||
      (customer.source && customer.source.toLowerCase().includes(query))
    );
  });

  // Helper to count tickets per customer
  const getTicketCount = (customerId: string) => {
    return tickets.filter(t => t.customerId === customerId).length;
  };

  return (
    <div className="space-y-4" id="customer-search-container">
      {/* Search Input Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5A5A40]/60 dark:text-[#8a8a70]/80">
          <Search className="w-5 h-5" />
        </div>
        <input
          type="text"
          id="customer-search-input"
          className="w-full text-sm bg-white dark:bg-[#20201a] border border-[#5A5A40]/20 dark:border-[#8a8a70]/30 rounded-xl pl-11 pr-10 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#5A5A40] text-[#2c2c26] dark:text-[#f5f5f0] placeholder-[#5A5A40]/40 dark:placeholder-[#8a8a70]/50 shadow-xs transition-all"
          placeholder="Search name, mobile, source, or country..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            type="button"
            id="btn-clear-search"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#5A5A40]/50 hover:text-[#5A5A40] focus:outline-none"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Customers List / Results */}
      <div className="space-y-3" id="customer-list-results">
        {filteredCustomers.length > 0 ? (
          filteredCustomers.map(customer => {
            const ticketCount = getTicketCount(customer.id);
            const initials = customer.name
              .split(' ')
              .map(n => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();

            return (
              <button
                key={customer.id}
                id={`customer-card-${customer.id}`}
                onClick={() => onSelectCustomer(customer)}
                className="w-full text-left bg-white dark:bg-[#20201a] p-4 rounded-2xl border border-[#5A5A40]/10 dark:border-[#8a8a70]/20 hover:border-[#5A5A40]/30 dark:hover:border-[#8a8a70]/40 transition-all shadow-xs flex items-center justify-between gap-3 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-[#f5f5f0] dark:bg-[#151510] text-[#5A5A40] dark:text-[#ecece5] border border-[#5A5A40]/10 dark:border-[#8a8a70]/20 flex items-center justify-center font-bold text-sm tracking-wider">
                    {initials || 'CU'}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-bold text-[#2c2c26] dark:text-[#f5f5f0] text-sm leading-tight">{customer.name}</h3>
                      <span className="font-mono text-[9px] font-semibold text-[#5A5A40]/55 dark:text-[#8a8a70] bg-[#f5f5f0] dark:bg-[#151510] px-1 rounded">
                        {customer.id}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-[#5A5A40]/70 dark:text-[#8a8a70]/90">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-[#5A5A40]/45" />
                        <span>{customer.mobileNumber}</span>
                      </span>
                      {customer.destinationCountry && (
                        <span className="flex items-center gap-1 text-[#5A5A40] dark:text-[#b8b89e] font-medium">
                          <Globe className="w-3 h-3" />
                          <span>{customer.destinationCountry}</span>
                        </span>
                      )}
                      {customer.source && (
                        <span className="bg-[#5A5A40]/5 dark:bg-[#8a8a70]/10 px-1.5 py-0.2 rounded text-[10px] text-[#5A5A40] dark:text-[#ecece5]">
                          {customer.source}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${
                    ticketCount > 0 ? 'bg-[#5A5A40]/10 text-[#5A5A40] dark:bg-[#8a8a70]/25 dark:text-[#ecece5]' : 'bg-[#f5f5f0] dark:bg-[#151510] text-[#2c2c26]/50 dark:text-[#8a8a70]/60'
                  }`}>
                    {ticketCount} {ticketCount === 1 ? 'Ticket' : 'Tickets'}
                  </span>
                  <ChevronRight className="w-4 h-4 text-[#5A5A40]/40 dark:text-[#8a8a70]/40" />
                </div>
              </button>
            );
          })
        ) : (
          <div className="bg-white dark:bg-[#20201a] rounded-3xl border border-[#5A5A40]/10 dark:border-[#8a8a70]/20 p-8 text-center space-y-4" id="search-no-results">
            <div className="w-12 h-12 bg-[#f5f5f0] dark:bg-[#151510] rounded-full flex items-center justify-center mx-auto text-[#5A5A40]/40 dark:text-[#8a8a70]/40">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-serif font-bold text-[#5A5A40] dark:text-[#ecece5] text-sm">No customers found</h4>
              <p className="text-xs text-[#5A5A40]/60 dark:text-[#8a8a70]/80 mt-1 max-w-xs mx-auto">
                {searchQuery 
                  ? `We couldn't find any customers matching "${searchQuery}".` 
                  : 'Start by building your customer pipeline.'}
              </p>
            </div>
            <button
              onClick={onNavigateToAddCustomer}
              id="btn-no-results-add-customer"
              className="inline-flex items-center gap-1.5 bg-[#5A5A40] hover:bg-[#4a4a34] dark:bg-[#5A5A40] dark:hover:bg-[#6c6c4e] text-white font-medium text-xs px-5 py-2.5 rounded-full shadow-lg shadow-[#5A5A40]/10 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Customer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
