import React from 'react';
import { Copy } from 'lucide-react';
import { showToast } from '../utils/toast';

interface InlineCopyProps {
  type: 'name' | 'mobile' | 'customerId' | 'ticketId';
  value: string | undefined | null;
  className?: string;
}

export const normalizeBangladeshNumber = (num: string): string => {
  if (!num) return '';
  // Remove spaces, hyphens, +
  let clean = num.replace(/[\s\-\+]/g, '');
  // Replace leading 880 with 0
  if (clean.startsWith('880')) {
    clean = '0' + clean.substring(3);
  }
  // If starts with 13, 14, 15, 16, 17, 18 or 19, prepend 0
  if (/^[1-9]/.test(clean) && !clean.startsWith('0')) {
    if (/^(13|14|15|16|17|18|19)/.test(clean)) {
      clean = '0' + clean;
    }
  }
  return clean;
};

export default function InlineCopy({ type, value, className = "" }: InlineCopyProps) {
  const isDisabled = !value || value.trim() === '' || value.toLowerCase() === 'none';

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (isDisabled) return;

    let textToCopy = value || '';
    let toastMsg = '';

    if (type === 'name') {
      textToCopy = (value || '').trim();
      toastMsg = '✅ NAME COPIED';
    } else if (type === 'mobile') {
      textToCopy = normalizeBangladeshNumber(value || '');
      toastMsg = '✅ MOBILE NUMBER COPIED';
    } else if (type === 'customerId') {
      textToCopy = (value || '').trim();
      toastMsg = '✅ CUSTOMER ID COPIED';
    } else if (type === 'ticketId') {
      textToCopy = (value || '').trim();
      toastMsg = '✅ TICKET ID COPIED';
    }

    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        showToast(toastMsg);
      })
      .catch((err) => {
        console.error('Failed to copy text: ', err);
        showToast(`❌ FAILED TO COPY`);
      });
  };

  const getTooltip = () => {
    if (isDisabled) {
      if (type === 'ticketId') return 'NO TICKET AVAILABLE';
      return 'NO VALUE AVAILABLE';
    }
    if (type === 'name') return 'COPY NAME';
    if (type === 'mobile') return 'COPY MOBILE NUMBER';
    if (type === 'customerId') return 'COPY CUSTOMER ID';
    if (type === 'ticketId') return 'COPY TICKET ID';
    return 'COPY';
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={isDisabled}
      className={`inline-flex items-center justify-center p-1 rounded-md text-[#5A5A40]/70 dark:text-[#ecece5]/65 hover:text-[#5A5A40] dark:hover:text-[#ecece5] transition-all duration-150 cursor-pointer min-w-[32px] min-h-[32px] select-none ${
        isDisabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[#5A5A40]/5 dark:hover:bg-[#8a8a70]/10'
      } ${className}`}
      title={getTooltip()}
      aria-label={getTooltip()}
    >
      <Copy className="w-4 h-4 shrink-0" />
    </button>
  );
}
