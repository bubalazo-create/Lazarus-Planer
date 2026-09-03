import React from 'react';
import { DndContext, DragEndEvent, useDroppable, useSensor, useSensors, MouseSensor, TouchSensor } from '@dnd-kit/core';
import { Assignment, Project, Worker } from '../../models/types';
import AssignmentBlock from './AssignmentBlock';
import { formatDayShort, formatDayNum, isToday, isWeekend, isSunday, addDays, formatDate } from '../../utils/dateUtils';
import { useAppContext } from '../../context/AppContext';
import styles from './CalendarGrid.module.css';

interface CalendarGridProps {
  columns: Date[];
  rows: { id: string; label: string; colour: string; sublabel?: string; isSeparator?: boolean }[];
  assignments: Assignment[];
  workers: Worker[];
  projects: Project[];
  onAssignmentClick: (assignment: Assignment, date: Date) => void;
  onCellClick?: (rowId: string, date: Date) => void;
  onRowClick?: (rowId: string) => void;
  renderRowActions?: (row: { id: string; label: string; colour: string; sublabel?: string }) => React.ReactNode;
  activeRowId?: string;
  mode: 'workers' | 'projects';
  compact?: boolean;
  isCopyMode?: boolean;
}

const DroppableCell: React.FC<{
  id: string;
  date: Date;
  rowId: string;
  isToday: boolean;
  isSunday: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}> = ({ id, date, rowId, isToday, isSunday, onClick, children }) => {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { date, rowId },
  });

  return (
    <div
      ref={setNodeRef}
      className={`${styles.cell} ${isToday ? styles.today : ''} ${isSunday ? styles.sunday : ''} ${
        isOver ? styles.isOver : ''
      }`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

const CalendarGrid: React.FC<CalendarGridProps> = ({
  columns,
  rows,
  assignments,
  workers,
  projects,
  onAssignmentClick,
  onCellClick,
  onRowClick,
  renderRowActions,
  activeRowId,
  mode,
  compact = false,
  isCopyMode = false,
}) => {
  const { dispatch } = useAppContext();
  
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
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

  return (
    <>
      <DndContext onDragEnd={handleDragEnd} sensors={sensors}>
      <div className={`${styles.gridContainer} ${compact ? styles.compactGrid : ''}`}>
        <div className={styles.headerRow}>
          <div className={styles.cornerCell}></div>
          {columns.map((date, i) => (
            <div
              key={i}
              className={`${styles.headerCell} ${isToday(date) ? styles.todayHeader : ''} ${
                isSunday(date) ? styles.sundayHeader : ''
              }`}
            >
              <div className={styles.dayShort}>{formatDayShort(date)}</div>
              <div className={styles.dayNum}>{formatDayNum(date)}</div>
            </div>
          ))}
        </div>

        <div className={styles.body}>
          {rows.map((row) => {
            if (row.isSeparator) {
              return (
                <div key={row.id} className={styles.separatorRow}>
                  <div className={styles.separatorLabel}>{row.label}</div>
                </div>
              );
            }

            return (
            <div key={row.id} className={styles.row}>
              <div
                className={`${styles.rowLabelCell} ${onRowClick ? styles.rowLabelClickable : ''}`}
                style={activeRowId === row.id ? { zIndex: 20 } : undefined}
                onClick={() => onRowClick?.(row.id)}
              >
                <div className={styles.labelIndicator} style={{ backgroundColor: row.colour }}></div>
                <div className={styles.labelContent}>
                  <div className={styles.mainLabel}>{row.label}</div>
                  {row.sublabel && <div className={styles.subLabel}>{row.sublabel}</div>}
                </div>
                {renderRowActions && (
                  <div className={styles.rowActions}>
                    {renderRowActions(row as any)}
                  </div>
                )}
              </div>
              
              {columns.map((date, i) => {
                const cellId = `${row.id}-${date.toISOString()}`;
                
                // Filter assignments for this cell
                const cellAssignments = assignments.filter((a) => {
                  const matchesRow = mode === 'workers' ? a.workerId === row.id : a.projectId === row.id;
                  const start = new Date(a.startDate);
                  const end = new Date(a.endDate);
                  start.setHours(0,0,0,0);
                  end.setHours(23,59,59,999);
                  return matchesRow && date >= start && date <= end;
                });

                // In projects mode: check if this date falls within the project's planned period
                let isInProjectPlannedRange = false;
                let projectPlannedColour = '';
                if (mode === 'projects') {
                  const proj = projects.find(p => p.id === row.id);
                  if (proj && proj.startDate && proj.targetEndDate) {
                    const planStart = new Date(proj.startDate);
                    const planEnd = new Date(proj.targetEndDate);
                    planStart.setHours(0, 0, 0, 0);
                    planEnd.setHours(23, 59, 59, 999);
                    isInProjectPlannedRange = date >= planStart && date <= planEnd;
                    projectPlannedColour = proj.colour || row.colour;
                  }
                }

                return (
                  <DroppableCell
                    key={cellId}
                    id={cellId}
                    date={date}
                    rowId={row.id}
                    isToday={isToday(date)}
                    isSunday={isSunday(date)}
                    onClick={() => onCellClick?.(row.id, date)}
                  >
                    {isInProjectPlannedRange && (
                      <div
                        className={styles.projectPlannedBand}
                        title="Project planned period"
                        style={{ backgroundColor: projectPlannedColour }}
                      />
                    )}
                    <div className={styles.cellContent}>
                      {cellAssignments.map((assignment) => {
                        const project = projects.find((p) => p.id === assignment.projectId)!;
                        const worker = workers.find((w) => w.id === assignment.workerId)!;
                        if (!project || !worker) return null;

                        return (
                          <AssignmentBlock
                            key={`${assignment.id}-${date.toISOString()}`}
                            assignment={assignment}
                            project={project}
                            worker={worker}
                            date={date}
                            onClick={(d) => onAssignmentClick(assignment, d)}
                            compact={compact}
                            displayContext={mode === 'projects' ? 'project' : 'worker'}
                            isCopyMode={isCopyMode}
                          />
                        );
                      })}
                    </div>
                  </DroppableCell>
                );
              })}
            </div>
          )})}
        </div>
      </div>
    </DndContext>
  </>
  );
};

export default CalendarGrid;
