import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ClientInvoice, Project } from '../../models/types';
import { useAppContext } from '../../context/AppContext';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import DateInput from '../common/DateInput';
import styles from './WorkerForm.module.css';

interface ClientInvoiceFormProps {
  isOpen: boolean;
  onClose: () => void;
  invoice?: ClientInvoice | null;
  project: Project;
}

const ClientInvoiceForm: React.FC<ClientInvoiceFormProps> = ({ isOpen, onClose, invoice, project }) => {
  const { dispatch } = useAppContext();
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNumber, setInvoiceNumber] = useState('INV-');
  const [netAmount, setNetAmount] = useState('');
  const [vatRate, setVatRate] = useState('18');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (invoice) {
      setDate(invoice.date);
      setInvoiceNumber(invoice.invoiceNumber || '');
      setNetAmount(invoice.netAmount.toString());
      setVatRate(invoice.vatRate.toString());
      setNotes(invoice.notes || '');
    } else {
      setDate(new Date().toISOString().split('T')[0]);
      setInvoiceNumber('INV-');
      setNetAmount('');
      setVatRate('18');
      setNotes('');
    }
  }, [invoice, isOpen]);

  const netNum = Number(netAmount) || 0;
  const rateNum = Number(vatRate) || 0;
  const vatAmount = (netNum * rateNum) / 100;
  const grossAmount = netNum + vatAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!netAmount) return;

    let finalInvoiceNumber: string | undefined = invoiceNumber.trim();
    if (finalInvoiceNumber === 'INV-' || finalInvoiceNumber === '') {
      finalInvoiceNumber = undefined;
    }

    const invoiceData: ClientInvoice = {
      id: invoice ? invoice.id : uuidv4(),
      projectId: project.id,
      date,
      invoiceNumber: finalInvoiceNumber,
      netAmount: netNum,
      vatRate: rateNum,
      vatAmount: Number(vatAmount.toFixed(2)),
      grossAmount: Number(grossAmount.toFixed(2)),
      notes: notes.trim() || undefined
    };

    if (invoice) {
      dispatch({ type: 'UPDATE_CLIENT_INVOICE', invoice: invoiceData });
    } else {
      dispatch({ type: 'ADD_CLIENT_INVOICE', invoice: invoiceData });
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={invoice ? 'Edit Client Invoice' : 'Add Client Invoice'}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <DateInput label="Date" value={date} onChange={setDate} required />
        <Input label="Invoice Number (Optional)" value={invoiceNumber} onChange={setInvoiceNumber} placeholder="e.g. INV-001" />
        
        <Input 
          label="Net Amount (€)" 
          type="number" 
          step="0.01" 
          min="0" 
          value={netAmount} 
          onChange={setNetAmount} 
          required 
        />
        
        <Input 
          label="VAT Rate (%)" 
          type="number" 
          step="0.1" 
          min="0" 
          value={vatRate} 
          onChange={setVatRate} 
          required 
        />
        
        <div style={{ display: 'flex', gap: '16px', background: 'var(--color-bg-secondary)', padding: '12px', borderRadius: '4px', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>VAT Amount:</div>
            <div style={{ fontWeight: 600 }}>€{vatAmount.toFixed(2)}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Gross Amount:</div>
            <div style={{ fontWeight: 600 }}>€{grossAmount.toFixed(2)}</div>
          </div>
        </div>

        <Input label="Notes (Optional)" value={notes} onChange={setNotes} />
        
        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">{invoice ? 'Save Changes' : 'Add Invoice'}</Button>
        </div>
      </form>
    </Modal>
  );
};

export default ClientInvoiceForm;
