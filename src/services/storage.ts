import { Worker, Project, Assignment, Client, WorkerEarning, WorkerPayment, ProjectClientPayment, WorkflowActivity } from '../models/types';
import { getDatesInRange } from '../utils/dateUtils';
import { v4 as uuidv4 } from 'uuid';

export interface DataService {
  getWorkers(): Worker[];
  getWorker(id: string): Worker | undefined;
  saveWorker(worker: Worker): Worker;
  deleteWorker(id: string): void;

  getProjects(): Project[];
  getProject(id: string): Project | undefined;
  saveProject(project: Project): Project;
  deleteProject(id: string): void;

  getClients(): Client[];
  getClient(id: string): Client | undefined;
  saveClient(client: Client): Client;
  deleteClient(id: string): void;

  getAssignments(): Assignment[];
  getAssignment(id: string): Assignment | undefined;
  saveAssignment(assignment: Assignment): Assignment;
  deleteAssignment(id: string): void;

  getAssignmentsForWorker(workerId: string): Assignment[];
  getAssignmentsForProject(projectId: string): Assignment[];
  getAssignmentsInRange(startDate: string, endDate: string): Assignment[];

  getWorkerEarnings(): WorkerEarning[];
  saveWorkerEarning(earning: WorkerEarning): WorkerEarning;
  deleteWorkerEarning(id: string): void;

  getWorkerPayments(): WorkerPayment[];
  saveWorkerPayment(payment: WorkerPayment): WorkerPayment;
  deleteWorkerPayment(id: string): void;

  getProjectClientPayments(): ProjectClientPayment[];
  saveProjectClientPayment(payment: ProjectClientPayment): ProjectClientPayment;
  deleteProjectClientPayment(id: string): void;

  getSubcontractorInvoices(): import('../models/types').SubcontractorInvoice[];
  getSubcontractorInvoiceAllocations(): import('../models/types').SubcontractorInvoiceAllocation[];
  saveSubcontractorInvoice(invoice: import('../models/types').SubcontractorInvoice, allocations: import('../models/types').SubcontractorInvoiceAllocation[]): { invoice: import('../models/types').SubcontractorInvoice, allocations: import('../models/types').SubcontractorInvoiceAllocation[] };
  deleteSubcontractorInvoice(id: string): void;

  getWorkflowActivities(): WorkflowActivity[];
  saveWorkflowActivity(activity: WorkflowActivity): WorkflowActivity;
  deleteWorkflowActivity(id: string): void;
}

export class LocalStorageService implements DataService {
  private workersKey = 'lazarus_workers';
  private projectsKey = 'lazarus_projects';
  private assignmentsKey = 'lazarus_assignments';

