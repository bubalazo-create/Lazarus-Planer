import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { getWeekDays, formatDate, formatDisplayDate, addDays } from '../../utils/dateUtils';
import CalendarGrid from '../../components/Calendar/CalendarGrid';
import AssignmentForm from '../../components/Forms/AssignmentForm';
import Button from '../../components/common/Button';
import { Assignment } from '../../models/types';
import styles from '../WorkersView/WorkersView.module.css'; // Reusing styles

const WeeklyWorkersView: React.FC = () => {
  const { state } = useAppContext();
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [isAssignmentFormOpen, setIsAssignmentFormOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [prefillWorkerId, setPrefillWorkerId] = useState<string | undefined>();
  const [prefillDate, setPrefillDate] = useState<string | undefined>();
  const [selectedOccurrenceDate, setSelectedOccurrenceDate] = useState<string | undefined>();

  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);
  
  const handlePrevWeek = () => setCurrentDate((d) => addDays(d, -7));
  const handleNextWeek = () => setCurrentDate((d) => addDays(d, 7));
  const handleThisWeek = () => setCurrentDate(new Date());

  const weekLabel = `${formatDisplayDate(weekDays[0])} — ${formatDisplayDate(weekDays[weekDays.length - 1])}`;

  const activeWorkers = state.workers.filter(w => w.active);
  const rows = activeWorkers.map(w => ({
    id: w.id,
    label: w.name,
    colour: w.colour,
    sublabel: w.trade
  }));

  const handleAssignmentClick = (assignment: Assignment, date?: Date) => {
    setSelectedAssignment(assignment);
    setPrefillDate(undefined);
    setSelectedOccurrenceDate(date ? formatDate(date) : undefined);
    setIsAssignmentFormOpen(true);
  };

  const handleCellClick = (workerId: string, date: Date) => {
    setSelectedAssignment(null);
    setPrefillWorkerId(workerId);
    setPrefillDate(formatDate(date));
    setSelectedOccurrenceDate(undefined);
    setIsAssignmentFormOpen(true);
  };

  const handleAddAssignment = () => {
    setSelectedAssignment(null);
    setPrefillWorkerId(undefined);
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
          mode="workers"
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
        prefillWorkerId={prefillWorkerId}
        prefillDate={prefillDate}
        selectedOccurrenceDate={selectedOccurrenceDate}
      />
    </div>
  );
};

export default WeeklyWorkersView;
