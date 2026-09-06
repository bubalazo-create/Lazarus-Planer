import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { getProjectDisplayName } from '../../utils/projectUtils';
import styles from './HomeView.module.css';
import Button from '../../components/common/Button';
import AssignmentForm from '../../components/Forms/AssignmentForm';
import WorkerForm from '../../components/Forms/WorkerForm';
import ProjectForm from '../../components/Forms/ProjectForm';
import { formatMonthYear, formatDate } from '../../utils/dateUtils';
import { fetchMaltaWeather, WeatherData } from '../../services/weather';

interface HomeViewProps {
  onNavigate: (view: 'workers' | 'projects' | 'clients' | 'calendar', params?: any) => void;
}

const WeatherWidget = () => {
  const [now, setNow] = useState(new Date());
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherError, setWeatherError] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchMaltaWeather()
      .then(data => setWeather(data))
      .catch(() => setWeatherError(true));
  }, []);

  return (
    <div className={styles.weatherCard}>
       <div className={styles.weatherCol}>
          <div className={styles.weatherTopLabel}>TODAY</div>
          <div className={styles.weatherDate}>
             {now.toLocaleDateString('en-US', { weekday: 'long' })}<br/>
             {now.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <div className={styles.weatherTime}>
             {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
          </div>
          <div className={styles.weatherLocation}>Malta</div>
       </div>
       
       <div className={styles.weatherCol}>
         {weatherError ? (
            <div>Weather unavailable</div>
         ) : !weather ? (
            <div>Loading...</div>
         ) : (
            <>
              <div className={styles.weatherMain}>
                 <span className={styles.weatherTemp}>{weather.current.temp}В°C</span>
                 <span className={styles.weatherIcon}>{weather.current.icon}</span>
              </div>
              <div className={styles.weatherCondition}>{weather.current.condition}</div>
              <div className={styles.weatherDetails}>
                Feels like {weather.current.feelsLike}В°C<br/>
                Wind {weather.current.windSpeed} km/h
              </div>
            </>
         )}
       </div>

       <div className={styles.weatherCol}>
         {weather && weather.forecast.map((f, i) => (
            <div key={i} className={styles.forecastItem}>
              <div>{f.day}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {f.maxTemp}В°C <span>{f.icon}</span>
              </div>
            </div>
         ))}
       </div>
    </div>
  );
};

const HomeView: React.FC<HomeViewProps> = ({ onNavigate }) => {
  const { state } = useAppContext();
  
  const [isWorkerFormOpen, setIsWorkerFormOpen] = useState(false);
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
  const [isAssignmentFormOpen, setIsAssignmentFormOpen] = useState(false);

  // Greeting
  const hour = new Date().getHours();
  let greeting = 'Good evening';
  if (hour < 12) greeting = 'Good morning';
  else if (hour < 18) greeting = 'Good afternoon';

  const activeWorkersList = state.workers.filter(w => w.active && w.type !== 'subcontractor');
  const activeProjectsList = state.projects.filter(p => p.status === 'Active' || p.status === 'On Hold');
  
  const displayedWorkers = activeWorkersList.slice(0, 9);
  const remainingWorkers = activeWorkersList.length - 9;
  
  const displayedProjects = activeProjectsList.slice(0, 9);
  const remainingProjects = activeProjectsList.length - 9;

  // Today's assignments
  const todayStr = formatDate(new Date());
  const todayAssignments = useMemo(() => {
    return state.assignments.filter(a => {
      return a.startDate <= todayStr && a.endDate >= todayStr;
    });
  }, [state.assignments, todayStr]);

  const handleAddAssignment = () => setIsAssignmentFormOpen(true);
  const handleAddWorker = () => setIsWorkerFormOpen(true);
  const handleAddProject = () => setIsProjectFormOpen(true);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.greeting}>{greeting}</h1>
        <p className={styles.subtitle}>Here's your schedule at a glance</p>
      </div>

      <div className={styles.dashboardGrid}>
        <div className={styles.dashboardCol}>
          <WeatherWidget />

          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              TODAY
            </div>
            <div className={styles.todayList}>
              {todayAssignments.length > 0 ? (
                todayAssignments.map(assignment => {
                  const worker = state.workers.find(w => w.id === assignment.workerId);
                  const project = state.projects.find(p => p.id === assignment.projectId);
                  
                  if (!worker || !project) return null;

                  const projectDisplayName = getProjectDisplayName(project, state.clients);
                  const clientObj = project.clientId ? state.clients.find(c => c.id === project.clientId) : null;
                  const clientName = assignment.clientName || (clientObj ? clientObj.name : project.client);

                  return (
                    <div key={assignment.id} className={styles.compactAssignmentRow} style={{ borderLeftColor: worker.colour }}>
                       <div className={styles.assignmentWorker}>
                         {worker.name}
                       </div>
                       
                       <div className={styles.assignmentProject}>
                          <div className={styles.assignmentProjectTitle} style={{ color: project.colour }}>
                             {projectDisplayName}
                          </div>
                          {clientName && (
                            <div className={styles.assignmentProjectClient}>{clientName}</div>
                          )}
                       </div>
                       
                       <div className={styles.assignmentTask}>
                          {assignment.title || ''}
                       </div>
                    </div>
                  );
                })
              ) : (
                <div className={styles.emptyState}>
                  No work scheduled for today.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.dashboardCol}>
          <div className={styles.card} onClick={() => onNavigate('projects')}>
            <div className={styles.cardHeaderArea}>
              <h2 className={styles.cardHeader}>PROJECTS</h2>
              <div className={styles.cardStatArea}>
                <p className={styles.cardValue}>{activeProjectsList.length}</p>
                <p className={styles.cardLabel}>Active</p>
              </div>
            </div>
            <div className={styles.cardSubList}>
              {displayedProjects.map(p => (
                <div key={p.id} className={styles.subListItem} style={{ borderLeftColor: p.colour }}>
                  {getProjectDisplayName(p, state.clients)}
                </div>
              ))}
              {remainingProjects > 0 && <div className={styles.subListMore}>+{remainingProjects} more</div>}
            </div>
          </div>

          <div className={styles.card} onClick={() => onNavigate('workers')}>
            <div className={styles.cardHeaderArea}>
              <h2 className={styles.cardHeader}>WORKFORCE</h2>
              <div className={styles.cardStatArea}>
                <p className={styles.cardValue}>{activeWorkersList.length}</p>
                <p className={styles.cardLabel}>Active</p>
              </div>
            </div>
            <div className={styles.cardSubList}>
              {displayedWorkers.map(w => (
                <div key={w.id} className={styles.subListItem} style={{ borderLeftColor: w.colour }}>
                  {w.name}
                </div>
              ))}
              {remainingWorkers > 0 && <div className={styles.subListMore}>+{remainingWorkers} more</div>}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Quick Actions</h2>
        <div className={styles.quickActions}>
          <Button variant="secondary" onClick={handleAddWorker}>+ Add Worker</Button>
          <Button variant="secondary" onClick={handleAddProject}>+ Add Project</Button>
          <Button variant="primary" onClick={handleAddAssignment}>+ Add Assignment</Button>
        </div>
      </div>

      <AssignmentForm
        isOpen={isAssignmentFormOpen}
        onClose={() => setIsAssignmentFormOpen(false)}
      />
      <WorkerForm
        isOpen={isWorkerFormOpen}
        onClose={() => setIsWorkerFormOpen(false)}
      />
      <ProjectForm
        isOpen={isProjectFormOpen}
        onClose={() => setIsProjectFormOpen(false)}
      />
    </div>
  );
};

export default HomeView;

