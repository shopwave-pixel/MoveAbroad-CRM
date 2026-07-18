import React, { useState } from 'react';
import { motion, useAnimation } from 'motion/react';
import { Edit2, Plus, Archive, Phone, MessageSquare } from 'lucide-react';
import { Customer, Ticket, FollowUp } from '../types';
import { Card, Badge } from './ui';
import SmartContactActions from './SmartContactActions';
import InlineCopy from './InlineCopy';

interface SwipeableCustomerCardProps {
  key?: React.Key;
  customer: Customer;
  tickets: Ticket[];
  followUps: FollowUp[];
  onSelectCustomer: (customer: Customer) => void;
  onEditCustomer: (customer: Customer) => void;
  onAddTicket: (customerId: string) => void;
  onArchiveCustomer?: (customerId: string) => void;
  isHighlighted?: boolean;
}

export default function SwipeableCustomerCard({
  customer,
  tickets,
  followUps,
  onSelectCustomer,
  onEditCustomer,
  onAddTicket,
  onArchiveCustomer,
  isHighlighted = false
}: SwipeableCustomerCardProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const controls = useAnimation();
  const isMounted = React.useRef(false);

  React.useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const customerTickets = tickets.filter(t => t.customerId === customer.id);
  const customerFollowUps = followUps.filter(f => f.customerId === customer.id);

  const latestTicket = customerTickets.length > 0
    ? customerTickets.reduce((latest, current) =>
        new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest
      , customerTickets[0])
    : null;

  // Formatting helper for WhatsApp deep links
  const getFormattedWhatsAppNumber = (num: string) => {
    let clean = num.replace(/\D/g, '');
    if (clean.startsWith('0') && clean.length === 11) {
      clean = '88' + clean;
    }
    return clean;
  };

  const handleWhatsApp = () => {
    const num = customer.whatsAppNumber || customer.mobileNumber;
    const formatted = getFormattedWhatsAppNumber(num);
    if (formatted) {
      window.open(`https://wa.me/${formatted}`, '_blank');
    }
  };

  const handleImo = () => {
    const num = customer.imoNumber || customer.mobileNumber;
    const cleanNumber = num.replace(/\D/g, '');
    if (cleanNumber) {
      window.location.href = `imo://chat?phone=${cleanNumber}`;
      setTimeout(() => {
        window.open(`https://web.imo.im/`, '_blank');
      }, 1500);
    }
  };

  const handleDragEnd = (event: any, info: any) => {
    if (!isMounted.current) return;
    const threshold = 80;
    const offset = info.offset.x;

    if (offset < -threshold) {
      // Swiped Left - Reveal Edit, Add Ticket, Archive
      controls.start({ x: -160, transition: { type: 'spring', stiffness: 300, damping: 25 } }).catch(() => {});
      setSwipeOffset(-160);
    } else if (offset > threshold) {
      // Swiped Right - Reveal Call, WhatsApp, IMO
      controls.start({ x: 160, transition: { type: 'spring', stiffness: 300, damping: 25 } }).catch(() => {});
      setSwipeOffset(160);
    } else {
      // Snap Back
      controls.start({ x: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } }).catch(() => {});
      setSwipeOffset(0);
    }
  };

  const resetSwipe = () => {
    if (isMounted.current) {
      controls.start({ x: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } }).catch(() => {});
      setSwipeOffset(0);
    }
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl border shadow-xs touch-pan-y group transition-all duration-500 ${isHighlighted ? 'border-emerald-500 dark:border-emerald-500 ring-2 ring-emerald-500/50 scale-[1.01] shadow-md' : 'border-[#5A5A40]/10 dark:border-zinc-800'}`}>
      
      {/* UNDERLAY ACTIONS */}
      
      {/* Left Underlay (Revealed on Swipe Right) -> Contacts */}
      <div className="absolute inset-y-0 left-0 w-40 flex items-center bg-emerald-50 dark:bg-emerald-950/20 divide-x divide-emerald-200/30 dark:divide-emerald-900/20 z-0">
        <a
          href={`tel:${customer.mobileNumber.replace(/\s+/g, '')}`}
          className="flex-1 h-full flex flex-col items-center justify-center gap-1 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 transition-colors"
          title="Call Primary Number"
          onClick={resetSwipe}
        >
          <Phone className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase">Call</span>
        </a>
        <button
          onClick={() => {
            handleWhatsApp();
            resetSwipe();
          }}
          className="flex-1 h-full flex flex-col items-center justify-center gap-1 text-[#25D366] hover:bg-[#25D366]/10 transition-colors cursor-pointer"
          title="WhatsApp Chat"
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase">WhatsApp</span>
        </button>
        <button
          onClick={() => {
            handleImo();
            resetSwipe();
          }}
          className="flex-1 h-full flex flex-col items-center justify-center gap-1 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-950/30 transition-colors cursor-pointer"
          title="IMO Chat"
        >
          <div className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center text-[8px] font-black leading-none">
            imo
          </div>
          <span className="text-[10px] font-bold uppercase">IMO</span>
        </button>
      </div>

      {/* Right Underlay (Revealed on Swipe Left) -> CRM Management */}
      <div className="absolute inset-y-0 right-0 w-40 flex items-center bg-slate-50 dark:bg-zinc-900/40 divide-x divide-slate-200/30 dark:divide-zinc-800/30 z-0 justify-end">
        <button
          onClick={() => {
            onEditCustomer(customer);
            resetSwipe();
          }}
          className="flex-1 h-full flex flex-col items-center justify-center gap-1 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors cursor-pointer"
          title="Edit Details"
        >
          <Edit2 className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase">Edit</span>
        </button>
        <button
          onClick={() => {
            onAddTicket(customer.id);
            resetSwipe();
          }}
          className="flex-1 h-full flex flex-col items-center justify-center gap-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors cursor-pointer"
          title="Add Support Ticket"
        >
          <Plus className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase">Ticket</span>
        </button>
        <button
          onClick={() => {
            if (onArchiveCustomer) {
              onArchiveCustomer(customer.id);
            }
            resetSwipe();
          }}
          className="flex-1 h-full flex flex-col items-center justify-center gap-1 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer"
          title="Archive Profile"
        >
          <Archive className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase">Archive</span>
        </button>
      </div>

      {/* FOREGROUND SWIPEABLE CARD CONTENT */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -160, right: 160 }}
        dragElastic={0.4}
        onDragEnd={handleDragEnd}
        animate={controls}
        className={`relative z-10 transition-colors duration-500 cursor-grab active:cursor-grabbing ${isHighlighted ? 'bg-emerald-50/20 dark:bg-emerald-950/25 animate-pulse' : 'bg-white dark:bg-[#1C1C14]'}`}
      >
        <Card
          id={`customer-card-${customer.id}`}
          borderTopColor="green"
          className="flex flex-col justify-between gap-4 border-0 rounded-none shadow-none"
        >
          {/* Profile Header */}
          <div className="flex items-start justify-between gap-2">
            <div 
              onClick={() => onSelectCustomer(customer)}
              className="space-y-1 cursor-pointer flex-1"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <h3 className="font-serif font-bold text-[#1F2937] dark:text-[#ecece5] text-sm group-hover:text-primary-olive dark:group-hover:text-[#f5f5f0] transition-colors uppercase">
                  {customer.name}
                </h3>
                <InlineCopy type="name" value={customer.name} className="min-w-[24px] min-h-[24px] p-0.5" />
                
                <Badge variant="olive" outline className="gap-0 px-1.5 py-0.2 rounded-md font-bold">
                  {customer.id}
                  <InlineCopy type="customerId" value={customer.id} className="min-w-[20px] min-h-[20px] p-0" />
                </Badge>

                {customer.customerCategory && (
                  <Badge variant="olive" className="px-1.5 py-0.2 rounded-md font-bold uppercase text-[9px]">
                    {customer.customerCategory}
                  </Badge>
                )}

                {customer.gender && (
                  <Badge variant="slate" className="px-1.5 py-0.2 rounded-md font-bold uppercase text-[9px]">
                    {customer.gender}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-[#8a8a70]">
                <span className="flex items-center gap-1 font-semibold">
                  📱 {customer.mobileNumber}
                  <InlineCopy type="mobile" value={customer.mobileNumber} className="min-w-[24px] min-h-[24px] p-0.5" />
                </span>
                {customer.whatsAppNumber && customer.whatsAppNumber !== customer.mobileNumber && (
                  <span className="flex items-center gap-1">
                    💬 WA: {customer.whatsAppNumber}
                  </span>
                )}
                {customer.imoNumber && customer.imoNumber !== customer.mobileNumber && (
                  <span className="flex items-center gap-1">
                    📞 IMO: {customer.imoNumber}
                  </span>
                )}
                {latestTicket && (
                  <span className="flex items-center gap-1 font-semibold">
                    🎫 {latestTicket.id}
                    <InlineCopy type="ticketId" value={latestTicket.id} className="min-w-[24px] min-h-[24px] p-0.5" />
                  </span>
                )}
                {customer.destinationCountry && (
                  <span className="flex items-center gap-1">🌍 {customer.destinationCountry}</span>
                )}
              </div>
            </div>

            {/* Hint Chevron or reset swipe handler */}
            {swipeOffset !== 0 ? (
              <button 
                onClick={resetSwipe}
                className="p-1 text-xs font-bold bg-[#5A5A40]/10 text-[#5A5A40] dark:text-[#ecece5] rounded-lg cursor-pointer"
              >
                Reset
              </button>
            ) : (
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-[10px] font-bold text-slate-300 dark:text-zinc-600 animate-pulse select-none hidden sm:inline">Swipe Left/Right</span>
              </div>
            )}
          </div>

          {/* Info and quick actions footer */}
          <div className="pt-3 border-t border-gray-200 dark:border-[#8a8a70]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Badge variant="blue">🎫 {customerTickets.length} TICKETS</Badge>
              <Badge variant="purple">📅 {customerFollowUps.length} FOLLOWUPS</Badge>
            </div>

            <div className="flex items-center">
              <SmartContactActions
                mobileNumber={customer.mobileNumber}
                customerName={customer.name}
                customerId={customer.id}
                ticketId={latestTicket?.id}
                additionalNumbers={customer.additionalNumbers}
              />
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
