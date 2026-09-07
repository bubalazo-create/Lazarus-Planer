import React from 'react';
import styles from './Layout.module.css';

export interface LayoutProps {
  children: React.ReactNode;
  activeView: string;
  onViewChange: (view: string) => void;
}

const VIEWS = [
  { id: 'workers', label: 'Workforce', icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></> },
  { id: 'projects', label: 'Projects', icon: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></> },
  { id: 'clients', label: 'Clients', icon: <><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></> },
    { id: 'finances', label: 'Financials', icon: <><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></> },
  { id: 'expenses', label: 'Expenses', icon: <><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></> },
  { id: 'calendar', label: 'Calendar', icon: <><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><rect x="8" y="14" width="2" height="2"></rect></> },
  { id: 'import-centre', label: 'Import', icon: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></> },
  { id: 'settings', label: 'Settings', icon: <><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></> },
];

export default function Layout({ children, activeView, onViewChange }: LayoutProps) {
  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <button 
            className={styles.logoBtn} 
            onClick={() => onViewChange('home')}
            title="Go to Dashboard"
            aria-label="Go to Dashboard"
          >
            <img 
              src={`${import.meta.env.BASE_URL}lazarus-logo.png`} 
              alt="Lazarus Turnkey Contractor" 
              className={styles.brandImage} 
            />
          </button>

          <nav className={styles.desktopNav}>
            {VIEWS.map((view) => (
              <button
                key={view.id}
                className={`${styles.tab} ${activeView === view.id ? styles.activeTab : ''}`}
                onClick={() => onViewChange(view.id)}
              >
                {view.label}
              </button>
            ))}
          </nav>

          <div className={styles.userActions}>
            <div className={styles.avatar}>LC</div>
          </div>
        </div>
      </header>

      <main className={styles.mainContent}>
        {children}
      </main>

      <nav className={styles.mobileNav}>
        {VIEWS.map((view) => (
          <button
            key={view.id}
            className={`${styles.mobileTab} ${activeView === view.id ? styles.activeMobileTab : ''}`}
            onClick={() => onViewChange(view.id)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {view.icon}
            </svg>
            <span>{view.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
