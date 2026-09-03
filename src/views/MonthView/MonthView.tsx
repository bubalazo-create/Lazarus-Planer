import React, { useState } from 'react';
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import { useAppContext } from '../../context/AppContext';
import { formatMonthYear, formatDate } from '../../utils/dateUtils';
import Button from '../../components/common/Button';
import AssignmentForm from '../../components/Forms/AssignmentForm';
import MonthCalendarSection from '../../components/Calendar/MonthCalendarSection';
import { Assignment } from '../../models/types';
import styles from './MonthView.module.css';

interface MonthViewProps {
  mode?: 'workers' | 'projects';
}

const MonthView: React.FC<MonthViewProps> = ({ mode = 'workers' }) => {
  const { state, dispatch } = useAppContext();
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [isAssignmentFormOpen, setIsAssignmentFormOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [selectedOccurrenceDate, setSelectedOccurrenceDate] = useState<string | undefined>();
  const [prefillDate, setPrefillDate] = useState<string | undefined>();
  const [prefillProjectId, setPrefillProjectId] = useState<string | undefined>();
  
  const [isCopyMode, setIsCopyMode] = useState(false);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const initialScrollDone = React.useRef(false);

  React.useLayoutEffect(() => {
    if (!initialScrollDone.current) {
      const now = new Date();
      if (currentDate.getMonth() === now.getMonth() && currentDate.getFullYear() === now.getFullYear()) {
        const timer = setTimeout(() => {
          const todayCell = document.querySelector('[data-today="true"][data-current-month="true"]') as HTMLElement;
          if (todayCell) {
            const rect = todayCell.getBoundingClientRect();
            document.documentElement.style.scrollBehavior = 'auto';
            window.scrollTo({
              top: window.scrollY + rect.top - 165,
              behavior: 'auto'
            });
            document.documentElement.style.scrollBehavior = 'smooth';
          }
          initialScrollDone.current = true;
        }, 100);
        return () => clearTimeout(timer);
      } else {
        initialScrollDone.current = true;
      }
    }
  }, [currentDate]);

  const handlePrevMonth = () => {
    setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  };
  
  const handleNextMonth = () => {
    setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    
    setTimeout(() => {
      const todayCell = document.querySelector('[data-today="true"][data-current-month="true"]') as HTMLElement;
      if (todayCell) {
        const rect = todayCell.getBoundingClientRect();
        window.scrollTo({
          top: window.scrollY + rect.top - 165,
          behavior: 'smooth'
        });
      }
    }, 50);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const dragType = active.data.current?.type;
    const assignment = active.data.current?.assignment as Assignment;
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
      const originalTime = Date.UTC(originalDate.getFullYear(), originalDate.getMonth(), originalDate.getDate());
      const targetTime = Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      
      if (originalTime !== targetTime) {
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

  const currentMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.navControls}>
          <Button variant="secondary" onClick={handlePrevMonth}>&lt; Prev</Button>
          <Button variant="secondary" onClick={handleToday}>Today</Button>
          <h2 className={styles.monthLabel}>{formatMonthYear(currentDate)}</h2>
          <Button variant="secondary" onClick={handleNextMonth}>Next &gt;</Button>
          <Button 
            variant={isCopyMode ? "primary" : "secondary"} 
            onClick={() => setIsCopyMode(!isCopyMode)}
          >
            {isCopyMode ? '✓ Copy Mode: ON' : 'Copy Mode: OFF'}
          </Button>
        </div>
      </header>
      
      <div className={styles.calendar}>
        <div className={styles.daysHeader}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className={styles.dayHeaderCell}>{day}</div>
          ))}
        </div>
        
        <DndContext onDragEnd={handleDragEnd} sensors={sensors}>
          <MonthCalendarSection
            monthDate={currentMonthDate}
            assignments={state.assignments}
            projects={state.projects}
            displayContext={mode === 'projects' ? 'project' : 'month'}
            isCopyMode={isCopyMode}
            onDayClick={(date) => {
              setSelectedAssignment(null);
              setPrefillDate(formatDate(date));
              setPrefillProjectId(undefined);
              setSelectedOccurrenceDate(undefined);
              setIsAssignmentFormOpen(true);
            }}
            onAssignmentClick={(assignment, clickedDate) => {
              setSelectedAssignment(assignment);
              setPrefillDate(undefined);
              setPrefillProjectId(undefined);
              setSelectedOccurrenceDate(formatDate(clickedDate));
              setIsAssignmentFormOpen(true);
            }}
          />
        </DndContext>
      </div>

      <AssignmentForm
        isOpen={isAssignmentFormOpen}
        onClose={() => setIsAssignmentFormOpen(false)}
        assignment={selectedAssignment}
        selectedOccurrenceDate={selectedOccurrenceDate}
        prefillDate={prefillDate}
        prefillProjectId={prefillProjectId}
      />
    </div>
  );
};

export default MonthView;
