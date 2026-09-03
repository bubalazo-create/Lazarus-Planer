import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { useAppContext } from '../../context/AppContext';
import { getProjectDisplayName } from '../../utils/projectUtils';
import { Assignment, Project, Worker } from '../../models/types';
import styles from './AssignmentBlock.module.css';

interface AssignmentBlockProps {
  assignment: Assignment;
  project: Project;
  worker: Worker;
  date: Date;
  onClick: (date: Date) => void;
  compact?: boolean;
  span?: number;
  displayContext?: 'worker' | 'project' | 'month';
  isCopyMode?: boolean;
}

const AssignmentBlock: React.FC<AssignmentBlockProps> = ({
  assignment,
  project,
  worker,
  date,
  onClick,
  compact = false,
  span = 1,
  displayContext = 'worker',
  isCopyMode = false,
}) => {
  const { attributes: singleAttr, listeners: singleListeners, setNodeRef: setSingleRef, transform: singleTransform, isDragging: singleIsDragging } = useDraggable({
    id: `single-${assignment.id}-${date.toISOString()}`,
    data: { type: 'single', assignment, date },
  });

  const { attributes: wholeAttr, listeners: wholeListeners, setNodeRef: setWholeRef, transform: wholeTransform, isDragging: wholeIsDragging } = useDraggable({
    id: `whole-${assignment.id}-${date.toISOString()}`,
    data: { type: 'whole', assignment },
  });

  const transform = singleTransform || wholeTransform;
  const isDragging = singleIsDragging || wholeIsDragging;

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 10,
      }
    : undefined;

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : '0, 0, 0';
  };

  const colorSource = displayContext === 'month' ? worker.colour : project.colour;
  const backgroundColor = `rgba(${hexToRgb(colorSource || '#ffffff')}, 0.2)`;
  const borderColor = colorSource || 'var(--color-border)';

  const { state } = useAppContext();
  const [isExpanded, setIsExpanded] = React.useState(false);

  const AssignmentBlockContent = () => {
    const projectName = getProjectDisplayName(project, state.clients);
    return (
    <>
      <div 
        ref={setWholeRef} 
        className={styles.dragHandle} 
        {...wholeListeners} 
        {...wholeAttr}
        onClick={(e) => e.stopPropagation()}
        title="Move entire assignment"
        style={{ padding: compact ? '2px 4px' : '4px 6px' }}
      >
        <svg width="12" height="20" viewBox="0 0 12 20" fill="currentColor" style={{ opacity: 0.5 }}>
          <circle cx="4" cy="4" r="1.5" />
          <circle cx="8" cy="4" r="1.5" />
          <circle cx="4" cy="10" r="1.5" />
          <circle cx="8" cy="10" r="1.5" />
          <circle cx="4" cy="16" r="1.5" />
          <circle cx="8" cy="16" r="1.5" />
        </svg>
      </div>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px',
              padding: compact ? '2px 6px 2px 0' : '4px 8px 4px 0',
              paddingBottom: (!compact && assignment.title) ? '2px' : (compact ? '2px' : '4px'),
              overflow: 'hidden'
            }}
          >
            {displayContext === 'month' ? (
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                title="Click to expand/collapse project name"
                className={styles.title}
              >
                <span style={{ fontSize: '0.7rem', opacity: 0.7, padding: '2px', marginLeft: '-2px' }}>
                  {isExpanded ? '▼' : '▶'}
                </span>
                <span>
                  {isExpanded ? `${worker.name} — ${projectName}` : worker.name}
                </span>
              </div>
            ) : (
              <div className={styles.title}>{projectName}</div>
            )}
          </div>
        {!compact && assignment.title && (
          <div 
            className={styles.task} 
            style={{ padding: '0 8px 4px 0' }}
          >
            {assignment.title}
          </div>
        )}
      </div>
    </>
  );
  };

  return (
    <>
      {isDragging && isCopyMode && (
        <div style={{ width: 0, height: 0, overflow: 'visible' }}>
          <div
            style={{
              backgroundColor,
              borderLeftColor: borderColor,
              width: `calc(${span * 100}% - 8px)`,
              display: 'flex',
              flexDirection: 'row',
              gap: '4px',
              alignItems: 'center',
              opacity: 0.5,
            }}
            className={`${styles.block} ${compact ? styles.compact : ''}`}
          >
            <AssignmentBlockContent />
          </div>
        </div>
      )}
      <div
        ref={setSingleRef}
        style={{
          ...style,
          backgroundColor,
          borderLeftColor: borderColor,
          width: `calc(${span * 100}% - 8px)`,
          display: 'flex',
          flexDirection: 'row',
          gap: '4px',
          alignItems: 'center',
        }}
        className={`${styles.block} ${compact ? styles.compact : ''} ${isDragging ? styles.isDragging : ''} ${isDragging && isCopyMode ? styles.isCopying : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onClick(date);
        }}
        {...singleListeners}
        {...singleAttr}
      >
        <AssignmentBlockContent />
      </div>
    </>
  );
};

export default AssignmentBlock;
