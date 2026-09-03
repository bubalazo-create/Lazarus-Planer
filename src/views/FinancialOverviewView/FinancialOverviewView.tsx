import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { getProjectDisplayName } from '../../utils/projectUtils';
import styles from './FinancialOverviewView.module.css';

type DateFilter = 'all' | 'this_month' | 'last_month' | 'this_quarter' | 'last_quarter' | 'q1' | 'q2' | 'q3' | 'q4' | 'this_year';
type StatusFilter = 'All' | 'Active' | 'Planned' | 'On Hold' | 'Completed';

export default function FinancialOverviewView() {
  const { state } = useAppContext();
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');

  const getQuarter = (d: Date) => Math.floor(d.getMonth() / 3) + 1;

  const filterDate = (dateStr: string) => {
    if (dateFilter === 'all') return true;
    if (!dateStr) return false;
    
    const d = new Date(dateStr);
    const now = new Date();
    
    if (dateFilter === 'this_month') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    if (dateFilter === 'last_month') {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return d.getMonth() === lastMonth.getMonth() && d.getFullYear() === lastMonth.getFullYear();
    }
    if (dateFilter === 'this_quarter') {
      return getQuarter(d) === getQuarter(now) && d.getFullYear() === now.getFullYear();
    }
    if (dateFilter === 'last_quarter') {
      let lqYear = now.getFullYear();
      let lqQuarter = getQuarter(now) - 1;
      if (lqQuarter === 0) {
        lqQuarter = 4;
        lqYear -= 1;
      }
      return getQuarter(d) === lqQuarter && d.getFullYear() === lqYear;
    }
    if (dateFilter === 'q1') {
      return getQuarter(d) === 1 && d.getFullYear() === now.getFullYear();
    }
    if (dateFilter === 'q2') {
      return getQuarter(d) === 2 && d.getFullYear() === now.getFullYear();
    }
    if (dateFilter === 'q3') {
      return getQuarter(d) === 3 && d.getFullYear() === now.getFullYear();
    }
    if (dateFilter === 'q4') {
      return getQuarter(d) === 4 && d.getFullYear() === now.getFullYear();
    }
    if (dateFilter === 'this_year') {
      return d.getFullYear() === now.getFullYear();
    }
    return true;
  };

  // 1. BUSINESS CASH (NET) & VAT LAYER
  let moneyInNet = 0;
  let vatReceived = 0;

  state.projectClientPayments.filter(p => filterDate(p.date)).forEach(p => {
    if (p.invoiceId) {
      const inv = state.clientInvoices.find(i => i.id === p.invoiceId);
      if (inv) {
        const gross = inv.grossAmount !== undefined ? inv.grossAmount : (inv as any).amount || 0;
        const vat = inv.vatAmount || 0;
        if (gross > 0) {
          const vatRatio = vat / gross;
          const pVat = p.amount * vatRatio;
          const pNet = p.amount - pVat;
          moneyInNet += pNet;
          vatReceived += pVat;
        } else {
          moneyInNet += p.amount;
        }
      } else {
        moneyInNet += p.amount;
      }
    } else {
      moneyInNet += p.amount;
    }
  });

  let workerMoneyOutNet = 0;
  let workerVatPaid = 0;

  state.workerPayments.filter(p => filterDate(p.date)).forEach(p => {
    if (p.invoiceId) {
      const inv = state.subcontractorInvoices.find(i => i.id === p.invoiceId);
      if (inv && inv.vatStatus === 'registered') {
        const gross = inv.grossAmount !== undefined ? inv.grossAmount : inv.totalAmount;
        const vat = inv.vatAmount || 0;
        if (gross > 0) {
          const vatRatio = vat / gross;
          const pVat = p.amount * vatRatio;
          workerMoneyOutNet += (p.amount - pVat);
          workerVatPaid += pVat;
        } else {
          workerMoneyOutNet += p.amount;
        }
      } else {
        workerMoneyOutNet += p.amount;
      }
    } else {
      workerMoneyOutNet += p.amount;
    }
  });

  let expensesMoneyOutNet = 0;
  let expensesVatPaid = 0;

  state.expenses.filter(e => filterDate(e.date)).forEach(e => {
    const isVatReg = e.vatStatus === 'registered';
    const vat = isVatReg && e.vatAmount !== undefined ? e.vatAmount : 0;
    const net = e.amount;
    expensesMoneyOutNet += net;
    expensesVatPaid += vat;
  });

  const moneyOutNet = workerMoneyOutNet + expensesMoneyOutNet;
  const businessCashResult = moneyInNet - moneyOutNet;
  const vatPaidTotal = workerVatPaid + expensesVatPaid;
  const vatBalance = vatReceived - vatPaidTotal;

  // 2. OUTSTANDING MONEY
  let clientOutstanding = 0;
  state.clientInvoices.forEach(inv => {
    const paidToInvoice = state.projectClientPayments
      .filter(p => p.invoiceId === inv.id)
      .reduce((sum, p) => sum + p.amount, 0);
    const out = (inv.grossAmount || (inv as any).amount || 0) - paidToInvoice;
    if (out > 0) clientOutstanding += out;
  });

  let subOutstanding = 0;
  state.subcontractorInvoices.forEach(inv => {
    const paidToInvoice = state.workerPayments
      .filter(p => p.invoiceId === inv.id)
      .reduce((sum, p) => sum + p.amount, 0);
    const gross = inv.grossAmount !== undefined ? inv.grossAmount : inv.totalAmount;
    const out = gross - paidToInvoice;
    if (out > 0) subOutstanding += out;
  });

  // 3. PROJECT OVERVIEW
  const projectSummaries = state.projects.map(project => {
    const invoicedNet = state.clientInvoices
      .filter(inv => inv.projectId === project.id)
      .reduce((sum, inv) => sum + inv.netAmount, 0);
    
    const paid = state.projectClientPayments
      .filter(p => p.projectId === project.id)
      .reduce((sum, p) => sum + p.amount, 0);

    const workerEarningsProj = state.workerEarnings
      .filter(e => e.projectId === project.id)
      .reduce((sum, e) => sum + e.amount, 0);
      
    const subCostsProj = state.subcontractorInvoiceAllocations
      .filter(a => a.projectId === project.id)
      .reduce((sum, a) => sum + a.amount, 0);

    const expenseCostsProj = state.expenseAllocations
      .filter(a => a.projectId === project.id)
      .reduce((sum, a) => sum + a.amount, 0);

    const projectCosts = workerEarningsProj + subCostsProj + expenseCostsProj;

    const cashResult = paid - projectCosts;
    const profit = invoicedNet - projectCosts;
    
    return {
      id: project.id,
      name: getProjectDisplayName(project, state.clients),
      status: project.status || 'Active',
      value: project.totalValue || 0,
      invoiced: invoicedNet,
      paid: paid,
      costs: projectCosts,
      cashResult: cashResult,
      profit: profit
    };
  });

  const statusRank = { 'Active': 1, 'Planned': 2, 'On Hold': 3, 'Completed': 4 };

  const filteredProjects = projectSummaries
    .filter(p => statusFilter === 'All' || p.status === statusFilter)
    .sort((a, b) => {
      if (statusFilter === 'All') {
        const rankA = statusRank[a.status as keyof typeof statusRank] || 99;
        const rankB = statusRank[b.status as keyof typeof statusRank] || 99;
        if (rankA !== rankB) return rankA - rankB;
      }
      return a.name.localeCompare(b.name);
    });

  const totals = filteredProjects.reduce((acc, p) => ({
    value: acc.value + p.value,
    invoiced: acc.invoiced + p.invoiced,
    paid: acc.paid + p.paid,
    costs: acc.costs + p.costs,
    cashResult: acc.cashResult + p.cashResult,
    profit: acc.profit + p.profit
  }), { value: 0, invoiced: 0, paid: 0, costs: 0, cashResult: 0, profit: 0 });

  const generalExpensesNet = state.expenses
    .filter(e => filterDate(e.date))
    .filter(e => !state.expenseAllocations.some(a => a.expenseId === e.id))
    .reduce((sum, e) => sum + e.amount, 0);

  const totalProjectProfit = projectSummaries.reduce((sum, p) => sum + p.profit, 0);
  const businessResult = totalProjectProfit - generalExpensesNet;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Financial Overview</h1>
        <select 
          className={styles.filterSelect}
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as DateFilter)}
        >
          <option value="all">All Time</option>
          <option value="this_month">This Month</option>
          <option value="last_month">Last Month</option>
          <option value="this_quarter">This Quarter</option>
          <option value="last_quarter">Last Quarter</option>
          <option value="q1">Q1 (Jan - Mar)</option>
          <option value="q2">Q2 (Apr - Jun)</option>
          <option value="q3">Q3 (Jul - Sep)</option>
          <option value="q4">Q4 (Oct - Dec)</option>
          <option value="this_year">This Year</option>
        </select>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>BUSINESS CASH</h2>
        <div className={styles.cardsContainer}>
          <div className={styles.card}>
            <div className={styles.cardTitle}>Money In (Net)</div>
            <div className={styles.cardValue} style={{ color: 'var(--color-success)' }}>
              €{moneyInNet.toFixed(2)}
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardTitle}>Money Out (Net)</div>
            <div className={styles.cardValue} style={{ color: 'var(--color-danger)' }}>
              €{moneyOutNet.toFixed(2)}
            </div>
          </div>
          <div className={styles.card} style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '2px solid var(--color-border)' }}>
            <div className={styles.cardTitle}>Business Cash Result</div>
            <div className={`${styles.cardValue} ${businessCashResult >= 0 ? styles.positive : styles.negative}`}>
              {businessCashResult >= 0 ? '+' : ''}€{businessCashResult.toFixed(2)}
            </div>
          </div>
          <div className={styles.card} style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '2px solid var(--color-accent)' }}>
            <div className={styles.cardTitle} style={{ color: 'var(--color-accent)' }}>Business Result</div>
            <div className={`${styles.cardValue} ${businessResult >= 0 ? styles.positive : styles.negative}`}>
              {businessResult >= 0 ? '+' : ''}€{businessResult.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>VAT</h2>
        <div className={styles.cardsContainer} style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div className={styles.card}>
            <div className={styles.cardTitle}>VAT Received</div>
            <div className={styles.cardValue} style={{ color: 'var(--color-text)' }}>
              €{vatReceived.toFixed(2)}
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardTitle}>VAT Paid</div>
            <div className={styles.cardValue} style={{ color: 'var(--color-text)' }}>
              €{vatPaidTotal.toFixed(2)}
            </div>
          </div>
          <div className={styles.card} style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}>
            <div className={styles.cardTitle}>VAT Balance</div>
            <div className={`${styles.cardValue} ${vatBalance >= 0 ? styles.positive : styles.negative}`}>
              {vatBalance >= 0 ? '+' : ''}€{vatBalance.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>OUTSTANDING</h2>
        <div className={styles.outstandingGrid}>
          <div className={styles.outstandingItem}>
            <span className={styles.outstandingLabel}>Client Invoices</span>
            <span className={styles.outstandingValue}>€{clientOutstanding.toFixed(2)}</span>
          </div>
          <div className={styles.outstandingItem}>
            <span className={styles.outstandingLabel}>Subcontractor Invoices</span>
            <span className={styles.outstandingValue}>€{subOutstanding.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
          <h2 className={styles.sectionTitle} style={{ margin: 0, border: 'none', padding: 0 }}>PROJECT OVERVIEW</h2>
          <select 
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="All">All Projects</option>
            <option value="Active">Active</option>
            <option value="Planned">Planned</option>
            <option value="On Hold">On Hold</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Project / Object</th>
                <th>Status</th>
                <th className={styles.rightAlign}>Value</th>
                <th className={styles.rightAlign}>Invoiced (Net)</th>
                <th className={styles.rightAlign}>Paid (Cash)</th>
                <th className={styles.rightAlign}>Costs (Net)</th>
                <th className={styles.rightAlign}>Cash Result</th>
                <th className={styles.rightAlign}>Profit</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map(proj => (
                <tr key={proj.id}>
                  <td style={{ fontWeight: 600 }}>{proj.name}</td>
                  <td>{proj.status}</td>
                  <td className={styles.rightAlign}>€{proj.value.toFixed(2)}</td>
                  <td className={styles.rightAlign}>€{proj.invoiced.toFixed(2)}</td>
                  <td className={styles.rightAlign}>€{proj.paid.toFixed(2)}</td>
                  <td className={styles.rightAlign}>€{proj.costs.toFixed(2)}</td>
                  <td className={`${styles.rightAlign} ${proj.cashResult >= 0 ? styles.positive : styles.negative}`} style={{ fontWeight: 'bold' }}>
                    {proj.cashResult >= 0 ? '+' : ''}€{proj.cashResult.toFixed(2)}
                  </td>
                  <td className={`${styles.rightAlign} ${proj.profit >= 0 ? styles.positive : styles.negative}`} style={{ fontWeight: 'bold' }}>
                    {proj.profit >= 0 ? '+' : ''}€{proj.profit.toFixed(2)}
                  </td>
                </tr>
              ))}
              {filteredProjects.length > 0 && (
                <tr style={{ backgroundColor: 'var(--color-bg-tertiary)', fontWeight: 'bold', borderTop: '2px solid var(--color-border)' }}>
                  <td colSpan={2}>TOTAL</td>
                  <td className={styles.rightAlign}>€{totals.value.toFixed(2)}</td>
                  <td className={styles.rightAlign}>€{totals.invoiced.toFixed(2)}</td>
                  <td className={styles.rightAlign}>€{totals.paid.toFixed(2)}</td>
                  <td className={styles.rightAlign}>€{totals.costs.toFixed(2)}</td>
                  <td className={`${styles.rightAlign} ${totals.cashResult >= 0 ? styles.positive : styles.negative}`}>
                    {totals.cashResult >= 0 ? '+' : ''}€{totals.cashResult.toFixed(2)}
                  </td>
                  <td className={`${styles.rightAlign} ${totals.profit >= 0 ? styles.positive : styles.negative}`}>
                    {totals.profit >= 0 ? '+' : ''}€{totals.profit.toFixed(2)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div style={{ marginTop: '24px', fontSize: '1.05rem' }}>
          <h2 className={styles.sectionTitle} style={{ border: 'none', marginBottom: '8px' }}>GENERAL / COMPANY EXPENSES</h2>
          <span style={{ color: 'var(--color-text-muted)' }}>Company Expenses (Net):</span>{' '}
          <span style={{ fontWeight: 'bold' }}>€{generalExpensesNet.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
