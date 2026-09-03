import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { WorkerPayment, Worker } from '../../models/types';
import { useAppContext } from '../../context/AppContext';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import DateInput from '../common/DateInput';
import Select from '../common/Select';
import styles from './WorkerForm.module.css';

interface WorkerPaymentFormProps {
  isOpen: boolean;
  onClose: () => void;
  payment?: WorkerPayment | null;
  worker?: Worker;
  projectId?: string;
  invoiceId?: string;
}

const WorkerPaymentForm: React.FC<WorkerPaymentFormProps> = ({ isOpen, onClose, payment, worker, projectId, invoiceId }) => {
  const { state, dispatch } = useAppContext();
  const [formData, setFormData] = useState<Partial<WorkerPayment>>({});

  useEffect(() => {
    if (isOpen) {
      if (payment) {
        setFormData(payment);
      } else {
        const today = new Date().toISOString().split('T')[0];
        setFormData({
          workerId: worker ? worker.id : '',
          date: today,
          amount: undefined,
          method: 'Cash',
          notes: '',
          projectId: projectId || '',
          invoiceId: invoiceId || '',
        });
      }
    }
  }, [isOpen, payment, worker, projectId, invoiceId]);

  const handleChange = (field: keyof WorkerPayment, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.date || !formData.amount || !formData.method || !formData.workerId) return;

    // Validate against remaining invoice balance when linked to an invoice
    const linkedInvoiceId = formData.invoiceId || invoiceId;
    if (linkedInvoiceId && !payment) {
      const invoice = state.subcontractorInvoices.find(i => i.id === linkedInvoiceId);
      if (invoice) {
        const alreadyPaid = state.workerPayments
          .filter(p => p.invoiceId === linkedInvoiceId)
          .reduce((s, p) => s + p.amount, 0);
        const remaining = (invoice.grossAmount || invoice.totalAmount) - alreadyPaid;
        if (formData.amount > remaining + 0.001) {
          alert(`Payment amount (€${formData.amount.toFixed(2)}) exceeds the remaining invoice balance (€${remaining.toFixed(2)}).`);
          return;
        }
      }
    }

    if (payment) {
      dispatch({ type: 'UPDATE_WORKER_PAYMENT', payment: formData as WorkerPayment });
    } else {
      dispatch({ type: 'ADD_WORKER_PAYMENT', payment: { ...formData, id: uuidv4() } as WorkerPayment });
    }
    onClose();
  };

  const projectOptions = [
    { value: '', label: '-- No Project --' },
    ...state.projects.map(p => {
      const client = state.clients.find(c => c.id === p.clientId);
      const name = p.name ? p.name : (client ? `${client.name} - ${p.client}` : p.client);
      return { value: p.id, label: name };
    })
  ];

  const workerOptions = [
    { value: '', label: '-- Select Worker --' },
    ...state.workers.map(w => ({ value: w.id, label: w.name }))
  ];

  const activeWorker = worker || state.workers.find(w => w.id === formData.workerId);

  const invoiceOptions = activeWorker?.paymentType === 'project'
    ? [
        { value: '', label: '-- No Invoice (Standalone Payment) --' },
        ...state.subcontractorInvoices
          .filter(i => i.workerId === activeWorker.id)
          .sort((a, b) => b.date.localeCompare(a.date))
          .map(i => {
            const paidSoFar = state.workerPayments
              .filter(p => p.invoiceId === i.id && p.id !== payment?.id)
              .reduce((s, p) => s + p.amount, 0);
            const remaining = (i.grossAmount || i.totalAmount) - paidSoFar;
            const label = `INV ${i.invoiceNumber || '—'} (${new Date(i.date).toLocaleDateString('en-GB')}) - Bal: €${remaining.toFixed(2)}`;
            return { value: i.id, label };
          })
      ]
    : [];

  // Compute remaining balance for invoice-linked payments
  const linkedInvoiceId = formData.invoiceId || invoiceId;
  let invoiceRemainingBalance: number | null = null;
  if (linkedInvoiceId) {
    const linkedInvoice = state.subcontractorInvoices.find(i => i.id === linkedInvoiceId);
    if (linkedInvoice) {
      const paidSoFar = state.workerPayments
        .filter(p => p.invoiceId === linkedInvoiceId && p.id !== payment?.id)
        .reduce((s, p) => s + p.amount, 0);
      invoiceRemainingBalance = (linkedInvoice.grossAmount || linkedInvoice.totalAmount) - paidSoFar;
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={payment ? 'Edit Payment' : 'Add Payment'}>
      <form onSubmit={handleSubmit} className={styles.form}>
        
        {!worker && (
          <Select
            label="Worker"
            value={formData.workerId || ''}
            onChange={(val) => handleChange('workerId', val)}
            options={workerOptions}
            required
          />
        )}
        <DateInput
          label="Date"
          value={formData.date || ''}
          onChange={(val) => handleChange('date', val)}
          required
        />
        
        {activeWorker?.paymentType === 'project' && (
          <Select
            label="Invoice (Optional)"
            value={formData.invoiceId || ''}
            onChange={(val) => {
              handleChange('invoiceId', val);
              if (val) handleChange('projectId', '');
            }}
            options={invoiceOptions}
          />
        )}
        
        {!formData.invoiceId && (
          <Select
            label="Project (Optional)"
            value={formData.projectId || ''}
            onChange={(val) => handleChange('projectId', val)}
            options={projectOptions}
          />
        )}

        <Input
          label="Amount (€)"
          type="number"
          value={formData.amount?.toString() || ''}
          onChange={(val) => handleChange('amount', val ? parseFloat(val) : undefined)}
          required
        />
        {invoiceRemainingBalance !== null && (
          <div style={{ marginTop: '-8px', marginBottom: '8px', fontSize: '0.85rem', color: invoiceRemainingBalance <= 0 ? 'var(--color-success)' : 'var(--color-warning)', fontWeight: 500 }}>
            {invoiceRemainingBalance <= 0
              ? '✓ Invoice fully paid'
              : `Remaining balance: €${invoiceRemainingBalance.toFixed(2)}`}
          </div>
        )}

        <Select
          label="Payment Method"
          value={formData.method || 'Cash'}
          onChange={(val) => handleChange('method', val as 'Cash' | 'Bank Transfer' | 'Revolut' | 'Other')}
          options={[
            { value: 'Cash', label: 'Cash' },
            { value: 'Bank Transfer', label: 'Bank Transfer' },
            { value: 'Revolut', label: 'Revolut' },
            { value: 'Other', label: 'Other' },
          ]}
        />

        <Input
          label="Notes"
          value={formData.notes || ''}
          onChange={(val) => handleChange('notes', val)}
          multiline
        />
        
        <div className={styles.actions}>
          <div></div>
          <div className={styles.rightActions}>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default WorkerPaymentForm;
