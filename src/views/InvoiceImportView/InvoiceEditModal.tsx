import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { ParsedInvoice } from '../../utils/invoiceParser';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import styles from './InvoiceImportView.module.css';
import { getProjectDisplayName } from '../../utils/projectUtils';

interface InvoiceEditModalProps {
  invoice: ParsedInvoice | null;
  onClose: () => void;
  onSave: (updated: ParsedInvoice) => void;
  onImport: (updated: ParsedInvoice) => void;
}

export default function InvoiceEditModal({ invoice, onClose, onSave, onImport }: InvoiceEditModalProps) {
  const { state } = useAppContext();
  const [formData, setFormData] = useState<ParsedInvoice | null>(null);

  useEffect(() => {
    if (invoice) setFormData({ ...invoice });
  }, [invoice]);

  if (!formData || !invoice) return null;

  const handleClientModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as 'CREATE_NEW' | 'ONE_TIME' | string;
    if (val === 'CREATE_NEW' || val === 'ONE_TIME') {
      setFormData({ ...formData, clientId: undefined, clientMode: val, isNewClient: val === 'CREATE_NEW' });
    } else {
      const client = state.clients.find(c => c.id === val);
      if (client) {
        setFormData({ 
          ...formData, 
          clientId: client.id, 
          clientName: client.name,
          clientVat: client.vatNumber || formData.clientVat,
          clientMode: 'EXISTING',
          isNewClient: false 
        });
      }
    }
  };

  const handleProjectModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'CREATE_NEW') {
      setFormData({ ...formData, projectId: undefined, projectMode: 'CREATE_NEW' });
    } else {
      setFormData({ ...formData, projectId: val, projectMode: 'EXISTING' });
    }
  };

  const updateNewProjectData = (field: string, value: string) => {
    if (!formData.newProjectData) return;
    setFormData({
      ...formData,
      newProjectData: { ...formData.newProjectData, [field]: value }
    });
  };

  const handleNumberChange = (field: keyof ParsedInvoice, value: string) => {
    const num = parseFloat(value);
    setFormData({ ...formData, [field]: isNaN(num) ? undefined : num });
  };

  const net = formData.netAmount || 0;
  const vat = formData.vatAmount || 0;
  const gross = formData.grossAmount || 0;
  
  const isMathValid = Math.abs(net + vat - gross) < 0.05;

  const handleImport = () => {
    if (formData.projectMode === 'EXISTING' && !formData.projectId) {
      alert('Please select an existing project or choose to create a new one.');
      return;
    }
    if (formData.projectMode === 'CREATE_NEW') {
      if (!formData.newProjectData?.name) {
        alert('Project Name is required for creating a new project.');
        return;
      }
    }
    if (formData.clientMode === 'CREATE_NEW' || formData.clientMode === 'ONE_TIME') {
      if (!formData.clientName) {
         alert('Client Name is required.');
         return;
      }
    }
    if (!isMathValid) {
      if (!confirm('Net + VAT does not equal Gross. Are you sure you want to import this invoice?')) return;
    }
    onImport(formData);
  };

  return (
    <Modal isOpen={!!invoice} onClose={onClose} title={`Edit & Import: ${formData.filename}`}>
      <div className={styles.editModal}>
        <div className={styles.editForm}>
          
          <div className={styles.formGroup}>
            <label>Invoice Number</label>
            <input type="text" value={formData.invoiceNumber || ''} onChange={e => setFormData({...formData, invoiceNumber: e.target.value})} />
          </div>

          <div className={styles.formGroup}>
            <label>Date (DD/MM/YYYY)</label>
            <input type="text" value={formData.date || ''} onChange={e => setFormData({...formData, date: e.target.value})} />
          </div>

          <div className={styles.formGroup}>
            <label>Client Selection</label>
            <select 
              value={formData.clientMode === 'EXISTING' ? (formData.clientId || '') : formData.clientMode} 
              onChange={handleClientModeChange}
            >
              <option value="" disabled>Select a client...</option>
              <option value="CREATE_NEW">+ Create New Client</option>
              <option value="ONE_TIME">One-Time Client (Do not save to DB)</option>
              {state.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {(formData.clientMode === 'CREATE_NEW' || formData.clientMode === 'ONE_TIME') && (
            <>
              <div className={styles.formGroup}>
                <label>{formData.clientMode === 'ONE_TIME' ? 'One-Time Client Name' : 'New Client Name'}</label>
                <input type="text" value={formData.clientName || ''} onChange={e => setFormData({...formData, clientName: e.target.value})} />
              </div>
              <div className={styles.formGroup}>
                <label>{formData.clientMode === 'ONE_TIME' ? 'One-Time Client VAT' : 'New Client VAT'}</label>
                <input type="text" value={formData.clientVat || ''} onChange={e => setFormData({...formData, clientVat: e.target.value})} />
              </div>
            </>
          )}

          <div className={styles.formGroup}>
            <label>Project Selection</label>
            <select 
              value={formData.projectMode === 'EXISTING' ? (formData.projectId || '') : 'CREATE_NEW'} 
              onChange={handleProjectModeChange}
            >
              <option value="">-- Select Existing Project --</option>
              <option value="CREATE_NEW">+ Create New Project</option>
              {state.projects
                .filter(p => formData.clientMode !== 'EXISTING' || !formData.clientId || p.clientId === formData.clientId)
                .map(p => <option key={p.id} value={p.id}>{getProjectDisplayName(p, state.clients)}</option>)
              }
            </select>
          </div>
        </div>

        {formData.projectMode === 'CREATE_NEW' && formData.newProjectData && (
          <div className={styles.newProjectBox}>
            <h4>New Project Details</h4>
            <div className={styles.editForm}>
              <div className={styles.formGroup}>
                <label>Project Name *</label>
                <input type="text" value={formData.newProjectData.name} onChange={e => updateNewProjectData('name', e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label>Address</label>
                <input type="text" value={formData.newProjectData.address} onChange={e => updateNewProjectData('address', e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label>Start Date (YYYY-MM-DD)</label>
                <input type="date" value={formData.newProjectData.startDate} onChange={e => updateNewProjectData('startDate', e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label>Target End Date (YYYY-MM-DD)</label>
                <input type="date" value={formData.newProjectData.targetEndDate} onChange={e => updateNewProjectData('targetEndDate', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        <div className={styles.editForm}>
          <div className={styles.formGroup}>
            <label>Description / Notes</label>
            <input type="text" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
          </div>

          <div className={styles.formGroup}>
            <label>Net Amount (€)</label>
            <input type="number" step="0.01" value={formData.netAmount ?? ''} onChange={e => handleNumberChange('netAmount', e.target.value)} />
          </div>

          <div className={styles.formGroup}>
            <label>VAT Rate (%)</label>
            <input type="number" step="0.1" value={formData.vatRate ?? ''} onChange={e => handleNumberChange('vatRate', e.target.value)} />
          </div>

          <div className={styles.formGroup}>
            <label>VAT Amount (€)</label>
            <input type="number" step="0.01" value={formData.vatAmount ?? ''} onChange={e => handleNumberChange('vatAmount', e.target.value)} />
          </div>

          <div className={styles.formGroup}>
            <label>Gross Amount (€)</label>
            <input type="number" step="0.01" value={formData.grossAmount ?? ''} onChange={e => handleNumberChange('grossAmount', e.target.value)} />
          </div>

        </div>

        {!isMathValid && (
          <div className={styles.warningBox}>
            <strong>Warning:</strong> Math Validation Failed.<br/>
            Net ({net}) + VAT ({vat}) = {(net + vat).toFixed(2)}, but Gross is {gross}.
          </div>
        )}

        <div className={styles.rawTextPreview}>
          <details>
            <summary>View Extracted PDF Text</summary>
            <pre>{formData.rawText}</pre>
          </details>
        </div>

        <div className={styles.modalActions}>
           <Button variant="ghost" onClick={onClose}>Cancel</Button>
           <Button variant="secondary" onClick={() => onSave(formData)}>Save Changes (Local)</Button>
           <Button variant="primary" onClick={handleImport} disabled={formData.status === 'IMPORTED'}>
             {formData.status === 'IMPORTED' ? 'Already Imported' : 'Import to Database'}
           </Button>
        </div>
      </div>
    </Modal>
  );
}
