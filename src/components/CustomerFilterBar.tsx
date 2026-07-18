import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ChevronDown, Check, X, Users, RefreshCw } from 'lucide-react';
import { Customer } from '../types';

interface CustomerFilterBarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  categoryFilter: string;
  setCategoryFilter: (cat: string) => void;
  genderFilter: string;
  setGenderFilter: (gender: string) => void;
  customers: Customer[];
}

export default function CustomerFilterBar({
  searchQuery,
  setSearchQuery,
  categoryFilter,
  setCategoryFilter,
  genderFilter,
  setGenderFilter,
  customers
}: CustomerFilterBarProps) {
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isGenderOpen, setIsGenderOpen] = useState(false);
  const [catSearchQuery, setCatSearchQuery] = useState('');
  
  const categoryRef = useRef<HTMLDivElement>(null);
  const genderRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setIsCategoryOpen(false);
      }
      if (genderRef.current && !genderRef.current.contains(event.target as Node)) {
        setIsGenderOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Preset categories + any additional categories found dynamically in customer data
  const predefinedCategories = useMemo(() => [
    "AGENT", 
    "SUPERVISOR (PRODUCTION)", 
    "SUPERVISOR (QUALITY)", 
    "IRON MAN", 
    "OPERATOR", 
    "CHECKER", 
    "DELICATOR"
  ], []);

  const allCategories = useMemo(() => {
    const dynamicCats = customers
      .map(c => c.customerCategory?.trim().toUpperCase())
      .filter((cat): cat is string => !!cat);
    
    const combined = [...predefinedCategories, ...dynamicCats];
    // Return unique, sorted list
    return Array.from(new Set(combined)).sort();
  }, [customers, predefinedCategories]);

  // Category counts from the Local Cache
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allCategories.forEach(cat => {
      counts[cat] = customers.filter(c => c.customerCategory?.toUpperCase() === cat).length;
    });
    return counts;
  }, [customers, allCategories]);

  // Gender counts from Local Cache
  const genderCounts = useMemo(() => {
    return {
      MALE: customers.filter(c => c.gender?.toUpperCase() === 'MALE').length,
      FEMALE: customers.filter(c => c.gender?.toUpperCase() === 'FEMALE').length,
      ALL: customers.length
    };
  }, [customers]);

  // Filter categories based on category search if there are more than 8 categories
  const showCategorySearch = allCategories.length > 8;
  const filteredCategoriesList = useMemo(() => {
    if (!showCategorySearch || !catSearchQuery) return allCategories;
    const query = catSearchQuery.toLowerCase().trim();
    return allCategories.filter(cat => cat.toLowerCase().includes(query));
  }, [allCategories, catSearchQuery, showCategorySearch]);

  const handleClearAll = () => {
    setSearchQuery('');
    setCategoryFilter('');
    setGenderFilter('');
    setCatSearchQuery('');
  };

  // Keyboard navigation helpers
  const handleDropdownKeyDown = (
    e: React.KeyboardEvent, 
    isOpen: boolean, 
    setIsOpen: (val: boolean) => void,
    ref: React.RefObject<HTMLDivElement | null>
  ) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      ref.current?.querySelector('button')?.focus();
    }
    if (e.key === 'ArrowDown' && !isOpen) {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  return (
    <div className="w-full space-y-3 sticky top-[57px] sm:top-[61px] z-20 bg-[#F8FAFC]/95 dark:bg-[#11110E]/95 backdrop-blur-md py-3 border-b border-gray-200/50 dark:border-zinc-800/50 -mx-4 px-4 shadow-2xs transition-all duration-150" id="customer-filter-bar">
      {/* Search Input Box */}
      <div className="relative w-full">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#5A5A40]">
          <Search className="w-5 h-5" />
        </div>
        <input
          type="text"
          role="searchbox"
          aria-label="Search customers"
          placeholder="SEARCH CUSTOMERS BY NAME, MOBILE, ID, TICKET ID, WHATSAPP, IMO..."
          className="w-full text-xs font-semibold bg-white dark:bg-[#151510]/50 border border-gray-200 dark:border-[#8a8a70]/30 rounded-xl pl-12 pr-10 py-4 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40] text-[#1F2937] dark:text-[#ecece5] placeholder-gray-400 tracking-wide uppercase shadow-2xs"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            aria-label="Clear search"
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer text-base font-bold"
          >
            &times;
          </button>
        )}
      </div>

      {/* Responsive Filter Actions Row */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 w-full">
        {/* All Customers Button - Always Visible, Always First */}
        <button
          type="button"
          onClick={handleClearAll}
          id="btn-all-customers"
          className={`flex items-center justify-center gap-2 h-11 px-5 rounded-xl font-bold text-xs uppercase tracking-wider border transition-all cursor-pointer select-none active:scale-95 shrink-0 ${
            !searchQuery && !categoryFilter && !genderFilter
              ? 'bg-[#5A5A40] text-white border-[#5A5A40] shadow-sm'
              : 'bg-white hover:bg-gray-50 text-gray-600 border-gray-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-gray-300 dark:hover:bg-zinc-700'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>ALL CUSTOMERS ({customers.length})</span>
        </button>

        {/* Dropdowns Container (Adapts on Tablet/Mobile) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
          {/* Category Dropdown */}
          <div 
            ref={categoryRef} 
            className="relative w-full"
            onKeyDown={(e) => handleDropdownKeyDown(e, isCategoryOpen, setIsCategoryOpen, categoryRef)}
          >
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={isCategoryOpen}
              onClick={() => setIsCategoryOpen(!isCategoryOpen)}
              className="flex items-center justify-between w-full h-11 px-4 bg-white dark:bg-[#1a1a15] text-[#2c2c26] dark:text-[#ecece5] hover:bg-gray-50 border border-gray-200 dark:border-[#8a8a70]/30 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
            >
              <span className="truncate">
                {categoryFilter ? `CATEGORY: ${categoryFilter}` : 'CATEGORY'}
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isCategoryOpen ? 'rotate-180' : ''}`} />
            </button>

            {isCategoryOpen && (
              <div 
                role="listbox"
                className="absolute z-50 left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl shadow-lg max-h-72 overflow-y-auto overflow-x-hidden p-1 space-y-1 transform origin-top transition-all duration-150 ease-out animate-in fade-in slide-in-from-top-2"
              >
                {showCategorySearch && (
                  <div className="px-2 py-1.5 sticky top-0 bg-white dark:bg-zinc-900 z-10 border-b border-gray-50 dark:border-zinc-800 mb-1">
                    <input
                      type="text"
                      placeholder="SEARCH CATEGORY..."
                      value={catSearchQuery}
                      onChange={(e) => setCatSearchQuery(e.target.value)}
                      onClick={(e) => e.stopPropagation()} // Prevent closing dropdown on input click
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs font-semibold uppercase focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                    />
                  </div>
                )}

                {/* Option: All Categories */}
                <button
                  type="button"
                  role="option"
                  aria-selected={!categoryFilter}
                  onClick={() => {
                    setCategoryFilter('');
                    setIsCategoryOpen(false);
                    setCatSearchQuery('');
                  }}
                  className={`flex items-center justify-between w-full p-2.5 text-left text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    !categoryFilter 
                      ? 'bg-[#5A5A40]/10 text-primary-olive dark:text-white' 
                      : 'hover:bg-slate-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span>ALL CATEGORIES</span>
                  {!categoryFilter && <Check className="w-3.5 h-3.5" />}
                </button>

                {/* Categories Options list */}
                {filteredCategoriesList.length > 0 ? (
                  filteredCategoriesList.map((cat) => {
                    const count = categoryCounts[cat] || 0;
                    const isSelected = categoryFilter.toUpperCase() === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          setCategoryFilter(cat);
                          setIsCategoryOpen(false);
                          setCatSearchQuery('');
                        }}
                        className={`flex items-center justify-between w-full p-2.5 text-left text-xs font-bold rounded-lg transition-colors cursor-pointer uppercase ${
                          isSelected 
                            ? 'bg-[#5A5A40]/10 text-primary-olive dark:text-white' 
                            : 'hover:bg-slate-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span className="truncate pr-2">{cat}</span>
                        <span className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-mono text-gray-400 font-bold bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md">
                            {count}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-primary-olive" />}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="p-3 text-center text-xs text-gray-400 dark:text-zinc-500 italic uppercase">
                    No matching categories
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Gender Dropdown */}
          <div 
            ref={genderRef} 
            className="relative w-full"
            onKeyDown={(e) => handleDropdownKeyDown(e, isGenderOpen, setIsGenderOpen, genderRef)}
          >
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={isGenderOpen}
              onClick={() => setIsGenderOpen(!isGenderOpen)}
              className="flex items-center justify-between w-full h-11 px-4 bg-white dark:bg-[#1a1a15] text-[#2c2c26] dark:text-[#ecece5] hover:bg-gray-50 border border-gray-200 dark:border-[#8a8a70]/30 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
            >
              <span className="truncate">
                {genderFilter ? `GENDER: ${genderFilter}` : 'GENDER'}
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isGenderOpen ? 'rotate-180' : ''}`} />
            </button>

            {isGenderOpen && (
              <div 
                role="listbox"
                className="absolute z-50 left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl shadow-lg max-h-60 overflow-y-auto overflow-x-hidden p-1 space-y-1 transform origin-top transition-all duration-150 ease-out animate-in fade-in slide-in-from-top-2"
              >
                {/* Option: All Genders */}
                <button
                  type="button"
                  role="option"
                  aria-selected={!genderFilter}
                  onClick={() => {
                    setGenderFilter('');
                    setIsGenderOpen(false);
                  }}
                  className={`flex items-center justify-between w-full p-2.5 text-left text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    !genderFilter 
                      ? 'bg-[#5A5A40]/10 text-primary-olive dark:text-white' 
                      : 'hover:bg-slate-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span>ALL GENDERS</span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-gray-400 font-bold bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md">
                      {genderCounts.ALL}
                    </span>
                    {!genderFilter && <Check className="w-3.5 h-3.5" />}
                  </span>
                </button>

                {/* Option: Male */}
                <button
                  type="button"
                  role="option"
                  aria-selected={genderFilter === 'MALE'}
                  onClick={() => {
                    setGenderFilter('MALE');
                    setIsGenderOpen(false);
                  }}
                  className={`flex items-center justify-between w-full p-2.5 text-left text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    genderFilter === 'MALE' 
                      ? 'bg-[#5A5A40]/10 text-primary-olive dark:text-white' 
                      : 'hover:bg-slate-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span>MALE</span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-gray-400 font-bold bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md">
                      {genderCounts.MALE}
                    </span>
                    {genderFilter === 'MALE' && <Check className="w-3.5 h-3.5 text-primary-olive" />}
                  </span>
                </button>

                {/* Option: Female */}
                <button
                  type="button"
                  role="option"
                  aria-selected={genderFilter === 'FEMALE'}
                  onClick={() => {
                    setGenderFilter('FEMALE');
                    setIsGenderOpen(false);
                  }}
                  className={`flex items-center justify-between w-full p-2.5 text-left text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    genderFilter === 'FEMALE' 
                      ? 'bg-[#5A5A40]/10 text-primary-olive dark:text-white' 
                      : 'hover:bg-slate-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span>FEMALE</span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-gray-400 font-bold bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md">
                      {genderCounts.FEMALE}
                    </span>
                    {genderFilter === 'FEMALE' && <Check className="w-3.5 h-3.5 text-primary-olive" />}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
