import { useState } from 'react';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout/Layout';
import HomeView from './views/HomeView/HomeView';
import WorkersListView from './views/WorkersView/WorkersListView';
import ProjectsListView from './views/ProjectsView/ProjectsListView';
import CalendarHubView from './views/CalendarHubView/CalendarHubView';
import ClientsView from './views/ClientsView/ClientsView';
import ExpensesView from './views/ExpensesView/ExpensesView';
import FinancialOverviewView from './views/FinancialOverviewView/FinancialOverviewView';
import SettingsView from './views/SettingsView/SettingsView';

type ViewType = 'home' | 'workers' | 'projects' | 'clients' | 'finances' | 'expenses' | 'calendar' | 'settings';

function App() {
  const [activeView, setActiveView] = useState<ViewType>('home');
  const [viewParams, setViewParams] = useState<any>({});

  const handleNavigate = (view: ViewType, params?: any) => {
    setActiveView(view);
    if (params) {
      setViewParams(params);
    } else {
      setViewParams({});
    }
  };

  const renderView = () => {
    switch (activeView) {
      case 'home':
        return <HomeView onNavigate={handleNavigate} />;
      case 'workers':
        return <WorkersListView initialWorkerId={viewParams?.workerId} onClearInitial={() => setViewParams({})} />;
      case 'projects':
        return <ProjectsListView initialProjectId={viewParams?.projectId} onClearInitial={() => setViewParams({})} />;
      case 'clients':
        return <ClientsView />;
      case 'finances':
        return <FinancialOverviewView />;
      case 'expenses':
        return <ExpensesView />;
      case 'calendar':
        return <CalendarHubView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <HomeView onNavigate={handleNavigate} />;
    }
  };

  return (
    <AppProvider>
      <Layout activeView={activeView} onViewChange={(v) => handleNavigate(v as ViewType)}>
        {renderView()}
      </Layout>
    </AppProvider>
  );
}

export default App;
