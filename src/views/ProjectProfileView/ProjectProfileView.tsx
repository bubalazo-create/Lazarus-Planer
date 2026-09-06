import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAppContext } from '../../context/AppContext';
import { getProjectDisplayName } from '../../utils/projectUtils';
import { Worker } from '../../models/types';
import Button from '../../components/common/Button';
import ProjectForm from '../../components/Forms/ProjectForm';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ProjectScheduleView from '../ProjectScheduleView/ProjectScheduleView';
import ProjectFinancials from '../ProjectFinancialsView/ProjectFinancials';
import { parseISO } from 'date-fns';
import styles from './ProjectProfileView.module.css';

interface ProjectProfileViewProps {
  projectId: string;
  onBack: () => void;
}

export default function ProjectProfileView({ projectId, onBack }: ProjectProfileViewProps) {
  const { state, dispatch } = useAppContext();
  const [view, setView] = useState<'profile' | 'schedule' | 'financials'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const project = state.projects.find(p => p.id === projectId);
  
  if (!project) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <Button variant="secondary" onClick={onBack} className={styles.backButton}>&larr; Back to Projects</Button>
          <h2>Project not found</h2>
        </div>
      </div>
    );
  }

  if (view === 'schedule') {
    return <ProjectScheduleView projectId={projectId} onBack={() => setView('profile')} />;
  }

  if (view === 'financials') {
    return <ProjectFinancials projectId={projectId} onBack={() => setView('profile')} />;
  }

  const clientName = project.clientId ? state.clients.find(c => c.id === project.clientId)?.name : project.client;
  const clientTypeLabel = project.clientId ? "Regular Client" : "One-off Client";

  const handleDelete = () => {
    dispatch({ type: 'DELETE_PROJECT', id: projectId });
    onBack();
  };

  const getStatusClass = (status: string) => {
    switch(status) {
      case 'Active': return styles.statusActive;
      case 'Planned': return styles.statusPlanned;
      case 'On Hold': return styles.statusOnHold;
      case 'Completed': return styles.statusCompleted;
      default: return '';
    }
  };

  const today = new Date();
  const currentAssignments = state.assignments.filter(a => 
    a.projectId === projectId && 
    parseISO(a.startDate) <= today && 
    parseISO(a.endDate) >= today
  );

  const assignedWorkers = currentAssignments.map(a => state.workers.find(w => w.id === a.workerId)).filter(Boolean) as Worker[];

  const employees = assignedWorkers.filter(w => !w.type || w.type === 'employee');
  const selfEmployed = assignedWorkers.filter(w => w.type === 'self-employed');
  const subWorkers = assignedWorkers.filter(w => w.type === 'subcontractor-worker');

  const subGroup = subWorkers.reduce((acc, worker) => {
    const subId = worker.subcontractorId || 'unknown';
    if (!acc[subId]) acc[subId] = [];
    acc[subId].push(worker);
    return acc;
  }, {} as Record<string, Worker[]>);

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <Button variant="secondary" onClick={onBack} className={styles.backButton}>&larr; Back to Projects</Button>
        
        <div className={styles.profileCard}>
          <header className={styles.header}>
            <div>
              <h2 className={styles.projectName}>
                <span className={styles.colorIndicator} style={{ backgroundColor: project.colour }}></span>
                {getProjectDisplayName(project, state.clients)}
                <span className={`${styles.statusBadge} ${getStatusClass(project.status)}`}>
                  {project.status}
                </span>
              </h2>
            </div>
          </header>

          <div className={styles.infoGrid}>
            <div className={styles.infoGroup}>
              <span className={styles.infoLabel}>Client ({clientTypeLabel})</span>
              <span className={styles.infoValue}>{clientName || '-'}</span>
            </div>
            <div className={styles.infoGroup}>
              <span className={styles.infoLabel}>Location / Address</span>
              <span className={styles.infoValue}>{project.address || '-'}</span>
            </div>
            <div className={styles.infoGroup}>
              <span className={styles.infoLabel}>Start Date</span>
              <span className={styles.infoValue}>{project.startDate ? new Date(project.startDate).toLocaleDateString('en-GB') : '-'}</span>
            </div>
            <div className={styles.infoGroup}>
              <span className={styles.infoLabel}>Target End Date</span>
              <span className={styles.infoValue}>{project.targetEndDate ? new Date(project.targetEndDate).toLocaleDateString('en-GB') : '-'}</span>
            </div>
          </div>

          {project.notes && (
            <div className={styles.notesSection}>
              <div className={styles.notesLabel}>Notes</div>
              <div className={styles.notesContent}>{project.notes}</div>
            </div>
          )}

          <div className={styles.actionGrid}>
            <div className={styles.actionCard} onClick={() => setView('schedule')}>
              <div className={styles.actionIcon}>📅</div>
              <div className={styles.actionTitle}>Schedule</div>
            </div>
            <div className={styles.actionCard} onClick={() => setView('financials')}>
              <div className={styles.actionIcon}>💶</div>
              <div className={styles.actionTitle}>Earnings & Payments</div>
            </div>
            <div className={styles.actionCard} onClick={() => setIsEditing(true)}>
              <div className={styles.actionIcon}>✏️</div>
              <div className={styles.actionTitle}>Edit Project</div>
            </div>
            <div className={styles.actionCard} onClick={() => setShowDeleteConfirm(true)}>
              <div className={styles.actionIcon}>🗑️</div>
              <div className={styles.actionTitle}>Delete Project</div>
            </div>
          </div>
          
          <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid var(--color-border)' }}>
            <h3 style={{ marginBottom: '24px', fontSize: '1.2rem', color: 'var(--color-text)' }}>Current Assigned Workforce</h3>
            
            {assignedWorkers.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)' }}>No workforce currently assigned to this project today.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {employees.length > 0 && (
                  <div>
                    <h4 style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', letterSpacing: '0.05em', marginBottom: '8px' }}>EMPLOYEES</h4>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {employees.map(w => (
                        <li key={w.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: w.colour }}></span>
                          <span style={{ fontWeight: 500 }}>{w.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {Object.keys(subGroup).length > 0 && (
                  <div>
                    <h4 style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', letterSpacing: '0.05em', marginBottom: '16px' }}>SUBCONTRACTORS</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {Object.entries(subGroup).map(([subId, workers]) => {
                        const subCompany = state.workers.find(w => w.id === subId);
                        const companyName = subCompany ? subCompany.name : 'Unknown Subcontractor';
                        return (
                          <div key={subId} style={{ paddingLeft: '12px', borderLeft: `3px solid ${subCompany?.colour || 'var(--color-border)'}` }}>
                            <div style={{ fontWeight: 600, marginBottom: '6px' }}>{companyName}</div>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {workers.map(w => (
                                <li key={w.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '8px', color: 'var(--color-text)' }}>
                                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: w.colour }}></span>
                                  <span>{w.name}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selfEmployed.length > 0 && (
                  <div>
                    <h4 style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', letterSpacing: '0.05em', marginBottom: '8px' }}>SELF-EMPLOYED</h4>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {selfEmployed.map(w => (
                        <li key={w.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: w.colour }}></span>
                          <span style={{ fontWeight: 500 }}>{w.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              </div>
            )}
          </div>

        </div>
      </div>
      
      {isEditing && (
        <ProjectForm isOpen={isEditing}
          project={project}
          onClose={() => setIsEditing(false)}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Project"
          message={`Are you sure you want to delete ${getProjectDisplayName(project, state.clients)}? This action cannot be undone.`}
          isOpen={showDeleteConfirm} confirmText="Delete"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
