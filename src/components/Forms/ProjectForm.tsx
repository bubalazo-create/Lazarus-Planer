import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Project } from '../../models/types';
import { useAppContext } from '../../context/AppContext';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import DateInput from '../common/DateInput';
import Select from '../common/Select';
import styles from './ProjectForm.module.css';

interface ProjectFormProps {
  isOpen: boolean;
  onClose: () => void;
  project?: Project | null;
}

const ProjectForm: React.FC<ProjectFormProps> = ({ isOpen, onClose, project }) => {
  const { state, dispatch } = useAppContext();
  const [formData, setFormData] = useState<Partial<Project>>({});
  const [clientType, setClientType] = useState<'existing' | 'one-off' | 'none'>('none');

  useEffect(() => {
    if (isOpen) {
      if (project) {
        setFormData(project);
        if (project.clientId) setClientType('existing');
        else if (project.client && project.client.trim() !== '') setClientType('one-off');
        else setClientType('none');
      } else {
        const todayStr = new Date().toISOString().split('T')[0];
        setFormData({
          name: '',
          client: '',
          address: '',
          startDate: todayStr,
          targetEndDate: todayStr,
          status: 'Planned',
          colour: '',
          notes: '',
        });
        setClientType('none');
      }
    }
  }, [isOpen, project]);

  const handleChange = (field: keyof Project, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (clientType === 'one-off' && (!formData.client || formData.client.trim() === '')) return;
    if (formData.targetEndDate && formData.startDate && formData.targetEndDate < formData.startDate) {
      alert('Target completion date cannot be earlier than start date.');
      return;
    }

    const payload = { ...formData };
    if (clientType === 'none') {
      payload.clientId = undefined;
      payload.client = '';
    } else if (clientType === 'existing') {
      payload.client = '';
    } else if (clientType === 'one-off') {
      payload.clientId = undefined;
    }

    if (payload.status === 'Completed' && !payload.completedAt) {
      payload.completedAt = new Date().toISOString();
    }

    if (project) {
      dispatch({ type: 'UPDATE_PROJECT', project: payload as Project });
    } else {
      dispatch({ type: 'ADD_PROJECT', project: { ...payload, id: uuidv4() } as Project });
    }
    onClose();
  };

  const handleDelete = () => {
    if (project) {
      dispatch({ type: 'DELETE_PROJECT', id: project.id });
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={project ? 'Edit Project' : 'New Project'}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <Input
          label="Project Name"
          value={formData.name || ''}
          onChange={(val) => handleChange('name', val)}
        />
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '8px' }}>Client Type</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <Button 
              variant={clientType === 'existing' ? 'primary' : 'secondary'}
              onClick={(e) => { e.preventDefault(); setClientType('existing'); }}
              type="button"
            >
              Existing Client
            </Button>
            <Button 
              variant={clientType === 'one-off' ? 'primary' : 'secondary'}
              onClick={(e) => { e.preventDefault(); setClientType('one-off'); handleChange('clientId', undefined); }}
              type="button"
            >
              One-off Client
            </Button>
            <Button 
              variant={clientType === 'none' ? 'primary' : 'secondary'}
              onClick={(e) => { e.preventDefault(); setClientType('none'); handleChange('clientId', undefined); }}
              type="button"
            >
              None
            </Button>
          </div>

          {clientType === 'existing' && (
            <Select
              label="Select Client"
              value={formData.clientId || ''}
              onChange={(val) => handleChange('clientId', val)}
              options={[
                { value: '', label: '-- Select Client --' },
                ...state.clients.map(c => ({ value: c.id, label: c.name }))
              ]}
              required
            />
          )}

          {clientType === 'one-off' && (
            <Input
              label="Client Name"
              value={formData.client || ''}
              onChange={(val) => handleChange('client', val)}
              required
            />
          )}
        </div>

        <Input
          label="Address"
          value={formData.address || ''}
          onChange={(val) => handleChange('address', val)}
        />
        <div className={styles.row}>
          <DateInput
            label="Start Date"
            value={formData.startDate || ''}
            onChange={(val) => handleChange('startDate', val)}
            required
          />
          <DateInput
            label="Target Completion Date"
            value={formData.targetEndDate || ''}
            onChange={(val) => handleChange('targetEndDate', val)}
            required
          />
        </div>
        <div className={styles.row}>
          <Select
            label="Status"
            value={formData.status || 'Planned'}
            onChange={(val) => handleChange('status', val)}
            options={[
              { value: 'Planned', label: 'Planned' },
              { value: 'Active', label: 'Active' },
              { value: 'On Hold', label: 'On Hold' },
              { value: 'Completed', label: 'Completed' },
            ]}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.875rem', color: 'var(--color-text)', fontWeight: 500 }}>Colour</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', height: '36px' }}>
              {formData.colour ? (
                <Input
                  type="color"
                  value={formData.colour}
                  onChange={(val) => handleChange('colour', val)}
                />
              ) : (
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                  Auto-assigned
                </span>
              )}
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => handleChange('colour', formData.colour ? '' : '#448AFF')}
              >
                {formData.colour ? 'Reset' : 'Override'}
              </Button>
            </div>
          </div>
        </div>
        <Input
          type="number"
          label="Total Project Value (€) (Optional)"
          value={formData.totalValue?.toString() || ''}
          onChange={(val) => handleChange('totalValue', val ? parseFloat(val) : undefined)}
          placeholder="Not set"
        />
        <Input
          label="Notes"
          value={formData.notes || ''}
          onChange={(val) => handleChange('notes', val)}
          multiline
        />
        
        <div className={styles.actions}>
          {project && (
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

export default ProjectForm;
