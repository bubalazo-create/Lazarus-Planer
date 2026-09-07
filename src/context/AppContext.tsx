import React, { createContext, useReducer, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { Assignment, Project, Worker, Client, WorkerEarning, WorkerPayment, ProjectClientPayment, SubcontractorInvoice, SubcontractorInvoiceAllocation, ClientInvoice, Expense, ExpenseAllocation, WorkflowActivity } from '../models/types';
import { LocalStorageService } from '../services/storage';
import { addDays, formatDate, getDatesInRange } from '../utils/dateUtils';
import { parseISO } from 'date-fns';
import { removeOrMoveDateFromAssignment } from '../utils/assignmentUtils';
import { WORKER_PALETTE, PROJECT_PALETTE, getAutoAssignedColor } from '../utils/colorPalette';
import { backupService } from '../services/backup';

export interface AppState {
  workers: Worker[];
  projects: Project[];
  clients: Client[];
  assignments: Assignment[];
  workerEarnings: WorkerEarning[];
  workerPayments: WorkerPayment[];
  projectClientPayments: ProjectClientPayment[];
  clientInvoices: ClientInvoice[];
  subcontractorInvoices: SubcontractorInvoice[];
  subcontractorInvoiceAllocations: SubcontractorInvoiceAllocation[];
  expenses: Expense[];
  expenseAllocations: ExpenseAllocation[];
  workflowActivities: WorkflowActivity[];
  loaded: boolean;
}

type Action =
  | { type: 'SET_ALL'; workers: Worker[]; projects: Project[]; clients: Client[]; assignments: Assignment[]; workerEarnings: WorkerEarning[]; workerPayments: WorkerPayment[]; projectClientPayments: ProjectClientPayment[]; clientInvoices: ClientInvoice[]; subcontractorInvoices: SubcontractorInvoice[]; subcontractorInvoiceAllocations: SubcontractorInvoiceAllocation[]; expenses: Expense[]; expenseAllocations: ExpenseAllocation[]; workflowActivities: WorkflowActivity[] }
  | { type: 'ADD_WORKER'; worker: Worker }
  | { type: 'UPDATE_WORKER'; worker: Worker }
  | { type: 'DELETE_WORKER'; id: string }
  | { type: 'ADD_PROJECT'; project: Project }
  | { type: 'UPDATE_PROJECT'; project: Project }
  | { type: 'DELETE_PROJECT'; id: string }
  | { type: 'ADD_CLIENT'; client: Client }
  | { type: 'UPDATE_CLIENT'; client: Client }
  | { type: 'DELETE_CLIENT'; id: string }
  | { type: 'ADD_ASSIGNMENT'; assignment: Assignment }
  | { type: 'UPDATE_ASSIGNMENT'; assignment: Assignment }
  | { type: 'DELETE_ASSIGNMENT'; id: string }
  | { type: 'MOVE_ASSIGNMENT'; id: string; daysDelta: number }
  | { type: 'COPY_ASSIGNMENT'; id: string; daysDelta: number; newId: string }
  | { type: 'MOVE_SINGLE_DAY_ASSIGNMENT'; id: string; originalDate: string; targetDate: string }
  | { type: 'COPY_SINGLE_DAY_ASSIGNMENT'; id: string; targetDate: string; newId: string }
  | { type: 'DELETE_SINGLE_DAY_ASSIGNMENT'; id: string; targetDate: string }
  | { type: 'ADD_WORKER_EARNING'; earning: WorkerEarning }
  | { type: 'UPDATE_WORKER_EARNING'; earning: WorkerEarning }
  | { type: 'DELETE_WORKER_EARNING'; id: string }
  | { type: 'ADD_WORKER_PAYMENT'; payment: WorkerPayment }
  | { type: 'UPDATE_WORKER_PAYMENT'; payment: WorkerPayment }
  | { type: 'DELETE_WORKER_PAYMENT'; id: string }
  | { type: 'ADD_PROJECT_CLIENT_PAYMENT'; payment: ProjectClientPayment }
  | { type: 'UPDATE_PROJECT_CLIENT_PAYMENT'; payment: ProjectClientPayment }
  | { type: 'DELETE_PROJECT_CLIENT_PAYMENT'; id: string }
  | { type: 'ADD_CLIENT_INVOICE'; invoice: ClientInvoice }
  | { type: 'UPDATE_CLIENT_INVOICE'; invoice: ClientInvoice }
  | { type: 'DELETE_CLIENT_INVOICE'; id: string }
  | { type: 'ADD_SUBCONTRACTOR_INVOICE'; invoice: SubcontractorInvoice; allocations: SubcontractorInvoiceAllocation[] }
  | { type: 'UPDATE_SUBCONTRACTOR_INVOICE'; invoice: SubcontractorInvoice; allocations: SubcontractorInvoiceAllocation[] }
  | { type: 'DELETE_SUBCONTRACTOR_INVOICE'; id: string }
  | { type: 'ADD_EXPENSE'; expense: Expense; allocations: ExpenseAllocation[] }
  | { type: 'UPDATE_EXPENSE'; expense: Expense; allocations: ExpenseAllocation[] }
  | { type: 'DELETE_EXPENSE'; id: string }
  | { type: 'ADD_WORKFLOW_ACTIVITY'; activity: WorkflowActivity }
  | { type: 'UPDATE_WORKFLOW_ACTIVITY'; activity: WorkflowActivity }
  | { type: 'DELETE_WORKFLOW_ACTIVITY'; id: string };

const initialState: AppState = {
  workers: [],
  projects: [],
  clients: [],
  assignments: [],
  workerEarnings: [],
  workerPayments: [],
  projectClientPayments: [],
  clientInvoices: [],
  subcontractorInvoices: [],
  subcontractorInvoiceAllocations: [],
    expenses: [],
    expenseAllocations: [],
    workflowActivities: [],
    loaded: false
};

const storage = new LocalStorageService();

const isValidHex = (hex: string) => /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);

