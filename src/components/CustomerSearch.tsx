import React, { useState, useMemo, useEffect } from 'react';
import { Customer, Ticket, FollowUp } from '../types';
import { Search, ChevronRight, UserPlus } from 'lucide-react';
import SmartContactActions from './SmartContactActions';
import InlineCopy from './InlineCopy';
import { 
  Card, 
  Input, 
  Badge, 
  Button 
} from './ui';

interface CustomerSearchProps {
  customers: Customer[];
  tickets: Ticket[];
  followUps: FollowUp[];
  onSelectCustomer: (customer: Customer) => void;
  onNavigateToAddCustomer: () => void;
}

export default function CustomerSearch({
  customers,
  tickets,
  followUps,
  onSelectCustomer,
  onNavigateToAddCustomer
}: CustomerSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // 250ms debounce for search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 250);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  // Real-time filtering by Name, Mobile, Customer ID, or Ticket ID
  const filteredCustomers = useMemo(() => {
    const q = debouncedQuery.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter(c => {
      // 1. Check Name
      if (c.name.toLowerCase().includes(q)) return true;
      // 2. Check Mobile
      if (c.mobileNumber.toLowerCase().includes(q)) return true;
      // 3. Check Customer ID
      if (c.id.toLowerCase().includes(q)) return true;
      // 4. Check Ticket ID
      const customerTickets = tickets.filter(t => t.customerId === c.id);
      const matchesTicket = customerTickets.some(t => t.id.toLowerCase().includes(q));
      if (matchesTicket) return true;

      return false;
    });
  }, [debouncedQuery, customers, tickets]);

  return (
    <div className="space-y-6" id="customer-search-container">
      {/* Module-specific Search Input using standard Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-accent-green">
          <Search className="w-5 h-5" />
        </div>
        <Input
          type="text"
          placeholder="SEARCH CUSTOMERS BY NAME, MOBILE, CUSTOMER ID, OR TICKET ID..."
          className="pl-12 pr-10 py-4 font-semibold shadow-xs"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <span className="text-xl font-bold">&times;</span>
          </button>
        )}
      </div>

      {/* Customer Profile Cards Grid */}
      {filteredCustomers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5" id="customers-grid">
          {filteredCustomers.map((c) => {
            const customerTickets = tickets.filter(t => t.customerId === c.id);
            const customerFollowUps = followUps.filter(f => f.customerId === c.id);

            // Find latest ticket to get ticket ID for Copy Ticket Action
            const latestTicket = customerTickets.length > 0
              ? customerTickets.reduce((latest, current) =>
                  new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest
                , customerTickets[0])
              : null;

            return (
              <Card
                key={c.id}
                id={`customer-card-${c.id}`}
                borderTopColor="green"
                className="flex flex-col justify-between gap-4 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 group relative"
              >
                {/* Profile Header */}
                <div className="flex items-start justify-between gap-2">
                  <div 
                    onClick={() => onSelectCustomer(c)}
                    className="space-y-1 cursor-pointer flex-1"
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="font-serif font-bold text-[#1F2937] dark:text-[#ecece5] text-sm group-hover:text-primary-olive dark:group-hover:text-[#f5f5f0] transition-colors uppercase">
                        {c.name}
                      </h3>
                      <InlineCopy type="name" value={c.name} className="min-w-[24px] min-h-[24px] p-0.5" />
                      
                      <Badge variant="olive" outline className="gap-0 px-1.5 py-0.2 rounded-md font-bold">
                        {c.id}
                        <InlineCopy type="customerId" value={c.id} className="min-w-[20px] min-h-[20px] p-0" />
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-[#8a8a70]">
                      <span className="flex items-center gap-1 font-semibold">
                        📱 {c.mobileNumber}
                        <InlineCopy type="mobile" value={c.mobileNumber} className="min-w-[24px] min-h-[24px] p-0.5" />
                      </span>
                      {latestTicket && (
                        <span className="flex items-center gap-1 font-semibold">
                          🎫 {latestTicket.id}
                          <InlineCopy type="ticketId" value={latestTicket.id} className="min-w-[24px] min-h-[24px] p-0.5" />
                        </span>
                      )}
                      {c.destinationCountry && (
                        <span className="flex items-center gap-1">🌍 {c.destinationCountry}</span>
                      )}
                    </div>
                  </div>

                  {/* Open Profile Button */}
                  <button 
                    onClick={() => onSelectCustomer(c)}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-primary-olive dark:text-[#ecece5] shrink-0 cursor-pointer"
                    title="View Profile Details"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                {/* Info and quick actions footer */}
                <div className="pt-3 border-t border-gray-200 dark:border-[#8a8a70]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Activity Stats using standard Badge components */}
                  <div className="flex items-center gap-3">
                    <Badge variant="blue">🎫 {customerTickets.length} TICKETS</Badge>
                    <Badge variant="purple">📅 {customerFollowUps.length} FOLLOWUPS</Badge>
                  </div>

                  {/* Smart Contact Actions icons */}
                  <div className="flex items-center">
                    <SmartContactActions
                      mobileNumber={c.mobileNumber}
                      customerName={c.name}
                      customerId={c.id}
                      ticketId={latestTicket?.id}
                    />
                  </div>
                </div>
              </Card>
            );
          })}
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
}
