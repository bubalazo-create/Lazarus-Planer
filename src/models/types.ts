export type ProjectStatus = 'Planned' | 'Active' | 'On Hold' | 'Completed';
export type AssignmentStatus = 'Planned' | 'In Progress' | 'Completed';

export interface Worker {
  id: string;
  name: string;
  colour: string;
  trade: string;
  active: boolean;
  notes: string;
  phone?: string;
  email?: string;
  paymentType?: 'daily' | 'project';
  dailyRate?: number;
}

export interface WorkerEarning {
  id: string;
  workerId: string;
  date: string;
  projectId?: string;
  description: string;
  amount: number;
  notes?: string;
}

export interface WorkerPayment {
  id: string;
  workerId: string;
  projectId?: string;
  invoiceId?: string;
  date: string;
  amount: number;
  method: 'Cash' | 'Bank Transfer' | 'Revolut' | 'Other';
  notes?: string;
  invoiceNumber?: string;
}

export interface Project {
  id: string;
  name?: string;
  clientId?: string;
  client: string;
  address: string;
  startDate: string; // ISO date string YYYY-MM-DD
  targetEndDate: string;
  status: ProjectStatus;
  colour: string;
  notes: string;
  totalValue?: number;
  completedAt?: string;
}

export interface Assignment {
  id: string;
  workerId: string;
  projectId: string;
  title: string;
  clientName?: string;
  startDate: string; // ISO date string YYYY-MM-DD
  endDate: string;
  status: AssignmentStatus;
  notes: string;
}

export interface ConflictInfo {
  assignment: Assignment;
  project: Project;
  dates: string[]; // conflicting date strings
}

export interface Client {
  id: string;
  name: string;
  vatNumber?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt?: string;
}


export interface ClientInvoice {
  id: string;
  projectId: string;
  date: string;
  invoiceNumber?: string;
  netAmount: number;
  vatRate: number;
  vatAmount: number;
  grossAmount: number;
  notes?: string;
}

export interface ProjectClientPayment {
  id: string;
  projectId: string;
  invoiceId?: string;
  date: string;
  amount: number;
  method: 'Cash' | 'Bank Transfer' | 'Revolut' | 'Other';
  notes?: string;
}

export interface SubcontractorInvoice {
  id: string;
  workerId: string;
  date: string;
  invoiceNumber?: string;
  totalAmount: number; // Represents the NET amount
  notes?: string;
  vatStatus?: 'registered' | 'exempt';
  vatRate?: number;
  vatAmount?: number;
  grossAmount?: number;
}

export interface SubcontractorInvoiceAllocation {
  id: string;
  invoiceId: string;
  type?: 'project' | 'other';
  projectId?: string;
  description?: string;
  amount: number;
}


export type ExpenseCategory = 'Materials' | 'Skips / Waste' | 'Tools' | 'Transport' | 'Fuel' | 'Salaries' | 'Other';

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  vatStatus?: 'registered' | 'exempt';
  vatRate?: number;
  vatAmount?: number;
  grossAmount?: number;
}

export interface ExpenseAllocation {
  id: string;
  expenseId: string;
  projectId?: string;
  amount: number;
}
