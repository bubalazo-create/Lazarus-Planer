import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import Button from '../../components/common/Button';
import ProjectForm from '../../components/Forms/ProjectForm';
import ProjectProfileView from '../ProjectProfileView/ProjectProfileView';
import { getProjectDisplayName } from '../../utils/projectUtils';
import styles from './ProjectsListView.module.css'; // Reusing similar styles to WorkersListView

interface ProjectsListViewProps {
  initialProjectId?: string;
  onClearInitial?: () => void;
}

const ProjectsListView: React.FC<ProjectsListViewProps> = ({ initialProjectId, onClearInitial }) => {
  const { state, dispatch } = useAppContext();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialProjectId || null);
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'Active' | 'Planned' | 'Completed'>('Active');
  const [completedYear, setCompletedYear] = useState<number>(new Date().getFullYear());

  const handleAddProject = () => {
    setIsProjectFormOpen(true);
  };

  if (selectedProjectId) {
    return (
      <ProjectProfileView 
        projectId={selectedProjectId} 
        onBack={() => {
          setSelectedProjectId(null);
          if (onClearInitial) onClearInitial();
        }} 
      />
    );
  }

  const activeProjects = state.projects.filter(p => !p.status || p.status === 'Active' || p.status === 'On Hold');
  const plannedProjects = state.projects.filter(p => p.status === 'Planned');
  
  const completedProjectsAll = state.projects.filter(p => p.status === 'Completed');
  const completedProjects = completedProjectsAll.filter(p => {
    let y;
    if (p.completedAt) y = new Date(p.completedAt).getFullYear();
    else if (p.targetEndDate) y = new Date(p.targetEndDate).getFullYear();
    else if (p.startDate) y = new Date(p.startDate).getFullYear();
    else y = new Date().getFullYear();
    return y === completedYear;
  });

  const availableYears = Array.from(new Set(
    completedProjectsAll.map(p => {
      if (p.completedAt) return new Date(p.completedAt).getFullYear();
      if (p.targetEndDate) return new Date(p.targetEndDate).getFullYear();
      if (p.startDate) return new Date(p.startDate).getFullYear();
      return new Date().getFullYear();
    })
  ));
  
  const maxYear = Math.max(new Date().getFullYear(), ...availableYears);
  const minYear = Math.min(new Date().getFullYear(), ...availableYears);

  const displayedProjects = activeTab === 'Active' ? activeProjects 
                          : activeTab === 'Planned' ? plannedProjects 
                          : completedProjects;

  // Reset to current year when switching to Completed
  const handleTabChange = (tab: 'Active' | 'Planned' | 'Completed') => {
    setActiveTab(tab);
    if (tab === 'Completed') {
      setCompletedYear(new Date().getFullYear());
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h2>Projects</h2>
        </div>
        <div className={styles.actionControls}>
          <Button variant="primary" onClick={handleAddProject}>+ Add Project</Button>
        </div>
      </header>

      <div className={styles.tabsContainer}>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'Active' ? styles.activeTab : ''}`}
          onClick={() => handleTabChange('Active')}
        >
          Active ({activeProjects.length})
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'Planned' ? styles.activeTab : ''}`}
          onClick={() => handleTabChange('Planned')}
        >
          Planned ({plannedProjects.length})
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'Completed' ? styles.activeTab : ''}`}
          onClick={() => handleTabChange('Completed')}
        >
          Completed ({completedProjectsAll.length})
        </button>
      </div>
      
      {activeTab === 'Completed' && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 24px 0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              onClick={() => setCompletedYear(prev => prev - 1)}
              style={{ border: 'none', background: 'transparent', cursor: completedYear <= minYear ? 'default' : 'pointer', color: completedYear <= minYear ? 'var(--color-border)' : 'var(--color-accent)', fontWeight: 'bold', fontSize: '1.1rem' }}
              disabled={completedYear <= minYear}
            >
              &lt;
            </button>
            <span style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--color-text)' }}>
              {completedYear}
            </span>
            <button 
              onClick={() => setCompletedYear(prev => prev + 1)}
              style={{ border: 'none', background: 'transparent', cursor: completedYear >= maxYear ? 'default' : 'pointer', color: completedYear >= maxYear ? 'var(--color-border)' : 'var(--color-accent)', fontWeight: 'bold', fontSize: '1.1rem' }}
              disabled={completedYear >= maxYear}
            >
              &gt;
            </button>
          </div>
        </div>
      )}
      
      <div className={styles.listContainer}>
        {displayedProjects.length === 0 && (
          <div className={styles.emptyState}>
            {activeTab === 'Completed' ? `No completed projects for ${completedYear}` : `No ${activeTab.toLowerCase()} projects`}
          </div>
        )}
        {displayedProjects.map(project => {
          const clientName = project.clientId 
            ? state.clients.find(c => c.id === project.clientId)?.name 
            : project.client;
          
          return (
            <div 
              key={project.id} 
              className={`${styles.projectCard} ${project.status === 'Completed' ? styles.completed : ''}`}
              onClick={() => setSelectedProjectId(project.id)}
            >
              <div className={styles.projectInfo}>
                <div className={styles.nameRow}>
                  <span className={styles.colourDot} style={{ backgroundColor: project.colour }}></span>
                  <h3>{getProjectDisplayName(project, state.clients)}</h3>
                  {project.status === 'Completed' && <span className={styles.completedBadge}>Completed</span>}
                </div>
                <div className={styles.detailsRow}>
                  {clientName && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>👤 {clientName}</span>}
                  {project.address && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>📍 {project.address}</span>}
                </div>
              </div>
              
            </div>
          );
        })}
      </div>

      <ProjectForm
        isOpen={isProjectFormOpen}
        onClose={() => setIsProjectFormOpen(false)}
        project={null}
      />
    </div>
  );
};

export default ProjectsListView;
