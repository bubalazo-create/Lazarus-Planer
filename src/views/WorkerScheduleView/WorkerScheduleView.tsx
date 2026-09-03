import React, { useState, useMemo } from 'react';
import { DndContext, DragEndEvent, useSensor, useSensors, MouseSensor, TouchSensor } from '@dnd-kit/core';
import { useContinuousCalendar } from '../../hooks/useContinuousCalendar';
import { useAppContext } from '../../context/AppContext';
import { formatMonthYear, formatDate } from '../../utils/dateUtils';
import Button from '../../components/common/Button';
import AssignmentForm from '../../components/Forms/AssignmentForm';
import MonthCalendarSection from '../../components/Calendar/MonthCalendarSection';
import { Assignment } from '../../models/types';
import styles from './WorkerScheduleView.module.css';

interface WorkerScheduleViewProps {
  workerId: string;
  onBack: () => void;
}

const WorkerScheduleView: React.FC<WorkerScheduleViewProps> = ({ workerId, onBack }) => {
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

  const worker = state.workers.find(w => w.id === workerId);

  const workerAssignments = useMemo(() => {
    return state.assignments.filter(a => a.workerId === workerId);
  }, [state.assignments, workerId]);

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
    console.log('DRAG END', { active: event.active, over: event.over });
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

  if (!worker) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <Button variant="secondary" onClick={onBack}>&lt; Back to Profile</Button>
          <h2>Worker not found</h2>
        </header>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.stickyContainer}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <Button variant="secondary" onClick={onBack} className={styles.backButton}>&larr; Back to Profile</Button>
            <div className={styles.workerInfo}>
              <h2 className={styles.workerName}>{worker.name}</h2>
              <p className={styles.workerTitle}>Monthly Schedule {worker.trade ? `— ${worker.trade}` : ''}</p>
            </div>
          </div>
          <div className={styles.navControls}>
            <Button variant={isCopyMode ? "primary" : "secondary"} onClick={toggleCopyMode}>
              {isCopyMode ? '✓ Copy Mode: ON' : 'Copy Mode: OFF'}
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
        <DndContext 
          onDragStart={(e) => console.log('DRAG START', e.active)}
          onDragOver={(e) => console.log('DRAG OVER', e.over)}
          onDragEnd={handleDragEnd} 
          sensors={sensors}
        >
          <div className={styles.scrollContainer}>
            {loadedMonths.map(month => (
              <MonthCalendarSection
                key={month.toISOString()}
                monthDate={month}
                assignments={workerAssignments}
                rowId={workerId}
                displayContext="worker"
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
        prefillWorkerId={workerId}
        prefillDate={prefillDate}
        selectedOccurrenceDate={selectedOccurrenceDate}
      />
    </div>
  );
};

export default WorkerScheduleView;
