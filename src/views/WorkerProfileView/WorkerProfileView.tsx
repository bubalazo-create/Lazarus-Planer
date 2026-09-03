import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Worker } from '../../models/types';
import Button from '../../components/common/Button';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import WorkerForm from '../../components/Forms/WorkerForm';
import WorkerScheduleView from '../WorkerScheduleView/WorkerScheduleView';
import WorkerFinancials from './WorkerFinancials';
import { isSameDay, parseISO } from 'date-fns';
import styles from './WorkerProfileView.module.css';

interface WorkerProfileViewProps {
  workerId: string;
  onBack: () => void;
}

type SubView = 'profile' | 'schedule' | 'earnings';

export default function WorkerProfileView({ workerId, onBack }: WorkerProfileViewProps) {
  const { state, dispatch } = useAppContext();
  const worker = state.workers.find(w => w.id === workerId);
  const [currentSubView, setCurrentSubView] = useState<SubView>('profile');
  const [isWorkerFormOpen, setIsWorkerFormOpen] = useState(false);
  const [workerToDelete, setWorkerToDelete] = useState<Worker | null>(null);

  if (!worker) {
    return <div className={styles.container}>Worker not found.</div>;
  }

  const confirmDeleteWorker = () => {
    if (workerToDelete) {
      dispatch({ type: 'DELETE_WORKER', id: workerToDelete.id });
      setWorkerToDelete(null);
      onBack();
    }
  };

  const confirmSetInactive = () => {
    if (workerToDelete) {
      dispatch({ type: 'UPDATE_WORKER', worker: { ...workerToDelete, active: false } });
      setWorkerToDelete(null);
    }
  };

  if (currentSubView === 'schedule') {
    return <WorkerScheduleView workerId={workerId} onBack={() => setCurrentSubView('profile')} />;
  }

  if (currentSubView === 'earnings') {
    return <WorkerFinancials workerId={workerId} onBack={() => setCurrentSubView('profile')} />;
  }

  // Current work (today's assignment)
  const today = new Date();
  const todaysAssignments = state.assignments.filter(a => 
    a.workerId === workerId && 
    parseISO(a.startDate) <= today && 
    parseISO(a.endDate) >= today
  );

  return (
    <div className={styles.container}>
      <div style={{ marginBottom: '16px' }}>
        <Button variant="secondary" onClick={onBack}>← Back to Workers</Button>
      </div>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.workerName}>
            <span style={{ display: 'inline-block', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: worker.colour }}></span>
            {worker.name}
          </div>
          <div className={styles.workerTrade}>{worker.trade || 'Worker'}</div>
          <div style={{ marginTop: '4px' }}>
            <span 
              onClick={() => dispatch({ type: 'UPDATE_WORKER', worker: { ...worker, active: !worker.active } })}
              title={`Click to mark as ${worker.active ? 'Inactive' : 'Active'}`}
              style={{ 
                display: 'inline-block', 
                padding: '2px 8px', 
                borderRadius: '12px', 
                fontSize: '0.8rem', 
                backgroundColor: worker.active ? 'var(--color-success)' : 'var(--color-danger)', 
                color: 'white',
                fontWeight: 500,
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              {worker.active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" onClick={() => setIsWorkerFormOpen(true)}>Edit</Button>
          <Button variant="danger" onClick={() => setWorkerToDelete(worker)}>Delete</Button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
        <Button variant="primary" onClick={() => setCurrentSubView('schedule')}>
          📅 View Schedule
        </Button>
        <Button variant="primary" onClick={() => setCurrentSubView('earnings')}>
          💰 Earnings & Payments
        </Button>
      </div>

      <div className={styles.detailsGrid}>
        <div className={styles.detailCard}>
          <div className={styles.detailLabel}>Phone</div>
          <div className={styles.detailValue}>{worker.phone || '-'}</div>
        </div>
        <div className={styles.detailCard}>
          <div className={styles.detailLabel}>Email</div>
          <div className={styles.detailValue}>
            {worker.email ? <a href={`mailto:${worker.email}`}>{worker.email}</a> : '-'}
          </div>
        </div>
        <div className={styles.detailCard}>
          <div className={styles.detailLabel}>Payment Type</div>
          <div className={styles.detailValue}>
            {worker.paymentType === 'project' ? 'Subcontractor' : 'Daily Rate'}
          </div>
        </div>
        {(worker.paymentType === 'daily' || !worker.paymentType) && (
          <div className={styles.detailCard}>
            <div className={styles.detailLabel}>Daily Rate</div>
            <div className={styles.detailValue}>
              {worker.dailyRate ? `€${worker.dailyRate} / day` : 'Not set'}
            </div>
          </div>
        )}
        <div className={styles.detailCard}>
          <div className={styles.detailLabel}>Notes</div>
          <div className={styles.detailValue}>{worker.notes || '-'}</div>
        </div>
      </div>

      <div className={styles.tableSection}>
        <h2 className={styles.sectionTitle}>Current Work</h2>
        {todaysAssignments.length > 0 ? (
          <div className={styles.detailsGrid}>
            {todaysAssignments.map(assignment => {
              const project = state.projects.find(p => p.id === assignment.projectId);
              const projectName = project?.name || project?.client || 'General';
              return (
                <div key={assignment.id} className={styles.detailCard} style={{ borderLeft: `4px solid ${project?.colour || 'var(--color-accent)'}` }}>
                  <div className={styles.detailLabel}>{projectName}</div>
                  <div className={styles.detailValue}>{assignment.title}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyState}>No assignment today</div>
        )}
      </div>

      <WorkerForm
        isOpen={isWorkerFormOpen}
        onClose={() => setIsWorkerFormOpen(false)}
        worker={worker}
      />

      <ConfirmDialog
        isOpen={!!workerToDelete}
        title={`Delete ${workerToDelete?.name}?`}
        message={
          (() => {
            if (!workerToDelete) return null;
            const assignmentCount = state.assignments.filter(a => a.workerId === workerToDelete.id).length;
            if (assignmentCount === 0) {
              return "This action cannot be undone. Are you sure you want to permanently delete this worker?";
            }
            return (
              <span>
                <strong>{workerToDelete.name} has {assignmentCount} existing assignment{assignmentCount === 1 ? '' : 's'}.</strong><br/><br/>
                Deleting this worker will permanently remove all their assignments. Alternatively, you can set them to Inactive to preserve their history.
              </span>
            );
          })()
        }
        onConfirm={confirmDeleteWorker}
        onCancel={() => setWorkerToDelete(null)}
        confirmText={
          workerToDelete && state.assignments.filter(a => a.workerId === workerToDelete.id).length > 0
            ? "Delete Worker and Assignments"
            : "Confirm Delete"
        }
        variant="danger"
        {...(workerToDelete && state.assignments.filter(a => a.workerId === workerToDelete.id).length > 0
          ? {
              tertiaryAction: confirmSetInactive,
              tertiaryText: "Set Inactive",
              tertiaryVariant: "secondary"
            }
          : {})}
      />
    </div>
  );
}
