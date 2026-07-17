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
}

export interface SyncConfig {
  webAppUrl: string;
  isLiveMode: boolean;
  spreadsheetId?: string;
  setupComplete?: boolean;
}
