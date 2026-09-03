import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import Button from '../../components/common/Button';
import WorkerForm from '../../components/Forms/WorkerForm';
import WorkerProfileView from '../WorkerProfileView/WorkerProfileView';
import { parseISO } from 'date-fns';
import styles from './WorkersListView.module.css';

interface WorkersListViewProps {
  initialWorkerId?: string;
  onClearInitial?: () => void;
}

const WorkersListView: React.FC<WorkersListViewProps> = ({ initialWorkerId, onClearInitial }) => {
  const { state, dispatch } = useAppContext();
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(initialWorkerId || null);
  const [isWorkerFormOpen, setIsWorkerFormOpen] = useState(false);

  const handleAddWorker = () => {
    setIsWorkerFormOpen(true);
  };

  if (selectedWorkerId) {
    return (
      <WorkerProfileView 
        workerId={selectedWorkerId} 
        onBack={() => {
          setSelectedWorkerId(null);
          if (onClearInitial) onClearInitial();
        }} 
      />
    );
  }

  const today = new Date();
  
  const getWorkerCurrentAssignment = (workerId: string) => {
    const todaysAssignment = state.assignments.find(a => 
      a.workerId === workerId && 
      parseISO(a.startDate) <= today && 
      parseISO(a.endDate) >= today
    );
    if (!todaysAssignment) return null;
    const project = state.projects.find(p => p.id === todaysAssignment.projectId);
    return { assignment: todaysAssignment, project };
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h2>Workers</h2>
        </div>
        <div className={styles.actionControls}>
          <Button variant="primary" onClick={handleAddWorker}>+ Add Worker</Button>
        </div>
      </header>
      
      <div className={styles.listContainer}>
        {state.workers.map(worker => {
          const current = getWorkerCurrentAssignment(worker.id);
          
          return (
            <div 
              key={worker.id} 
              className={`${styles.workerCard} ${!worker.active ? styles.inactive : ''}`}
              onClick={() => setSelectedWorkerId(worker.id)}
            >
              <div className={styles.workerInfo}>
                <div className={styles.nameRow}>
                  <span className={styles.colourDot} style={{ backgroundColor: worker.colour }}></span>
                  <h3>{worker.name}</h3>
                  {!worker.active && <span className={styles.inactiveBadge}>Inactive</span>}
                </div>
                <div className={styles.detailsRow}>
                  {worker.trade && <span className={styles.trade}>{worker.trade}</span>}
                  {worker.phone && <span className={styles.phone}>📞 {worker.phone}</span>}
                </div>
              </div>
              
              <div className={styles.assignmentInfo}>
                {current ? (
                  <div className={styles.currentAssignment} style={{ borderLeftColor: current.project?.colour || 'var(--color-accent)' }}>
                    <div className={styles.assignmentTitle}>{current.project?.name || current.project?.client || 'General'}</div>
                    <div className={styles.assignmentDesc}>{current.assignment.title}</div>
                  </div>
                ) : (
                  <div className={styles.noAssignment}>No assignment today</div>
                )}
              </div>
              
            </div>
          );
        })}
      </div>

      <WorkerForm
        isOpen={isWorkerFormOpen}
        onClose={() => setIsWorkerFormOpen(false)}
        worker={null}
      />
    </div>
  );
};

export default WorkersListView;
