import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Assignment } from '../../models/types';
import { useAppContext } from '../../context/AppContext';
import { checkConflicts } from '../../utils/conflictDetection';
import { formatEuropeanDate, parseDate } from '../../utils/dateUtils';
import { parseISO } from 'date-fns';
import Modal from '../common/Modal';
import Button from '../common/Button';
import ConfirmDialog from '../common/ConfirmDialog';
import Input from '../common/Input';
import DateInput from '../common/DateInput';
import Select from '../common/Select';
import { getProjectDisplayName } from '../../utils/projectUtils';
import styles from './AssignmentForm.module.css';

interface AssignmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  assignment?: Assignment | null;
  prefillWorkerId?: string;
  prefillProjectId?: string;
  prefillDate?: string;
  selectedOccurrenceDate?: string;
}

const AssignmentForm: React.FC<AssignmentFormProps> = ({
  isOpen,
  onClose,
  assignment,
  prefillWorkerId,
  prefillProjectId,
  prefillDate,
  selectedOccurrenceDate,
}) => {
  const { state, dispatch } = useAppContext();
  const [formData, setFormData] = useState<Partial<Assignment>>({});
  const [clientType, setClientType] = useState<'project' | 'one-off' | 'none'>('project');
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (assignment) {
        setFormData(assignment);
        setClientType(assignment.clientName ? 'one-off' : 'project');
      } else {
        const todayStr = new Date().toISOString().split('T')[0];
        setFormData({
          workerId: prefillWorkerId || '',
          projectId: prefillProjectId || '',
          title: '',
          startDate: prefillDate || todayStr,
          endDate: prefillDate || todayStr,
          status: 'Planned',
          notes: '',
        });
        setClientType('project');
      }
    }
  }, [isOpen, assignment, prefillWorkerId, prefillProjectId, prefillDate]);

  const workerOptions = state.workers
    .filter((w) => w.active || w.id === formData.workerId)
    .map((w) => ({ value: w.id, label: w.name }));
  const activeProjects = state.projects.filter((p) => p.status !== 'Completed');

  const selectedProject = state.projects.find((p) => p.id === formData.projectId);
  const selectedProjectClient = selectedProject?.clientId
    ? state.clients.find((c) => c.id === selectedProject.clientId)
    : null;

  const clientOptions = [];
  if (selectedProjectClient) {
    clientOptions.push({ value: 'project', label: selectedProjectClient.name });
    clientOptions.push({ value: 'none', label: 'No Client' });
  } else {
    clientOptions.push({ value: 'project', label: 'No Client' });
  }
  clientOptions.push({ value: 'one-off', label: 'One-off Client' });

  const handleChange = (field: keyof Assignment, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.workerId || !formData.projectId || !formData.startDate || !formData.endDate) return;
    if (clientType === 'one-off' && (!formData.clientName || formData.clientName.trim() === '')) return;
    if (formData.endDate < formData.startDate) {
      alert('End date cannot be earlier than start date.');
      return;
    }
    
    // V1.3: Allow multiple assignments per day, bypass conflict check for now
    saveAssignment();
  };

  const saveAssignment = () => {
    const payload = { ...formData };
    if (clientType === 'project' || clientType === 'none') {
      payload.clientName = undefined;
    }

    if (assignment) {
      dispatch({ type: 'UPDATE_ASSIGNMENT', assignment: payload as Assignment });
    } else {
      dispatch({ type: 'ADD_ASSIGNMENT', assignment: { ...payload, id: uuidv4() } as Assignment });
    }
    onClose();
  };

  const handleDeleteClick = () => {
    if (assignment) {
      if (assignment.startDate !== assignment.endDate && selectedOccurrenceDate) {
        setShowDeleteDialog(true);
      } else {
        handleDeleteEntire();
      }
    }
  };

  const handleDeleteEntire = () => {
    if (assignment) {
      dispatch({ type: 'DELETE_ASSIGNMENT', id: assignment.id });
      setShowDeleteDialog(false);
      onClose();
    }
  };

  const handleDeleteSingleDay = () => {
    if (assignment && selectedOccurrenceDate) {
      dispatch({ 
        type: 'DELETE_SINGLE_DAY_ASSIGNMENT', 
        id: assignment.id, 
        targetDate: selectedOccurrenceDate 
      });
      setShowDeleteDialog(false);
      onClose();
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={assignment ? 'Edit Assignment' : 'New Assignment'}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <Select
            label="Worker"
            value={formData.workerId || ''}
            onChange={(val) => handleChange('workerId', val)}
            options={workerOptions}
            required
          />
          <Select
            label="Project"
            value={formData.projectId || ''}
            onChange={(val) => handleChange('projectId', val)}
            options={activeProjects.map((p) => ({ value: p.id, label: getProjectDisplayName(p, state.clients) }))}
            required
          />
          <div className={styles.row}>
            <Select
              label="Client"
              value={clientType}
              onChange={(val) => {
                setClientType(val as 'project' | 'one-off' | 'none');
                if (val !== 'one-off') {
                  setFormData(prev => ({ ...prev, clientName: '' }));
                }
              }}
              options={clientOptions}
            />
            {clientType === 'one-off' && (
              <Input
                label="Client Name"
                value={formData.clientName || ''}
                onChange={(val) => handleChange('clientName', val)}
                required
              />
            )}
          </div>
          <Input
            label="Task / Title"
            value={formData.title || ''}
            onChange={(val) => handleChange('title', val)}
          />
          <div className={styles.row}>
            <DateInput
              label="Start Date"
              value={formData.startDate || ''}
              onChange={(val) => handleChange('startDate', val)}
              required
            />
            <DateInput
              label="End Date"
              value={formData.endDate || ''}
              onChange={(val) => handleChange('endDate', val)}
              required
            />
          </div>
          <Select
            label="Status"
            value={formData.status || 'Planned'}
            onChange={(val) => handleChange('status', val)}
            options={[
              { value: 'Planned', label: 'Planned' },
              { value: 'In Progress', label: 'In Progress' },
              { value: 'Completed', label: 'Completed' },
            ]}
          />
          <Input
            label="Notes"
            value={formData.notes || ''}
            onChange={(val) => handleChange('notes', val)}
            multiline
          />
          
          <div className={styles.actions}>
            {assignment && (
              <Button type="button" variant="danger" onClick={handleDeleteClick}>
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

      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Delete Assignment"
        message={`Do you want to delete only ${selectedOccurrenceDate ? formatEuropeanDate(parseISO(selectedOccurrenceDate)) : 'this day'}, or the entire assignment?`}
        onConfirm={handleDeleteEntire}
        onCancel={() => setShowDeleteDialog(false)}
        confirmText="Delete Entire Assignment"
        variant="danger"
        tertiaryAction={handleDeleteSingleDay}
        tertiaryText="Delete This Day"
        tertiaryVariant="primary"
      />
    </>
  );
};

export default AssignmentForm;
