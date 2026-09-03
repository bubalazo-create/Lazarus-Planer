import React, { useState } from 'react';
import WeeklyWorkersView from './WeeklyWorkersView';
import WeeklyProjectsView from './WeeklyProjectsView';
import MonthView from '../MonthView/MonthView';
import styles from './CalendarHubView.module.css';

type ViewMode = 'weekly' | 'monthly';
type WeeklyMode = 'workers' | 'projects';

const CalendarHubView: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [weeklyMode, setWeeklyMode] = useState<WeeklyMode>('workers');
  const [monthlyMode, setMonthlyMode] = useState<'workers' | 'projects'>('workers');

  return (
    <div className={styles.container}>
      <div className={styles.topNavigation}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${viewMode === 'weekly' ? styles.activeTab : ''}`}
            onClick={() => setViewMode('weekly')}
          >
            Weekly
          </button>
          <button
            className={`${styles.tab} ${viewMode === 'monthly' ? styles.activeTab : ''}`}
            onClick={() => setViewMode('monthly')}
          >
            Monthly
          </button>
        </div>

        {viewMode === 'weekly' && (
          <div className={styles.subTabs}>
            <button
              className={`${styles.subTab} ${weeklyMode === 'workers' ? styles.activeSubTab : ''}`}
              onClick={() => setWeeklyMode('workers')}
            >
              Workers
            </button>
            <button
              className={`${styles.subTab} ${weeklyMode === 'projects' ? styles.activeSubTab : ''}`}
              onClick={() => setWeeklyMode('projects')}
            >
              Projects
            </button>
          </div>
        )}

        {viewMode === 'monthly' && (
          <div className={styles.subTabs}>
            <button
              className={`${styles.subTab} ${monthlyMode === 'workers' ? styles.activeSubTab : ''}`}
              onClick={() => setMonthlyMode('workers')}
            >
              Workers
            </button>
            <button
              className={`${styles.subTab} ${monthlyMode === 'projects' ? styles.activeSubTab : ''}`}
              onClick={() => setMonthlyMode('projects')}
            >
              Projects
            </button>
          </div>
        )}
      </div>

      <div className={styles.content}>
        {viewMode === 'monthly' && <MonthView mode={monthlyMode} />}
        {viewMode === 'weekly' && weeklyMode === 'workers' && <WeeklyWorkersView />}
        {viewMode === 'weekly' && weeklyMode === 'projects' && <WeeklyProjectsView />}
      </div>
    </div>
  );
};

export default CalendarHubView;
