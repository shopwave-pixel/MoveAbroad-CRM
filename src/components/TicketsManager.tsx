import React, { useState, useEffect } from 'react';
import { Customer, Ticket, TicketStatus, FollowUp, TicketComment, TicketActivity, SyncConfig, User as CRMUser } from '../types';
import SuccessCheckmark from './SuccessCheckmark';
import SmartGlobalSearch from './SmartGlobalSearch';
import SmartContactActions from './SmartContactActions';
import SearchableCustomerDropdown from './SearchableCustomerDropdown';
import InlineCopy from './InlineCopy';
import { 
  Button, 
  Input, 
  Select, 
  TextArea, 
  FormGroup, 
  Card, 
  Badge, 
  Alert 
} from './ui';
import { 
  FilePlus2, 
  User, 
  Phone, 
  AlignLeft, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Search, 
  SlidersHorizontal, 
  Trash2, 
  Edit2, 
  X, 
  Check, 
  Clock, 
  Plus, 
  AlertTriangle,
  History,
  Info,
  MessageSquare,
  Lock,
  Send,
  ChevronDown,
  ChevronUp,
  ShieldAlert
} from 'lucide-react';
import {
  createComment,
  getComments,
  deleteComment,
  getTicketActivities
} from '../utils/crmApi';

interface TicketsManagerProps {
  customers: Customer[];
  tickets: Ticket[];
  followUps: FollowUp[];
  onAddCustomer: (
    name: string, 
    mobileNumber: string,
    whatsAppNumber?: string,
    destinationCountry?: string,
    source?: string,
    remarks?: string,
    imoNumber?: string
  ) => Promise<{ success: boolean; customer?: Customer; error?: string }>;
  onCreateTicket: (
    customerId: string,
    name: string,
    mobileNumber: string,
    conversationDescription: string,
    status: TicketStatus
  ) => Promise<{ success: boolean; ticket?: Ticket; error?: string }>;
  onUpdateTicket: (id: string, updates: Partial<Ticket>) => Promise<{ success: boolean; message?: string; error?: string }>;
  onDeleteTicket: (id: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  preselectedCustomerId?: string;
  config?: SyncConfig;
  currentUser?: CRMUser | null;
}

const TicketsManager = React.memo(function TicketsManager({
  customers,
  tickets,
  followUps,
  onAddCustomer,
  onCreateTicket,
  onUpdateTicket,
  onDeleteTicket,
  preselectedCustomerId,
  config,
  currentUser
}: TicketsManagerProps) {
  // Mode toggles
  const [subView, setSubView] = useState<'list' | 'create'>('list');
  const [isAddingCustomerInline, setIsAddingCustomerInline] = useState(false);
  
  // Create Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerMobile, setNewCustomerMobile] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TicketStatus>('Open');

  // Ticket Details State
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<string, TicketComment[]>>({});
  const [activitiesMap, setActivitiesMap] = useState<Record<string, TicketActivity[]>>({});
  
  // New Comment Form State
  const [newCommentText, setNewCommentText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [isAddingComment, setIsAddingComment] = useState(false);

  const loadTicketDetails = async (ticketId: string) => {
    if (!config) return;
    try {
      const [cRes, aRes] = await Promise.all([
        getComments(config, ticketId),
        getTicketActivities(config, ticketId)
      ]);
      if (cRes.success && cRes.comments) {
        setCommentsMap(prev => ({ ...prev, [ticketId]: cRes.comments! }));
      }
      if (aRes.success && aRes.activities) {
        setActivitiesMap(prev => ({ ...prev, [ticketId]: aRes.activities! }));
      }
    } catch (e) {
      console.error("Failed to load ticket details", e);
    }
  };

  const handleToggleExpandTicket = (ticketId: string) => {
    if (expandedTicketId === ticketId) {
      setExpandedTicketId(null);
    } else {
      setExpandedTicketId(ticketId);
      loadTicketDetails(ticketId);
    }
  };

  const handlePostComment = async (ticket: Ticket) => {
    if (!newCommentText.trim() || !config) return;
    setIsAddingComment(true);
    try {
      const res = await createComment(config, {
        ticketId: ticket.id,
        customerId: ticket.customerId,
        comment: newCommentText.trim(),
        isInternalNote: isInternalNote,
        commentedBy: currentUser?.fullName || 'Staff'
      });
      if (res.success && res.comment) {
        setCommentsMap(prev => ({
          ...prev,
          [ticket.id]: [...(prev[ticket.id] || []), res.comment!]
        }));
        setNewCommentText('');
        setIsInternalNote(false);
        const aRes = await getTicketActivities(config, ticket.id);
        if (aRes.success && aRes.activities) {
          setActivitiesMap(prev => ({ ...prev, [ticket.id]: aRes.activities! }));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAddingComment(false);
    }
  };

  // Customer Search query state (specifically for creating tickets)
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  // Filtered list of customers for selection in form based on name, mobile, customer ID, or any of their Ticket IDs
  const [ticketSearchInput, setTicketSearchInput] = useState('');
  const [isTicketSearchOpen, setIsTicketSearchOpen] = useState(false);
  const ticketSearchRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ticketSearchRef.current && !ticketSearchRef.current.contains(e.target as Node)) {
        setIsTicketSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchedTickets = React.useMemo(() => {
    const q = ticketSearchInput.toLowerCase().trim();
    if (!q) return [];
    return tickets.filter(t => 
      t.id.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q) ||
      t.mobileNumber.toLowerCase().includes(q) ||
      t.customerId.toLowerCase().includes(q)
    );
  }, [ticketSearchInput, tickets]);

  // Filtered list of customers for selection in form based on name, mobile, customer ID, or any of their Ticket IDs
  const filteredCustomersForSelect = React.useMemo(() => {
    const q = customerSearchQuery.toLowerCase().trim();
    if (!q) return [];
    return customers.filter(c => {
      const nameMatch = c.name.toLowerCase().includes(q);
      const mobileMatch = c.mobileNumber.toLowerCase().includes(q);
      const idMatch = c.id.toLowerCase().includes(q);
      const ticketMatch = tickets.some(t => t.customerId === c.id && t.id.toLowerCase().includes(q));
      return nameMatch || mobileMatch || idMatch || ticketMatch;
    });
  }, [customerSearchQuery, customers, tickets]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | TicketStatus>('All');
  const [visibleCount, setVisibleCount] = useState(20);

  // Reset pagination when filter or search changes
  useEffect(() => {
    setVisibleCount(20);
  }, [searchQuery, statusFilter, ticketSearchInput]);

  // Edit Ticket Modal State
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [editStatus, setEditStatus] = useState<TicketStatus>('Open');
  const [editComments, setEditComments] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editSuccessMsg, setEditSuccessMsg] = useState('');
  const [editErrorMsg, setEditErrorMsg] = useState('');

  const handleOpenEditModal = (t: Ticket) => {
    setEditingTicket(t);
    setEditStatus(t.status);
    setEditComments(''); // Always empty per workflow requirement
    setEditSuccessMsg('');
    setEditErrorMsg('');
  };

  const handleSaveEditTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTicket) return;
    if (!editComments.trim()) {
      setEditErrorMsg('Comments are required.');
      return;
    }

    setIsSavingEdit(true);
    setEditErrorMsg('');
    setEditSuccessMsg('');

    try {
      const cfg = config || { webAppUrl: '', isLiveMode: false };
      const updaterName = currentUser?.fullName || 'Staff';

      // 1. Create a new Ticket History entry
      const cRes = await createComment(cfg, {
        ticketId: editingTicket.id,
        customerId: editingTicket.customerId,
        parentTicketId: editingTicket.id,
        comment: editComments.trim(),
        commentedBy: updaterName
      });

      if (cRes.success && cRes.comment) {
        setCommentsMap(prev => ({
          ...prev,
          [editingTicket.id]: [cRes.comment!, ...(prev[editingTicket.id] || [])]
        }));
      }

      // 2. Update Parent Ticket Status if changed
      const uRes = await onUpdateTicket(editingTicket.id, {
        status: editStatus
      });

      if (uRes.success || cRes.success) {
        setEditSuccessMsg('✅ Ticket Updated Successfully');
        setTimeout(() => {
          setEditingTicket(null);
          setEditSuccessMsg('');
        }, 1200);
      } else {
        setEditErrorMsg(uRes.error || cRes.error || 'Failed to update ticket.');
      }
    } catch (err: any) {
      setEditErrorMsg(err.message || 'An error occurred while updating the ticket.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Status indicator
  const [alert, setAlert] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message: string }>({
    type: 'idle',
    message: ''
  });

  // Handle pre-selection of candidate profile
  useEffect(() => {
    if (preselectedCustomerId) {
      setSubView('create');
      setSelectedCustomerId(preselectedCustomerId);
    } else {
      setSelectedCustomerId('');
    }
  }, [preselectedCustomerId]);

  // Handle Form Submission (Create Ticket)
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      setAlert({ type: 'error', message: 'Ticket description is required.' });
      return;
    }

    setAlert({ type: 'loading', message: 'Generating support ticket...' });

    try {
      let existing = customers.find(c => c.id === selectedCustomerId);
      if (!existing && newCustomerMobile) {
        existing = customers.find(c => c.mobileNumber.replace(/\D/g, '') === newCustomerMobile.replace(/\D/g, ''));
      }
      if (!existing && newCustomerName) {
        existing = customers.find(c => c.name.toLowerCase() === newCustomerName.toLowerCase());
      }
      if (!existing && customers.length > 0 && selectedCustomerId) {
        // Fallback if selectedCustomerId was transformed from temp ID to perm ID
        existing = customers[0];
      }

      if (!existing) {
        setAlert({ type: 'error', message: 'Please select a valid customer.' });
        return;
      }
      
      const finalCustomerId = existing.id;
      const finalName = existing.name;
      const finalMobile = existing.mobileNumber;

      // Create Ticket
      const res = await onCreateTicket(
        finalCustomerId,
        finalName,
        finalMobile,
        description.trim(),
        status
      );

      if (res.success && res.ticket) {
        setAlert({
          type: 'success',
          message: `Ticket ${res.ticket.id} created successfully!`
        });
        
        // Reset inputs
        setDescription('');
        setNewCustomerName('');
        setNewCustomerMobile('');
        setStatus('Open');
        
        // Transition back to list after a brief delay
        setTimeout(() => {
          setSubView('list');
          setAlert({ type: 'idle', message: '' });
        }, 1500);
      } else {
        setAlert({ type: 'error', message: res.error || 'Failed to generate ticket.' });
      }

    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'An unexpected error occurred.' });
    }
  };

