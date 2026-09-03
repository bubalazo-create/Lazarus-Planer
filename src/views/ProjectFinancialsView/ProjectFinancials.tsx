import React, { useState } from 'react';
import { Project, WorkerEarning, WorkerPayment, SubcontractorInvoiceAllocation, ProjectClientPayment, Worker } from '../../models/types';
import { useAppContext } from '../../context/AppContext';
import Button from '../../components/common/Button';
import WorkerEarningForm from '../../components/Forms/WorkerEarningForm';
import WorkerPaymentForm from '../../components/Forms/WorkerPaymentForm';
import ProjectClientPaymentForm from '../../components/Forms/ProjectClientPaymentForm';
import ClientInvoiceForm from '../../components/Forms/ClientInvoiceForm';
import { ClientInvoice } from '../../models/types';
import DateInput from '../../components/common/DateInput';
import { parseISO, isWithinInterval, startOfDay, endOfDay, isSameYear, subYears, format } from 'date-fns';
import { generateProjectStatement } from '../../utils/pdfGenerator';
import styles from './ProjectFinancials.module.css';

interface ProjectFinancialsProps {
  projectId: string;
  onBack: () => void;
}

export default function ProjectFinancials({ projectId, onBack }: ProjectFinancialsProps) {
  const { state, dispatch } = useAppContext();
  const project = state.projects.find(p => p.id === projectId);
  const client = project ? state.clients.find(c => c.id === project.clientId) : null;

  const [filter, setFilter] = useState<'all_time' | 'year' | 'custom' | 'single_worker'>('all_time');
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  
  const today = new Date();
  const currentYear = today.getFullYear();
  const [customStartDate, setCustomStartDate] = useState(format(subYears(today, 1), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState(format(today, 'yyyy-MM-dd'));

  const [isEarningFormOpen, setIsEarningFormOpen] = useState(false);
  const [editingEarning, setEditingEarning] = useState<WorkerEarning | null>(null);

  const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<WorkerPayment | null>(null);
  
    const [isClientInvoiceFormOpen, setIsClientInvoiceFormOpen] = useState(false);
  const [editingClientInvoice, setEditingClientInvoice] = useState<ClientInvoice | null>(null);

  const [isClientPaymentFormOpen, setIsClientPaymentFormOpen] = useState(false);
  const [editingClientPayment, setEditingClientPayment] = useState<ProjectClientPayment | null>(null);
  const [payInvoiceId, setPayInvoiceId] = useState<string | undefined>(undefined);

  if (!project) {
    return <div className={styles.container}>Project not found.</div>;
  }

  const projectWorkerIds = Array.from(new Set([
    ...state.workerEarnings.filter(e => e.projectId === projectId).map(e => e.workerId),
    ...state.workerPayments.filter(p => p.projectId === projectId).map(p => p.workerId),
    ...state.subcontractorInvoiceAllocations.filter(a => a.projectId === projectId).map(a => {
      const invoice = state.subcontractorInvoices.find(i => i.id === a.invoiceId);
      return invoice?.workerId;
    }).filter(id => id !== undefined)
  ]));
  
  const activeWorkers = projectWorkerIds.map(id => {
    const w = state.workers.find(worker => worker.id === id);
    return w || { id, name: 'Former Worker', colour: '#999999' } as any;
  });

  const filterDate = (dateStr: string) => {
    if (filter === 'all_time' || filter === 'single_worker') return true;
    const d = parseISO(dateStr);
    if (filter === 'year') {
      return isSameYear(d, currentYear);
    }
    if (filter === 'custom') {
      if (!customStartDate && !customEndDate) return true;
      if (customStartDate && !customEndDate) return d >= startOfDay(parseISO(customStartDate));
      if (!customStartDate && customEndDate) return d <= endOfDay(parseISO(customEndDate));
      return isWithinInterval(d, { start: startOfDay(parseISO(customStartDate)), end: endOfDay(parseISO(customEndDate)) });
    }
    return true;
  };

  const filteredEarnings = state.workerEarnings
    .filter(e => e.projectId === projectId && filterDate(e.date) && (filter !== 'single_worker' || e.workerId === selectedWorkerId))
    .sort((a, b) => b.date.localeCompare(a.date));

  const filteredAllocations = state.subcontractorInvoiceAllocations
    .filter(a => a.projectId === projectId)
    .map(a => {
      const invoice = state.subcontractorInvoices.find(i => i.id === a.invoiceId);
      return { allocation: a, invoice };
    })
    .filter(({ invoice }) => invoice && filterDate(invoice.date) && (filter !== 'single_worker' || invoice.workerId === selectedWorkerId))
    .sort((a, b) => b.invoice!.date.localeCompare(a.invoice!.date));

  const filteredPayments = state.workerPayments
    .filter(p => p.projectId === projectId && filterDate(p.date) && (filter !== 'single_worker' || p.workerId === selectedWorkerId))
    .sort((a, b) => b.date.localeCompare(a.date));

  const filteredClientPayments = state.projectClientPayments
    .filter(p => p.projectId === projectId && filterDate(p.date))
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalWorkerEarned = filteredEarnings.reduce((sum, e) => sum + e.amount, 0);
  const totalSubcontractorEarned = filteredAllocations.reduce((sum, { allocation, invoice }) => {
      const isVatReg = invoice!.vatStatus === 'registered';
      const rate = invoice!.vatRate !== undefined ? invoice!.vatRate : 18;
      const aGross = isVatReg ? allocation.amount * (1 + rate / 100) : allocation.amount;
      return sum + aGross;
    }, 0);
    const totalEarned = totalWorkerEarned + totalSubcontractorEarned;
    
    let totalSubcontractorPaid = 0;
    const allocsByInvoice = new Map<string, typeof filteredAllocations>();
    filteredAllocations.forEach(item => {
      const invId = item.invoice!.id;
      if (!allocsByInvoice.has(invId)) allocsByInvoice.set(invId, []);
      allocsByInvoice.get(invId)!.push(item);
    });
  
    allocsByInvoice.forEach((projectItems, invId) => {
       const invPayments = state.workerPayments.filter(p => p.invoiceId === invId);
       const totalPaidOnInvoice = invPayments.reduce((s, p) => s + p.amount, 0);
       
       const allInvoiceAllocations = state.subcontractorInvoiceAllocations.filter(a => a.invoiceId === invId);
       const invoice = state.subcontractorInvoices.find(i => i.id === invId);
       const isVatReg = invoice && invoice.vatStatus === 'registered';
       const rate = invoice && invoice.vatRate !== undefined ? invoice.vatRate : 18;

       const totalAllocatedGross = allInvoiceAllocations.reduce((s, a) => {
         return s + (isVatReg ? a.amount * (1 + rate / 100) : a.amount);
       }, 0);
       
       if (totalPaidOnInvoice <= 0 || allInvoiceAllocations.length === 0) return;
       
       if (totalPaidOnInvoice >= totalAllocatedGross - 0.01) {
           projectItems.forEach(pi => {
               const aGross = isVatReg ? pi.allocation.amount * (1 + rate / 100) : pi.allocation.amount;
               totalSubcontractorPaid += aGross;
           });
       } else {
           let remainingPaid = totalPaidOnInvoice;
           allInvoiceAllocations.forEach((alloc, index) => {
               const aGross = isVatReg ? alloc.amount * (1 + rate / 100) : alloc.amount;
               let paidAmount = 0;
               if (index === allInvoiceAllocations.length - 1) {
                   paidAmount = Math.round(remainingPaid * 100) / 100;
               } else {
                   paidAmount = Math.round(totalPaidOnInvoice * (aGross / totalAllocatedGross) * 100) / 100;
                   remainingPaid -= paidAmount;
               }
               if (alloc.projectId === projectId) {
                   if (projectItems.find(pi => pi.allocation.id === alloc.id)) {
                      totalSubcontractorPaid += paidAmount;
                   }
               }
           });
       }
    });
  
    const totalWorkerPaid = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalPaid = totalWorkerPaid + totalSubcontractorPaid;
    const workerBalance = totalEarned - totalPaid;

  const totalReceivedFromClient = filteredClientPayments.reduce((sum, p) => sum + p.amount, 0);
  const outstandingFromClient = project.totalValue !== undefined && project.totalValue !== null 
    ? project.totalValue - totalReceivedFromClient
    : null;

  const filteredClientInvoices = state.clientInvoices
    .filter(i => i.projectId === projectId && filterDate(i.date))
    .sort((a, b) => b.date.localeCompare(a.date));

  const filteredExpenseAllocations = state.expenseAllocations
      .filter(a => a.projectId === projectId)
      .map(a => {
        const expense = state.expenses.find(e => e.id === a.expenseId);
        return { allocation: a, expense };
      })
      .filter(({ expense }) => expense && filterDate(expense.date))
      .sort((a, b) => b.expense!.date.localeCompare(a.expense!.date));
      
    const totalProjectExpenses = filteredExpenseAllocations.reduce((sum, item) => sum + item.allocation.amount, 0);

    const totalInvoicedToClientNet = filteredClientInvoices.reduce((sum, i) => sum + (i.netAmount || 0), 0);
  const totalInvoicedToClientVat = filteredClientInvoices.reduce((sum, i) => sum + (i.vatAmount || 0), 0);
  
  let outstandingInvoicesBalance = 0;
  filteredClientInvoices.forEach(inv => {
    const paidSoFar = state.projectClientPayments
      .filter(p => p.invoiceId === inv.id)
      .reduce((sum, p) => sum + p.amount, 0);
    outstandingInvoicesBalance += ((inv.grossAmount || (inv as any).amount || 0) - paidSoFar);
  });
  
  const notYetInvoiced = project.totalValue !== undefined && project.totalValue !== null
    ? project.totalValue - totalInvoicedToClientNet
    : null;
    
  const getClientInvoiceDisplay = (invoiceId: string) => {
     const inv = state.clientInvoices.find(i => i.id === invoiceId);
     return inv ? `${inv.invoiceNumber || 'Inv'} (${inv.date})` : 'Unknown';
  };




  

  const getWorkerName = (workerId: string) => {
    const w = state.workers.find(w => w.id === workerId);
    return w ? w.name : 'Former Worker';
  };

  const getWorkerColor = (workerId: string) => {
    const w = state.workers.find(w => w.id === workerId);
    return w ? w.colour : '#999999';
  };

  const handleDeleteEarning = (id: string) => {
    if (window.confirm('Are you sure you want to delete this earning?')) {
      dispatch({ type: 'DELETE_WORKER_EARNING', id });
    }
  };

  const handleDeletePayment = (id: string) => {
    if (window.confirm('Are you sure you want to delete this payment?')) {
      dispatch({ type: 'DELETE_WORKER_PAYMENT', id });
    }
  };
  
    const handleDeleteClientInvoice = (id: string) => {
    if (window.confirm('Are you sure you want to delete this invoice? Related payments will be unlinked.')) {
      dispatch({ type: 'DELETE_CLIENT_INVOICE', id });
    }
  };

  const handleDeleteClientPayment = (id: string) => {
    if (window.confirm('Are you sure you want to delete this payment?')) {
      dispatch({ type: 'DELETE_PROJECT_CLIENT_PAYMENT', id });
    }
  };

  const handleDownloadPDF = () => {
    let periodLabel = 'All Time';
    if (filter === 'year') periodLabel = `${currentYear}`;
    if (filter === 'custom') periodLabel = `${customStartDate} to ${customEndDate}`;
    if (filter === 'single_worker') periodLabel = `For ${getWorkerName(selectedWorkerId)}`;

    const fauxEarnings: WorkerEarning[] = [
      ...filteredEarnings,
      ...filteredAllocations.map(a => ({
        id: a.allocation.id,
        workerId: a.invoice!.workerId,
        projectId: a.allocation.projectId,
        date: a.invoice!.date,
        description: a.allocation.description || 'Invoice Allocation',
        amount: a.allocation.amount
      } as WorkerEarning))
    ];

    generateProjectStatement(
      project,
      fauxEarnings,
      filteredPayments, // we might need to faux-ify Subcontractor payments too? The prompt didn't say, I'll pass filteredPayments.
      state.workers,
      state.clients,
      periodLabel,
      totalEarned,
      totalPaid,
      workerBalance,
      activeWorkers
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div style={{ marginBottom: '16px' }}>
          <Button variant="secondary" onClick={onBack}>&larr; Back to Profile</Button>
        </div>

        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>{project.name || project.client} - Financials</h1>
            {client && <p style={{ color: 'var(--color-text-muted)', marginTop: '4px' }}>Client: {client.name}</p>}
          </div>
          
        </div>

                <div className={styles.filterSection}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div className={styles.filters}>
              <button className={`${styles.filterBtn} ${filter === 'year' ? styles.active : ''}`} onClick={() => setFilter('year')}>{currentYear}</button>
              <button className={`${styles.filterBtn} ${filter === 'all_time' ? styles.active : ''}`} onClick={() => setFilter('all_time')}>All Time</button>
              <button className={`${styles.filterBtn} ${filter === 'custom' ? styles.active : ''}`} onClick={() => setFilter('custom')}>Custom</button>
              <button className={`${styles.filterBtn} ${filter === 'single_worker' ? styles.active : ''}`} onClick={() => setFilter('single_worker')}>Single Worker</button>
            </div>
            <Button variant="secondary" onClick={handleDownloadPDF}>📄 Download Statement</Button>
          </div>
          
          {filter === 'custom' && (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', backgroundColor: 'var(--color-bg-tertiary)', padding: '12px', borderRadius: 'var(--radius-md)', marginTop: '12px' }}>
              <DateInput label="Start Date" value={customStartDate} onChange={(val) => setCustomStartDate(val)} />
              <DateInput label="End Date" value={customEndDate} onChange={(val) => setCustomEndDate(val)} />
            </div>
          )}

          {filter === 'single_worker' && (
            <div style={{ maxWidth: '300px', marginTop: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Select Worker</label>
              <select 
                value={selectedWorkerId} 
                onChange={(e) => setSelectedWorkerId(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
              >
                <option value="">-- Select Worker --</option>
                {activeWorkers.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        
        <div style={{ marginTop: '32px', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '24px', backgroundColor: 'var(--color-surface)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px', marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}>CLIENT INVOICES</h3>
            <Button variant="primary" onClick={() => { setEditingClientInvoice(null); setIsClientInvoiceFormOpen(true); }}>
              + Add Invoice
            </Button>
          </div>
          
          {filteredClientInvoices.length > 0 ? (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Invoice #</th>
                    <th style={{ textAlign: 'right' }}>Net</th>
                    <th style={{ textAlign: 'right' }}>VAT</th>
                    <th style={{ textAlign: 'right' }}>Gross</th>
                    <th style={{ textAlign: 'right' }}>Remaining</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClientInvoices.map(inv => {
                    const paidSoFar = state.projectClientPayments.filter(p => p.invoiceId === inv.id).reduce((s,p) => s + p.amount, 0);
                    const rem = (inv.grossAmount || (inv as any).amount || 0) - paidSoFar;
                    return (
                    <tr key={inv.id}>
                      <td>{new Date(inv.date).toLocaleDateString('en-GB')}</td>
                      <td>{inv.invoiceNumber || '-'}</td>
                      <td style={{ textAlign: 'right' }}>€{(inv.netAmount || 0).toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }} title={`${(inv.vatRate || 0)}%`}>€{(inv.vatAmount || 0).toFixed(2)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>€{(inv.grossAmount || (inv as any).amount || 0).toFixed(2)}</td>
                      <td style={{ textAlign: 'right', color: rem > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>€{rem.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <span style={{ marginRight: '8px' }}>
                          <Button variant="primary" size="sm" onClick={() => { setPayInvoiceId(inv.id); setEditingClientPayment(null); setIsClientPaymentFormOpen(true); }}>+ Pay</Button>
                        </span>
                        <button className={styles.actionBtn} onClick={() => { setEditingClientInvoice(inv); setIsClientInvoiceFormOpen(true); }} style={{ padding: '4px 8px', fontSize: '0.8rem', marginRight: '4px' }}>Edit</button>
                        <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDeleteClientInvoice(inv.id)} style={{ padding: '4px 8px', fontSize: '0.8rem' }}>Delete</button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.emptyState}>No client invoices recorded.</div>
          )}
        </div>


        <div style={{ marginTop: '32px', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '24px', backgroundColor: 'var(--color-surface)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px', marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}>CLIENT PAYMENTS (REVENUE)</h3>
            <Button variant="primary" onClick={() => { setEditingClientPayment(null); setIsClientPaymentFormOpen(true); }}>
              + Add Client Payment
            </Button>
          </div>
          
          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Total Project Value</span>
              <span className={styles.summaryValue}>
                {project.totalValue !== undefined && project.totalValue !== null ? `€${project.totalValue.toFixed(2)}` : '-'}
              </span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Received from Client</span>
              <span className={styles.summaryValue} style={{ color: 'var(--color-success)' }}>€{totalReceivedFromClient.toFixed(2)}</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Outstanding Balance</span>
              <span className={`${styles.summaryValue} ${outstandingFromClient && outstandingFromClient > 0 ? styles.negativeBalance : ''}`}>
                {outstandingFromClient !== null ? `€${outstandingFromClient.toFixed(2)}` : '-'}
              </span>
            </div>
          </div>

          <div style={{ marginTop: '24px' }}>
            {filteredClientPayments.length > 0 ? (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Method</th>
                      <th>Linked Invoice</th>
                      <th>Notes</th>
                      <th className={styles.amountCol}>Amount</th>
                      <th className={styles.actionsCol}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClientPayments.map(p => (
                      <tr key={p.id}>
                        <td>{new Date(p.date).toLocaleDateString('en-GB')}</td>
                        <td>{p.method}</td>
                        <td>{p.invoiceId ? getClientInvoiceDisplay(p.invoiceId) : '-'}</td>
                        <td>{p.notes || '-'}</td>
                        <td className={styles.amountCol} style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>€{p.amount.toFixed(2)}</td>
                        <td className={styles.actionsCol}>
                          <button className={styles.actionBtn} onClick={() => { setEditingClientPayment(p); setIsClientPaymentFormOpen(true); }}>Edit</button>
                          <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDeleteClientPayment(p.id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.emptyState}>No client payments recorded.</div>
            )}
          </div>
        </div>

        
          <div style={{ marginTop: '32px', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '24px', backgroundColor: 'var(--color-surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>PROJECT EXPENSES</h3>
              <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--color-danger)' }}>
                Total: €{totalProjectExpenses.toFixed(2)}
              </div>
            </div>
            
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th style={{ textAlign: 'right' }}>Net Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenseAllocations.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>No expenses recorded for this project.</td>
                    </tr>
                  ) : (
                    filteredExpenseAllocations.map(({ allocation, expense }) => (
                      <tr key={allocation.id}>
                        <td>{new Date(expense!.date).toLocaleDateString('en-GB')}</td>
                        <td>{expense!.category}</td>
                        <td>{expense!.description}</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>€{allocation.amount.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ marginTop: '32px', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '24px', backgroundColor: 'var(--color-surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>WORKER & SUBCONTRACTOR COSTS</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="primary" onClick={() => { setEditingEarning(null); setIsEarningFormOpen(true); }}>
                + Add Earning
              </Button>
              <Button variant="primary" onClick={() => { setEditingPayment(null); setIsPaymentFormOpen(true); }}>
                + Add Payment
              </Button>
            </div>
          </div>
          
          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Total Worker/Sub Earnings</span>
              <span className={styles.summaryValue}>€{totalEarned.toFixed(2)}</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Total Paid to Workers/Subs</span>
              <span className={styles.summaryValue} style={{ color: 'var(--color-success)' }}>€{totalPaid.toFixed(2)}</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Worker Balance Due</span>
              <span className={`${styles.summaryValue} ${workerBalance > 0 ? styles.negativeBalance : ''}`}>
                €{workerBalance.toFixed(2)}
              </span>
            </div>
          </div>

          <div className={styles.workerBreakdown}>
            <h3>Worker Breakdown</h3>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Worker</th>
                    <th>Earned</th>
                    <th>Paid</th>
                    <th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {activeWorkers.map(w => {
                    const wEarned = filteredEarnings.filter(e => e.workerId === w.id).reduce((sum, e) => sum + e.amount, 0);
                    const wPaid = filteredPayments.filter(p => p.workerId === w.id).reduce((sum, p) => sum + p.amount, 0);
                    
                    const wAllocs = filteredAllocations.filter(({ invoice }) => invoice!.workerId === w.id);
                    const wSubEarned = wAllocs.reduce((sum, { allocation }) => sum + allocation.amount, 0);
                    
                    let wSubPaid = 0;
                    const wAllocsByInv = new Map<string, typeof wAllocs>();
                    wAllocs.forEach(item => {
                       const invId = item.invoice!.id;
                       if (!wAllocsByInv.has(invId)) wAllocsByInv.set(invId, []);
                       wAllocsByInv.get(invId)!.push(item);
                    });
                    
                    wAllocsByInv.forEach((items, invId) => {
                       const invPayments = state.workerPayments.filter(p => p.invoiceId === invId);
                       const totalInvPaid = invPayments.reduce((s, p) => s + p.amount, 0);
                       const allInvAllocs = state.subcontractorInvoiceAllocations.filter(a => a.invoiceId === invId);
                       const totalInvAllocated = allInvAllocs.reduce((s, a) => s + a.amount, 0);
                       
                       if (totalInvPaid >= totalInvAllocated) {
                           wSubPaid += items.reduce((s, item) => s + item.allocation.amount, 0);
                       } else if (totalInvPaid > 0) {
                           let remainingPaid = totalInvPaid;
                           allInvAllocs.forEach((alloc, index) => {
                               let paidAmount = 0;
                               if (index === allInvAllocs.length - 1) {
                                   paidAmount = Math.round(remainingPaid * 100) / 100;
                               } else {
                                   paidAmount = Math.round(totalInvPaid * (alloc.amount / totalInvAllocated) * 100) / 100;
                                   remainingPaid -= paidAmount;
                               }
                               if (alloc.projectId === projectId && items.find(i => i.allocation.id === alloc.id)) {
                                  wSubPaid += paidAmount;
                               }
                           });
                       }
                    });

                    const totalW = wEarned + wSubEarned;
                    const totalP = wPaid + wSubPaid;
                    const bal = totalW - totalP;
                    
                    if (totalW === 0 && totalP === 0) return null;

                    return (
                      <tr key={w.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: w.colour }}></div>
                            {w.name}
                          </div>
                        </td>
                        <td>€{totalW.toFixed(2)}</td>
                        <td style={{ color: 'var(--color-success)' }}>€{totalP.toFixed(2)}</td>
                        <td style={{ fontWeight: 'bold', color: bal > 0 ? 'var(--color-danger)' : 'var(--color-text)' }}>
                          €{bal.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      <WorkerEarningForm
        isOpen={isEarningFormOpen}
        onClose={() => setIsEarningFormOpen(false)}
        earning={editingEarning}
        projectId={projectId}
      />

      <WorkerPaymentForm
        isOpen={isPaymentFormOpen}
        onClose={() => setIsPaymentFormOpen(false)}
        payment={editingPayment}
        projectId={projectId}
      />
      
      <ClientInvoiceForm
        isOpen={isClientInvoiceFormOpen}
        onClose={() => setIsClientInvoiceFormOpen(false)}
        invoice={editingClientInvoice}
        project={project}
      />

      <ProjectClientPaymentForm
        initialInvoiceId={payInvoiceId}
        isOpen={isClientPaymentFormOpen}
        onClose={() => { setIsClientPaymentFormOpen(false); setPayInvoiceId(undefined); }}
        payment={editingClientPayment}
        project={project!}
      />
    </div>
  );
}
