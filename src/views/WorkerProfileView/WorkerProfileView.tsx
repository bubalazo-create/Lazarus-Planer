import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Worker, WorkerType } from '../../models/types';
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

  // Subcontractor workers state
  const [isSubWorkerFormOpen, setIsSubWorkerFormOpen] = useState(false);
  const [editingSubWorker, setEditingSubWorker] = useState<Worker | null>(null);

  if (!worker) {
    return <div className={styles.container}>Workforce member not found.</div>;
  }

  const isCompany = worker.type === 'subcontractor';
  const isSubWorker = worker.type === 'subcontractor-worker';
  const parentSub = isSubWorker ? state.workers.find(w => w.id === worker.subcontractorId) : null;

  // Retrieve sub-workers if it's a company
  const subWorkers = isCompany ? state.workers.filter(w => w.type === 'subcontractor-worker' && w.subcontractorId === worker.id) : [];

  const confirmDeleteWorker = () => {
    if (workerToDelete) {
      dispatch({ type: 'DELETE_WORKER', id: workerToDelete.id });
      setWorkerToDelete(null);
      if (workerToDelete.id === worker.id) {
        onBack();
      }
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

  const today = new Date();
  
  const getWorkerCurrentAssignment = (wId: string) => {
    const todaysAssignment = state.assignments.find(a => 
      a.workerId === wId && 
      parseISO(a.startDate) <= today && 
      parseISO(a.endDate) >= today
    );
    if (!todaysAssignment) return null;
    const project = state.projects.find(p => p.id === todaysAssignment.projectId);
    return { assignment: todaysAssignment, project };
  };

  const todaysAssignments = state.assignments.filter(a => 
    a.workerId === workerId && 
    parseISO(a.startDate) <= today && 
    parseISO(a.endDate) >= today
  );

  const getRoleLabel = () => {
    if (isCompany) return 'Subcontractor (Company)';
    if (isSubWorker) return 'Subcontractor Worker';
    if (worker.type === 'self-employed') return 'Self-Employed';
    return 'Employee';
  };

  return (
    <div className={styles.container}>
      <div style={{ marginBottom: '16px' }}>
        <Button variant="secondary" onClick={onBack}>← Back to Workforce</Button>
      </div>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.workerName}>
            <span style={{ display: 'inline-block', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: worker.colour }}></span>
            {worker.name}
          </div>
          <div className={styles.workerTrade}>{getRoleLabel()}</div>
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

      {!isCompany && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
          <Button variant="primary" onClick={() => setCurrentSubView('schedule')}>
            📅 View Schedule
          </Button>
          <Button variant="primary" onClick={() => setCurrentSubView('earnings')}>
            💶 Earnings & Payments
          </Button>
        </div>
      )}

      <div className={styles.detailsGrid}>
        {isSubWorker && (
          <div className={styles.detailCard}>
            <div className={styles.detailLabel}>Parent Subcontractor</div>
            <div className={styles.detailValue}>{parentSub?.name || 'Unknown'}</div>
          </div>
        )}
        
        {isCompany && worker.contactPerson && (
          <div className={styles.detailCard}>
            <div className={styles.detailLabel}>Contact Person</div>
            <div className={styles.detailValue}>{worker.contactPerson}</div>
          </div>
        )}
        
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

        {isCompany && worker.vatNumber && (
          <div className={styles.detailCard}>
            <div className={styles.detailLabel}>VAT Number</div>
            <div className={styles.detailValue}>{worker.vatNumber}</div>
          </div>
        )}

        {isCompany && worker.address && (
          <div className={styles.detailCard}>
            <div className={styles.detailLabel}>Address</div>
            <div className={styles.detailValue}>{worker.address}</div>
          </div>
        )}

        <div className={styles.detailCard}>
          <div className={styles.detailLabel}>{isCompany ? 'Trade / Service' : 'Trade / Role'}</div>
          <div className={styles.detailValue}>{worker.trade || '-'}</div>
        </div>
        
        {!isCompany && (
          <div className={styles.detailCard}>
            <div className={styles.detailLabel}>Payment Type</div>
            <div className={styles.detailValue}>
              {worker.paymentType === 'project' ? 'Project / Fixed' : 'Daily Rate'}
            </div>
          </div>
        )}
        
        {!isCompany && (worker.paymentType === 'daily' || !worker.paymentType) && (
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

      {!isCompany && (
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
      )}

      {isCompany && (
        <div className={styles.tableSection} style={{ marginTop: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 className={styles.sectionTitle} style={{ margin: 0 }}>Workers</h2>
            <Button variant="primary" onClick={() => { setEditingSubWorker(null); setIsSubWorkerFormOpen(true); }}>
              + Add Worker
            </Button>
          </div>
          
          {subWorkers.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', backgroundColor: 'var(--color-surface)', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <thead style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                <tr>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>Name</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>Trade</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>Current Project</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>Status</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {subWorkers.map(w => {
                  const current = getWorkerCurrentAssignment(w.id);
                  return (
                    <tr key={w.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 500 }}>{w.name}</td>
                      <td style={{ padding: '12px 16px' }}>{w.trade || '-'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {current ? (current.project?.name || current.project?.client || 'Assigned') : <span style={{ color: 'var(--color-text-muted)' }}>Unassigned</span>}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ 
                          padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', 
                          backgroundColor: w.active ? 'var(--color-success)' : 'var(--color-danger)', color: 'white' 
                        }}>
                          {w.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button 
                          onClick={() => { setEditingSubWorker(w); setIsSubWorkerFormOpen(true); }}
                          style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontWeight: 500 }}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className={styles.emptyState}>No workers added to this subcontractor yet.</div>
          )}
        </div>
      )}

      <WorkerForm
        isOpen={isWorkerFormOpen}
        onClose={() => setIsWorkerFormOpen(false)}
        worker={worker}
      />

      <WorkerForm
        isOpen={isSubWorkerFormOpen}
        onClose={() => setIsSubWorkerFormOpen(false)}
        worker={editingSubWorker}
        defaultType="subcontractor-worker"
        defaultSubcontractorId={worker.id}
      />

      <ConfirmDialog
        isOpen={!!workerToDelete}
        title={`Delete ${workerToDelete?.name}?`}
        message={
          (() => {
            if (!workerToDelete) return null;
            
            if (workerToDelete.type === 'subcontractor') {
              const subs = state.workers.filter(w => w.type === 'subcontractor-worker' && w.subcontractorId === workerToDelete.id);
              if (subs.length > 0) {
                 return <span><strong>This subcontractor has {subs.length} worker(s).</strong><br/><br/>You must delete the workers first, or mark the company as Inactive instead.</span>;
              }
            }
            
            const assignmentCount = state.assignments.filter(a => a.workerId === workerToDelete.id).length;
            if (assignmentCount === 0) {
              return "This action cannot be undone. Are you sure you want to permanently delete this record?";
            }
            return (
              <span>
                <strong>{workerToDelete.name} has {assignmentCount} existing assignment{assignmentCount === 1 ? '' : 's'}.</strong><br/><br/>
                Deleting this record will permanently remove all their assignments. Alternatively, you can set them to Inactive to preserve their history.
              </span>
            );
          })()
        }
        onConfirm={confirmDeleteWorker}
        onCancel={() => setWorkerToDelete(null)}
        confirmText={
          workerToDelete && workerToDelete.type === 'subcontractor' && state.workers.filter(w => w.type === 'subcontractor-worker' && w.subcontractorId === workerToDelete.id).length > 0
            ? "" // Don't allow delete if has subworkers
            : (workerToDelete && state.assignments.filter(a => a.workerId === workerToDelete.id).length > 0
              ? "Delete and Remove Assignments"
              : "Confirm Delete")
        }
        variant="danger"
        {...(workerToDelete && (state.assignments.filter(a => a.workerId === workerToDelete.id).length > 0 || state.workers.filter(w => w.type === 'subcontractor-worker' && w.subcontractorId === workerToDelete.id).length > 0)
          ? {
              tertiaryAction: confirmSetInactive,
              tertiaryText: "Set Inactive Instead",
              tertiaryVariant: "secondary"
            }
          : {})}
      />
    </div>
  );
}
