export interface AdditionalNumber {
  id: string;
  number: string;
  type: 'Secondary' | 'Additional';
}

export interface Customer {
  id: string;
  name: string;
  mobileNumber: string;
  whatsAppNumber?: string;
  imoNumber?: string;
  destinationCountry?: string;
  source?: string; // Facebook, Walk-in, Reference, Website, Other
  remarks?: string;
  createdAt: string;
  customerCategory?: string;
  address?: string;
  gender?: string;
  additionalNumbers?: AdditionalNumber[];
  isArchived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
  restoredAt?: string;
  restoredBy?: string;
  permanentlyDeletedAt?: string;
  permanentlyDeletedBy?: string;
}

export type TicketStatus = 'Open' | 'Closed';

export interface Ticket {
  id: string; // e.g., TKT-000001
  customerId: string;
  name: string;
  mobileNumber: string;
  conversationDescription: string;
  status: TicketStatus;
  createdAt: string;
}

export type FollowUpStatus = 'Pending' | 'Completed';

export interface FollowUp {
  id: string; // e.g. FUP-000001
  customerId: string;
  name: string;
  mobileNumber: string;
  followUpDate: string; // YYYY-MM-DD
  followUpTime: string; // HH:MM
  notes: string;
  status: FollowUpStatus;
  createdAt: string;
}

export interface TicketComment {
  id: string; // e.g. CMT-000001
  ticketId: string;
  customerId: string;
  parentTicketId?: string;
  comment: string;
  isInternalNote: boolean;
  commentedBy: string;
  createdAt: string;
  updatedAt?: string;
  status?: string;
}

export interface TicketActivity {
  id: string; // e.g. ACT-000001
  ticketId: string;
  action: string;
  performedBy: string;
  timestamp: string;
  details?: string;
}

export interface User {
  id: string; // e.g., USR-000001
  fullName: string;
  loginId: string;
  password: string; // Stored password
  role: 'Admin' | 'Staff';
  status: 'Active' | 'Disabled';
  createdAt: string;
}

export interface CRMData {
  customers: Customer[];
  tickets: Ticket[];
  followUps: FollowUp[];
  users?: User[];
  comments?: TicketComment[];
  ticketActivities?: TicketActivity[];
}

export interface SyncConfig {
  webAppUrl: string;
  isLiveMode: boolean;
  spreadsheetId?: string;
  setupComplete?: boolean;
}
