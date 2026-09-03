import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Expense } from '../../models/types';
import Button from '../../components/common/Button';
import ExpenseForm from '../../components/Forms/ExpenseForm';
import { getProjectDisplayName } from '../../utils/projectUtils';
import styles from './ExpensesView.module.css';

export default function ExpensesView() {
  const { state, dispatch } = useAppContext();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const expenses = [...state.expenses].sort((a, b) => b.date.localeCompare(a.date));
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.grossAmount || e.amount), 0);

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      dispatch({ type: 'DELETE_EXPENSE', id });
    }
  };

  const getExpenseProjectDisplay = (expenseId: string) => {
    const allocs = state.expenseAllocations.filter(a => a.expenseId === expenseId);
    if (allocs.length === 0) return 'General (Company)';
    
    if (allocs.length === 1) {
      const p = state.projects.find(proj => proj.id === allocs[0].projectId);
      return p ? getProjectDisplayName(p, state.clients) : 'Deleted Project';
    }

    return 'Multiple Projects';
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Expenses</h1>
        <Button variant="primary" onClick={() => { setEditingExpense(null); setIsFormOpen(true); }}>
          + Add Expense
        </Button>
      </div>

      <div className={styles.summaryCard}>
        <div className={styles.summaryLabel}>Total Expenses (Cash Out)</div>
        <div className={styles.summaryValue}>€{totalExpenses.toFixed(2)}</div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th>Project/Object</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '24px' }}>
                  No expenses recorded yet.
                </td>
              </tr>
            ) : (
              expenses.map(e => (
                <tr key={e.id}>
                  <td>{new Date(e.date).toLocaleDateString('en-GB')}</td>
                  <td>{e.category}</td>
                  <td>{e.description}</td>
                  <td>
                    {getExpenseProjectDisplay(e.id)}
                    {state.expenseAllocations.filter(a => a.expenseId === e.id).length > 1 && (
                      <div className={styles.allocLabel}>
                        {state.expenseAllocations.filter(a => a.expenseId === e.id).map(a => {
                          const p = state.projects.find(proj => proj.id === a.projectId);
                          const name = p ? getProjectDisplayName(p, state.clients) : 'Deleted Project';
                          return `${name}: €${a.amount.toFixed(2)}`;
                        }).join(' | ')}
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>€{(e.grossAmount || e.amount).toFixed(2)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className={styles.actionBtn} onClick={() => { setEditingExpense(e); setIsFormOpen(true); }}>Edit</button>
                    <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDelete(e.id)}>Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isFormOpen && (
        <ExpenseForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          expense={editingExpense}
        />
      )}
    </div>
  );
}