  private getItems<T>(key: string): T[] {
    const data = localStorage.getItem(key);
    if (!data || data === 'undefined') return [];
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error(`Failed to parse localStorage data for key ${key}:`, e);
      return [];
    }
  }

  private setItems<T>(key: string, items: T[]): void {
    localStorage.setItem(key, JSON.stringify(items));
  }

  getWorkers(): Worker[] {
    return this.getItems<Worker>(this.workersKey);
  }

  getWorker(id: string): Worker | undefined {
    return this.getWorkers().find(w => w.id === id);
  }

  saveWorker(worker: Worker): Worker {
    const workers = this.getWorkers();
    const index = workers.findIndex(w => w.id === worker.id);
    const workerToSave = worker.id ? worker : { ...worker, id: uuidv4() };
    
    if (index >= 0) {
      workers[index] = workerToSave;
    } else {
      workers.push(workerToSave);
    }
    this.setItems(this.workersKey, workers);
    return workerToSave;
  }

  deleteWorker(id: string): void {
    const workers = this.getWorkers().filter(w => w.id !== id);
    this.setItems(this.workersKey, workers);
  }

  getProjects(): Project[] {
    return this.getItems<Project>(this.projectsKey);
  }

  getProject(id: string): Project | undefined {
    return this.getProjects().find(p => p.id === id);
  }

  saveProject(project: Project): Project {
    const projects = this.getProjects();
    const index = projects.findIndex(p => p.id === project.id);
    const projectToSave = project.id ? project : { ...project, id: uuidv4() };

    if (index >= 0) {
      projects[index] = projectToSave;
    } else {
      projects.push(projectToSave);
    }
    this.setItems(this.projectsKey, projects);
    return projectToSave;
  }

  deleteProject(id: string): void {
    const projects = this.getProjects().filter(p => p.id !== id);
    this.setItems(this.projectsKey, projects);
  }

  getClients(): Client[] {
    return this.getItems<Client>('lazarus_clients');
  }

  getClient(id: string): Client | undefined {
    return this.getClients().find(c => c.id === id);
  }

  saveClient(client: Client): Client {
    const clients = this.getClients();
    const index = clients.findIndex(c => c.id === client.id);
    const clientToSave = client.id ? client : { ...client, id: uuidv4() };

    if (index >= 0) {
      clients[index] = clientToSave;
    } else {
      clients.push(clientToSave);
    }
    this.setItems('lazarus_clients', clients);
    return clientToSave;
  }

  deleteClient(id: string): void {
    const clients = this.getClients().filter(c => c.id !== id);
    this.setItems('lazarus_clients', clients);
  }

  getAssignments(): Assignment[] {
    return this.getItems<Assignment>(this.assignmentsKey);
  }

  getAssignment(id: string): Assignment | undefined {
    return this.getAssignments().find(a => a.id === id);
  }

  saveAssignment(assignment: Assignment): Assignment {
    const assignments = this.getAssignments();
    const index = assignments.findIndex(a => a.id === assignment.id);
    const assignmentToSave = assignment.id ? assignment : { ...assignment, id: uuidv4() };

    if (index >= 0) {
      assignments[index] = assignmentToSave;
    } else {
      assignments.push(assignmentToSave);
    }
    this.setItems(this.assignmentsKey, assignments);
    return assignmentToSave;
  }

  saveAssignments(assignments: Assignment[]): void {
    this.setItems(this.assignmentsKey, assignments);
  }

  deleteAssignment(id: string): void {
    const assignments = this.getAssignments().filter(a => a.id !== id);
    this.setItems(this.assignmentsKey, assignments);
  }

  getAssignmentsForWorker(workerId: string): Assignment[] {
    return this.getAssignments().filter(a => a.workerId === workerId);
  }

  getAssignmentsForProject(projectId: string): Assignment[] {
    return this.getAssignments().filter(a => a.projectId === projectId);
  }

  getAssignmentsInRange(startDate: string, endDate: string): Assignment[] {
    const rangeDates = getDatesInRange(startDate, endDate);
    return this.getAssignments().filter(a => {
      const assignmentDates = getDatesInRange(a.startDate, a.endDate);
      return assignmentDates.some(d => rangeDates.includes(d));
    });
  }

  getWorkerEarnings(): WorkerEarning[] {
    return this.getItems<WorkerEarning>('lazarus_worker_earnings');
  }

  saveWorkerEarning(earning: WorkerEarning): WorkerEarning {
    const earnings = this.getWorkerEarnings();
    const index = earnings.findIndex(e => e.id === earning.id);
    const earningToSave = earning.id ? earning : { ...earning, id: uuidv4() };

    if (index >= 0) {
      earnings[index] = earningToSave;
    } else {
      earnings.push(earningToSave);
    }
    this.setItems('lazarus_worker_earnings', earnings);
    return earningToSave;
  }

  deleteWorkerEarning(id: string): void {
    const earnings = this.getWorkerEarnings().filter(e => e.id !== id);
    this.setItems('lazarus_worker_earnings', earnings);
  }

  getWorkerPayments(): WorkerPayment[] {
    return this.getItems<WorkerPayment>('lazarus_worker_payments');
  }

  saveWorkerPayment(payment: WorkerPayment): WorkerPayment {
    const payments = this.getWorkerPayments();
    const index = payments.findIndex(p => p.id === payment.id);
    const paymentToSave = payment.id ? payment : { ...payment, id: uuidv4() };

    if (index >= 0) {
      payments[index] = paymentToSave;
    } else {
      payments.push(paymentToSave);
    }
    this.setItems('lazarus_worker_payments', payments);
    return paymentToSave;
  }

  deleteWorkerPayment(id: string): void {
    const payments = this.getWorkerPayments().filter(p => p.id !== id);
    this.setItems('lazarus_worker_payments', payments);
  }

  getProjectClientPayments(): ProjectClientPayment[] {
    return this.getItems<ProjectClientPayment>('lazarus_project_client_payments');
  }

  saveProjectClientPayment(payment: ProjectClientPayment): ProjectClientPayment {
    const payments = this.getProjectClientPayments();
    const index = payments.findIndex(p => p.id === payment.id);
    const paymentToSave = payment.id ? payment : { ...payment, id: uuidv4() };

    if (index >= 0) {
      payments[index] = paymentToSave;
    } else {
      payments.push(paymentToSave);
    }
    this.setItems('lazarus_project_client_payments', payments);
    return paymentToSave;
  }

  deleteProjectClientPayment(id: string): void {
    const payments = this.getProjectClientPayments().filter(p => p.id !== id);
    this.setItems('lazarus_project_client_payments', payments);
  }

  getSubcontractorInvoices(): import('../models/types').SubcontractorInvoice[] {
    return this.getItems<import('../models/types').SubcontractorInvoice>('lazarus_subcontractor_invoices');
  }

  getSubcontractorInvoiceAllocations(): import('../models/types').SubcontractorInvoiceAllocation[] {
    return this.getItems<import('../models/types').SubcontractorInvoiceAllocation>('lazarus_subcontractor_invoice_allocations');
  }

  saveSubcontractorInvoice(
    invoice: import('../models/types').SubcontractorInvoice, 
    allocations: import('../models/types').SubcontractorInvoiceAllocation[]
  ): { invoice: import('../models/types').SubcontractorInvoice, allocations: import('../models/types').SubcontractorInvoiceAllocation[] } {
    const invoices = this.getSubcontractorInvoices();
    const invoiceIndex = invoices.findIndex(i => i.id === invoice.id);
    const invoiceToSave = invoice.id ? invoice : { ...invoice, id: uuidv4() };

    if (invoiceIndex >= 0) {
      invoices[invoiceIndex] = invoiceToSave;
    } else {
      invoices.push(invoiceToSave);
    }
    this.setItems('lazarus_subcontractor_invoices', invoices);

    const allAllocations = this.getSubcontractorInvoiceAllocations();
    // Remove existing allocations for this invoice
    const filteredAllocations = allAllocations.filter(a => a.invoiceId !== invoiceToSave.id);
    
    // Assign correct invoiceId and new IDs if needed
    const allocationsToSave = allocations.map(a => ({
      ...a,
      invoiceId: invoiceToSave.id,
      id: a.id || uuidv4()
    }));

    this.setItems('lazarus_subcontractor_invoice_allocations', [...filteredAllocations, ...allocationsToSave]);

    return { invoice: invoiceToSave, allocations: allocationsToSave };
  }

  deleteSubcontractorInvoice(id: string): void {
    const invoices = this.getSubcontractorInvoices().filter(i => i.id !== id);
    this.setItems('lazarus_subcontractor_invoices', invoices);

    const allocations = this.getSubcontractorInvoiceAllocations().filter(a => a.invoiceId !== id);
    this.setItems('lazarus_subcontractor_invoice_allocations', allocations);
  }

  getWorkflowActivities(): WorkflowActivity[] {
    return this.getItems<WorkflowActivity>('lazarus_workflow_activities');
  }

  saveWorkflowActivity(activity: WorkflowActivity): WorkflowActivity {
    const activities = this.getWorkflowActivities();
    const index = activities.findIndex(a => a.id === activity.id);
    const activityToSave = activity.id ? activity : { ...activity, id: uuidv4() };

    if (index >= 0) {
      activities[index] = activityToSave;
    } else {
      activities.push(activityToSave);
    }
    this.setItems('lazarus_workflow_activities', activities);
    return activityToSave;
  }

  deleteWorkflowActivity(id: string): void {
    const activities = this.getWorkflowActivities().filter(a => a.id !== id);
    this.setItems('lazarus_workflow_activities', activities);
  }
}
