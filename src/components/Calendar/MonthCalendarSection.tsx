import React, { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useAppContext } from '../../context/AppContext';
import { formatMonthYear, isToday, formatDate } from '../../utils/dateUtils';
import AssignmentBlock from './AssignmentBlock';
import { Assignment, Project } from '../../models/types';
import styles from './MonthCalendarSection.module.css';

interface MonthCalendarSectionProps {
  monthDate: Date;
  assignments: Assignment[];
  projects?: Project[];
  onDayClick: (date: Date) => void;
  onAssignmentClick: (assignment: Assignment, date: Date) => void;
  displayContext?: 'worker' | 'project' | 'month';
  rowId?: string;
  isCopyMode?: boolean;
}

const DroppableCell: React.FC<{
  id: string;
  date: Date;
  rowId?: string;
  isTodayDate: boolean;
  isCurrentMonth: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ id, date, rowId, isTodayDate, isCurrentMonth, onClick, children }) => {
  const dateStr = formatDate(date);
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { date, rowId: rowId || 'global' },
  });

  return (
    <div 
      ref={setNodeRef}
      className={`${styles.dayCell} ${!isCurrentMonth ? styles.otherMonth : ''} ${isTodayDate ? styles.today : ''} ${isOver ? styles.dragOver : ''}`}
      onClick={onClick}
      data-date={dateStr}
      data-today={isTodayDate ? "true" : undefined}
      data-current-month={isCurrentMonth ? "true" : "false"}
    >
      {children}
    </div>
  );
};

const MonthCalendarSection: React.FC<MonthCalendarSectionProps> = ({
  monthDate,
  assignments,
  projects,
  onDayClick,
  onAssignmentClick,
  displayContext = 'worker',
  rowId,
  isCopyMode = false,
}) => {
  const { state } = useAppContext();

  const daysInMonth = useMemo(() => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days = [];
    
    // Previous month padding
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6; // Sunday
    
    for (let i = startDayOfWeek; i > 0; i--) {
      days.push(new Date(year, month, 1 - i));
    }
    
    // Current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    
    // Next month padding
    let endDayOfWeek = lastDay.getDay();
    if (endDayOfWeek !== 0) {
      for (let i = 1; i <= 7 - endDayOfWeek; i++) {
        days.push(new Date(year, month + 1, i));
      }
    }
    
    return days;
  }, [monthDate]);

  const getAssignmentsForDay = (date: Date) => {
    return assignments.filter(a => {
      const start = new Date(a.startDate);
      const end = new Date(a.endDate);
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
      return date >= start && date <= end;
    });
  };

  // Return all projects whose planned period covers this date
  const getProjectsForDay = (date: Date): Project[] => {
    if (!projects || projects.length === 0) return [];
    return projects.filter(p => {
      if (!p.startDate || !p.targetEndDate) return false;
      const planStart = new Date(p.startDate);
      const planEnd = new Date(p.targetEndDate);
      planStart.setHours(0, 0, 0, 0);
      planEnd.setHours(23, 59, 59, 999);
      return date >= planStart && date <= planEnd;
    });
  };

  const monthStr = formatDate(new Date(monthDate.getFullYear(), monthDate.getMonth(), 1));

  return (
    <div className={styles.monthSection} data-month={monthStr}>
      <div className={styles.monthHeaderWrapper}>
        <h3 className={styles.monthTitle}>{formatMonthYear(monthDate)}</h3>
      </div>
      
      <div className={styles.daysGrid}>
        {daysInMonth.map((date, i) => {
          const isCurrentMonth = date.getMonth() === monthDate.getMonth();
          const dateStr = formatDate(date);

          if (!isCurrentMonth) {
            return <div key={`${dateStr}-${i}`} className={`${styles.dayCell} ${styles.otherMonth}`} />;
          }

          const dayAssignments = getAssignmentsForDay(date);
          const dayProjects = getProjectsForDay(date);
          const isTodayDate = isToday(date);

          return (
            <DroppableCell
              key={`${dateStr}-${i}`}
              id={`${rowId || 'global'}-${date.toISOString()}`}
              date={date}
              rowId={rowId}
              isTodayDate={isTodayDate}
              isCurrentMonth={isCurrentMonth}
              onClick={() => onDayClick(date)}
            >
              <div className={styles.dayNumber}>{date.getDate()}</div>
              <div className={styles.assignmentsList}>
                {dayAssignments.map(a => {
                  const project = state.projects.find(p => p.id === a.projectId);
                  const worker = state.workers.find(w => w.id === a.workerId);
                  
                  if (!project || !worker) return null;
                  
                  return (
                    <AssignmentBlock
                      key={`${a.id}-${date.toISOString()}`}
                      assignment={a}
                      project={project}
                      worker={worker}
                      date={date}
                      compact={false}
                      span={1}
                      displayContext={displayContext}
                      isCopyMode={isCopyMode}
                      onClick={(clickedDate: Date) => {
                        onAssignmentClick(a, clickedDate);
                      }}
                    />
                  );
                })}
              </div>
              {dayProjects.length > 0 && (
                <div className={styles.projectPlannedList}>
                  {dayProjects.map(p => (
                    <div
                      key={p.id}
                      className={styles.projectPlannedStrip}
                      title={`${p.name || p.client || 'Project'} — planned period`}
                      style={{ backgroundColor: p.colour }}
                    />
                  ))}
                </div>
              )}
            </DroppableCell>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(MonthCalendarSection);

