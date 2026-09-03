import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { WorkerEarning, Worker } from '../../models/types';
import { useAppContext } from '../../context/AppContext';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import DateInput from '../common/DateInput';
import Select from '../common/Select';
import styles from './WorkerForm.module.css';

interface WorkerEarningFormProps {
  isOpen: boolean;
  onClose: () => void;
  earning?: WorkerEarning | null;
  worker?: Worker;
  projectId?: string;
}

const WorkerEarningForm: React.FC<WorkerEarningFormProps> = ({ isOpen, onClose, earning, worker, projectId }) => {
  const { state, dispatch } = useAppContext();
  const [formData, setFormData] = useState<Partial<WorkerEarning>>({});

  useEffect(() => {
    if (isOpen) {
      if (earning) {
        setFormData(earning);
      } else {
        const today = new Date().toISOString().split('T')[0];
        setFormData({
          workerId: worker ? worker.id : '',
          date: today,
          projectId: projectId || '',
          description: '',
          amount: undefined,
          notes: '',
        });
      }
    }
  }, [isOpen, earning, worker, projectId]);

  const handleChange = (field: keyof WorkerEarning, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleUseDailyRate = () => {
    const activeWorker = worker || state.workers.find(w => w.id === formData.workerId);
    if (activeWorker && activeWorker.dailyRate) {
      handleChange('amount', activeWorker.dailyRate);
      if (!formData.description) {
        handleChange('description', 'Daily work');
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.date || !formData.amount || !formData.description || !formData.workerId) return;

    // Convert empty string projectId to undefined
    const finalData = {
      ...formData,
      projectId: formData.projectId === 'none' || formData.projectId === '' ? undefined : formData.projectId
    };

    if (earning) {
      dispatch({ type: 'UPDATE_WORKER_EARNING', earning: finalData as WorkerEarning });
    } else {
      dispatch({ type: 'ADD_WORKER_EARNING', earning: { ...finalData, id: uuidv4() } as WorkerEarning });
    }
    onClose();
  };

  const projectOptions = [
    { value: 'none', label: 'None / General' },
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={earning ? 'Edit Earning' : 'Add Earning'}>
      <form onSubmit={handleSubmit} className={styles.form}>
        
        {!worker && (
          <Select
            label="Worker"
            value={formData.workerId || ''}
            onChange={(val) => handleChange('workerId', val)}
            options={workerOptions}
          />
        )}

        <DateInput
          label="Date"
          value={formData.date || ''}
          onChange={(val) => handleChange('date', val)}
          required
        />
        
        <Select
          label="Project (Optional)"
          value={formData.projectId || 'none'}
          onChange={(val) => handleChange('projectId', val)}
          options={projectOptions}
        />

        <Input
          label="Description"
          value={formData.description || ''}
          onChange={(val) => handleChange('description', val)}
          required
          placeholder="e.g., Plastering, 120m2..."
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <Input
                label="Amount (€)"
                type="number"
                value={formData.amount?.toString() || ''}
                onChange={(val) => handleChange('amount', val ? parseFloat(val) : undefined)}
                required
              />
            </div>
            {activeWorker && activeWorker.dailyRate ? (
              <div style={{ marginLeft: '12px', paddingBottom: '2px' }}>
                <Button type="button" variant="secondary" onClick={handleUseDailyRate}>
                  Use Daily Rate (€{activeWorker.dailyRate})
                </Button>
              </div>
            ) : null}
          </div>
        </div>

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

export default WorkerEarningForm;
