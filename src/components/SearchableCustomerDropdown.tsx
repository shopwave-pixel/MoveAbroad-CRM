import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Customer } from '../types';
import { Search, UserPlus } from 'lucide-react';

interface SearchableCustomerDropdownProps {
  customers: Customer[];
  selectedCustomerId: string;
  onSelectCustomer: (customer: Customer) => void;
  onAddNewCustomer?: () => void;
  placeholder?: string;
}

export default function SearchableCustomerDropdown({
  customers,
  selectedCustomerId,
  onSelectCustomer,
  onAddNewCustomer,
  placeholder = "Search Customer (Name, Mobile, Customer ID)..."
}: SearchableCustomerDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return customers.slice(0, 8); // Show first 8 when empty
    return customers.filter(c => 
      c.name.toLowerCase().includes(q) ||
      c.mobileNumber.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q)
    );
  }, [searchQuery, customers]);

  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId);
  }, [selectedCustomerId, customers]);

  // Sync searchQuery with selected name if not active
  useEffect(() => {
    if (selectedCustomer && !isOpen) {
      setSearchQuery(selectedCustomer.name);
    } else if (!selectedCustomerId && !isOpen) {
      setSearchQuery('');
    }
  }, [selectedCustomer, selectedCustomerId, isOpen]);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#5A5A40]/55 dark:text-[#8a8a70]/70">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          className="w-full text-xs pl-9 pr-8 py-3 bg-white dark:bg-[#20201a] border border-[#5A5A40]/20 dark:border-[#8a8a70]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5A5A40] text-[#2c2c26] dark:text-[#f5f5f0]"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              onSelectCustomer({ id: '', name: '', mobileNumber: '', createdAt: 0 } as any);
            }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#5A5A40]/40 hover:text-[#5A5A40] dark:text-[#8a8a70]/40 dark:hover:text-[#ecece5]"
          >
            <span className="text-sm font-bold">&times;</span>
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 z-40 mt-1 max-h-60 overflow-y-auto bg-white dark:bg-[#1a1a15] border border-[#5A5A40]/15 dark:border-[#8a8a70]/25 rounded-xl shadow-lg divide-y divide-[#5A5A40]/10 dark:divide-[#8a8a70]/20">
          {filteredCustomers.length > 0 ? (
            filteredCustomers.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onSelectCustomer(c);
                  setSearchQuery(c.name);
                  setIsOpen(false);
                }}
                className={`w-full text-left p-2.5 text-xs transition-colors flex flex-col gap-1 hover:bg-[#5A5A40]/5 dark:hover:bg-[#8a8a70]/5 ${
                  selectedCustomerId === c.id ? 'bg-[#5A5A40]/10 dark:bg-[#8a8a70]/10 font-semibold' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#2c2c26] dark:text-[#f5f5f0]">{c.name}</span>
                  <span className="font-mono text-[9px] text-[#5A5A40]/60 dark:text-[#8a8a70]">ID: {c.id}</span>
                </div>
                <div className="text-[10px] text-[#5A5A40]/80 dark:text-[#8a8a70]">
                  📱 {c.mobileNumber}
                </div>
              </button>
            ))
          ) : (
            <div className="p-3 text-center space-y-2 bg-white dark:bg-[#1a1a15]">
              <p className="text-xs text-[#5A5A40]/60 dark:text-[#8a8a70] italic">No candidates found matching query.</p>
              {onAddNewCustomer && (
                <button
                  type="button"
                  onClick={() => {
                    onAddNewCustomer();
                    setIsOpen(false);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#5A5A40] hover:bg-[#4a4a34] dark:bg-[#5A5A40] dark:hover:bg-[#6c6c4e] rounded-lg transition-colors cursor-pointer mx-auto"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add New Customer</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
