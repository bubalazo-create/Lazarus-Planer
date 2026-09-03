import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { SubcontractorInvoice, SubcontractorInvoiceAllocation, Worker } from '../../models/types';
import { useAppContext } from '../../context/AppContext';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import DateInput from '../common/DateInput';
import Select from '../common/Select';
import styles from './WorkerForm.module.css';
import { getProjectDisplayName } from '../../utils/projectUtils';

interface SubcontractorInvoiceFormProps {
  isOpen: boolean;
  onClose: () => void;
  invoice?: SubcontractorInvoice | null;
  worker?: Worker;
}

const SubcontractorInvoiceForm: React.FC<SubcontractorInvoiceFormProps> = ({ isOpen, onClose, invoice, worker }) => {
  const { state, dispatch } = useAppContext();
  const [formData, setFormData] = useState<Partial<SubcontractorInvoice>>({});
  const [allocations, setAllocations] = useState<Partial<SubcontractorInvoiceAllocation>[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (invoice) {
        setFormData(invoice);
        const existingAllocations = state.subcontractorInvoiceAllocations.filter(a => a.invoiceId === invoice.id);
        setAllocations(existingAllocations.length > 0 ? existingAllocations : [{ projectId: '', description: '', amount: 0 }]);
      } else {
        const today = new Date().toISOString().split('T')[0];
                setFormData({
          workerId: worker ? worker.id : '',
          date: today,
          invoiceNumber: '',
          totalAmount: 0,
          vatStatus: 'exempt',
          vatRate: 0,
          notes: '',
        });
        setAllocations([{ projectId: '', description: '', amount: 0 }]);
      }
      setErrorMsg('');
    }
  }, [isOpen, invoice, worker, state.subcontractorInvoiceAllocations]);

  const handleChange = (field: keyof SubcontractorInvoice, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAllocationChange = (index: number, field: keyof SubcontractorInvoiceAllocation, value: any) => {
    const newAllocations = [...allocations];
    newAllocations[index] = { ...newAllocations[index], [field]: value };
    
    if (field === 'projectId') {
      if (value === '__other__') {
        newAllocations[index].type = 'other';
        newAllocations[index].projectId = '';
      } else {
        newAllocations[index].type = 'project';
      }
    }
    
    setAllocations(newAllocations);
  };

  const addAllocation = () => {
    setAllocations([...allocations, { projectId: '', description: '', amount: 0 }]);
  };

  const removeAllocation = (index: number) => {
    const newAllocations = allocations.filter((_, i) => i !== index);
    setAllocations(newAllocations);
  };
  
  const totalAllocated = allocations.reduce((sum, a) => sum + (parseFloat(a.amount as any) || 0), 0);
  const vatAmount = formData.vatStatus === 'registered' ? totalAllocated * ((formData.vatRate || 18) / 100) : 0;
  const grossAmount = totalAllocated + vatAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (!formData.date || !formData.workerId) return;
    
    const validAllocations = allocations.filter(a => {
      const isProjectValid = a.type !== 'other' && !!a.projectId;
      const isOtherValid = a.type === 'other';
      return (isProjectValid || isOtherValid) && !!a.description && a.amount !== undefined && a.amount > 0;
    });

    if (validAllocations.length === 0) {
      setErrorMsg("Please provide at least one valid allocation (requires Project, Description, and Amount > 0).");
      return;
    }

        const finalInvoice = {
      ...formData,
      totalAmount: totalAllocated,
      vatAmount,
      grossAmount,
      id: invoice ? invoice.id : uuidv4(),
    } as SubcontractorInvoice;

    const finalAllocations = validAllocations.map(a => ({
      ...a,
      id: a.id || uuidv4(),
      invoiceId: finalInvoice.id,
      type: a.type || 'project',
      projectId: a.type === 'other' ? undefined : a.projectId,
    })) as SubcontractorInvoiceAllocation[];

    if (invoice) {
      dispatch({ type: 'UPDATE_SUBCONTRACTOR_INVOICE', invoice: finalInvoice, allocations: finalAllocations });
    } else {
      dispatch({ type: 'ADD_SUBCONTRACTOR_INVOICE', invoice: finalInvoice, allocations: finalAllocations });
    }
    onClose();
  };

  const workerOptions = [
    { value: '', label: '-- Select Subcontractor --' },
    ...state.workers.filter(w => w.paymentType === 'project').map(w => ({ value: w.id, label: w.name }))
  ];

  const projectOptions = [
    { value: '', label: '-- Select Project --' },
    { value: '__other__', label: '-- Other / No Project --' },
    ...state.projects.map(p => ({ value: p.id, label: getProjectDisplayName(p, state.clients) }))
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={invoice ? 'Edit Invoice' : 'Add Invoice'}>
      <form onSubmit={handleSubmit} className={styles.form}>
        
        {!worker && (
          <Select
            label="Subcontractor"
            value={formData.workerId || ''}
            onChange={(val) => handleChange('workerId', val)}
            options={workerOptions}
            required
          />
        )}
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <DateInput
              label="Date"
              value={formData.date || ''}
              onChange={(val) => handleChange('date', val)}
              required
            />
          </div>
          <div style={{ flex: 1 }}>
            <Input
              label="Invoice Number"
              value={formData.invoiceNumber || ''}
              onChange={(val) => handleChange('invoiceNumber', val)}
              placeholder="e.g. INV-2026-042"
            />
          </div>
        </div>
        
        <Input
          label="Invoice Total (€) - Auto-calculated"
          type="text"
          value={totalAllocated.toFixed(2)}
          onChange={() => {}}
          disabled
        />

        <div style={{ marginTop: '16px', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
          <h4 style={{ marginBottom: '12px' }}>Allocations</h4>
          {allocations.map((alloc, index) => {
             const projValue = alloc.type === 'other' ? '__other__' : (alloc.projectId || '');
             return (
              <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', marginBottom: '8px' }}>
                <div style={{ flex: 1.5 }}>
                  <Select
                    label={index === 0 ? "Project" : ""}
                    value={projValue}
                    onChange={(val) => handleAllocationChange(index, 'projectId', val)}
                    options={projectOptions}
                    required
                  />
                </div>
                <div style={{ flex: 2 }}>
                  <Input
                    label={index === 0 ? "Description" : ""}
                    value={alloc.description || ''}
                    onChange={(val) => handleAllocationChange(index, 'description', val)}
                    required
                    placeholder="e.g. Labour, Skip..."
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <Input
                    label={index === 0 ? "Amount (€)" : ""}
                    type="number"
                    value={alloc.amount?.toString() || ''}
                    onChange={(val) => handleAllocationChange(index, 'amount', val ? parseFloat(val) : 0)}
                    required
                  />
                </div>
                {allocations.length > 1 && (
                  <div style={{ paddingBottom: '4px' }}>
                    <Button type="button" variant="danger" onClick={() => removeAllocation(index)}>X</Button>
                  </div>
                )}
              </div>
             );
          })}
          <Button type="button" variant="secondary" onClick={addAllocation} style={{ marginTop: '8px' }}>
            + Add Allocation
          </Button>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '16px', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '8px' }}>VAT Status</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button 
                type="button" 
                variant={formData.vatStatus === 'registered' ? 'primary' : 'secondary'} 
                onClick={() => setFormData(prev => ({ ...prev, vatStatus: 'registered', vatRate: prev.vatRate || 18 }))}
                style={{ flex: 1 }}
              >
                VAT Registered
              </Button>
              <Button 
                type="button" 
                variant={formData.vatStatus !== 'registered' ? 'primary' : 'secondary'} 
                onClick={() => setFormData(prev => ({ ...prev, vatStatus: 'exempt', vatRate: 0 }))}
                style={{ flex: 1 }}
              >
                VAT Exempt
              </Button>
            </div>
          </div>
          
          {formData.vatStatus === 'registered' && (
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

        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
           <div style={{ fontWeight: 'bold', fontSize: '1.1rem', backgroundColor: 'var(--color-bg-tertiary)', padding: '12px', borderRadius: '4px', border: '1px solid var(--color-border)', width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Net Total (Allocations):</span>
                <span>€{totalAllocated.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>VAT {formData.vatStatus !== 'registered' ? '(Exempt)' : `(${formData.vatRate || 18}%)`}:</span>
                <span>€{vatAmount.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: '8px', fontSize: '1.2rem', color: 'var(--color-accent)' }}>
                <span>Gross Total:</span>
                <span>€{grossAmount.toFixed(2)}</span>
              </div>
           </div>
        </div>

        {errorMsg && (
          <div style={{ marginTop: '12px', color: 'white', backgroundColor: 'var(--color-danger)', padding: '8px 12px', borderRadius: '4px' }}>
            {errorMsg}
          </div>
        )}

        <Input
          label="Notes"
          value={formData.notes || ''}
          onChange={(val) => handleChange('notes', val)}
          multiline
        />
        
        <div className={styles.actions} style={{ marginTop: '24px' }}>
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

export default SubcontractorInvoiceForm;
