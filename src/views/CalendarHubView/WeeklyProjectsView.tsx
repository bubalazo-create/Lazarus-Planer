import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { getWeekDays, formatDate, formatDisplayDate, addDays } from '../../utils/dateUtils';
import { getProjectDisplayName } from '../../utils/projectUtils';
import CalendarGrid from '../../components/Calendar/CalendarGrid';
import AssignmentForm from '../../components/Forms/AssignmentForm';
import Button from '../../components/common/Button';
import { Assignment } from '../../models/types';
import styles from '../ProjectsView/ProjectsView.module.css';

const WeeklyProjectsView: React.FC = () => {
  const { state } = useAppContext();
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [isAssignmentFormOpen, setIsAssignmentFormOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [prefillDate, setPrefillDate] = useState<string | undefined>();
  const [prefillProjectId, setPrefillProjectId] = useState<string | undefined>();
  const [selectedOccurrenceDate, setSelectedOccurrenceDate] = useState<string | undefined>();

  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);
  
  const handlePrevWeek = () => setCurrentDate((d) => addDays(d, -7));
  const handleNextWeek = () => setCurrentDate((d) => addDays(d, 7));
  const handleThisWeek = () => setCurrentDate(new Date());

  const weekLabel = `${formatDisplayDate(weekDays[0])} — ${formatDisplayDate(weekDays[weekDays.length - 1])}`;

  const activeProjects = state.projects.filter(p => p.status !== 'Completed');
  const completedProjects = state.projects.filter(p => p.status === 'Completed');

  const rows: { id: string; label: string; colour: string; sublabel?: string; isSeparator?: boolean }[] = [];
  
  if (activeProjects.length > 0 || completedProjects.length === 0) {
    rows.push({ id: 'active-sep', label: 'Active', colour: '', isSeparator: true });
    rows.push(...activeProjects.map(p => {
      const clientObj = p.clientId ? state.clients.find(c => c.id === p.clientId) : null;
      return {
        id: p.id,
        label: getProjectDisplayName(p, state.clients),
        colour: p.colour,
        sublabel: clientObj ? clientObj.name : p.client
      };
    }));
  }

  if (completedProjects.length > 0) {
    rows.push({ id: 'completed-sep', label: 'Completed', colour: '', isSeparator: true });
    rows.push(...completedProjects.map(p => {
      const clientObj = p.clientId ? state.clients.find(c => c.id === p.clientId) : null;
      return {
        id: p.id,
        label: getProjectDisplayName(p, state.clients),
        colour: p.colour,
        sublabel: clientObj ? clientObj.name : p.client
      };
    }));
  }

  const handleAssignmentClick = (assignment: Assignment, date?: Date) => {
    setSelectedAssignment(assignment);
    setPrefillDate(undefined);
    setSelectedOccurrenceDate(date ? formatDate(date) : undefined);
    setIsAssignmentFormOpen(true);
  };

  const handleCellClick = (projectId: string, date: Date) => {
    if (projectId === 'active-sep' || projectId === 'completed-sep') return;
    setSelectedAssignment(null);
    setPrefillProjectId(projectId);
    setPrefillDate(formatDate(date));
    setSelectedOccurrenceDate(undefined);
    setIsAssignmentFormOpen(true);
  };

  const handleAddAssignment = () => {
    setSelectedAssignment(null);
    setPrefillProjectId(undefined);
    setPrefillDate(undefined);
    setSelectedOccurrenceDate(undefined);
    setIsAssignmentFormOpen(true);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.navControls}>
          <Button variant="secondary" onClick={handlePrevWeek}>&lt; Previous Week</Button>
          <Button variant="secondary" onClick={handleThisWeek}>This Week</Button>
          <span className={styles.weekLabel}>{weekLabel}</span>
          <Button variant="secondary" onClick={handleNextWeek}>Next Week &gt;</Button>
        </div>
        <div className={styles.actionControls}>
          <Button variant="primary" onClick={handleAddAssignment}>+ Add Assignment</Button>
        </div>
      </header>
      
      <div className={styles.gridWrapper}>
        <CalendarGrid
          mode="projects"
          columns={weekDays}
          rows={rows}
          assignments={state.assignments}
          workers={state.workers}
          projects={state.projects}
          onAssignmentClick={handleAssignmentClick}
          onCellClick={handleCellClick}
        />
      </div>

      <AssignmentForm
        isOpen={isAssignmentFormOpen}
        onClose={() => setIsAssignmentFormOpen(false)}
        assignment={selectedAssignment}
        prefillProjectId={prefillProjectId}
        prefillDate={prefillDate}
        selectedOccurrenceDate={selectedOccurrenceDate}
      />
    </div>
  );
};

export default WeeklyProjectsView;
