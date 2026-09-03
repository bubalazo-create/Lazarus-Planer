import React, { useState, useMemo } from 'react';
import { DndContext, DragEndEvent, useSensor, useSensors, MouseSensor, TouchSensor } from '@dnd-kit/core';
import { useContinuousCalendar } from '../../hooks/useContinuousCalendar';
import { useAppContext } from '../../context/AppContext';
import { Project, Assignment, ConflictInfo } from '../../models/types';
import { getProjectDisplayName } from '../../utils/projectUtils';
import { formatMonthYear, formatDate } from '../../utils/dateUtils';
import Button from '../../components/common/Button';
import AssignmentForm from '../../components/Forms/AssignmentForm';
import MonthCalendarSection from '../../components/Calendar/MonthCalendarSection';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ProjectForm from '../../components/Forms/ProjectForm';
import styles from './ProjectScheduleView.module.css';

interface ProjectScheduleViewProps {
  projectId: string;
  onBack: () => void;
}

const ProjectScheduleView: React.FC<ProjectScheduleViewProps> = ({ projectId, onBack }) => {
  const { state, dispatch } = useAppContext();
  
  const {
    loadedMonths,
    visibleMonth,
    handlePrevMonth,
    handleNextMonth,
    handleToday,
    isCopyMode,
    toggleCopyMode,
  } = useContinuousCalendar();

  // Form State
  const [isAssignmentFormOpen, setIsAssignmentFormOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [prefillDate, setPrefillDate] = useState<string | undefined>();
  const [selectedOccurrenceDate, setSelectedOccurrenceDate] = useState<string | undefined>();

  // Edit / Delete State
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
  const [projectToConfirm, setProjectToConfirm] = useState<Project | null>(null);
  const [confirmType, setConfirmType] = useState<'complete' | 'delete' | null>(null);

  const project = state.projects.find(p => p.id === projectId);
  const clientObj = project?.clientId ? state.clients.find(c => c.id === project.clientId) : null;
  const clientName = clientObj ? clientObj.name : project?.client;

  const projectAssignments = useMemo(() => {
    return state.assignments.filter(a => a.projectId === projectId);
  }, [state.assignments, projectId]);

  const handleConfirmAction = () => {
    if (projectToConfirm && confirmType) {
      if (confirmType === 'delete') {
        dispatch({ type: 'DELETE_PROJECT', id: projectToConfirm.id });
        setProjectToConfirm(null);
        setConfirmType(null);
        onBack();
        return;
      } else if (confirmType === 'complete') {
        dispatch({ type: 'UPDATE_PROJECT', project: { ...projectToConfirm, status: 'Completed', completedAt: projectToConfirm.completedAt || new Date().toISOString() } });
      }
    }
    setProjectToConfirm(null);
    setConfirmType(null);
  };

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const dragType = active.data.current?.type;
    const assignment = active.data.current?.assignment;
    if (!assignment) return;

    const overData = over.data.current as { date: Date; rowId: string };
    const targetDate = overData.date;
    
    if (dragType === 'whole') {
      const originalStartDate = new Date(assignment.startDate);
      const originalTime = Date.UTC(originalStartDate.getFullYear(), originalStartDate.getMonth(), originalStartDate.getDate());
      const targetTime = Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      const daysDelta = Math.round((targetTime - originalTime) / (1000 * 60 * 60 * 24));

      if (daysDelta !== 0) {
        if (isCopyMode) {
          dispatch({ type: 'COPY_ASSIGNMENT', id: assignment.id, daysDelta, newId: crypto.randomUUID() });
        } else {
          dispatch({ type: 'MOVE_ASSIGNMENT', id: assignment.id, daysDelta });
        }
      }
    } else if (dragType === 'single') {
      const originalDate = active.data.current?.date as Date;
      if (!originalDate) return;
      
      const originalTime = Date.UTC(originalDate.getFullYear(), originalDate.getMonth(), originalDate.getDate());
      const targetTime = Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      const daysDelta = Math.round((targetTime - originalTime) / (1000 * 60 * 60 * 24));

      if (daysDelta !== 0) {
        if (isCopyMode) {
          dispatch({ 
            type: 'COPY_SINGLE_DAY_ASSIGNMENT', 
            id: assignment.id, 
            targetDate: formatDate(targetDate),
            newId: crypto.randomUUID()
          });
        } else {
          dispatch({ 
            type: 'MOVE_SINGLE_DAY_ASSIGNMENT', 
            id: assignment.id, 
            originalDate: formatDate(originalDate), 
            targetDate: formatDate(targetDate) 
          });
        }
      }
    }
  };

  if (!project) {
    return (
      <div className={styles.container}>
        <div style={{ padding: '16px 24px 0 24px', backgroundColor: 'var(--color-surface)' }}>
          <Button variant="secondary" onClick={onBack}>&larr; Back to Profile</Button>
        </div>
        <header className={styles.header}>
          <h2>Project not found</h2>
        </header>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.stickyContainer}>
        <div style={{ padding: '16px 24px 0 24px', backgroundColor: 'var(--color-surface)' }}>
          <Button variant="secondary" onClick={onBack} className={styles.backButton}>&larr; Back to Profile</Button>
        </div>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.projectInfo}>
              <h2 className={styles.projectName}>
                <span style={{ display: 'inline-block', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: project.colour, marginRight: '8px' }}></span>
                {getProjectDisplayName(project, state.clients)}
              </h2>
              {clientName && <p className={styles.projectClient}>Client: {clientName}</p>}
              <p className={styles.projectTitle}>Project Schedule</p>
              
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <Button variant="secondary" onClick={() => setIsProjectFormOpen(true)}>Edit</Button>
                {project.status !== 'Completed' ? (
                  <Button variant="secondary" onClick={() => { setProjectToConfirm(project); setConfirmType('complete'); }}>Complete</Button>
                ) : (
                  <Button variant="secondary" onClick={() => dispatch({ type: 'UPDATE_PROJECT', project: { ...project, status: 'Active' } })}>Restore</Button>
                )}
                <Button variant="danger" onClick={() => { setProjectToConfirm(project); setConfirmType('delete'); }}>Delete</Button>
              </div>
            </div>
          </div>
          <div className={styles.navControls}>
            <Button variant={isCopyMode ? "primary" : "secondary"} onClick={toggleCopyMode}>
              {isCopyMode ? '📋 Copy Mode: ON' : 'Copy Mode: OFF'}
            </Button>
            <Button variant="secondary" onClick={handlePrevMonth}>&lt; Previous Month</Button>
            <Button variant="secondary" onClick={handleToday}>Today</Button>
            <h2 className={styles.monthLabel}>{formatMonthYear(visibleMonth)}</h2>
            <Button variant="secondary" onClick={handleNextMonth}>Next Month &gt;</Button>
          </div>
        </header>
        
        <div className={styles.daysHeader}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className={styles.dayHeaderCell}>{day}</div>
          ))}
        </div>
      </div>
      
      <div className={styles.calendar}>
      <DndContext onDragEnd={handleDragEnd} sensors={sensors}>
        <div className={styles.scrollContainer}>
          {loadedMonths.map(month => (
            <MonthCalendarSection
              key={month.toISOString()}
              monthDate={month}
              assignments={projectAssignments}
              rowId={projectId}
              displayContext='project'
              isCopyMode={isCopyMode}
              onDayClick={(date) => {
                setSelectedAssignment(null);
                setPrefillDate(formatDate(date));
                setSelectedOccurrenceDate(undefined);
                setIsAssignmentFormOpen(true);
              }}
              onAssignmentClick={(assignment, clickedDate) => {
                setSelectedAssignment(assignment);
                setPrefillDate(undefined);
                setSelectedOccurrenceDate(formatDate(clickedDate));
                setIsAssignmentFormOpen(true);
              }}
            />
          ))}
        </div>
      </DndContext>
      </div>

      <AssignmentForm
        isOpen={isAssignmentFormOpen}
        onClose={() => setIsAssignmentFormOpen(false)}
        assignment={selectedAssignment}
        prefillProjectId={projectId}
        prefillDate={prefillDate}
        selectedOccurrenceDate={selectedOccurrenceDate}
      />

      <ProjectForm
        isOpen={isProjectFormOpen}
        onClose={() => setIsProjectFormOpen(false)}
        project={project}
      />

      <ConfirmDialog
        isOpen={!!projectToConfirm}
        title={confirmType === 'delete' ? `Delete ${projectToConfirm?.name}?` : `Complete ${projectToConfirm?.name}?`}
        message={
          confirmType === 'delete'
            ? "This action cannot be undone. Are you sure you want to permanently delete this project? All associated assignments will also be deleted."
            : "Marking this project as completed will move it to the completed section."
        }
        onConfirm={handleConfirmAction}
        onCancel={() => { setProjectToConfirm(null); setConfirmType(null); }}
        confirmText={confirmType === 'delete' ? "Delete Project" : "Mark as Completed"}
        variant={confirmType === 'delete' ? "danger" : undefined}
      />
    </div>
  );
};

export default ProjectScheduleView;
