import React, { useState, useRef, useEffect } from 'react';
import { 
  Phone, 
  Copy, 
  Check, 
  User, 
  Smartphone, 
  Hash, 
  FileText,
  MessageSquare
} from 'lucide-react';
import { showToast } from '../utils/toast';
import { logCustomerActivity } from '../utils/activityLogger';
import { AdditionalNumber } from '../types';

interface SmartContactActionsProps {
  customerName: string;
  mobileNumber: string;
  whatsAppNumber?: string;
  imoNumber?: string;
  customerId: string;
  ticketId?: string;
  className?: string;
  additionalNumbers?: AdditionalNumber[];
}

export default function SmartContactActions({
  customerName,
  mobileNumber,
  whatsAppNumber,
  imoNumber,
  customerId,
  ticketId,
  className = "",
  additionalNumbers = []
}: SmartContactActionsProps) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<'call' | 'whatsapp' | 'imo' | null>(null);
  
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getLoggedInUser = (): string => {
    try {
      const saved = localStorage.getItem('crm_current_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.fullName || 'Staff';
      }
    } catch (e) {
      console.error(e);
    }
    return 'Staff';
  };

  // Execution Handlers
  const executeCall = (num: string, label: string = 'Primary') => {
    logCustomerActivity(customerId, 'CALL_LOGGED', `Initiated voice call to ${customerName} (${label}: ${num})`, getLoggedInUser());
    window.location.href = `tel:${num.replace(/\s+/g, '')}`;
    setActiveMenu(null);
  };

  const executeWhatsApp = (num: string, label: string = 'Primary') => {
    let clean = num.replace(/\D/g, '');
    if (clean.startsWith('0') && clean.length === 11) {
      clean = '88' + clean;
    }
    if (!clean) {
      showToast("❌ No valid number found for WhatsApp");
      return;
    }
    logCustomerActivity(customerId, 'WHATSAPP_CONTACTED', `Sent WhatsApp message to ${customerName} (${label}: ${num})`, getLoggedInUser());
    window.open(`https://wa.me/${clean}`, '_blank');
    setActiveMenu(null);
  };

  const executeImo = (num: string, label: string = 'Primary') => {
    const cleanNumber = num.replace(/\D/g, '');
    if (!cleanNumber) {
      showToast("❌ No valid number found for IMO");
      return;
    }

    logCustomerActivity(customerId, 'IMO_CONTACTED', `Opened IMO chat with ${customerName} (${label}: ${num})`, getLoggedInUser());

    const deepLink = `imo://chat?phone=${cleanNumber}`;
    const webFallback = `https://web.imo.im/`;

    // Attempt to open deep link
    let navigated = false;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isMobile) {
      window.location.href = deepLink;
      
      // Fallback timeout
      setTimeout(() => {
        if (!navigated) {
          window.open(webFallback, '_blank');
        }
      }, 2000);

      const blurHandler = () => {
        navigated = true;
      };
      window.addEventListener('blur', blurHandler);
      setTimeout(() => window.removeEventListener('blur', blurHandler), 2500);
    } else {
      // Desktop
      window.location.href = deepLink;
      setTimeout(() => {
        window.open(webFallback, '_blank');
      }, 1500);
    }
    setActiveMenu(null);
  };

  const hasAdditional = additionalNumbers && additionalNumbers.length > 0;

  return (
    <div 
      className={`inline-flex flex-wrap items-center gap-2 relative ${className}`} 
      onClick={(e) => e.stopPropagation()}
      ref={menuRef}
    >
      {/* 📞 Call Action Button */}
      <div className="relative group">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (hasAdditional) {
              setActiveMenu(activeMenu === 'call' ? null : 'call');
            } else {
              executeCall(mobileNumber, 'Primary');
            }
          }}
          className="w-11 h-11 sm:w-10 sm:h-10 flex items-center justify-center bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded-xl border border-emerald-200/50 dark:border-emerald-900/30 transition-all shadow-2xs touch-manipulation active:scale-95 cursor-pointer relative"
          title="Call Customer"
          aria-label="Call Customer"
        >
          <Phone className="w-5 h-5 sm:w-4.5 sm:h-4.5" />
          {hasAdditional && (
            <span className="absolute bottom-0.5 right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white dark:border-[#1C1C14]" />
          )}
        </button>
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md whitespace-nowrap z-50">
          {hasAdditional ? 'Choose Call Contact' : 'Call Customer'}
        </span>

        {activeMenu === 'call' && (
          <div className="absolute bottom-full left-0 mb-2 w-48 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-gray-100 dark:border-zinc-800 py-1 z-50 text-xs text-gray-700 dark:text-gray-200 animate-fade-in">
            <div className="px-3 py-1.5 border-b border-gray-50 dark:border-zinc-800/50 text-[10px] text-gray-400 uppercase font-bold tracking-wider">Call Contact</div>
            <button 
              type="button"
              onClick={() => executeCall(mobileNumber, 'Primary')} 
              className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-zinc-800 flex flex-col cursor-pointer"
            >
              <span className="font-bold text-emerald-600 dark:text-emerald-400">Primary</span>
              <span className="text-[11px] text-gray-400 font-mono">{mobileNumber}</span>
            </button>
            {additionalNumbers.map((an) => (
              <button 
                key={an.id} 
                type="button"
                onClick={() => executeCall(an.number, an.type)} 
                className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-zinc-800 flex flex-col border-t border-gray-50 dark:border-zinc-800/30 cursor-pointer"
              >
                <span className="font-bold">{an.type}</span>
                <span className="text-[11px] text-gray-400 font-mono">{an.number}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 💬 WhatsApp Action Button */}
      <div className="relative group">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (hasAdditional) {
              setActiveMenu(activeMenu === 'whatsapp' ? null : 'whatsapp');
            } else {
              executeWhatsApp(whatsAppNumber || mobileNumber, 'Primary');
            }
          }}
          className="w-11 h-11 sm:w-10 sm:h-10 flex items-center justify-center bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] rounded-xl border border-[#25D366]/30 transition-all shadow-2xs touch-manipulation active:scale-95 cursor-pointer relative"
          title="Chat on WhatsApp"
          aria-label="Chat on WhatsApp"
        >
          <svg className="w-5.5 h-5.5 sm:w-5 sm:h-5 fill-current" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.705 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          {hasAdditional && (
            <span className="absolute bottom-0.5 right-0.5 w-2 h-2 bg-[#25D366] rounded-full border border-white dark:border-[#1C1C14]" />
          )}
        </button>
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md whitespace-nowrap z-50">
          {hasAdditional ? 'Choose WhatsApp Contact' : 'WhatsApp Chat'}
        </span>

        {activeMenu === 'whatsapp' && (
          <div className="absolute bottom-full left-0 mb-2 w-48 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-gray-100 dark:border-zinc-800 py-1 z-50 text-xs text-gray-700 dark:text-gray-200 animate-fade-in">
            <div className="px-3 py-1.5 border-b border-gray-50 dark:border-zinc-800/50 text-[10px] text-gray-400 uppercase font-bold tracking-wider">WhatsApp Chat</div>
            <button 
              type="button"
              onClick={() => executeWhatsApp(whatsAppNumber || mobileNumber, 'Primary')} 
              className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-zinc-800 flex flex-col cursor-pointer"
            >
              <span className="font-bold text-[#25D366]">Primary</span>
              <span className="text-[11px] text-gray-400 font-mono">{whatsAppNumber || mobileNumber}</span>
            </button>
            {additionalNumbers.map((an) => (
              <button 
                key={an.id} 
                type="button"
                onClick={() => executeWhatsApp(an.number, an.type)} 
                className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-zinc-800 flex flex-col border-t border-gray-50 dark:border-zinc-800/30 cursor-pointer"
              >
                <span className="font-bold">{an.type}</span>
                <span className="text-[11px] text-gray-400 font-mono">{an.number}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 🔵 IMO Action Button */}
      <div className="relative group">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (hasAdditional) {
              setActiveMenu(activeMenu === 'imo' ? null : 'imo');
            } else {
              executeImo(imoNumber || mobileNumber, 'Primary');
            }
          }}
          className="w-11 h-11 sm:w-10 sm:h-10 flex items-center justify-center bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/20 dark:hover:bg-sky-950/30 text-sky-600 dark:text-sky-400 rounded-xl border border-sky-200/50 dark:border-sky-900/30 transition-all shadow-2xs touch-manipulation active:scale-95 cursor-pointer relative"
          title="Chat on IMO"
          aria-label="Chat on IMO"
        >
          <div className="w-5.5 h-5.5 sm:w-5 sm:h-5 bg-sky-600 hover:bg-sky-700 text-white rounded-full flex items-center justify-center text-[8px] font-black tracking-tighter leading-none select-none">
            imo
          </div>
          {hasAdditional && (
            <span className="absolute bottom-0.5 right-0.5 w-2 h-2 bg-sky-500 rounded-full border border-white dark:border-[#1C1C14]" />
          )}
        </button>
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md whitespace-nowrap z-50">
          {hasAdditional ? 'Choose IMO Contact' : 'IMO Chat'}
        </span>

        {activeMenu === 'imo' && (
          <div className="absolute bottom-full left-0 mb-2 w-48 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-gray-100 dark:border-zinc-800 py-1 z-50 text-xs text-gray-700 dark:text-gray-200 animate-fade-in">
            <div className="px-3 py-1.5 border-b border-gray-50 dark:border-zinc-800/50 text-[10px] text-gray-400 uppercase font-bold tracking-wider">IMO Chat</div>
            <button 
              type="button"
              onClick={() => executeImo(imoNumber || mobileNumber, 'Primary')} 
              className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-zinc-800 flex flex-col cursor-pointer"
            >
              <span className="font-bold text-sky-600">Primary</span>
              <span className="text-[11px] text-gray-400 font-mono">{imoNumber || mobileNumber}</span>
            </button>
            {additionalNumbers.map((an) => (
              <button 
                key={an.id} 
                type="button"
                onClick={() => executeImo(an.number, an.type)} 
                className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-zinc-800 flex flex-col border-t border-gray-50 dark:border-zinc-800/30 cursor-pointer"
              >
                <span className="font-bold">{an.type}</span>
                <span className="text-[11px] text-gray-400 font-mono">{an.number}</span>
              </button>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
