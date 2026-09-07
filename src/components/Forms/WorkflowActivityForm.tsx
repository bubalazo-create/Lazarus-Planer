import React, { useState, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { WorkflowActivity } from '../../models/types';
import { useAppContext } from '../../context/AppContext';
import Modal from '../common/Modal';
import Button from '../common/Button';
import ConfirmDialog from '../common/ConfirmDialog';
import Input from '../common/Input';
import DateInput from '../common/DateInput';
import styles from './WorkflowActivityForm.module.css';

interface WorkflowActivityFormProps {
  isOpen: boolean;
  onClose: () => void;
  activity?: WorkflowActivity | null;
  projectId: string;
}

const WorkflowActivityForm: React.FC<WorkflowActivityFormProps> = ({
  isOpen,
  onClose,
  activity,
  projectId,
}) => {
  const { state, dispatch } = useAppContext();
  const [formData, setFormData] = useState<Partial<WorkflowActivity>>({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Extract unique categories for this project for datalist
  const projectCategories = useMemo(() => {
    const categories = new Set<string>();
    state.workflowActivities
      .filter((a) => a.projectId === projectId)
      .forEach((a) => categories.add(a.category));
    return Array.from(categories).sort();
  }, [state.workflowActivities, projectId]);

  useEffect(() => {
    if (isOpen) {
      if (activity) {
        setFormData(activity);
      } else {
        const todayStr = new Date().toISOString().split('T')[0];
        setFormData({
          projectId: projectId,
          name: '',
          category: '',
          startDate: todayStr,
          endDate: todayStr,
          notes: '',
        });
      }
    }
  }, [isOpen, activity, projectId]);

  const handleChange = (field: keyof WorkflowActivity, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.category || !formData.startDate || !formData.endDate) return;
    if (formData.endDate < formData.startDate) {
      alert('End date cannot be earlier than start date.');
      return;
    }

    const payload = { ...formData, projectId } as WorkflowActivity;

    if (activity) {
      dispatch({ type: 'UPDATE_WORKFLOW_ACTIVITY', activity: payload });
    } else {
      dispatch({ type: 'ADD_WORKFLOW_ACTIVITY', activity: { ...payload, id: uuidv4() } });
    }
    onClose();
  };

  const handleDelete = () => {
    if (activity) {
      dispatch({ type: 'DELETE_WORKFLOW_ACTIVITY', id: activity.id });
      setShowDeleteDialog(false);
      onClose();
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={activity ? `Edit: ${activity.name}` : 'New Activity'}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            label="Activity Name"
            value={formData.name || ''}
            onChange={(val) => handleChange('name', val)}
            required
            placeholder="e.g. Groundwork, 1st Fix Plumbing"
          />
          
          <div>
            <Input
              label="Category / Phase"
              value={formData.category || ''}
              onChange={(val) => handleChange('category', val)}
              required
              list="workflow-categories"
              placeholder="e.g. Planning, Demolition, Construction"
            />
            <datalist id="workflow-categories">
              {projectCategories.map(cat => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>

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
              openToDate={formData.startDate ? new Date(formData.startDate) : undefined}
            />
          </div>

          <Input
            label="Notes (Optional)"
            value={formData.notes || ''}
            onChange={(val) => handleChange('notes', val)}
            multiline
            rows={3}
          />
          
          <div className={styles.actions}>
            {activity ? (
              <Button type="button" variant="danger" onClick={() => setShowDeleteDialog(true)}>
                Delete
              </Button>
            ) : <div></div>}
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
        title="Delete Activity"
        message={`Are you sure you want to delete "${activity?.name}"?`}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
        confirmText="Delete Activity"
        variant="danger"
      />
    </>
  );
};

export default WorkflowActivityForm;
