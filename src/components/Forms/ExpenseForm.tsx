import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Expense, ExpenseAllocation, ExpenseCategory } from '../../models/types';
import { useAppContext } from '../../context/AppContext';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import DateInput from '../common/DateInput';
import Select from '../common/Select';
import { getProjectDisplayName } from '../../utils/projectUtils';
import styles from './WorkerForm.module.css';

interface ExpenseFormProps {
  isOpen: boolean;
  onClose: () => void;
  expense?: Expense | null;
}

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'Materials', label: 'Materials' },
  { value: 'Skips / Waste', label: 'Skips / Waste' },
  { value: 'Tools', label: 'Tools' },
  { value: 'Transport', label: 'Transport' },
  { value: 'Fuel', label: 'Fuel' },
  { value: 'Salaries', label: 'Salaries' },
  { value: 'Other', label: 'Other' }
];

export default function ExpenseForm({ isOpen, onClose, expense }: ExpenseFormProps) {
  const { state, dispatch } = useAppContext();
  const [formData, setFormData] = useState<Partial<Expense>>({});
  const [allocations, setAllocations] = useState<Partial<ExpenseAllocation>[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (expense) {
        setFormData({
          ...expense,
          vatStatus: expense.vatStatus || 'exempt',
          vatRate: expense.vatRate || 18,
          grossAmount: expense.grossAmount !== undefined ? expense.grossAmount : expense.amount
        });
        const existingAllocs = state.expenseAllocations.filter(a => a.expenseId === expense.id);
        setAllocations(existingAllocs.length > 0 ? existingAllocs : []);
      } else {
        setFormData({
          date: new Date().toISOString().split('T')[0],
          category: 'Materials',
          description: '',
          grossAmount: 0,
          vatStatus: 'registered',
          vatRate: 18
        });
        setAllocations([]);
      }
      setErrorMsg('');
    }
  }, [isOpen, expense, state.expenseAllocations]);

  const handleChange = (field: keyof Expense, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAllocationChange = (index: number, field: keyof ExpenseAllocation, value: any) => {
    const newAllocs = [...allocations];
    newAllocs[index] = { ...newAllocs[index], [field]: value };
    setAllocations(newAllocs);
  };

  const addAllocation = () => {
    setAllocations([...allocations, { projectId: '', amount: 0 }]);
  };

  const removeAllocation = (index: number) => {
    setAllocations(allocations.filter((_, i) => i !== index));
  };

  const inputGross = formData.grossAmount || 0;
  let netTotal = inputGross;
  let vatAmount = 0;

  const isVatRegistered = formData.vatStatus === 'registered';
  const currentVatRate = formData.vatRate !== undefined ? formData.vatRate : 18;

  if (isVatRegistered) {
    netTotal = inputGross / (1 + (currentVatRate / 100));
    vatAmount = inputGross - netTotal;
  }
  
  const grossTotal = inputGross;
  
  const allocatedNetTotal = allocations.reduce((sum, a) => sum + (parseFloat(a.amount as any) || 0), 0);
  const remainingNet = netTotal - allocatedNetTotal;
  const allocatedVatTotal = isVatRegistered ? allocatedNetTotal * (currentVatRate / 100) : 0;
  const allocatedGrossTotal = allocatedNetTotal + allocatedVatTotal;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.date || !formData.category || !formData.description || formData.grossAmount === undefined) return;

    if (allocations.length > 0) {
      const allValid = allocations.every(a => a.projectId && (a.amount || 0) > 0);
      if (!allValid) {
        setErrorMsg('All allocations must have a Project and a Net Amount > 0.');
        return;
      }
      if (Math.abs(allocatedNetTotal - netTotal) > 0.01) {
        setErrorMsg(`Allocated Net (€${allocatedNetTotal.toFixed(2)}) must exactly equal the Expense Net (€${netTotal.toFixed(2)}).`);
        return;
      }
    }

    const finalExpense: Expense = {
      id: expense ? expense.id : uuidv4(),
      date: formData.date,
      category: formData.category as ExpenseCategory,
      description: formData.description,
      amount: parseFloat(netTotal.toFixed(2)),
      vatStatus: formData.vatStatus,
      vatRate: formData.vatRate,
      vatAmount: parseFloat(vatAmount.toFixed(2)),
      grossAmount: parseFloat(grossTotal.toFixed(2))
    };

    const finalAllocations: ExpenseAllocation[] = allocations.map(a => ({
      id: a.id || uuidv4(),
      expenseId: finalExpense.id,
      projectId: a.projectId,
      amount: parseFloat(a.amount as any)
    }));

    if (expense) {
      dispatch({ type: 'UPDATE_EXPENSE', expense: finalExpense, allocations: finalAllocations });
    } else {
      dispatch({ type: 'ADD_EXPENSE', expense: finalExpense, allocations: finalAllocations });
    }
    onClose();
  };

  const projectOptions = [
    { value: '', label: '-- Select Project --' },
    ...state.projects.map(p => ({ value: p.id, label: getProjectDisplayName(p, state.clients) }))
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={expense ? 'Edit Expense' : 'Add Expense'}>
      <form onSubmit={handleSubmit} className={styles.form}>
        
        <div className={styles.row}>
          <div style={{ flex: 1 }}>
            <DateInput
              label="Date"
              value={formData.date || ''}
              onChange={(val) => handleChange('date', val)}
              required
            />
          </div>
          <div style={{ flex: 1 }}>
            <Select
              label="Category"
              value={formData.category || ''}
              onChange={(val) => handleChange('category', val)}
              options={CATEGORIES}
              required
            />
          </div>
        </div>

        <Input
          label="Description"
          value={formData.description || ''}
          onChange={(val) => handleChange('description', val)}
          required
          placeholder="e.g. Paint from B&Q"
        />

        <div className={styles.row} style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <Input
              label="Total Paid / Gross (€)"
              type="number"
              value={formData.grossAmount?.toString() || ''}
              onChange={(val) => handleChange('grossAmount', val ? parseFloat(val) : 0)}
              required
            />
          </div>
          
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '8px' }}>VAT Status</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button 
                type="button" 
                variant={formData.vatStatus === 'registered' ? 'primary' : 'secondary'} 
                onClick={() => handleChange('vatStatus', 'registered')}
                style={{ flex: 1, padding: '8px 4px', fontSize: '0.85rem' }}
              >
                VAT Applicable
              </Button>
              <Button 
                type="button" 
                variant={formData.vatStatus !== 'registered' ? 'primary' : 'secondary'} 
                onClick={() => handleChange('vatStatus', 'exempt')}
                style={{ flex: 1, padding: '8px 4px', fontSize: '0.85rem' }}
              >
                No VAT
              </Button>
            </div>
          </div>
          
          {isVatRegistered && (
            <div style={{ flex: 1 }}>
              <Input
                label="VAT Rate (%)"
                type="number"
                value={formData.vatRate?.toString() || ''}
                onChange={(val) => handleChange('vatRate', val ? parseFloat(val) : 0)}
              />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: 'var(--color-bg-tertiary)', borderRadius: '4px', border: '1px solid var(--color-border)', fontSize: '0.95rem' }}>
           <div><span style={{ color: 'var(--color-text-muted)' }}>Net:</span> <span style={{ fontWeight: 'bold' }}>€{netTotal.toFixed(2)}</span></div>
           <div><span style={{ color: 'var(--color-text-muted)' }}>VAT:</span> <span style={{ fontWeight: 'bold' }}>€{vatAmount.toFixed(2)}</span></div>
        </div>

        <div style={{ borderTop: '1px solid var(--color-border)', margin: '8px 0', paddingTop: '16px' }}>
          <h4 style={{ marginBottom: '8px' }}>Project Allocations (Optional)</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
            Leave empty for a General Company Expense. If adding projects, allocate the <strong>NET</strong> amount.
          </p>

          {allocations.map((alloc, idx) => {
            const aNet = parseFloat(alloc.amount as any) || 0;
            const aVat = isVatRegistered ? aNet * (currentVatRate / 100) : 0;
            const aGross = aNet + aVat;

            return (
              <div key={idx} className={styles.row} style={{ alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ flex: 1.5 }}>
                  <Select
                    label={idx === 0 ? "Project/Object" : ""}
                    value={alloc.projectId || ''}
                    onChange={(val) => handleAllocationChange(idx, 'projectId', val)}
                    options={projectOptions}
                    required
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <Input
                    label={idx === 0 ? "NET Amount (€)" : ""}
                    type="number"
                    value={alloc.amount?.toString() || ''}
                    onChange={(val) => handleAllocationChange(idx, 'amount', val ? parseFloat(val) : 0)}
                    required
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <Input
                    label={idx === 0 ? "VAT (€)" : ""}
                    type="text"
                    value={aVat.toFixed(2)}
                    onChange={() => {}}
                    disabled
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <Input
                    label={idx === 0 ? "GROSS (€)" : ""}
                    type="text"
                    value={aGross.toFixed(2)}
                    onChange={() => {}}
                    disabled
                  />
                </div>
                <div style={{ paddingTop: idx === 0 ? '28px' : '6px' }}>
                  <Button type="button" variant="danger" onClick={() => removeAllocation(idx)}>X</Button>
                </div>
              </div>
            );
          })}

          <Button type="button" variant="secondary" onClick={addAllocation} style={{ marginTop: '8px' }}>
            + Add Allocation
          </Button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
           <div style={{ backgroundColor: 'var(--color-bg-tertiary)', padding: '12px', borderRadius: '4px', border: '1px solid var(--color-border)', width: '100%', fontSize: '0.95rem' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: 'var(--color-text-muted)' }}>
                <span>Expense Net:</span>
                <span>€{netTotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Allocated Net:</span>
                <span>€{allocatedNetTotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--color-border)', color: allocations.length > 0 && Math.abs(remainingNet) > 0.01 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                <span style={{ fontWeight: 'bold' }}>Remaining Net:</span>
                <span style={{ fontWeight: 'bold' }}>€{remainingNet.toFixed(2)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: 'var(--color-text-muted)' }}>
                <span>Allocated VAT:</span>
                <span>€{allocatedVatTotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-accent)' }}>
                <span style={{ fontWeight: 'bold' }}>Allocated Gross:</span>
                <span style={{ fontWeight: 'bold' }}>€{allocatedGrossTotal.toFixed(2)}</span>
              </div>
           </div>
        </div>

        {errorMsg && (
          <div style={{ color: 'white', backgroundColor: 'var(--color-danger)', padding: '8px 12px', borderRadius: '4px' }}>
            {errorMsg}
          </div>
        )}

        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <div className={styles.rightActions}>
            <Button type="submit" variant="primary">
              {expense ? 'Save Changes' : 'Add Expense'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}