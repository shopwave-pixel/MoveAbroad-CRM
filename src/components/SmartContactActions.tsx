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

interface SmartContactActionsProps {
  customerName: string;
  mobileNumber: string;
  whatsAppNumber?: string;
  imoNumber?: string;
  customerId: string;
  ticketId?: string;
  className?: string;
}

export default function SmartContactActions({
  customerName,
  mobileNumber,
  whatsAppNumber,
  imoNumber,
  customerId,
  ticketId,
  className = ""
}: SmartContactActionsProps) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [showCopyMenu, setShowCopyMenu] = useState(false);
  const copyMenuRef = useRef<HTMLDivElement>(null);

  // Close copy dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (copyMenuRef.current && !copyMenuRef.current.contains(event.target as Node)) {
        setShowCopyMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Format helper for WhatsApp
  const getFormattedWhatsAppNumber = () => {
    const primary = whatsAppNumber && whatsAppNumber.trim() ? whatsAppNumber : mobileNumber;
    let clean = primary.replace(/\D/g, '');
    if (clean.startsWith('0') && clean.length === 11) {
      clean = '88' + clean;
    }
    return clean;
  };

  // WhatsApp click handler
  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const formatted = getFormattedWhatsAppNumber();
    if (!formatted) {
      showToast("❌ No valid number found for WhatsApp");
      return;
    }
    window.open(`https://wa.me/${formatted}`, '_blank');
  };

  // IMO click handler
  const handleImo = (e: React.MouseEvent) => {
    e.stopPropagation();
    const primary = imoNumber && imoNumber.trim() ? imoNumber : mobileNumber;
    const cleanNumber = primary.replace(/\D/g, '');
    if (!cleanNumber) {
      showToast("❌ No valid number found for IMO");
      return;
    }

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
  };

  // Copy handler with toast
  const handleCopy = (e: React.MouseEvent, textToCopy: string, label: string) => {
    e.stopPropagation();
    if (!textToCopy) return;

    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        showToast(`✅ ${label} copied`);
      })
      .catch((err) => {
        console.error('Failed to copy: ', err);
        showToast(`❌ Failed to copy ${label}`);
      });
    
    setShowCopyMenu(false);
  };

  return (
    <div 
      className={`inline-flex flex-wrap items-center gap-2 ${className}`} 
      onClick={(e) => e.stopPropagation()}
    >
      {/* 📞 Call Action Button */}
      <div className="relative group">
        <a
          href={`tel:${mobileNumber.replace(/\s+/g, '')}`}
          onClick={(e) => e.stopPropagation()}
          className="w-11 h-11 sm:w-10 sm:h-10 flex items-center justify-center bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded-xl border border-emerald-200/50 dark:border-emerald-900/30 transition-all shadow-2xs touch-manipulation active:scale-95"
          title="Call Customer"
          aria-label="Call Customer"
        >
          <Phone className="w-5 h-5 sm:w-4.5 sm:h-4.5" />
        </a>
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md whitespace-nowrap z-50">
          Call Customer
        </span>
      </div>

      {/* 💬 WhatsApp Action Button */}
      <div className="relative group">
        <button
          type="button"
          onClick={handleWhatsApp}
          className="w-11 h-11 sm:w-10 sm:h-10 flex items-center justify-center bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] rounded-xl border border-[#25D366]/30 transition-all shadow-2xs touch-manipulation active:scale-95 cursor-pointer"
          title="Chat on WhatsApp"
          aria-label="Chat on WhatsApp"
        >
          {/* Custom WhatsApp Vector Icon for premium look */}
          <svg className="w-5.5 h-5.5 sm:w-5 sm:h-5 fill-current" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.705 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </button>
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md whitespace-nowrap z-50">
          WhatsApp Chat
        </span>
      </div>

      {/* 🔵 IMO Action Button */}
      <div className="relative group">
        <button
          type="button"
          onClick={handleImo}
          className="w-11 h-11 sm:w-10 sm:h-10 flex items-center justify-center bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/20 dark:hover:bg-sky-950/30 text-sky-600 dark:text-sky-400 rounded-xl border border-sky-200/50 dark:border-sky-900/30 transition-all shadow-2xs touch-manipulation active:scale-95 cursor-pointer"
          title="Chat on IMO"
          aria-label="Chat on IMO"
        >
          {/* Custom IMO styled circular badge icon */}
          <div className="w-5.5 h-5.5 sm:w-5 sm:h-5 bg-sky-600 hover:bg-sky-700 text-white rounded-full flex items-center justify-center text-[8px] font-black tracking-tighter leading-none select-none">
            imo
          </div>
        </button>
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md whitespace-nowrap z-50">
          IMO Chat
        </span>
      </div>

    </div>
  );
}