  // Handle Deletes
  const handleDeleteTicket = async (id: string) => {
    setAlert({ type: 'loading', message: 'Deleting support ticket...' });
    try {
      const res = await onDeleteTicket(id);
      if (res.success) {
        setAlert({ type: 'success', message: 'Ticket deleted successfully!' });
        setTimeout(() => setAlert({ type: 'idle', message: '' }), 3000);
      } else {
        setAlert({ type: 'error', message: res.error || 'Failed to delete ticket.' });
      }
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'An unexpected error occurred.' });
    }
  };

  // Filter & Search Tickets list
  const filteredTickets = tickets
    .filter(t => {
      // Filter status
      if (statusFilter !== 'All' && t.status !== statusFilter) return false;
      
      // Search text matches (Ticket ID, Customer Name, Mobile)
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        t.id.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.mobileNumber.includes(q)
      );
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // Newest first

  const visibleTickets = React.useMemo(() => {
    return filteredTickets.slice(0, visibleCount);
  }, [filteredTickets, visibleCount]);

  // Auto-fetch comments history for visible tickets
  useEffect(() => {
    const cfg = config || { webAppUrl: '', isLiveMode: false };
    visibleTickets.forEach(t => {
      if (!commentsMap[t.id]) {
        getComments(cfg, t.id).then(res => {
          if (res.success && res.comments) {
            setCommentsMap(prev => ({ ...prev, [t.id]: res.comments! }));
          }
        });
      }
    });
  }, [visibleTickets, config]);

  const formatDateTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6" id="tickets-manager-container">
      
      {/* Dynamic Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-serif font-bold text-[#3B82F6] tracking-tight uppercase">Support Tickets</h2>
          <p className="text-[13px] text-gray-400 font-bold uppercase">Track customer documentation, requests & general support histories</p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSubView(subView === 'list' ? 'create' : 'list');
              setAlert({ type: 'idle', message: '' });
            }}
            id="btn-toggle-ticket-view"
            className="inline-flex items-center gap-1.5 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold text-[13px] px-5 py-2.5 rounded-full shadow-md shadow-[#3B82F6]/10 transition-colors cursor-pointer h-11"
          >
            {subView === 'list' ? (
              <>
                <Plus className="w-4 h-4" />
                <span>File Ticket</span>
              </>
            ) : (
              <>
                <History className="w-4 h-4" />
                <span>View Logs</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Global Status Banner using design system Alerts */}
      {alert.type === 'error' && (
        <Alert variant="error" id="ticket-alert-error">
          <span className="font-semibold uppercase">{alert.message}</span>
        </Alert>
      )}

      {alert.type === 'success' && (
        <div id="ticket-alert-success" className="p-4 bg-emerald-50/50 dark:bg-[#1b3a24]/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl flex flex-col items-center justify-center">
          <SuccessCheckmark size={36} message={alert.message} />
        </div>
      )}

      {alert.type === 'loading' && (
        <Alert variant="info" id="ticket-alert-loading">
          <span className="font-semibold uppercase">{alert.message}</span>
        </Alert>
      )}

      {/* VIEW 1: FILE NEW TICKET FORM using Card */}
      {subView === 'create' && (
        <Card borderTopColor="blue" className="space-y-5 animate-fade-in" id="ticket-form-card">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <FilePlus2 className="w-5 h-5 text-accent-blue" />
            <h3 className="font-serif font-bold text-sm text-accent-blue uppercase">Create Support Ticket</h3>
          </div>

          <form onSubmit={handleCreate} className="space-y-4" id="ticket-form">
            
            {/* If NO customer is selected, show Smart Search or inline customer registration */}
            {!selectedCustomerId ? (
              <div className="space-y-4">
                {isAddingCustomerInline ? (
                  /* Inline New Customer Creation Form */
                  <div className="p-4 bg-slate-50 dark:bg-[#1a1a15] rounded-2xl border border-gray-200 dark:border-[#8a8a70]/20 space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#8a8a70]/10 pb-2">
                      <h4 className="font-serif font-bold text-[13px] text-[#3B82F6] dark:text-[#60a5fa] uppercase">Add New Customer</h4>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingCustomerInline(false);
                          setNewCustomerName('');
                          setNewCustomerMobile('');
                        }}
                        className="text-[13px] font-bold text-gray-400 hover:text-gray-600 dark:text-[#8a8a70] dark:hover:text-[#ecece5] uppercase cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[13px] font-bold text-gray-500 dark:text-[#8a8a70] uppercase tracking-wider mb-1">
                          Full Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          className="w-full text-[13px] bg-white dark:bg-[#20201a] border border-gray-200 dark:border-[#8a8a70]/30 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-[#1F2937] dark:text-[#ecece5]"
                          placeholder="E.G. JOHN DOE"
                          value={newCustomerName}
                          onChange={(e) => setNewCustomerName(e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-[13px] font-bold text-gray-500 dark:text-[#8a8a70] uppercase tracking-wider mb-1">
                          Mobile Number <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="tel"
                          required
                          className="w-full text-[13px] bg-white dark:bg-[#20201a] border border-gray-200 dark:border-[#8a8a70]/30 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-[#1F2937] dark:text-[#ecece5]"
                          placeholder="E.G. +880 1712-345678"
                          value={newCustomerMobile}
                          onChange={(e) => setNewCustomerMobile(e.target.value)}
                        />
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={async () => {
                            const trimmedName = newCustomerName.trim();
                            const trimmedMobile = newCustomerMobile.trim();
                            if (!trimmedName || !trimmedMobile) {
                              setAlert({ type: 'error', message: 'Customer name and mobile number are required.' });
                              return;
                            }
                            // Quick duplicate check
                            const digitsInput = trimmedMobile.replace(/\D/g, '');
                            const duplicate = customers.some(c => c.mobileNumber.replace(/\D/g, '') === digitsInput);
                            if (duplicate) {
                              setAlert({ type: 'error', message: 'A customer with this mobile number already exists.' });
                              return;
                            }
                            
                            setAlert({ type: 'loading', message: 'Creating customer...' });
                            const res = await onAddCustomer(trimmedName, trimmedMobile);
                            if (res.success && res.customer) {
                              setAlert({ type: 'success', message: 'Customer created successfully.' });
                              setSelectedCustomerId(res.customer.id);
                              setNewCustomerName('');
                              setNewCustomerMobile('');
                              setIsAddingCustomerInline(false);
                              setCustomerSearchQuery('');
                            } else {
                              setAlert({ type: 'error', message: res.error || 'Failed to create customer.' });
                            }
                          }}
                          className="bg-[#10B981] hover:bg-[#059669] text-white px-5 py-2 rounded-full text-[13px] font-bold cursor-pointer transition-colors uppercase shadow-xs animate-none"
                        >
                          Save Customer
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingCustomerInline(false);
                            setNewCustomerName('');
                            setNewCustomerMobile('');
                          }}
                          className="border border-gray-200 dark:border-[#8a8a70]/30 hover:bg-gray-50 dark:hover:bg-[#1a1a15]/50 px-5 py-2 rounded-full text-[13px] font-bold text-gray-500 dark:text-[#8a8a70] cursor-pointer transition-colors uppercase"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Smart Customer Search box */
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Search Customer <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <Search className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        className="w-full text-xs bg-white border border-gray-200 rounded-xl pl-9 pr-3 py-3 focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent text-gray-800 transition-all font-bold"
                        placeholder="SEARCH CUSTOMER (NAME, MOBILE NUMBER, CUSTOMER ID OR TICKET ID)"
                        value={customerSearchQuery}
                        onChange={(e) => setCustomerSearchQuery(e.target.value)}
                      />
                    </div>

                    {/* Results Cards or Empty State */}
                    {customerSearchQuery.trim().length > 0 && (
                      <div className="space-y-2 mt-2">
                        {filteredCustomersForSelect.length > 0 ? (
                          filteredCustomersForSelect.map(c => {
                            // Find latest ticket info for this customer
                            const custTickets = tickets.filter(t => t.customerId === c.id);
                            const latest = custTickets.length > 0
                              ? custTickets.reduce((latest, current) => 
                                  new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest
                                , custTickets[0])
                              : null;

                            return (
                              <div
                                key={c.id}
                                onClick={() => {
                                  setSelectedCustomerId(c.id);
                                  setCustomerSearchQuery('');
                                }}
                                className="p-3 bg-white hover:bg-blue-50/50 border border-gray-100 hover:border-blue-100 rounded-2xl cursor-pointer transition-all flex items-start justify-between gap-3 shadow-xs"
                              >
                                <div>
                                  <div className="font-bold text-xs text-gray-800 flex items-center gap-1.5 uppercase">
                                    <span>👤</span> {c.name}
                                  </div>
                                  <div className="text-[10px] text-gray-400 flex flex-wrap gap-x-3 gap-y-0.5 mt-1 font-mono uppercase">
                                    <span>📱 {c.mobileNumber}</span>
                                    <span>🆔 {c.id}</span>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  {latest ? (
                                    <div className="space-y-1">
                                      <span className="font-mono text-[9px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold border border-blue-100">
                                        🎫 {latest.id}
                                      </span>
                                      <div className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border text-center ${
                                        latest.status === 'Open' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                                      }`}>
                                        {latest.status}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-[9px] text-gray-400 font-bold uppercase italic">No Ticket</span>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-4 bg-rose-50/25 border border-dashed border-rose-200 rounded-2xl text-center space-y-2.5">
                            <p className="text-xs text-rose-800 italic font-medium uppercase">No customer found.</p>
                            <button
                              type="button"
                              onClick={() => setIsAddingCustomerInline(true)}
                              className="inline-flex items-center gap-1 px-4 py-2 bg-[#3B82F6] text-white text-[10px] font-bold rounded-full hover:bg-[#2563EB] cursor-pointer transition-colors uppercase shadow-xs"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add New Customer</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {!customerSearchQuery.trim() && (
                      <div className="p-6 bg-slate-50 border border-dashed border-gray-200 rounded-2xl text-center text-xs text-gray-400 font-bold uppercase italic">
                        Please type in the box above to search for a customer.
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Selected Customer Card with load/timeline/history and Change Customer button */
              <div className="space-y-4">
                {(() => {
                  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
                  if (!selectedCustomer) return null;

                  const customerTickets = tickets.filter(t => t.customerId === selectedCustomer.id);
                  const customerFollowUps = followUps.filter(f => f.customerId === selectedCustomer.id);

                  const timelineItems = [
                    ...customerTickets.map(t => ({
                      id: t.id,
                      date: t.createdAt,
                      type: 'ticket' as const,
                      title: `Support Ticket (${t.status})`,
                      content: t.conversationDescription,
                    })),
                    ...customerFollowUps.map(f => ({
                      id: f.id,
                      date: f.createdAt || f.followUpDate,
                      type: 'followup' as const,
                      title: `Scheduled Follow-up`,
                      content: f.notes,
                    }))
                  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                  const latestTicketInfo = customerTickets.length > 0
                    ? customerTickets.reduce((latest, current) => 
                        new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest
                      , customerTickets[0])
                    : null;

                  return (
                    <div className="space-y-4">
                      {/* Customer Details Header */}
                      <div className="p-4 bg-slate-50 border border-gray-200 rounded-2xl space-y-4">
                        <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-3">
                          <div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Selected Customer</span>
                            <h4 className="font-serif font-bold text-sm text-gray-800 flex items-center gap-1.5 mt-0.5 uppercase">
                              <span>👤</span> {selectedCustomer.name}
                            </h4>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-500 uppercase font-bold">
                              <span className="flex items-center gap-1">📱 {selectedCustomer.mobileNumber}</span>
                              {selectedCustomer.destinationCountry && (
                                <span className="flex items-center gap-1">🌍 {selectedCustomer.destinationCountry}</span>
                              )}
                              {selectedCustomer.imoNumber && (
                                <span className="flex items-center gap-1 text-[9px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">IMO: {selectedCustomer.imoNumber}</span>
                              )}
                            </div>
                            <div className="text-[10px] mt-2 text-gray-400 font-bold uppercase">
                              Latest Ticket: {latestTicketInfo ? `${latestTicketInfo.id} (${latestTicketInfo.status})` : 'None'}
                            </div>
                          </div>
                          
                          <div className="text-right flex flex-col items-end gap-1.5">
                            <span className="font-mono text-[9px] bg-white border border-gray-200 px-2 py-0.5 rounded text-gray-500 font-bold block">
                              🆔 {selectedCustomer.id}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCustomerId('');
                                setCustomerSearchQuery('');
                              }}
                              className="px-2.5 py-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 text-[10px] font-bold rounded-md transition-colors cursor-pointer uppercase"
                            >
                              Change Customer
                            </button>
                          </div>
                        </div>

                        {/* Timeline Area */}
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                            Complete Conversation & Activity History (Newest First)
                          </span>
                          {timelineItems.length > 0 ? (
                            <div className="space-y-3">
                              {/* Latest Item Highlight */}
                              <div className="p-3 bg-white border border-gray-100 rounded-xl text-xs space-y-1 shadow-xs">
                                <div className="flex items-center justify-between">
                                  <span className={`font-bold uppercase text-[9px] px-2 py-0.5 rounded-full ${
                                    timelineItems[0].type === 'ticket' 
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                      : 'bg-amber-50 text-amber-700 border border-amber-100'
                                  }`}>
                                    {timelineItems[0].type === 'ticket' ? '🎫 Support Ticket' : '📅 Follow-up'}
                                  </span>
                                  <span className="text-[10px] font-mono text-gray-400">
                                    {new Date(timelineItems[0].date).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="font-bold text-gray-800 uppercase">{timelineItems[0].title}</p>
                                <p className="text-gray-500 italic">"{timelineItems[0].content}"</p>
                              </div>

                              {/* Full Scrollable Conversation History */}
                              {timelineItems.length > 1 && (
                                <div className="border-t border-gray-100 pt-3">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                                    Past History ({timelineItems.length} records)
                                  </span>
                                  <div className="max-h-36 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
                                    {timelineItems.slice(1).map((item, index) => (
                                      <div key={index} className="pl-3 border-l-2 border-blue-200 space-y-0.5 text-[11px]">
                                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase">
                                          <span>{item.type === 'ticket' ? '🎫' : '📅'}</span>
                                          <span>{new Date(item.date).toLocaleDateString()}</span>
                                          <span>•</span>
                                          <span>{item.title}</span>
                                        </div>
                                        <p className="text-gray-500 italic">"{item.content}"</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="p-3 bg-white border border-dashed border-gray-200 rounded-xl text-center text-[10px] text-gray-400 font-bold uppercase italic">
                              No historical activity or tickets logged yet for this customer.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Remaining Form Details */}
                      <div className="space-y-4">
                        {/* Status Selector */}
                        <div>
                          <label htmlFor="ticket-status" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                            Ticket Status <span className="text-rose-500">*</span>
                          </label>
                          <div className="grid grid-cols-2 gap-2" id="ticket-status-grid">
                            {(['Open', 'Closed'] as TicketStatus[]).map((st) => {
                              const isActive = status === st;
                              let activeColor = '';
                              let normalBorder = 'bg-white border-gray-200 text-gray-500 hover:bg-slate-50 hover:text-gray-700';
                              
                              if (isActive) {
                                if (st === 'Open') activeColor = 'bg-[#22C55E] text-white border-[#22C55E] shadow-xs';
                                if (st === 'Closed') activeColor = 'bg-[#EF4444] text-white border-[#EF4444] shadow-xs';
                              }

                              return (
                                <button
                                  key={st}
                                  type="button"
                                  id={`btn-status-${st.toLowerCase()}`}
                                  onClick={() => setStatus(st)}
                                  className={`py-2.5 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer uppercase ${
                                    isActive 
                                      ? activeColor 
                                      : normalBorder
                                  }`}
                                >
                                  {st}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Conversation Notes using design system FormGroup and TextArea */}
                        <FormGroup
                          label="Ticket Conversation Description"
                          required
                          htmlFor="ticket-description"
                        >
                          <div className="relative">
                            <div className="absolute top-3 left-3 text-gray-400">
                              <AlignLeft className="w-4 h-4" />
                            </div>
                            <TextArea
                              id="ticket-description"
                              required
                              rows={4}
                              className="pl-10 uppercase font-bold"
                              placeholder="DESCRIBE THE CURRENT INTERACTION, UPDATES OR SUPPORT DISCUSSION..."
                              value={description}
                              onChange={(e) => setDescription(e.target.value)}
                            />
                          </div>
                        </FormGroup>

                        {/* Submit Button using design system Button */}
                        <Button
                          type="submit"
                          id="btn-submit-ticket"
                          disabled={!selectedCustomerId}
                          variant="info"
                          size="lg"
                          className="w-full"
                          icon={<FilePlus2 className="w-4.5 h-4.5" />}
                        >
                          Save Ticket
                        </Button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </form>
        </Card>
      )}

      {/* VIEW 2: SEARCHABLE ALL TICKETS LIST */}
      {subView === 'list' && (
        <div className="space-y-4" id="tickets-history-list-view">
          
          {/* Search bar & filter controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            
            {/* Dedicated Ticket Search */}
            <div ref={ticketSearchRef} className="relative sm:col-span-2">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Search className="w-4.5 h-4.5" />
              </div>
              <input
                type="text"
                placeholder="Search Ticket (ID, Customer Name, Mobile, Customer ID)..."
                className="w-full text-xs bg-white border border-gray-200 rounded-xl pl-9 pr-8 py-3 focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-gray-800 font-bold uppercase"
                value={ticketSearchInput}
                onChange={(e) => {
                  setTicketSearchInput(e.target.value);
                  setIsTicketSearchOpen(true);
                }}
                onFocus={() => setIsTicketSearchOpen(true)}
              />
              {(ticketSearchInput || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setTicketSearchInput('');
                    setSearchQuery('');
                    setIsTicketSearchOpen(false);
                  }}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* Floating Dropdown Results */}
              {isTicketSearchOpen && ticketSearchInput.trim() !== '' && (
                <div className="absolute left-0 right-0 z-40 mt-1 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg divide-y divide-gray-100">
                  {searchedTickets.length > 0 ? (
                    searchedTickets.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setSearchQuery(t.id);
                          setTicketSearchInput(t.id); // Show Ticket ID in search box
                          setIsTicketSearchOpen(false);
                        }}
                        className="w-full text-left p-3 hover:bg-blue-50/50 transition-colors flex flex-col gap-1.5 cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded uppercase">
                            {t.id}
                          </span>
                          <span className={`text-[8px] font-bold uppercase px-1.5 rounded border ${
                            t.status === 'Open' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                              : 'bg-rose-50 text-rose-700 border-rose-100'
                          }`}>
                            {t.status}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <p className="text-xs font-bold text-gray-800 uppercase">{t.name}</p>
                          <p className="text-[10px] text-gray-400 font-mono">📱 {t.mobileNumber}</p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-center text-xs text-gray-400 font-bold uppercase italic">
                      No matching tickets found.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Filter Dropdown */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <select
                className="w-full text-xs bg-white border border-gray-200 rounded-xl pl-9 pr-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-[#3B82F6] appearance-none cursor-pointer text-gray-700 font-bold uppercase"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="All">All Ticket Statuses</option>
                <option value="Open">Open</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

          </div>

          {/* Table / List representation */}
          <div className="space-y-3.5" id="ticket-items-feed">
            {visibleTickets.length > 0 ? (
              <>
                {visibleTickets.map(t => {
                  let badgeStyle = '';
                  if (t.status === 'Open') badgeStyle = 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20';
                  else badgeStyle = 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20';

                  return (
                    <div
                      key={t.id}
                      id={`ticket-card-${t.id}`}
                      className="bg-white dark:bg-[#20201a] p-5 rounded-[20px] border border-[#E5E7EB] dark:border-[#8a8a70]/20 border-t-4 border-t-[#3B82F6] shadow-sm space-y-3 hover:-translate-y-1 hover:shadow-md transition-all duration-200"
                    >
                      
                      {/* Header line of card */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h4 className="font-serif font-bold text-sm text-[#1F2937] dark:text-[#ecece5] uppercase">{t.name}</h4>
                            <InlineCopy type="name" value={t.name} className="min-w-[24px] min-h-[24px] p-0.5" />
                            
                            <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold text-gray-500 bg-gray-100 dark:bg-[#151510] px-1.5 py-0.2 rounded-md">
                              {t.id}
                              <InlineCopy type="ticketId" value={t.id} className="min-w-[20px] min-h-[20px] p-0" />
                            </span>

                            <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold text-gray-400 bg-gray-50 dark:bg-[#151510] px-1.5 py-0.2 rounded-md">
                              CID: {t.customerId}
                              <InlineCopy type="customerId" value={t.customerId} className="min-w-[20px] min-h-[20px] p-0" />
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-[#6B7280] dark:text-[#8a8a70]/80">
                            <Phone className="w-3 h-3 text-[#5A5A40]/30" />
                            <span className="font-semibold">{t.mobileNumber}</span>
                            <InlineCopy type="mobile" value={t.mobileNumber} className="min-w-[24px] min-h-[24px] p-0.5" />
                          </div>
                        </div>

                        {/* Status badge */}
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border flex items-center gap-1 shrink-0 ${badgeStyle}`}>
                          {t.status === 'Open' && <Clock className="w-3 h-3 shrink-0" />}
                          {t.status}
                        </span>
                      </div>

                      {/* Description Notes Text */}
                      <div className="bg-slate-50 dark:bg-[#1a1a15] p-3 rounded-xl border border-gray-100 dark:border-[#8a8a70]/20">
                        <p className="text-xs text-gray-700 dark:text-[#ecece5] whitespace-pre-wrap leading-relaxed break-words font-sans">
                          {t.conversationDescription}
                        </p>
                      </div>

                      {/* Ticket Timeline History */}
                      {(() => {
                        const ticketComments = (commentsMap[t.id] || [])
                          .slice()
                          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

                        if (ticketComments.length === 0) return null;

                        return (
                          <div className="space-y-2 pt-1 border-t border-gray-100 dark:border-[#8a8a70]/20">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-gray-400 dark:text-[#8a8a70] uppercase tracking-wider">
                                Ticket Update History ({ticketComments.length})
                              </span>
                            </div>
                            <div className="space-y-2">
                              {ticketComments.map((cmt) => (
                                <div
                                  key={cmt.id}
                                  className="p-3 bg-slate-50/80 dark:bg-[#151510] rounded-xl border border-gray-200/80 dark:border-[#8a8a70]/20 space-y-1"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-gray-900 dark:text-[#ecece5] uppercase font-sans">
                                      {cmt.commentedBy}
                                    </span>
                                    <span className="text-[10px] text-gray-500 dark:text-[#8a8a70] font-sans font-semibold">
                                      {formatDateTime(cmt.createdAt)}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-800 dark:text-[#ecece5] whitespace-pre-wrap leading-relaxed break-words font-sans pt-0.5">
                                    {cmt.comment}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {(() => {
                        const customer = customers.find(c => c.id === t.customerId);
                        if (!customer) return null;
                        return (
                          <div className="pt-1 flex justify-end">
                            <SmartContactActions
                              customerName={customer.name}
                              mobileNumber={customer.mobileNumber}
                              whatsAppNumber={customer.whatsAppNumber}
                              imoNumber={customer.imoNumber}
                              customerId={customer.id}
                              ticketId={t.id}
                            />
                          </div>
                        );
                      })()}

                      {/* Card Actions Footer */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[9px] text-gray-400 uppercase tracking-wider font-bold font-sans">
                        <span>Opened: {formatDateTime(t.createdAt)}</span>
                        
                        {t.status === 'Open' && (
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(t)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#3B82F6] hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900/40 transition-all cursor-pointer"
                            title="Edit Ticket"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit (✏️)</span>
                          </button>
                        )}
                      </div>

                    </div>
                  );
                })}

                {filteredTickets.length > visibleCount && (
                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      onClick={() => setVisibleCount(prev => prev + 20)}
                      className="px-6 py-2.5 text-xs font-bold rounded-full bg-[#3B82F6] text-white hover:bg-[#2563EB] transition-all cursor-pointer shadow-sm uppercase tracking-wider animate-fade-in"
                    >
                      Show More Tickets (showing {visibleCount} of {filteredTickets.length})
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-[20px] border border-gray-200 p-12 text-center space-y-4 shadow-xs" id="tickets-empty-state">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-gray-400">
                  <AlignLeft className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-gray-800 text-sm uppercase">No tickets found</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 max-w-xs mx-auto">
                    {searchQuery 
                      ? `No logged visa support tickets match your search for "${searchQuery}".` 
                      : 'You do not have any logged visa support tickets.'}
                  </p>
                </div>
                {!searchQuery && (
                  <button
                    onClick={() => setSubView('create')}
                    className="inline-flex items-center gap-1.5 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold text-xs px-5 py-2.5 rounded-full shadow-md shadow-[#3B82F6]/10 transition-colors cursor-pointer uppercase h-11"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>File First Ticket</span>
                  </button>
                )}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Edit Ticket Modal */}
      {editingTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#1a1a15] border border-gray-200 dark:border-[#8a8a70]/30 rounded-2xl p-6 shadow-2xl max-w-md w-full space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#8a8a70]/20">
              <h4 className="font-serif font-bold text-sm text-gray-900 dark:text-[#ecece5] uppercase tracking-wide flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[#3B82F6]" />
                <span>Edit Ticket</span>
              </h4>
              <button
                type="button"
                onClick={() => setEditingTicket(null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 text-center animate-fade-in">
                {editSuccessMsg}
              </div>
            )}

            {editErrorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800 text-center animate-fade-in">
                {editErrorMsg}
              </div>
            )}

            <form onSubmit={handleSaveEditTicket} className="space-y-4 text-xs">
              {/* 1. Status * */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-[#ecece5] uppercase mb-1">
                  Status <span className="text-rose-500">*</span>
                </label>
                <select
                  className="w-full text-xs bg-white dark:bg-[#20201a] border border-gray-300 dark:border-[#8a8a70]/40 rounded-xl p-2.5 font-bold uppercase focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-gray-800 dark:text-[#ecece5]"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as TicketStatus)}
                >
                  <option value="Open">Open</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              {/* 2. Comments * */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-[#ecece5] uppercase mb-1">
                  Comments <span className="text-rose-500">*</span>
                </label>
                <textarea
                  placeholder="Enter comments..."
                  rows={5}
                  className="w-full text-xs bg-white dark:bg-[#20201a] border border-gray-300 dark:border-[#8a8a70]/40 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-gray-800 dark:text-[#ecece5]"
                  value={editComments}
                  onChange={(e) => setEditComments(e.target.value)}
                  required
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-[#8a8a70]/20">
                <button
                  type="button"
                  onClick={() => setEditingTicket(null)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-[#8a8a70] hover:bg-gray-100 dark:hover:bg-[#252520] rounded-xl cursor-pointer uppercase transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit || !editComments.trim()}
                  className="px-5 py-2 text-xs bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold rounded-xl cursor-pointer uppercase transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 shadow-md shadow-[#3B82F6]/20"
                >
                  {isSavingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
});

export default TicketsManager;
