import React, { useState } from 'react';
import { Worker, WorkerEarning, WorkerPayment, SubcontractorInvoice } from '../../models/types';
import { useAppContext } from '../../context/AppContext';
import Select from '../../components/common/Select';
import Button from '../../components/common/Button';
import WorkerEarningForm from '../../components/Forms/WorkerEarningForm';
import WorkerPaymentForm from '../../components/Forms/WorkerPaymentForm';
import SubcontractorInvoiceForm from '../../components/Forms/SubcontractorInvoiceForm';
import DateInput from '../../components/common/DateInput';
import { parseISO, isWithinInterval, startOfDay, endOfDay, isSameYear, subYears, format } from 'date-fns';
import { generateWorkerStatement } from '../../utils/pdfGenerator';
import styles from './WorkerProfileView.module.css';

interface WorkerFinancialsProps {
  workerId: string;
  onBack?: () => void;
}

export default function WorkerFinancials({ workerId, onBack }: WorkerFinancialsProps) {
  const { state, dispatch } = useAppContext();
  const worker = state.workers.find(w => w.id === workerId);

  const [filter, setFilter] = useState<'all' | 'this_year' | 'custom' | 'single_project'>('this_year');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  
  const today = new Date();
  const [customStartDate, setCustomStartDate] = useState(format(subYears(today, 1), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState(format(today, 'yyyy-MM-dd'));

  const [isEarningFormOpen, setIsEarningFormOpen] = useState(false);
  const [editingEarning, setEditingEarning] = useState<WorkerEarning | null>(null);
  
  const [isInvoiceFormOpen, setIsInvoiceFormOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<SubcontractorInvoice | null>(null);

  const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<WorkerPayment | null>(null);
  const [activeInvoiceIdForPayment, setActiveInvoiceIdForPayment] = useState<string>('');

  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set());

  if (!worker) {
    return <div className={styles.container}>Worker not found.</div>;
  }

  const workerProjectIds = Array.from(new Set([
    ...state.workerEarnings.filter(e => e.workerId === workerId && e.projectId).map(e => e.projectId as string),
    ...state.subcontractorInvoiceAllocations.filter(a => state.subcontractorInvoices.find(i => i.id === a.invoiceId)?.workerId === workerId).map(a => a.projectId)
  ]));
  const workerProjects = state.projects.filter(p => p && workerProjectIds.includes(p.id));

  const filterDate = (dateStr: string) => {
    if (filter === 'all' || filter === 'single_project') return true;
    
    const date = parseISO(dateStr);
    
    if (filter === 'this_year') {
      return isSameYear(date, today);
    }
    if (filter === 'custom') {
      return isWithinInterval(date, { 
        start: startOfDay(parseISO(customStartDate)), 
        end: endOfDay(parseISO(customEndDate)) 
      });
    }
    return true;
  };

  const getProjectName = (id?: string) => {
    if (!id) return '-';
    const p = state.projects.find(p => p.id === id);
    if (!p) return 'Unknown Project';
    if (p.name) return p.name;
    const client = state.clients.find(c => c.id === p.clientId);
    return client ? `${client.name} - ${p.client}` : p.client;
  };

  const filteredEarnings = state.workerEarnings
    .filter(e => e.workerId === workerId && filterDate(e.date) && (filter !== 'single_project' || e.projectId === selectedProjectId))
    .sort((a, b) => b.date.localeCompare(a.date));

  const filteredInvoices = state.subcontractorInvoices
    .filter(i => i.workerId === workerId && filterDate(i.date))
    .sort((a, b) => b.date.localeCompare(a.date));

  const filteredAllocations = state.subcontractorInvoiceAllocations
    .filter(a => filteredInvoices.some(i => i.id === a.invoiceId) && (filter !== 'single_project' || a.projectId === selectedProjectId));

  const filteredPayments = state.workerPayments
    .filter(p => p.workerId === workerId && filterDate(p.date) && (filter !== 'single_project' || p.projectId === selectedProjectId))
    .sort((a, b) => b.date.localeCompare(a.date));

  let totalEarned = 0;
  let totalPaid = 0;

  if (worker.paymentType === 'project') {
    if (filter === 'single_project') {
       totalEarned = filteredAllocations.reduce((sum, a) => {
         const inv = state.subcontractorInvoices.find(i => i.id === a.invoiceId);
         const isVatReg = inv && inv.vatStatus === 'registered';
         const rate = inv && inv.vatRate !== undefined ? inv.vatRate : 18;
         const aGross = isVatReg ? a.amount * (1 + rate / 100) : a.amount;
         return sum + aGross;
       }, 0);
       
       filteredAllocations.forEach(alloc => {
           const inv = state.subcontractorInvoices.find(i => i.id === alloc.invoiceId);
           if (!inv) return;
           const isVatReg = inv.vatStatus === 'registered';
           const rate = inv.vatRate !== undefined ? inv.vatRate : 18;
           const allocGross = isVatReg ? alloc.amount * (1 + rate / 100) : alloc.amount;

           const invPayments = state.workerPayments.filter(p => p.invoiceId === inv.id);
           const invTotalPaid = invPayments.reduce((s, p) => s + p.amount, 0);
           const invAllocs = state.subcontractorInvoiceAllocations.filter(a => a.invoiceId === inv.id);
           
           if (invTotalPaid <= 0 || invAllocs.length === 0) return;
           
           const totalAllocatedGross = invAllocs.reduce((sum, a) => {
             const ag = isVatReg ? a.amount * (1 + rate / 100) : a.amount;
             return sum + ag;
           }, 0);
           
           if (totalAllocatedGross <= 0) return;
           
           // If fully paid or overpaid
           if (invTotalPaid >= totalAllocatedGross - 0.01) {
               totalPaid += allocGross;
               return;
           }
           
           // Proportional payment
           let remainingPaid = invTotalPaid;
           invAllocs.forEach((a, index) => {
               const aGross = isVatReg ? a.amount * (1 + rate / 100) : a.amount;
               let paidAmount = 0;
               if (index === invAllocs.length - 1) {
                   paidAmount = Math.round(remainingPaid * 100) / 100;
               } else {
                   paidAmount = Math.round(invTotalPaid * (aGross / totalAllocatedGross) * 100) / 100;
                   remainingPaid -= paidAmount;
               }
               if (a.id === alloc.id) {
                   totalPaid += paidAmount;
               }
           });
       });
    } else {
       totalEarned = filteredInvoices.reduce((sum, i) => sum + (i.grossAmount !== undefined ? i.grossAmount : i.totalAmount), 0);
       totalPaid = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
    }
  } else {
    totalEarned = filteredEarnings.reduce((sum, e) => sum + e.amount, 0);
    totalPaid = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  }

  const balance = totalEarned - totalPaid;

  const handleDownloadPDF = () => {
    let fauxEarnings: any[] = [];
    if (worker.paymentType === 'project') {
      if (filter === 'single_project') {
        fauxEarnings = filteredAllocations.map(a => {
          const inv = state.subcontractorInvoices.find(i => i.id === a.invoiceId);
          const isVatReg = inv && inv.vatStatus === 'registered';
          const rate = inv && inv.vatRate !== undefined ? inv.vatRate : 18;
          const aGross = isVatReg ? a.amount * (1 + rate / 100) : a.amount;
          return {
            id: a.id,
            workerId: worker.id,
            date: inv ? inv.date : '',
            projectId: a.projectId,
            description: a.description || 'Invoice allocation',
            amount: aGross
          };
        });
      } else {
        fauxEarnings = state.subcontractorInvoiceAllocations
          .filter(a => filteredInvoices.some(i => i.id === a.invoiceId))
          .map(a => {
            const inv = state.subcontractorInvoices.find(i => i.id === a.invoiceId);
            let desc = `Invoice ${inv?.invoiceNumber ? '#' + inv.invoiceNumber : ''}`;
            if (a.type === 'other' && a.description) desc += ` - ${a.description}`;
            const isVatReg = inv && inv.vatStatus === 'registered';
            const rate = inv && inv.vatRate !== undefined ? inv.vatRate : 18;
            const aGross = isVatReg ? a.amount * (1 + rate / 100) : a.amount;
            return {
              id: a.id,
              workerId: worker.id,
              date: inv ? inv.date : '',
              projectId: a.projectId,
              description: a.description || desc,
              amount: aGross
            };
          });
      }
    } else {
      fauxEarnings = filteredEarnings;
    }

    let periodLabel = 'All Time';
    if (filter === 'this_year') periodLabel = 'This Year';
    if (filter === 'custom') periodLabel = `${customStartDate} to ${customEndDate}`;
    if (filter === 'single_project') periodLabel = `Project: ${getProjectName(selectedProjectId)}`;

    generateWorkerStatement(
      worker,
      fauxEarnings as WorkerEarning[],
      filteredPayments,
      state.projects,
      state.clients,
      periodLabel,
      totalEarned,
      totalPaid,
      balance
    );
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

  const handleDeleteInvoice = (id: string) => {
    if (window.confirm('Are you sure you want to delete this invoice? All associated payments will remain but lose their invoice reference.')) {
      dispatch({ type: 'DELETE_SUBCONTRACTOR_INVOICE', id });
    }
  };

  const toggleInvoiceExpand = (invoiceId: string) => {
    const newExpanded = new Set(expandedInvoices);
    if (newExpanded.has(invoiceId)) {
      newExpanded.delete(invoiceId);
    } else {
      newExpanded.add(invoiceId);
    }
    setExpandedInvoices(newExpanded);
  };

  return (
    <div className={styles.financialsContainer}>
      {onBack && (
        <div style={{ marginBottom: '16px' }}>
          <Button variant="secondary" onClick={onBack}>&larr; Back to Profile</Button>
        </div>
      )}
      <div className={styles.filterSection}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div className={styles.filters}>
            <button className={`${styles.filterBtn} ${filter === 'this_year' ? styles.active : ''}`} onClick={() => setFilter('this_year')}>This Year</button>
            <button className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`} onClick={() => setFilter('all')}>All Time</button>
            
            <button className={`${styles.filterBtn} ${filter === 'custom' ? styles.active : ''}`} onClick={() => setFilter('custom')}>Custom</button>
            <button className={`${styles.filterBtn} ${filter === 'single_project' ? styles.active : ''}`} onClick={() => setFilter('single_project')}>Single Project</button>
          </div>
          <Button variant="secondary" onClick={handleDownloadPDF}>📄 Download Statement</Button>
        </div>
        
        {filter === 'custom' && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', backgroundColor: 'var(--color-bg-tertiary)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <DateInput 
                label="Start Date"
                value={customStartDate} 
                onChange={(val) => setCustomStartDate(val)}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <DateInput 
                label="End Date"
                value={customEndDate} 
                onChange={(val) => setCustomEndDate(val)}
              />
            </div>
          </div>
        )}

        {filter === 'single_project' && (
          <div style={{ maxWidth: '400px' }}>
            <Select
              label="Select Project"
              value={selectedProjectId}
              onChange={(val) => setSelectedProjectId(val)}
              options={[
                { value: '', label: '-- Select Project --' },
                ...workerProjects.map(p => ({ value: p.id, label: getProjectName(p.id) }))
              ]}
            />
          </div>
        )}
      </div>

      <div className={styles.summarySection}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Total {worker.paymentType === 'project' ? 'Invoiced' : 'Earned'}</div>
          <div className={styles.summaryValue}>€{totalEarned.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Total Paid</div>
          <div className={styles.summaryValue}>€{totalPaid.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Outstanding</div>
          <div className={`${styles.summaryValue} ${balance > 0 ? styles.outstandingValue : (balance < 0 ? styles.negativeValue : '')}`}>
            €{balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </div>
        </div>
      </div>

      <div className={styles.tableSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{worker.paymentType === 'project' ? 'Invoices & Payments' : 'Earnings'}</h2>
          {worker.paymentType === 'project' ? (
            <Button variant="primary" onClick={() => { setEditingInvoice(null); setIsInvoiceFormOpen(true); }}>
              + Add Invoice
            </Button>
          ) : (
            <Button variant="primary" onClick={() => { setEditingEarning(null); setIsEarningFormOpen(true); }}>
              + Add Earning
            </Button>
          )}
        </div>
        
        {worker.paymentType === 'project' ? (
          (filter === 'single_project' ? filteredAllocations.length > 0 : filteredInvoices.length > 0) ? (
            <div className={styles.invoiceList}>
              {filter === 'single_project' ? (
                 <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Invoice</th>
                      <th>Project</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAllocations.map(a => {
                      const i = state.subcontractorInvoices.find(inv => inv.id === a.invoiceId);
                      return (
                        <tr key={a.id} className={styles.tableRow}>
                          <td>{i ? new Date(i.date).toLocaleDateString('en-GB') : '-'}</td>
                          <td>{i?.invoiceNumber ? `INV: ${i.invoiceNumber}` : '-'}</td>
                          <td>{getProjectName(a.projectId)}</td>
                          <td>{a.description}</td>
                          <td>€{a.amount.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                          <td>
                            <div className={styles.actions}>
                              <button className={styles.actionBtn} onClick={() => { setEditingInvoice(i || null); setIsInvoiceFormOpen(true); }}>Edit Invoice</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                 </table>
              ) : (
                filteredInvoices.map(invoice => {
                  const allocs = state.subcontractorInvoiceAllocations.filter(a => a.invoiceId === invoice.id);
                  const projAllocs = allocs.filter(a => a.type !== 'other' && a.projectId);
                  const otherAllocs = allocs.filter(a => a.type === 'other' || !a.projectId);
                  
                  const projAllocsTotal = projAllocs.reduce((s, a) => s + a.amount, 0);
                  const otherAllocsTotal = otherAllocs.reduce((s, a) => s + a.amount, 0);
                  
                  const invPayments = state.workerPayments.filter(p => p.invoiceId === invoice.id).sort((a, b) => a.date.localeCompare(b.date));
                  const invTotalPaid = invPayments.reduce((s, p) => s + p.amount, 0);
                  const invOutstanding = (invoice.grossAmount || invoice.totalAmount) - invTotalPaid;
                  
                  const isExpanded = expandedInvoices.has(invoice.id);

                  return (
                    <div key={invoice.id} style={{ marginBottom: '16px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface)', overflow: 'hidden' }}>
                      <div 
                        style={{ padding: '16px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', cursor: 'pointer', backgroundColor: isExpanded ? 'var(--color-bg-tertiary)' : 'transparent' }}
                        onClick={() => toggleInvoiceExpand(invoice.id)}
                      >
                         <div style={{ flex: 1, minWidth: '150px' }}>
                           <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{invoice.invoiceNumber ? `Invoice ${invoice.invoiceNumber}` : 'Invoice'}</div>
                           <div style={{ color: 'var(--color-text-muted)' }}>{new Date(invoice.date).toLocaleDateString('en-GB')}</div>
                         </div>
                         <div style={{ flex: 1, minWidth: '120px' }}>
                           <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Net</div>
                             <div>€{invoice.totalAmount.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                             {invoice.vatStatus === 'registered' && (
                               <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>VAT ({invoice.vatRate}%): €{(invoice.vatAmount || 0).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                             )}
                             <div style={{ fontWeight: 'bold', marginTop: '4px' }}>Gross: €{(invoice.grossAmount || invoice.totalAmount).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                         </div>
                         <div style={{ flex: 1, minWidth: '120px' }}>
                           <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Allocated</div>
                           <div>€{projAllocsTotal.toLocaleString(undefined, {minimumFractionDigits:2})} (Proj)</div>
                           <div>€{otherAllocsTotal.toLocaleString(undefined, {minimumFractionDigits:2})} (Other)</div>
                         </div>
                         <div style={{ flex: 1, minWidth: '120px' }}>
                           <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Status</div>
                           <div style={{ fontWeight: 'bold', color: invOutstanding > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                             Paid: €{invTotalPaid.toLocaleString(undefined, {minimumFractionDigits:2})}
                           </div>
                           {invOutstanding > 0 && <div style={{ color: 'var(--color-danger)' }}>Out: €{invOutstanding.toLocaleString(undefined, {minimumFractionDigits:2})}</div>}
                         </div>
                         <div style={{ display: 'flex', gap: '8px' }}>
                           {invOutstanding > 0 && (
                             <Button variant="primary" onClick={(e) => { e.stopPropagation(); setActiveInvoiceIdForPayment(invoice.id); setEditingPayment(null); setIsPaymentFormOpen(true); }}>+ Pay</Button>
                           )}
                           <Button variant="secondary" onClick={(e) => { e.stopPropagation(); setEditingInvoice(invoice); setIsInvoiceFormOpen(true); }}>Edit</Button>
                           <Button variant="danger" onClick={(e) => { e.stopPropagation(); handleDeleteInvoice(invoice.id); }}>Del</Button>
                           <div style={{ padding: '8px', color: 'var(--color-text-muted)' }}>
                             {isExpanded ? '▲' : '▼'}
                           </div>
                         </div>
                      </div>
                      
                      {isExpanded && (
                        <div style={{ padding: '24px 16px', borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-tertiary)' }}>
                           
                           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                             <div>
                               <h4 style={{ marginBottom: '12px', color: 'var(--color-text)' }}>Project Allocations</h4>
                               {projAllocs.length > 0 ? (
                                 <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                   {projAllocs.map(a => (
                                     <li key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed var(--color-border)' }}>
                                        <div>
                                          <div style={{ fontWeight: '500' }}>{getProjectName(a.projectId)}</div>
                                          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{a.description}</div>
                                        </div>
                                        <div style={{ fontWeight: '500' }}>€{a.amount.toLocaleString(undefined, {minimumFractionDigits:2})}</div>
                                     </li>
                                   ))}
                                 </ul>
                               ) : <div style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>None</div>}
                               
                               <h4 style={{ marginTop: '24px', marginBottom: '12px', color: 'var(--color-text)' }}>Other / No Project</h4>
                               {otherAllocs.length > 0 ? (
                                 <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                   {otherAllocs.map(a => (
                                     <li key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed var(--color-border)' }}>
                                        <div style={{ color: 'var(--color-text-muted)' }}>{a.description}</div>
                                        <div style={{ fontWeight: '500' }}>€{a.amount.toLocaleString(undefined, {minimumFractionDigits:2})}</div>
                                     </li>
                                   ))}
                                 </ul>
                               ) : <div style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>None</div>}
                             </div>

                             <div>
                               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                 <h4 style={{ margin: 0, color: 'var(--color-text)' }}>Payments</h4>
                                 <Button variant="primary" onClick={() => { setActiveInvoiceIdForPayment(invoice.id); setEditingPayment(null); setIsPaymentFormOpen(true); }}>
                                   + Add Payment
                                 </Button>
                               </div>
                               {invPayments.length > 0 ? (
                                 <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                   {invPayments.map(p => (
                                     <li key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed var(--color-border)' }}>
                                        <div>
                                          <div style={{ fontWeight: '500' }}>{new Date(p.date).toLocaleDateString('en-GB')} — {p.method}</div>
                                          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{p.notes || '-'}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                          <div style={{ fontWeight: '500' }}>€{p.amount.toLocaleString(undefined, {minimumFractionDigits:2})}</div>
                                          <div style={{ marginTop: '4px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            <button style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontSize: '0.8rem' }} onClick={() => { setActiveInvoiceIdForPayment(invoice.id); setEditingPayment(p); setIsPaymentFormOpen(true); }}>Edit</button>
                                            <button style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: '0.8rem' }} onClick={() => handleDeletePayment(p.id)}>Delete</button>
                                          </div>
                                        </div>
                                     </li>
                                   ))}
                                 </ul>
                               ) : <div style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', padding: '16px', textAlign: 'center', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-sm)' }}>No payments recorded yet.</div>}
                             </div>
                           </div>

                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className={styles.emptyState}>No invoices recorded for this period.</div>
          )
        ) : (
          filteredEarnings.length > 0 ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Project</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEarnings.map(e => (
                  <tr key={e.id} className={styles.tableRow}>
                    <td>{new Date(e.date).toLocaleDateString('en-GB')}</td>
                    <td>{getProjectName(e.projectId)}</td>
                    <td>{e.description}</td>
                    <td>€{e.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td>
                      <div className={styles.actions}>
                        <button className={styles.actionBtn} onClick={() => { setEditingEarning(e); setIsEarningFormOpen(true); }}>Edit</button>
                        <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDeleteEarning(e.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className={styles.emptyState}>No earnings recorded for this period.</div>
          )
        )}
      </div>

      <div className={styles.tableSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Payments</h2>
          <Button variant="primary" onClick={() => { setEditingPayment(null); setIsPaymentFormOpen(true); }}>
            + Add Payment
          </Button>
        </div>
        {filteredPayments.length > 0 ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Project</th>
                <th>Invoice</th>
                <th>Method</th>
                <th>Notes</th>
                <th>Amount</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map(p => {
                const linkedInv = p.invoiceId ? state.subcontractorInvoices.find(i => i.id === p.invoiceId) : null;
                return (
                  <tr key={p.id} className={styles.tableRow}>
                    <td>{new Date(p.date).toLocaleDateString('en-GB')}</td>
                    <td>{getProjectName(p.projectId)}</td>
                    <td>{linkedInv?.invoiceNumber ? `#${linkedInv.invoiceNumber}` : (p.invoiceId ? 'Linked' : '—')}</td>
                    <td>{p.method}</td>
                    <td>{p.notes || '-'}</td>
                    <td>€{p.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td>
                      <div className={styles.actions}>
                        <button className={styles.actionBtn} onClick={() => { setEditingPayment(p); setIsPaymentFormOpen(true); }}>Edit</button>
                        <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDeletePayment(p.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className={styles.emptyState}>No payments recorded for this period.</div>
        )}
      </div>

      {isEarningFormOpen && (
        <WorkerEarningForm
          isOpen={isEarningFormOpen}
          onClose={() => setIsEarningFormOpen(false)}
          earning={editingEarning}
          worker={worker}
        />
      )}

      {isInvoiceFormOpen && (
        <SubcontractorInvoiceForm
          isOpen={isInvoiceFormOpen}
          onClose={() => setIsInvoiceFormOpen(false)}
          invoice={editingInvoice}
          worker={worker}
        />
      )}

      {isPaymentFormOpen && (
        <WorkerPaymentForm
          isOpen={isPaymentFormOpen}
          onClose={() => setIsPaymentFormOpen(false)}
          payment={editingPayment}
          worker={worker}
          invoiceId={worker.paymentType === 'project' ? activeInvoiceIdForPayment : undefined}
        />
      )}
    </div>
  );
}
