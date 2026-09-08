import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import Button from '../../components/common/Button';
import WorkerForm from '../../components/Forms/WorkerForm';
import WorkerProfileView from '../WorkerProfileView/WorkerProfileView';
import { parseISO } from 'date-fns';
import { WorkerType } from '../../models/types';
import styles from './WorkersListView.module.css';

interface WorkersListViewProps {
  initialWorkerId?: string;
  onClearInitial?: () => void;
}

const WorkersListView: React.FC<WorkersListViewProps> = ({ initialWorkerId, onClearInitial }) => {
  const { state, dispatch } = useAppContext();
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(initialWorkerId || null);
  const [isWorkerFormOpen, setIsWorkerFormOpen] = useState(false);
  const [categoryTab, setCategoryTab] = useState<'All' | 'employees' | 'subcontractors' | 'self-employed'>('All');
  const [statusTab, setStatusTab] = useState<'All' | 'Active' | 'Inactive'>('Active');
  
  // Track what kind of record we are currently trying to add
  const [addingType, setAddingType] = useState<WorkerType>('employee');

  const handleAdd = () => {
    setAddingType(
      categoryTab === 'subcontractors' ? 'subcontractor' : 
      categoryTab === 'self-employed' ? 'self-employed' : 'employee'
    );
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

  // Safe mapping of legacy types
  const getWorkerCategory = (w: any): 'employees' | 'subcontractors' | 'self-employed' => {
    if (w.type === 'subcontractor') return 'subcontractors';
    if (w.type === 'self-employed') return 'self-employed';
    // Assume employee if not explicitly the above (includes 'employee' and undefined legacy)
    // Subcontractor workers will NOT appear at top level list, they only appear inside subcontractor profile!
    return 'employees';
  };

  // Filter top-level items based on category and status
  const topLevelWorkers = state.workers.filter(w => w.type !== 'subcontractor-worker');
  
  const categoryWorkers = categoryTab === 'All' 
    ? topLevelWorkers 
    : topLevelWorkers.filter(w => getWorkerCategory(w) === categoryTab);
  
  const allCount = categoryWorkers.length;
  const activeCount = categoryWorkers.filter(w => w.active !== false).length;
  const inactiveCount = categoryWorkers.filter(w => w.active === false).length;

  const displayedWorkers = categoryWorkers.filter(w => {
    if (statusTab === 'Active') return w.active !== false;
    if (statusTab === 'Inactive') return w.active === false;
    return true; // All
  }).sort((a, b) => a.name.localeCompare(b.name));

  const getRoleBadge = (w: any) => {
    const cat = getWorkerCategory(w);
    if (cat === 'subcontractors') return <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>Subcontractor</span>;
    if (cat === 'self-employed') return <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>Self-Employed</span>;
    return <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>Employee</span>;
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h2>Workforce</h2>
        </div>
        <div className={styles.actionControls}>
          <Button variant="primary" onClick={handleAdd}>
            + Add {categoryTab === 'subcontractors' ? 'Subcontractor' : categoryTab === 'self-employed' ? 'Self-Employed' : 'Workforce'}
          </Button>
        </div>
      </header>
      
      {/* Category Tabs */}
      <div className={styles.categoryTabsContainer}>
        <button 
          className={categoryTab === 'All' ? styles.categoryTabActive : styles.categoryTab}
          onClick={() => setCategoryTab('All')}
        >
          ALL
        </button>
        <button 
          className={categoryTab === 'employees' ? styles.categoryTabActive : styles.categoryTab}
          onClick={() => setCategoryTab('employees')}
        >
          EMPLOYEES
        </button>
        <button 
          className={categoryTab === 'subcontractors' ? styles.categoryTabActive : styles.categoryTab}
          onClick={() => setCategoryTab('subcontractors')}
        >
          SUBCONTRACTORS
        </button>
        <button 
          className={categoryTab === 'self-employed' ? styles.categoryTabActive : styles.categoryTab}
          onClick={() => setCategoryTab('self-employed')}
        >
          SELF-EMPLOYED
        </button>
      </div>

      {/* Status Filters */}
      <div className={styles.tabsContainer} style={{ padding: '0 24px 0 24px', backgroundColor: 'transparent' }}>
        <button 
          className={`${styles.tabBtn} ${statusTab === 'All' ? styles.activeTab : ''}`}
          onClick={() => setStatusTab('All')}
        >
          All ({allCount})
        </button>
        <button 
          className={`${styles.tabBtn} ${statusTab === 'Active' ? styles.activeTab : ''}`}
          onClick={() => setStatusTab('Active')}
        >
          Active ({activeCount})
        </button>
        <button 
          className={`${styles.tabBtn} ${statusTab === 'Inactive' ? styles.activeTab : ''}`}
          onClick={() => setStatusTab('Inactive')}
        >
          Inactive ({inactiveCount})
        </button>
      </div>

      <div className={styles.listContainer}>
        {displayedWorkers.length === 0 && (
          <div className={styles.emptyState}>
            No {statusTab.toLowerCase() === 'all' ? '' : statusTab.toLowerCase()} {categoryTab.toLowerCase() === 'all' ? 'workforce' : categoryTab} found.
          </div>
        )}
        {displayedWorkers.map(worker => {
          const current = getWorkerCurrentAssignment(worker.id);
          const isCompany = worker.type === 'subcontractor';
          
          return (
            <div 
              key={worker.id} 
              className={`${styles.workerCard} ${!worker.active ? styles.inactive : ''}`}
              style={{ borderLeftColor: worker.colour }}
              onClick={() => setSelectedWorkerId(worker.id)}
            >
              <div className={styles.workerInfo}>
                <div className={styles.nameRow}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {worker.name}
                    {getRoleBadge(worker)}
                  </h3>
                  {!worker.active && <span className={styles.inactiveBadge}>Inactive</span>}
                </div>
                <div className={styles.detailsRow}>
                  {worker.trade && <span className={styles.trade}>{worker.trade}</span>}
                  {worker.phone && <span className={styles.phone}>📞 {worker.phone}</span>}
                  {isCompany && worker.vatNumber && <span className={styles.trade}>VAT: {worker.vatNumber}</span>}
                </div>
              </div>
              
              {!isCompany && (
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
              )}
              {isCompany && (
                <div className={styles.assignmentInfo}>
                  <div className={styles.noAssignment} style={{color: 'var(--color-text-muted)'}}>
                    {state.workers.filter(w => w.type === 'subcontractor-worker' && w.subcontractorId === worker.id).length} Worker(s)
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <WorkerForm
        isOpen={isWorkerFormOpen}
        onClose={() => setIsWorkerFormOpen(false)}
        worker={null}
        defaultType={addingType}
      />
    </div>
  );
};

export default WorkersListView;

