import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ProjectClientPayment, Project } from '../../models/types';
import { useAppContext } from '../../context/AppContext';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import DateInput from '../common/DateInput';
import Select from '../common/Select';
import styles from './WorkerForm.module.css';

interface ProjectClientPaymentFormProps {
  isOpen: boolean;
  onClose: () => void;
  payment?: ProjectClientPayment | null;
  project: Project;
  initialInvoiceId?: string;
}

const ProjectClientPaymentForm: React.FC<ProjectClientPaymentFormProps> = ({ isOpen, onClose, payment, project, initialInvoiceId }) => {
  const { state, dispatch } = useAppContext();
  const [formData, setFormData] = useState<Partial<ProjectClientPayment>>({});
  
  // Outstanding invoice calculations
  const invoices = state.clientInvoices.filter(i => i.projectId === project.id);
  
  // Calculate remaining balance for a specific invoice (uses GROSS amount)
  const getInvoiceBalance = (invId: string) => {
    const inv = invoices.find(i => i.id === invId);
    if (!inv) return 0;
    const paidSoFar = state.projectClientPayments
      .filter(p => p.invoiceId === invId && p.id !== formData.id)
      .reduce((sum, p) => sum + p.amount, 0);
    return (inv.grossAmount || (inv as any).amount || 0) - paidSoFar;
  };
  
  const selectedInvoice = formData.invoiceId ? invoices.find(i => i.id === formData.invoiceId) : undefined;
  const remainingBalance = formData.invoiceId ? getInvoiceBalance(formData.invoiceId) : null;
  
  // Real-time validation warning
  const amountNum = Number(formData.amount) || 0;
  const exceedsBalance = remainingBalance !== null && amountNum > remainingBalance + 0.01;

  useEffect(() => {
    if (isOpen) {
      if (payment) {
        setFormData(payment);
      } else {
        const today = new Date().toISOString().split('T')[0];
        setFormData({
          projectId: project.id,
          date: today,
          amount: 0,
          method: 'Bank Transfer',
          invoiceId: ''
        });
      }
    }
  }, [isOpen, payment, project.id, initialInvoiceId, state.clientInvoices, state.projectClientPayments]);

  if (!isOpen) return null;

  const handleChange = (field: keyof ProjectClientPayment, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.projectId || !formData.date || !formData.amount || !formData.method) return;

    const paymentToSave: ProjectClientPayment = {
      id: formData.id || uuidv4(),
      projectId: formData.projectId,
      invoiceId: formData.invoiceId || undefined,
      date: formData.date,
      amount: Number(formData.amount),
      method: formData.method as any,
      notes: formData.notes
    };

    if (payment) {
      dispatch({ type: 'UPDATE_PROJECT_CLIENT_PAYMENT', payment: paymentToSave });
    } else {
      dispatch({ type: 'ADD_PROJECT_CLIENT_PAYMENT', payment: paymentToSave });
    }
    onClose();
  };
  
  const invoiceOptions = [
    { value: '', label: '-- No Invoice (Deposit / Advance) --' },
    ...invoices.map(inv => {
      const bal = getInvoiceBalance(inv.id);
      return {
        value: inv.id,
        label: `${inv.invoiceNumber || 'Inv'} (${inv.date}) - Gross: €${(inv.grossAmount || (inv as any).amount || 0).toFixed(2)} (Rem: €${bal.toFixed(2)})`
      };
    })
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={payment ? 'Edit Client Payment' : 'Add Client Payment'}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <DateInput
          label="Date"
          value={formData.date || ''}
          onChange={(val) => handleChange('date', val)}
          required
        />
        
        <Select
          label="Link to Client Invoice (Optional)"
          options={invoiceOptions}
          value={formData.invoiceId || ''}
          onChange={(val) => handleChange('invoiceId', val)}
        />
        
        {selectedInvoice && remainingBalance !== null && (
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '-8px', marginTop: '-8px' }}>
            Remaining balance for this invoice: <strong style={{ color: 'var(--text-primary)' }}>€{remainingBalance.toFixed(2)}</strong>
          </div>
        )}

        <div>
          <Input
            label="Amount (€)"
            type="number"
            step="0.01"
            min="0.01"
            value={formData.amount?.toString() || ''}
            onChange={(val) => handleChange('amount', val)}
            required
          />
          {exceedsBalance && (
            <div style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginTop: '4px' }}>
              Warning: Payment exceeds the remaining balance of the selected invoice!
            </div>
          )}
        </div>

        <Select
          label="Payment Method"
          options={[
            { value: 'Bank Transfer', label: 'Bank Transfer' },
            { value: 'Cash', label: 'Cash' },
            { value: 'Revolut', label: 'Revolut' },
            { value: 'Other', label: 'Other' }
          ]}
          value={formData.method || 'Bank Transfer'}
          onChange={(val) => handleChange('method', val)}
          required
        />

        <Input
          label="Notes (Optional)"
          value={formData.notes || ''}
          onChange={(val) => handleChange('notes', val)}
          placeholder="Any extra details"
        />

        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            {payment ? 'Save Changes' : 'Add Payment'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ProjectClientPaymentForm;
