import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Customer, Ticket, FollowUp } from '../types';
import SmartContactActions from './SmartContactActions';
import InlineCopy from './InlineCopy';
import { 
  Search, 
  X, 
  Plus, 
  Check, 
  User, 
  Phone, 
  Globe, 
  Ticket as TicketIcon, 
  Calendar, 
  FileText,
  Clock
} from 'lucide-react';

interface SmartGlobalSearchProps {
  customers: Customer[];
  tickets: Ticket[];
  followUps: FollowUp[];
  onSelectCustomer: (customer: Customer) => void;
  onNavigateToAddCustomer?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  idPrefix?: string;
  mode?: 'inline' | 'dropdown';
  showCreateNewButton?: boolean;
}

export default function SmartGlobalSearch({
  customers,
  tickets,
  followUps,
  onSelectCustomer,
  onNavigateToAddCustomer,
  placeholder = "Search CRM (Name, Phone, WhatsApp, Country, Tickets, Notes, IDs)...",
  autoFocus = false,
  className = "",
  idPrefix = "global-search",
  mode = "inline",
  showCreateNewButton = true
}: SmartGlobalSearchProps) {
  // Input and Debounced values
  const [inputValue, setInputValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce the input by 250ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(inputValue);
    }, 250);

    return () => {
      clearTimeout(handler);
    };
  }, [inputValue]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Format Helper for Activity/Creation dates
  const formatDateTime = (timestamp: number) => {
    try {
      const d = new Date(timestamp);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } catch {
      return String(timestamp);
    }
  };

  // Helper for text highlighting
  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim() || !text) return <span>{text}</span>;
    
    // Split text by regex-escaped query case-insensitively
    const escaped = highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === highlight.toLowerCase().trim() ? (
            <mark key={i} className="bg-amber-100 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 font-semibold px-0.5 rounded-sm">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  // Perform CRM-wide Search
  const searchResults = useMemo(() => {
    const qClean = searchQuery.toLowerCase().trim();
    const qSpaceStripped = qClean.replace(/\s+/g, '');

    // If query is empty, handle based on mode
    if (!qSpaceStripped) {
      if (mode === 'dropdown') {
        return [];
      }
      
      // For inline/directory mode, return all records sorted by recently active/created
      return customers.map(customer => {
        const cTickets = tickets.filter(t => t.customerId === customer.id);
        const cFollowUps = followUps.filter(f => f.customerId === customer.id);
        
        let recentlyUpdatedTime = new Date(customer.createdAt).getTime();
        let latestTicket: Ticket | null = null;
        let latestTicketTime = 0;

        for (const t of cTickets) {
          const tTime = new Date(t.createdAt).getTime();
          if (tTime > recentlyUpdatedTime) {
            recentlyUpdatedTime = tTime;
          }
          if (tTime > latestTicketTime) {
            latestTicketTime = tTime;
            latestTicket = t;
          }
        }

        for (const f of cFollowUps) {
          const fTime = new Date(f.createdAt).getTime();
          if (fTime > recentlyUpdatedTime) {
            recentlyUpdatedTime = fTime;
          }
        }

        return {
          customer,
          isExactMatch: false,
          matchesCustomerId: false,
          matchesTicketId: false,
          matchesMobile: false,
          matchesCustomerName: false,
          recentlyUpdatedTime,
          latestTicket,
          ticketsCount: cTickets.length
        };
      }).sort((a, b) => b.recentlyUpdatedTime - a.recentlyUpdatedTime);
    }

    const matchesList = [];

    for (const customer of customers) {
      const cId = customer.id.toLowerCase();
      const cIdClean = cId.replace(/\s+/g, '');
      const cName = customer.name.toLowerCase();
      const cNameClean = cName.replace(/\s+/g, '');
      
      const cMobile = customer.mobileNumber.toLowerCase();
      const cMobileClean = cMobile.replace(/\s+/g, '');
      const cMobileDigits = customer.mobileNumber.replace(/\D/g, '');

      const cWhatsApp = (customer.whatsAppNumber || '').toLowerCase();
      const cWhatsAppClean = cWhatsApp.replace(/\s+/g, '');
      const cWhatsAppDigits = (customer.whatsAppNumber || '').replace(/\D/g, '');

      const cImo = (customer.imoNumber || '').toLowerCase();
      const cImoClean = cImo.replace(/\s+/g, '');
      const cImoDigits = (customer.imoNumber || '').replace(/\D/g, '');

      const cCountry = (customer.destinationCountry || '').toLowerCase();
      const cCountryClean = cCountry.replace(/\s+/g, '');

      const cTickets = tickets.filter(t => t.customerId === customer.id);
      const cFollowUps = followUps.filter(f => f.customerId === customer.id);

      let isMatch = false;
      let isExactMatch = false;
      
      let matchesCustomerId = false;
      let matchesTicketId = false;
      let matchesMobile = false;
      let matchesCustomerName = false;

      // Exact Matches Checks (case-insensitive & ignore spaces)
      if (cIdClean === qSpaceStripped) {
        isMatch = true;
        isExactMatch = true;
        matchesCustomerId = true;
      }
      if (cNameClean === qSpaceStripped || cName === qClean) {
        isMatch = true;
        isExactMatch = true;
        matchesCustomerName = true;
      }
      if (cMobileClean === qSpaceStripped || cMobileDigits === qSpaceStripped) {
        isMatch = true;
        isExactMatch = true;
        matchesMobile = true;
      }
      if (cWhatsAppClean === qSpaceStripped || cWhatsAppDigits === qSpaceStripped) {
        isMatch = true;
        isExactMatch = true;
        matchesMobile = true;
      }
      if (cImoClean === qSpaceStripped || cImoDigits === qSpaceStripped) {
        isMatch = true;
        isExactMatch = true;
        matchesMobile = true;
      }

      // Check Tickets
      for (const t of cTickets) {
        const tIdClean = t.id.toLowerCase().replace(/\s+/g, '');
        const descClean = t.conversationDescription.toLowerCase().replace(/\s+/g, '');
        
        if (tIdClean === qSpaceStripped) {
          isMatch = true;
          isExactMatch = true;
          matchesTicketId = true;
        } else if (tIdClean.includes(qSpaceStripped) || t.id.toLowerCase().includes(qClean)) {
          isMatch = true;
          matchesTicketId = true;
        }

        if (descClean.includes(qSpaceStripped) || t.conversationDescription.toLowerCase().includes(qClean)) {
          isMatch = true;
        }
      }

      // Check Follow-ups
      for (const f of cFollowUps) {
        const fIdClean = f.id.toLowerCase().replace(/\s+/g, '');
        const notesClean = f.notes.toLowerCase().replace(/\s+/g, '');

        if (fIdClean === qSpaceStripped) {
          isMatch = true;
          isExactMatch = true;
        } else if (fIdClean.includes(qSpaceStripped) || f.id.toLowerCase().includes(qClean)) {
          isMatch = true;
        }

        if (notesClean.includes(qSpaceStripped) || f.notes.toLowerCase().includes(qClean)) {
          isMatch = true;
        }
      }

      // Partial / Substring Match Fallback
      if (!isMatch) {
        if (cIdClean.includes(qSpaceStripped) || cId.includes(qClean)) {
          isMatch = true;
          matchesCustomerId = true;
        }
        if (cNameClean.includes(qSpaceStripped) || cName.includes(qClean)) {
          isMatch = true;
          matchesCustomerName = true;
        }
        if (cMobileClean.includes(qSpaceStripped) || cMobileDigits.includes(qSpaceStripped) || cMobile.includes(qClean)) {
          isMatch = true;
          matchesMobile = true;
        }
        if (cWhatsAppClean.includes(qSpaceStripped) || cWhatsAppDigits.includes(qSpaceStripped) || cWhatsApp.includes(qClean)) {
          isMatch = true;
          matchesMobile = true;
        }
        if (cImoClean.includes(qSpaceStripped) || cImoDigits.includes(qSpaceStripped) || cImo.includes(qClean)) {
          isMatch = true;
          matchesMobile = true;
        }
        if (cCountryClean.includes(qSpaceStripped) || cCountry.includes(qClean)) {
          isMatch = true;
        }
      }

      // If matched, extract activity timestamps and latest ticket
      if (isMatch) {
        let recentlyUpdatedTime = new Date(customer.createdAt).getTime();
        let latestTicket: Ticket | null = null;
        let latestTicketTime = 0;

        for (const t of cTickets) {
          const tTime = new Date(t.createdAt).getTime();
          if (tTime > recentlyUpdatedTime) {
            recentlyUpdatedTime = tTime;
          }
          if (tTime > latestTicketTime) {
            latestTicketTime = tTime;
            latestTicket = t;
          }
        }

        for (const f of cFollowUps) {
          const fTime = new Date(f.createdAt).getTime();
          if (fTime > recentlyUpdatedTime) {
            recentlyUpdatedTime = fTime;
          }
        }

        matchesList.push({
          customer,
          isExactMatch,
          matchesCustomerId,
          matchesTicketId,
          matchesMobile,
          matchesCustomerName,
          recentlyUpdatedTime,
          latestTicket,
          ticketsCount: cTickets.length
        });
      }
    }

    // Sort matching results based on exact criteria priorities:
    // 1. Exact Match
    // 2. Customer ID
    // 3. Ticket ID
    // 4. Mobile Number
    // 5. Customer Name
    // 6. Recently Updated
    matchesList.sort((a, b) => {
      if (a.isExactMatch !== b.isExactMatch) {
        return a.isExactMatch ? -1 : 1;
      }
      if (a.matchesCustomerId !== b.matchesCustomerId) {
        return a.matchesCustomerId ? -1 : 1;
      }
      if (a.matchesTicketId !== b.matchesTicketId) {
        return a.matchesTicketId ? -1 : 1;
      }
      if (a.matchesMobile !== b.matchesMobile) {
        return a.matchesMobile ? -1 : 1;
      }
      if (a.matchesCustomerName !== b.matchesCustomerName) {
        return a.matchesCustomerName ? -1 : 1;
      }
      return b.recentlyUpdatedTime - a.recentlyUpdatedTime;
    });

    return matchesList;
  }, [searchQuery, customers, tickets, followUps]);

  // Performance Optimization: Slice to render only top 25 matches in the DOM
  // to prevent browser rendering bottlenecks while searching thousands of records.
  const displayedResults = useMemo(() => {
    return searchResults.slice(0, 25);
  }, [searchResults]);

  const handleClear = () => {
    setInputValue('');
    setSearchQuery('');
  };

  const handleSelect = (customer: Customer) => {
    onSelectCustomer(customer);
    if (mode === 'dropdown') {
      setIsDropdownOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`} id={`${idPrefix}-wrapper`}>
      {/* Search Input Box */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5A5A40]/60 dark:text-[#8a8a70]/80">
          <Search className="w-5 h-5 animate-pulse" />
        </div>
        <input
          type="text"
          id={`${idPrefix}-input`}
          autoFocus={autoFocus}
          className="w-full text-sm bg-white dark:bg-[#20201a] border border-[#5A5A40]/25 dark:border-[#8a8a70]/40 rounded-xl pl-11 pr-10 py-3 focus:outline-none focus:ring-2 focus:ring-[#5A5A40] text-[#2c2c26] dark:text-[#f5f5f0] placeholder-[#5A5A40]/45 dark:placeholder-[#8a8a70]/50 shadow-xs transition-all"
          placeholder={placeholder}
          value={inputValue}
          onFocus={() => setIsDropdownOpen(true)}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsDropdownOpen(true);
          }}
        />
        {inputValue && (
          <button
            type="button"
            id={`${idPrefix}-btn-clear`}
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#5A5A40]/50 hover:text-[#5A5A40] focus:outline-none"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        )}
      </div>

      {/* Search Results Display Area */}
      {(mode === 'inline' || (isDropdownOpen && inputValue.trim().length > 0)) && (
        <div 
          id={`${idPrefix}-results-panel`}
          className={`${
            mode === 'dropdown' 
              ? 'absolute z-50 left-0 right-0 mt-2 bg-white dark:bg-[#1a1a15] border border-[#5A5A40]/20 dark:border-[#8a8a70]/30 rounded-2xl shadow-xl max-h-[480px] overflow-y-auto' 
              : 'mt-3 space-y-2.5'
          }`}
        >
          {displayedResults.length > 0 ? (
            <div className={`p-2 space-y-2.5 ${mode === 'dropdown' ? 'divide-y divide-[#5A5A40]/10' : ''}`}>
              {mode === 'dropdown' && (
                <div className="px-3 py-1 text-[10px] uppercase font-bold tracking-wider text-[#5A5A40]/60 dark:text-[#8a8a70] mb-1">
                  Matching CRM Results ({searchResults.length})
                </div>
              )}
              {displayedResults.map(({ customer, latestTicket, ticketsCount, recentlyUpdatedTime }) => {
                return (
                  <div
                    key={customer.id}
                    id={`${idPrefix}-card-${customer.id}`}
                    onClick={() => handleSelect(customer)}
                    className="w-full text-left bg-white/70 dark:bg-[#20201a]/70 hover:bg-[#5A5A40]/5 dark:hover:bg-[#8a8a70]/5 p-3.5 rounded-xl border border-[#5A5A40]/10 dark:border-[#8a8a70]/15 transition-all flex flex-col gap-2 shadow-2xs group cursor-pointer focus:ring-1 focus:ring-[#5A5A40]"
                  >
                    {/* Customer Header */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[#2c2c26] dark:text-[#f5f5f0] flex items-center gap-1.5 text-xs sm:text-sm">
                        <span>👤</span> {highlightText(customer.name, inputValue)}
                        <InlineCopy type="name" value={customer.name} className="min-w-[20px] min-h-[20px] p-0" />
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono text-[9px] bg-[#f5f5f0] dark:bg-[#151510] text-[#5A5A40] dark:text-[#ecece5] px-1.5 py-0.5 rounded border border-[#5A5A40]/10 font-bold shrink-0">
                        🆔 {highlightText(customer.id, inputValue)}
                        <InlineCopy type="customerId" value={customer.id} className="min-w-[20px] min-h-[20px] p-0" />
                      </span>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] text-[#5A5A40]/85 dark:text-[#8a8a70]/90">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#5A5A40]/60 text-xs">📱</span>
                        <span className="font-semibold">{highlightText(customer.mobileNumber, inputValue)}</span>
                        <InlineCopy type="mobile" value={customer.mobileNumber} className="min-w-[20px] min-h-[20px] p-0" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#5A5A40]/60 text-xs">🌍</span>
                        <span>
                          {customer.destinationCountry ? (
                            <span className="font-medium text-[#2c2c26] dark:text-[#f5f5f0]">
                              {highlightText(customer.destinationCountry, inputValue)}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-600 italic">Not specified</span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#5A5A40]/60 text-xs">🎫</span>
                        <span className="inline-flex items-center gap-1 truncate">
                          Latest Ticket ID: {latestTicket ? (
                            <>
                              <span className="font-bold text-[#5A5A40] dark:text-[#ecece5]">{highlightText(latestTicket.id, inputValue)}</span>
                              <InlineCopy type="ticketId" value={latestTicket.id} className="min-w-[20px] min-h-[20px] p-0" />
                            </>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-600 italic">None</span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#5A5A40]/60 text-xs">🏷</span>
                        <span>
                          Status: {latestTicket ? (
                            <span className={`inline-flex items-center text-[9px] font-bold px-2 py-0.5 rounded-full leading-none border ${
                              latestTicket.status === 'Open' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200' :
                              latestTicket.status === 'Pending' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border-amber-200' :
                              'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border-rose-200'
                            }`}>
                              {latestTicket.status}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500 italic text-[10px]">No Ticket</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Smart Contact Actions */}
                    <div className="pt-2 border-t border-[#5A5A40]/5 dark:border-[#8a8a70]/10 flex justify-end">
                      <SmartContactActions
                        customerName={customer.name}
                        mobileNumber={customer.mobileNumber}
                        whatsAppNumber={customer.whatsAppNumber}
                        imoNumber={customer.imoNumber}
                        customerId={customer.id}
                        ticketId={latestTicket?.id}
                      />
                    </div>

                    {/* Timeline Activity Row */}
                    <div className="pt-2 border-t border-[#5A5A40]/5 dark:border-[#8a8a70]/10 flex flex-wrap items-center justify-between text-[10px] text-[#5A5A40]/60 dark:text-[#8a8a70]/70 gap-2">
                      <span className="flex items-center gap-1">
                        <span>📅</span> Last Activity: <span className="font-semibold text-[#2c2c26]/70 dark:text-[#ecece5]/70">{formatDateTime(recentlyUpdatedTime)}</span>
                      </span>
                      {ticketsCount > 0 && (
                        <span className="bg-[#5A5A40]/5 dark:bg-[#8a8a70]/10 px-1.5 py-0.2 rounded-full font-bold text-[9px]">
                          {ticketsCount} Activities
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {searchResults.length > displayedResults.length && (
                <div className="text-center text-[10px] text-[#5A5A40]/50 py-1.5 font-semibold">
                  Showing top {displayedResults.length} of {searchResults.length} matches. Narrow your query for more.
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-[#1e1e18] rounded-2xl border border-[#5A5A40]/15 dark:border-[#8a8a70]/30 p-6 text-center space-y-3" id={`${idPrefix}-no-results`}>
              <div className="w-10 h-10 bg-[#f5f5f0] dark:bg-[#151510] rounded-full flex items-center justify-center mx-auto text-[#5A5A40]/45">
                <Search className="w-5 h-5" />
              </div>
              <p className="text-xs font-serif font-bold text-[#5A5A40] dark:text-[#ecece5]">No matching customer found.</p>
              {showCreateNewButton && onNavigateToAddCustomer && (
                <button
                  type="button"
                  id={`${idPrefix}-btn-create-customer`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigateToAddCustomer();
                    setIsDropdownOpen(false);
                  }}
                  className="inline-flex items-center gap-1.5 bg-[#5A5A40] hover:bg-[#4a4a34] dark:bg-[#5A5A40] dark:hover:bg-[#6c6c4e] text-white font-bold text-[11px] px-4 py-2 rounded-full shadow-md transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create New Customer
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