const ensureValidColor = (color: string, existingColors: string[], palette: string[]) => {
  if (color && isValidHex(color)) return color;
  return getAutoAssignedColor(existingColors, palette);
};

// ── PURE REDUCER — no I/O, no side-effects ──────────────────────────────
function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_ALL': {
      let workerColors: string[] = [];
      const workers = action.workers.map(w => {
        const colour = ensureValidColor(w.colour, workerColors, WORKER_PALETTE);
        workerColors.push(colour);
        return { ...w, colour };
      });
      
      let projectColors: string[] = [];
      const projects = action.projects.map(p => {
        const colour = ensureValidColor(p.colour, projectColors, PROJECT_PALETTE);
        projectColors.push(colour);
        return { ...p, colour };
      });

      return {
        ...state,
        workers: workers || [],
        projects: projects || [],
        clients: action.clients || [],
        assignments: action.assignments || [],
        workerEarnings: action.workerEarnings || [],
        workerPayments: action.workerPayments || [],
        projectClientPayments: action.projectClientPayments || [],
        clientInvoices: action.clientInvoices || [],
        subcontractorInvoices: action.subcontractorInvoices || [],
        subcontractorInvoiceAllocations: action.subcontractorInvoiceAllocations || [],
          expenses: action.expenses || [],
          expenseAllocations: action.expenseAllocations || [],
          workflowActivities: action.workflowActivities || [],
          loaded: true,
      };
    }
    case 'ADD_WORKER':
    case 'UPDATE_WORKER': {
      const existingIndex = state.workers.findIndex(w => w.id === action.worker.id);
      const workers = [...state.workers];
      
      const existingColors = state.workers.filter(w => w.id !== action.worker.id).map(w => w.colour);
      const workerToSave = {
        ...action.worker,
        colour: ensureValidColor(action.worker.colour, existingColors, WORKER_PALETTE)
      };

      if (existingIndex >= 0) {
        workers[existingIndex] = workerToSave;
      } else {
        workers.push(workerToSave);
      }
      return { ...state, workers };
    }
    // C-2: Cascading delete — remove worker AND all related records
    case 'DELETE_WORKER': {
      const wId = action.id;
      // Find invoices belonging to this worker so we can remove their allocations
      const workerInvoiceIds = state.subcontractorInvoices
        .filter(i => i.workerId === wId)
        .map(i => i.id);
      return {
        ...state,
        workers: state.workers.filter(w => w.id !== wId),
        assignments: state.assignments.filter(a => a.workerId !== wId),
        workerEarnings: state.workerEarnings.filter(e => e.workerId !== wId),
        workerPayments: state.workerPayments.filter(p => p.workerId !== wId),
        subcontractorInvoices: state.subcontractorInvoices.filter(i => i.workerId !== wId),
        subcontractorInvoiceAllocations: state.subcontractorInvoiceAllocations.filter(
          a => !workerInvoiceIds.includes(a.invoiceId)
        ),
      };
    }
    case 'ADD_PROJECT':
    case 'UPDATE_PROJECT': {
      const existingIndex = state.projects.findIndex(p => p.id === action.project.id);
      const projects = [...state.projects];
      
      const existingColors = state.projects.filter(p => p.id !== action.project.id).map(p => p.colour);
      const projectToSave = {
        ...action.project,
        colour: ensureValidColor(action.project.colour, existingColors, PROJECT_PALETTE)
      };

      if (existingIndex >= 0) {
        projects[existingIndex] = projectToSave;
      } else {
        projects.push(projectToSave);
      }
      return { ...state, projects };
    }
    // C-2: Cascading delete — remove project AND all related records
    case 'DELETE_PROJECT': {
      const pId = action.id;
        return {
          ...state,
          projects: state.projects.filter(p => p.id !== pId),
          assignments: state.assignments.filter(a => a.projectId !== pId),
          workerEarnings: state.workerEarnings.filter(e => e.projectId !== pId),
          workerPayments: state.workerPayments.filter(p => p.projectId !== pId),
          projectClientPayments: state.projectClientPayments.filter(p => p.projectId !== pId),
          clientInvoices: state.clientInvoices.filter(i => i.projectId !== pId),
          subcontractorInvoiceAllocations: state.subcontractorInvoiceAllocations.filter(
          a => a.projectId !== pId
        ),
          workflowActivities: state.workflowActivities.filter(a => a.projectId !== pId),
      };
    }
    case 'ADD_CLIENT':
    case 'UPDATE_CLIENT': {
      const existingIndex = state.clients.findIndex(c => c.id === action.client.id);
      const clients = [...state.clients];
      if (existingIndex >= 0) {
        clients[existingIndex] = action.client;
      } else {
        clients.push(action.client);
      }
      return { ...state, clients };
    }
    // C-2: Cascading delete — clear clientId references on projects
    case 'DELETE_CLIENT': {
      const cId = action.id;
      return {
        ...state,
        clients: state.clients.filter(c => c.id !== cId),
        projects: state.projects.map(p =>
          p.clientId === cId ? { ...p, clientId: undefined } : p
        ),
      };
    }
    case 'ADD_ASSIGNMENT':
    case 'UPDATE_ASSIGNMENT': {
      const existingIndex = state.assignments.findIndex(a => a.id === action.assignment.id);
      const assignments = [...state.assignments];
      if (existingIndex >= 0) {
        assignments[existingIndex] = action.assignment;
      } else {
        assignments.push(action.assignment);
      }
      return { ...state, assignments };
    }
    case 'DELETE_ASSIGNMENT':
      return { ...state, assignments: state.assignments.filter(a => a.id !== action.id) };
    case 'MOVE_ASSIGNMENT': {
      const assignments = state.assignments.map(a => {
        if (a.id === action.id) {
          const newStart = addDays(parseISO(a.startDate), action.daysDelta);
          const newEnd = addDays(parseISO(a.endDate), action.daysDelta);
          return {
            ...a,
            startDate: formatDate(newStart),
            endDate: formatDate(newEnd),
          };
        }
        return a;
      });
      return { ...state, assignments };
    }
    case 'COPY_ASSIGNMENT': {
      const assignmentToCopy = state.assignments.find(a => a.id === action.id);
      if (!assignmentToCopy) return state;

      const newStart = addDays(parseISO(assignmentToCopy.startDate), action.daysDelta);
      const newEnd = addDays(parseISO(assignmentToCopy.endDate), action.daysDelta);
      
      const newAssignment = {
        ...assignmentToCopy,
        id: action.newId,
        startDate: formatDate(newStart),
        endDate: formatDate(newEnd),
      };
      
      return { ...state, assignments: [...state.assignments, newAssignment] };
    }
    case 'COPY_SINGLE_DAY_ASSIGNMENT': {
      const assignmentToCopy = state.assignments.find(a => a.id === action.id);
      if (!assignmentToCopy) return state;

      const newAssignment = {
        ...assignmentToCopy,
        id: action.newId,
        startDate: action.targetDate,
        endDate: action.targetDate,
      };

      return { ...state, assignments: [...state.assignments, newAssignment] };
    }
    case 'MOVE_SINGLE_DAY_ASSIGNMENT':
    case 'DELETE_SINGLE_DAY_ASSIGNMENT': {
      const isMove = action.type === 'MOVE_SINGLE_DAY_ASSIGNMENT';
      const id = action.id;
      const originalDate = isMove ? (action as { originalDate: string }).originalDate : (action as { targetDate: string }).targetDate;
      const targetDate = isMove ? (action as { targetDate: string }).targetDate : undefined;
      
      const assignmentIndex = state.assignments.findIndex(a => a.id === id);
      if (assignmentIndex === -1) return state;

      const originalAssignment = state.assignments[assignmentIndex];
      const workerId = originalAssignment.workerId;
      
      const newAssignments = removeOrMoveDateFromAssignment(originalAssignment, originalDate, targetDate);

      // Filter out the old assignment
      let others = state.assignments.filter(a => a.id !== id);
      
      // Combine with new ones
      const workerAssignments = others.filter(a => a.workerId === workerId).concat(newAssignments);
      others = others.filter(a => a.workerId !== workerId);
      
      // Normalize (merge adjacent assignments for this worker)
      const grouped = new Map<string, Assignment[]>();
      for (const a of workerAssignments) {
        const key = `${a.projectId}|${a.title || ''}|${a.status || ''}|${a.notes || ''}`;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(a);
      }

      const mergedWorkerAssignments: Assignment[] = [];
      for (const group of grouped.values()) {
        group.sort((a, b) => parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime());
        if (group.length === 0) continue;
        
        const merged: Assignment[] = [{...group[0]}];
        for (let i = 1; i < group.length; i++) {
          const current = group[i];
          const lastMerged = merged[merged.length - 1];
          
          const lastEnd = parseISO(lastMerged.endDate);
          const currentStart = parseISO(current.startDate);
          const diff = Math.round((currentStart.getTime() - lastEnd.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diff <= 1) {
            const currentEnd = parseISO(current.endDate);
            if (currentEnd.getTime() > lastEnd.getTime()) {
              lastMerged.endDate = current.endDate;
            }
          } else {
            merged.push({...current});
          }
        }
        mergedWorkerAssignments.push(...merged);
      }
      
      const finalAssignments = [...others, ...mergedWorkerAssignments];
      return { ...state, assignments: finalAssignments };
    }
    // ── Financial entities: pure state transforms, no storage calls ──
    case 'ADD_WORKER_EARNING':
      return { ...state, workerEarnings: [...state.workerEarnings, action.earning] };
    case 'UPDATE_WORKER_EARNING':
      return { ...state, workerEarnings: state.workerEarnings.map(e => e.id === action.earning.id ? action.earning : e) };
    case 'DELETE_WORKER_EARNING':
      return { ...state, workerEarnings: state.workerEarnings.filter(e => e.id !== action.id) };
    case 'ADD_WORKER_PAYMENT':
      return { ...state, workerPayments: [...state.workerPayments, action.payment] };
    case 'UPDATE_WORKER_PAYMENT':
      return { ...state, workerPayments: state.workerPayments.map(p => p.id === action.payment.id ? action.payment : p) };
    case 'DELETE_WORKER_PAYMENT':
      return { ...state, workerPayments: state.workerPayments.filter(p => p.id !== action.id) };
    case 'ADD_CLIENT_INVOICE':
      return { ...state, clientInvoices: [...state.clientInvoices, action.invoice] };
    case 'UPDATE_CLIENT_INVOICE':
      return { ...state, clientInvoices: state.clientInvoices.map(i => i.id === action.invoice.id ? action.invoice : i) };
    case 'DELETE_CLIENT_INVOICE':
      return {
        ...state,
        clientInvoices: state.clientInvoices.filter(i => i.id !== action.id),
        projectClientPayments: state.projectClientPayments.map(p => p.invoiceId === action.id ? { ...p, invoiceId: undefined } : p)
      };
    case 'ADD_PROJECT_CLIENT_PAYMENT':
      return { ...state, projectClientPayments: [...state.projectClientPayments, action.payment] };
    case 'UPDATE_PROJECT_CLIENT_PAYMENT':
      return { ...state, projectClientPayments: state.projectClientPayments.map(p => p.id === action.payment.id ? action.payment : p) };
    case 'DELETE_PROJECT_CLIENT_PAYMENT':
      return { ...state, projectClientPayments: state.projectClientPayments.filter(p => p.id !== action.id) };
    case 'ADD_SUBCONTRACTOR_INVOICE':
      return { 
        ...state, 
        subcontractorInvoices: [...state.subcontractorInvoices, action.invoice],
        subcontractorInvoiceAllocations: [...state.subcontractorInvoiceAllocations, ...action.allocations]
      };
    case 'UPDATE_SUBCONTRACTOR_INVOICE':
      return { 
        ...state, 
        subcontractorInvoices: state.subcontractorInvoices.map(i => i.id === action.invoice.id ? action.invoice : i),
        subcontractorInvoiceAllocations: [
          ...state.subcontractorInvoiceAllocations.filter(a => a.invoiceId !== action.invoice.id),
          ...action.allocations
        ]
      };
    case 'DELETE_SUBCONTRACTOR_INVOICE': {
      return { 
        ...state, 
        subcontractorInvoices: state.subcontractorInvoices.filter(i => i.id !== action.id),
        subcontractorInvoiceAllocations: state.subcontractorInvoiceAllocations.filter(a => a.invoiceId !== action.id),
        workerPayments: state.workerPayments.filter(p => p.invoiceId !== action.id),
      };
    }
    case 'ADD_EXPENSE':
        return { 
          ...state, 
          expenses: [...state.expenses, action.expense],
          expenseAllocations: [...state.expenseAllocations, ...action.allocations]
        };
      case 'UPDATE_EXPENSE':
        return { 
          ...state, 
          expenses: state.expenses.map(e => e.id === action.expense.id ? action.expense : e),
          expenseAllocations: [
            ...state.expenseAllocations.filter(a => a.expenseId !== action.expense.id),
            ...action.allocations
          ]
        };
      case 'DELETE_EXPENSE':
        return { 
          ...state, 
          expenses: state.expenses.filter(e => e.id !== action.id),
          expenseAllocations: state.expenseAllocations.filter(a => a.expenseId !== action.id)
        };
      case 'ADD_WORKFLOW_ACTIVITY':
        return { ...state, workflowActivities: [...state.workflowActivities, action.activity] };
      case 'UPDATE_WORKFLOW_ACTIVITY':
        return { ...state, workflowActivities: state.workflowActivities.map(a => a.id === action.activity.id ? action.activity : a) };
      case 'DELETE_WORKFLOW_ACTIVITY':
        return { ...state, workflowActivities: state.workflowActivities.filter(a => a.id !== action.id) };
      default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export type { Action };

// H-1: Safe localStorage write with quota error handling
function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    console.error(`localStorage write failed for key "${key}":`, e);
    return false;
  }
}

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [persistError, setPersistError] = useState<string | null>(null);
  const hasLoaded = useRef(false);

  // Load data on mount
  useEffect(() => {
    backupService.runPeriodicBackupIfNeeded();
    
    const workers = storage.getWorkers();
    const projects = storage.getProjects();
    const clients = storage.getClients();
    const assignments = storage.getAssignments();
    const workerEarnings = storage.getWorkerEarnings();
    const workerPayments = storage.getWorkerPayments();
    const projectClientPayments = storage.getProjectClientPayments();
    
    let clientInvoices: ClientInvoice[] = [];
      let expenses: Expense[] = [];
      let expenseAllocations: ExpenseAllocation[] = [];
      try {
        const stored = localStorage.getItem('lazarus_client_invoices');
        if (stored) {
          clientInvoices = JSON.parse(stored);
          let modified = false;
          clientInvoices = clientInvoices.map((inv: any) => {
             if (inv.date && inv.date.includes('/')) {
                const parts = inv.date.split('/');
                if (parts.length === 3) {
                   modified = true;
                   return { ...inv, date: `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}` };
                }
             }
             return inv;
          });
          if (modified) {
             localStorage.setItem('lazarus_client_invoices', JSON.stringify(clientInvoices));
          }
        }
        const storedE = localStorage.getItem('lazarus_expenses');
        if (storedE) expenses = JSON.parse(storedE);
        const storedEA = localStorage.getItem('lazarus_expense_allocations');
        if (storedEA) expenseAllocations = JSON.parse(storedEA);
      } catch (e) {
        console.error("Error loading invoices or expenses", e);
      }

    const subcontractorInvoices = storage.getSubcontractorInvoices();
    const subcontractorInvoiceAllocations = storage.getSubcontractorInvoiceAllocations();
    const workflowActivities = storage.getWorkflowActivities();
    dispatch({ type: 'SET_ALL', workers, projects, clients, assignments, workerEarnings, workerPayments, projectClientPayments, clientInvoices, subcontractorInvoices, subcontractorInvoiceAllocations, expenses, expenseAllocations, workflowActivities });
    hasLoaded.current = true;
  }, []);

  // ── SINGLE persistence mechanism ──────────────────────────────────────
  // This is the ONLY place that writes application data to localStorage.
  useEffect(() => {
    if (!state.loaded || !hasLoaded.current) return;
    
    let allOk = true;
    allOk = safeSetItem('lazarus_workers', JSON.stringify(state.workers)) && allOk;
    allOk = safeSetItem('lazarus_projects', JSON.stringify(state.projects)) && allOk;
    allOk = safeSetItem('lazarus_clients', JSON.stringify(state.clients)) && allOk;
    allOk = safeSetItem('lazarus_assignments', JSON.stringify(state.assignments)) && allOk;
    allOk = safeSetItem('lazarus_worker_earnings', JSON.stringify(state.workerEarnings)) && allOk;
    allOk = safeSetItem('lazarus_worker_payments', JSON.stringify(state.workerPayments)) && allOk;
    allOk = safeSetItem('lazarus_project_client_payments', JSON.stringify(state.projectClientPayments)) && allOk;
    allOk = safeSetItem('lazarus_client_invoices', JSON.stringify(state.clientInvoices)) && allOk;
    allOk = safeSetItem('lazarus_subcontractor_invoices', JSON.stringify(state.subcontractorInvoices)) && allOk;
    allOk = safeSetItem('lazarus_subcontractor_invoice_allocations', JSON.stringify(state.subcontractorInvoiceAllocations)) && allOk;
    allOk = safeSetItem('lazarus_expenses', JSON.stringify(state.expenses)) && allOk;
    allOk = safeSetItem('lazarus_expense_allocations', JSON.stringify(state.expenseAllocations)) && allOk;
    allOk = safeSetItem('lazarus_workflow_activities', JSON.stringify(state.workflowActivities)) && allOk;
    
    if (!allOk) {
      setPersistError('⚠️ Storage limit reached. Some changes may not have been saved. Please export a backup immediately.');
    } else {
      setPersistError(null);
    }
  }, [state]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {persistError && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999,
          background: '#dc2626', color: 'white', padding: '12px 24px',
          textAlign: 'center', fontWeight: 600, fontSize: '0.95rem'
        }}>
          {persistError}
        </div>
      )}
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within an AppProvider');
  return context;
};

export const useWorker = (id: string) => {
  const { state } = useAppContext();
  return state.workers.find(w => w.id === id);
};

export const useProject = (id: string) => {
  const { state } = useAppContext();
  return state.projects.find(p => p.id === id);
};

export const useAssignmentsForWorker = (workerId: string, startDate?: string, endDate?: string) => {
  const { state } = useAppContext();
  let assignments = state.assignments.filter(a => a.workerId === workerId);
  if (startDate && endDate) {
    const rangeDates = getDatesInRange(startDate, endDate);
    assignments = assignments.filter(a => {
      const assignmentDates = getDatesInRange(a.startDate, a.endDate);
      return assignmentDates.some(d => rangeDates.includes(d));
    });
  }
  return assignments;
};

export const useAssignmentsForProject = (projectId: string, startDate?: string, endDate?: string) => {
  const { state } = useAppContext();
  let assignments = state.assignments.filter(a => a.projectId === projectId);
  if (startDate && endDate) {
    const rangeDates = getDatesInRange(startDate, endDate);
    assignments = assignments.filter(a => {
      const assignmentDates = getDatesInRange(a.startDate, a.endDate);
      return assignmentDates.some(d => rangeDates.includes(d));
    });
  }
  return assignments;
};
