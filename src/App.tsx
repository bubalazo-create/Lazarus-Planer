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

import InvoiceImportView from './views/InvoiceImportView/InvoiceImportView';

type ViewType = 'home' | 'workers' | 'projects' | 'clients' | 'finances' | 'expenses' | 'calendar' | 'settings' | 'import-centre';

function App() {
  const [activeView, setActiveView] = useState<ViewType>('home');
  const [viewParams, setViewParams] = useState<any>({});
  const [navTick, setNavTick] = useState(0);

  const handleNavigate = (view: ViewType, params?: any) => {
    setActiveView(view);
    setNavTick(t => t + 1);
    if (params) {
      setViewParams(params);
    } else {
      setViewParams({});
    }
  };

  const renderView = () => {
    switch (activeView) {
      case 'home':
        return <HomeView key={navTick} onNavigate={handleNavigate} />;
      case 'workers':
        return <WorkersListView key={navTick} initialWorkerId={viewParams?.workerId} onClearInitial={() => setViewParams({})} />;
      case 'projects':
        return <ProjectsListView key={navTick} initialProjectId={viewParams?.projectId} onClearInitial={() => setViewParams({})} />;
      case 'clients':
        return <ClientsView key={navTick} />;
      case 'finances':
        return <FinancialOverviewView key={navTick} />;
      case 'expenses':
        return <ExpensesView key={navTick} />;
      case 'calendar':
        return <CalendarHubView key={navTick} />;
      case 'settings':
        return <SettingsView key={navTick} />;
      case 'import-centre':
        return <InvoiceImportView key={navTick} />;
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
