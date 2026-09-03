import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Worker } from '../../models/types';
import { useAppContext } from '../../context/AppContext';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';
import styles from './WorkerForm.module.css';

interface WorkerFormProps {
  isOpen: boolean;
  onClose: () => void;
  worker?: Worker | null;
}

const WorkerForm: React.FC<WorkerFormProps> = ({ isOpen, onClose, worker }) => {
  const { dispatch } = useAppContext();
  const [formData, setFormData] = useState<Partial<Worker>>({});

  useEffect(() => {
    if (isOpen) {
      if (worker) {
        setFormData(worker);
      } else {
        setFormData({
          name: '',
          trade: '',
          colour: '',
          active: true,
          notes: '',
          phone: '',
          email: '',
          paymentType: 'daily',
          dailyRate: undefined,
        });
      }
    }
  }, [isOpen, worker]);

  const handleChange = (field: keyof Worker, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    if (worker) {
      dispatch({ type: 'UPDATE_WORKER', worker: formData as Worker });
    } else {
      dispatch({ type: 'ADD_WORKER', worker: { ...formData, id: uuidv4() } as Worker });
    }
    onClose();
  };

  const handleDelete = () => {
    if (worker) {
      dispatch({ type: 'DELETE_WORKER', id: worker.id });
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={worker ? 'Edit Worker' : 'New Worker'}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <Input
          label="Name"
          value={formData.name || ''}
          onChange={(val) => handleChange('name', val)}
          required
        />
        <Input
          label="Trade / Role"
          value={formData.trade || ''}
          onChange={(val) => handleChange('trade', val)}
          required
        />
        <Input
          label="Phone Number"
          value={formData.phone || ''}
          onChange={(val) => handleChange('phone', val)}
        />
        <Input
          label="Email Address"
          type="email"
          value={formData.email || ''}
          onChange={(val) => handleChange('email', val)}
        />
        <Select
          label="Payment Type"
          value={formData.paymentType || 'daily'}
          onChange={(val) => handleChange('paymentType', val as 'daily' | 'project')}
          options={[
            { value: 'daily', label: 'Daily Rate' },
            { value: 'project', label: 'Subcontractor' },
          ]}
        />
        {(formData.paymentType === 'daily' || !formData.paymentType) && (
          <Input
            label="Daily Rate (€)"
            type="number"
            value={formData.dailyRate?.toString() || ''}
            onChange={(val) => handleChange('dailyRate', val ? parseFloat(val) : undefined)}
          />
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '4px 0' }}>
          <label style={{ fontSize: '0.875rem', color: 'var(--color-text)', fontWeight: 500 }}>Colour</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {formData.colour ? (
              <Input
                type="color"
                value={formData.colour}
                onChange={(val) => handleChange('colour', val)}
              />
            ) : (
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                Auto-assigned on save
              </span>
            )}
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => handleChange('colour', formData.colour ? '' : '#4A90D9')}
            >
              {formData.colour ? 'Reset to Auto' : 'Manually choose'}
            </Button>
          </div>
        </div>
        <div className={styles.checkboxGroup}>
          <input
            type="checkbox"
            id="active-checkbox"
            checked={formData.active ?? true}
            onChange={(e) => handleChange('active', e.target.checked)}
          />
          <label htmlFor="active-checkbox">Active Status</label>
        </div>
        <Input
          label="Notes"
          value={formData.notes || ''}
          onChange={(val) => handleChange('notes', val)}
          multiline
        />
        
        <div className={styles.actions}>
          {worker && (
            <Button type="button" variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          )}
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

export default WorkerForm;
