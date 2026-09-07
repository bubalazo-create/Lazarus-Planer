import React, { useState, useMemo, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { WorkflowActivity } from '../../models/types';
import { getProjectDisplayName } from '../../utils/projectUtils';
import { getDatesInRange, parseDate, formatDayShort, formatDayNum, isWeekend, isToday, formatDate } from '../../utils/dateUtils';
import { getCategoryColor } from '../../utils/colorPalette';
import { parseISO, addDays as dateFnsAddDays, subDays as dateFnsSubDays, differenceInDays } from 'date-fns';
import Button from '../../components/common/Button';
import WorkflowActivityForm from '../../components/Forms/WorkflowActivityForm';
import styles from './ProjectWorkflowView.module.css';

interface ProjectWorkflowViewProps {
  projectId: string;
  onBack: () => void;
}

export default function ProjectWorkflowView({ projectId, onBack }: ProjectWorkflowViewProps) {
  const { state } = useAppContext();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<WorkflowActivity | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(48);

  const project = state.projects.find(p => p.id === projectId);
  const clientObj = project?.clientId ? state.clients.find(c => c.id === project.clientId) : null;
  const clientName = clientObj ? clientObj.name : project?.client;

  const activities = useMemo(() => {
    return state.workflowActivities.filter(a => a.projectId === projectId);
  }, [state.workflowActivities, projectId]);

  // Calculate timeline range
  const { timelineDates, weeks, minDate, totalDays } = useMemo(() => {
    if (activities.length === 0 && !project) {
      return { timelineDates: [], weeks: [], minDate: new Date(), totalDays: 0 };
    }

    let minD: Date;
    let maxD: Date;

    if (activities.length > 0) {
      const startDates = activities.map(a => parseDate(a.startDate).getTime());
      const endDates = activities.map(a => parseDate(a.endDate).getTime());
      
      minD = new Date(Math.min(...startDates));
      maxD = new Date(Math.max(...endDates));
    } else {
      minD = project?.startDate ? parseDate(project.startDate) : new Date();
      maxD = project?.targetEndDate ? parseDate(project.targetEndDate) : dateFnsAddDays(minD, 14);
      if (maxD < minD) {
        maxD = dateFnsAddDays(minD, 14);
      }
    }

    // Pad by a few days for visual breathing room
    minD = dateFnsSubDays(minD, 2);
    maxD = dateFnsAddDays(maxD, 2);

    // Ensure the timeline spans at least 24 weeks (168 days) so the user has room to plan ahead
    const currentSpan = differenceInDays(maxD, minD);
    if (currentSpan < 168) {
      maxD = dateFnsAddDays(maxD, 168 - currentSpan);
    }

    // Snap to nearest Monday for minD to make it look like a week start
    const dayOfWeek = minD.getDay();
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    minD = dateFnsSubDays(minD, diffToMonday);

    // Snap maxD to Sunday
    const maxDayOfWeek = maxD.getDay();
    const diffToSunday = maxDayOfWeek === 0 ? 0 : 7 - maxDayOfWeek;
    maxD = dateFnsAddDays(maxD, diffToSunday);

    const dates = getDatesInRange(formatDate(minD), formatDate(maxD));
    
    // Group into weeks
    const weeksList: { label: string; span: number }[] = [];
    let currentWeekSpan = 0;
    let weekCounter = 1;

    dates.forEach((dateStr, index) => {
      currentWeekSpan++;
      const d = parseDate(dateStr);
      // If Sunday or last date, flush week
      if (d.getDay() === 0 || index === dates.length - 1) {
        weeksList.push({ label: `Week ${weekCounter++}`, span: currentWeekSpan });
        currentWeekSpan = 0;
      }
    });

    return { 
      timelineDates: dates, 
      weeks: weeksList,
      minDate: minD,
      totalDays: dates.length
    };
  }, [activities, project]);

  // Group activities by category
  const categories = useMemo(() => {
    const grouped = new Map<string, WorkflowActivity[]>();
    activities.forEach(a => {
      const cat = a.category || 'Uncategorized';
      if (!grouped.has(cat)) grouped.set(cat, []);
      grouped.get(cat)!.push(a);
    });
    
    // Sort activities by start date within categories
    for (const acts of grouped.values()) {
      acts.sort((a, b) => parseDate(a.startDate).getTime() - parseDate(b.startDate).getTime());
    }

    // Return as array sorted by category name
    return Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [activities]);

  if (!project) return null;

  const handleEditActivity = (activity: WorkflowActivity) => {
    setSelectedActivity(activity);
    setIsFormOpen(true);
  };

  const handleAddActivity = () => {
    setSelectedActivity(null);
    setIsFormOpen(true);
  };

  const headerRef = useRef<HTMLDivElement>(null);
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (headerRef.current) {
      headerRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  // By using exact pixels instead of 1fr, we prevent the max-content of the text from overriding the zoom level
  const columnTemplate = `repeat(${totalDays}, ${zoomLevel}px)`;

  return (
    <div className={styles.container}>
      <div className={styles.stickyContainer}>
        <div style={{ padding: '16px 24px 0 24px', backgroundColor: 'var(--color-surface)' }}>
          <Button variant="secondary" onClick={onBack}>&larr; Back to Profile</Button>
        </div>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <h2 className={styles.projectName}>
              <span style={{ display: 'inline-block', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: project.colour, marginRight: '8px' }}></span>
              {getProjectDisplayName(project, state.clients)}
            </h2>
            {clientName && <p className={styles.projectClient}>Client: {clientName}</p>}
            <p className={styles.projectTitle}>Weekly Workflow</p>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Plan and visualize project phases over time.</p>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.zoomControl}>
              <span className={styles.zoomIcon}>🔍</span>
              <input 
                type="range" 
                min="3" 
                max="100" 
                value={zoomLevel} 
                onChange={e => setZoomLevel(Number(e.target.value))} 
                className={styles.zoomSlider}
                title="Zoom Timeline"
              />
            </div>
            <Button variant="primary" onClick={handleAddActivity}>+ Add Activity</Button>
          </div>
        </header>
      </div>

      {activities.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>📊</div>
          <h3>No workflow activities yet</h3>
          <p>Add your first activity to start planning the project workflow phases.</p>
          <Button variant="primary" onClick={handleAddActivity}>+ Add Activity</Button>
        </div>
      ) : (
        <div className={styles.timelineWrapper}>
          <div className={styles.timelineContainer}>
            
            <div style={{ position: 'sticky', top: 0, zIndex: 10, borderBottom: '2px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md) var(--radius-md) 0 0' }}>
              <div ref={headerRef} style={{ overflowX: 'hidden' }}>
                <div className={styles.timelineHeader} style={{ borderBottom: 'none', borderRadius: '0' }}>
                  <div className={styles.weeksRow} style={{ gridTemplateColumns: columnTemplate }}>
                    {weeks.map((w, i) => (
                      <div key={i} className={styles.weekCell} style={{ gridColumn: `span ${w.span}` }}>
                        {w.label}
                      </div>
                    ))}
                  </div>
                  
                  <div className={styles.daysRow} style={{ gridTemplateColumns: columnTemplate }}>
                    {timelineDates.map(dateStr => {
                      const d = parseDate(dateStr);
                      const isWknd = isWeekend(d);
                      const isTd = isToday(d);
                      return (
                        <div key={dateStr} className={`${styles.dayCell} ${isWknd ? styles.dayCellWeekend : ''}`}>
                          <span className={`${styles.dayName} ${isTd ? styles.dayToday : ''}`}>{formatDayShort(d)}</span>
                          <span className={`${styles.dayDate} ${isTd ? styles.dayToday : ''}`}>{formatDayNum(d)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div onScroll={handleScroll} style={{ overflowX: 'auto', backgroundColor: 'var(--color-surface)' }}>
              <div className={styles.timelineBody}>
                {categories.map(([category, acts]) => (
                  <React.Fragment key={category}>
                    {acts.map(activity => {
                      const actStart = parseDate(activity.startDate);
                      const actEnd = parseDate(activity.endDate);
                      
                      // Grid coordinates (1-indexed)
                      const startCol = differenceInDays(actStart, minDate) + 1;
                      const endCol = differenceInDays(actEnd, minDate) + 2; // +1 for difference, +1 for exclusive grid end

                      // Clamp to visible grid if outside
                      const clampedStartCol = Math.max(1, startCol);
                      const clampedEndCol = Math.min(totalDays + 1, endCol);

                      return (
                        <div key={activity.id} className={styles.activityRow}>
                          
                          {/* Background Grid Lines */}
                          <div className={styles.gridLines} style={{ gridTemplateColumns: columnTemplate }}>
                            {timelineDates.map((dateStr, i) => {
                              const isWknd = isWeekend(parseDate(dateStr));
                              return <div key={i} className={`${styles.gridLine} ${isWknd ? styles.gridLineWeekend : ''}`} />
                            })}
                          </div>
                          
                          {/* Actual Activity Block */}
                          <div className={styles.activityBlockContainer} style={{ gridTemplateColumns: columnTemplate }}>
                            <div 
                              className={styles.activityBlock}
                              style={{ 
                                gridColumn: `${clampedStartCol} / ${clampedEndCol}`,
                                backgroundColor: getCategoryColor(activity.category || 'Uncategorized')
                              }}
                              onClick={() => handleEditActivity(activity)}
                              title={`${activity.category || 'Uncategorized'}: ${activity.name}\n${activity.startDate} to ${activity.endDate}${activity.notes ? '\n\n' + activity.notes : ''}`}
                            >
                              {activity.name}
                            </div>
                          </div>

                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      <WorkflowActivityForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        activity={selectedActivity}
        projectId={projectId}
      />
    </div>
  );
}
