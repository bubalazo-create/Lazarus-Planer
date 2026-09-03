import React, { useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAppContext } from '../../context/AppContext';
import Button from '../../components/common/Button';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ClientForm from '../../components/Forms/ClientForm';
import ClientDetailsView from './ClientDetailsView';
import ProjectProfileView from '../ProjectProfileView/ProjectProfileView';
import { getProjectDisplayName } from '../../utils/projectUtils';
import { Client, Project } from '../../models/types';
import styles from './ClientsView.module.css';

const ClientsView: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [viewType, setViewType] = useState<'regular' | 'one-off'>('regular');
  
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  const [selectedClientForDetails, setSelectedClientForDetails] = useState<string | null>(null);
  const [selectedProjectForSchedule, setSelectedProjectForSchedule] = useState<string | null>(null);

  const handleAddClient = () => {
    setSelectedClient(null);
    setIsFormOpen(true);
  };

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (client: Client) => {
    setClientToDelete(client);
  };

  const confirmDelete = () => {
    if (clientToDelete) {
      const linkedProjects = state.projects.filter(p => p.clientId === clientToDelete.id);
      
      linkedProjects.forEach(p => {
        dispatch({ type: 'UPDATE_PROJECT', project: { ...p, clientId: undefined } });
      });

      dispatch({ type: 'DELETE_CLIENT', id: clientToDelete.id });
      setClientToDelete(null);
    }
  };

  const handleConvertOneOff = (clientName: string) => {
    const newClientId = uuidv4();
    dispatch({ 
      type: 'ADD_CLIENT', 
      client: { 
        id: newClientId, 
        name: clientName,
        createdAt: new Date().toISOString()
      } 
    });
    
    state.projects.forEach(p => {
      if (!p.clientId && p.client === clientName) {
        dispatch({
          type: 'UPDATE_PROJECT',
          project: {
            ...p,
            clientId: newClientId,
            client: ''
          }
        });
      }
    });
    
    // Switch view back to regular to see the newly converted client
    setViewType('regular');
  };

  const toggleMenu = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setActiveMenuId(prev => prev === id ? null : id);
  };

  const oneOffClients = useMemo(() => {
    const clientsMap = new Map<string, Project[]>();
    state.projects.forEach(p => {
      if (!p.clientId && p.client && p.client.trim() !== '') {
        const clientName = p.client.trim();
        if (!clientsMap.has(clientName)) {
          clientsMap.set(clientName, []);
        }
        clientsMap.get(clientName)!.push(p);
      }
    });
    return Array.from(clientsMap.entries()).map(([name, projects]) => ({ name, projects }));
  }, [state.projects]);

  if (selectedProjectForSchedule) {
    return (
      <ProjectProfileView 
        projectId={selectedProjectForSchedule} 
        onBack={() => setSelectedProjectForSchedule(null)} 
      />
    );
  }

  if (selectedClientForDetails) {
    return (
      <ClientDetailsView
        clientId={selectedClientForDetails}
        onBack={() => setSelectedClientForDetails(null)}
        onProjectClick={(projectId) => setSelectedProjectForSchedule(projectId)}
      />
    );
  }

  const getClientProjects = (clientId: string) => {
    const projects = state.projects.filter(p => p.clientId === clientId);
    const active = projects.filter(p => p.status === 'Active' || p.status === 'On Hold');
    const completed = projects.filter(p => p.status === 'Completed');
    return { active, completed };
  };

  const clientToDeleteProjectsCount = clientToDelete ? state.projects.filter(p => p.clientId === clientToDelete.id).length : 0;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Clients</h1>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div className={styles.tabContainer}>
            <button 
              className={`${styles.tab} ${viewType === 'regular' ? styles.activeTab : ''}`}
              onClick={() => setViewType('regular')}
            >
              Regular Clients
            </button>
            <button 
              className={`${styles.tab} ${viewType === 'one-off' ? styles.activeTab : ''}`}
              onClick={() => setViewType('one-off')}
            >
              One-off Clients
            </button>
          </div>
          {viewType === 'regular' && (
            <Button variant="primary" onClick={handleAddClient}>+ Add Client</Button>
          )}
        </div>
      </header>

      {viewType === 'regular' ? (
        state.clients.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No clients found. Add your first client to get started.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {state.clients.map(client => {
              const { active, completed } = getClientProjects(client.id);
              return (
                <div key={client.id} className={styles.card} onClick={() => setSelectedClientForDetails(client.id)} style={{ cursor: 'pointer' }}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.clientName}>{client.name}</h3>
                    <div className={styles.menuContainer} onClick={e => e.stopPropagation()}>
                      <button className={styles.menuButton} onClick={(e) => toggleMenu(e, client.id)}>
                        ...
                      </button>
                      {activeMenuId === client.id && (
                        <div className={styles.dropdownMenu}>
                          <button onClick={() => { setActiveMenuId(null); handleEditClient(client); }}>Edit Client</button>
                          <button className={styles.dangerButton} onClick={() => { setActiveMenuId(null); handleDeleteClick(client); }}>Delete</button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className={styles.cardBody}>
                    {client.vatNumber && (
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>VAT No:</span>
                        <span>{client.vatNumber}</span>
                      </div>
                    )}
                    {client.email && (
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Email:</span>
                        <span>{client.email}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Phone:</span>
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {client.address && (
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Address:</span>
                        <span>{client.address}</span>
                      </div>
                    )}

                    <div className={styles.projectSummary}>
                      <h4 className={styles.summaryTitle}>PROJECTS</h4>
                      <div className={styles.summaryStats}>
                        <span>{active.length} Active</span>
                        <span>{completed.length} Completed</span>
                      </div>
                      {active.length > 0 && (
                        <div className={styles.summaryList}>
                          <span className={styles.summaryListHeader}>Active</span>
                          {active.map(p => <div key={p.id} className={styles.summaryItem}>• {getProjectDisplayName(p, state.clients)}</div>)}
                        </div>
                      )}
                      {completed.length > 0 && (
                        <div className={styles.summaryList}>
                          <span className={styles.summaryListHeader}>Completed</span>
                          {completed.map(p => <div key={p.id} className={styles.summaryItem}>• {getProjectDisplayName(p, state.clients)}</div>)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        oneOffClients.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No one-off clients found. Enter a manual client name when creating a project to see them here.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {oneOffClients.map((client, idx) => {
              const active = client.projects.filter(p => p.status === 'Active' || p.status === 'On Hold');
              const completed = client.projects.filter(p => p.status === 'Completed');
              return (
                <div key={idx} className={styles.card} style={{ cursor: 'default' }}>
                  <div className={styles.cardHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 className={styles.clientName}>{client.name}</h3>
                    <Button 
                      variant="secondary" 
                      onClick={() => handleConvertOneOff(client.name)}
                      style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                    >
                      Convert to Regular
                    </Button>
                  </div>
                  <div className={styles.cardBody}>
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Type:</span>
                      <span>One-off Project Client</span>
                    </div>
                    <div className={styles.projectSummary}>
                      <h4 className={styles.summaryTitle}>PROJECTS</h4>
                      <div className={styles.summaryStats}>
                        <span>{active.length} Active</span>
                        <span>{completed.length} Completed</span>
                      </div>
                      {active.length > 0 && (
                        <div className={styles.summaryList}>
                          <span className={styles.summaryListHeader}>Active</span>
                          {active.map(p => <div key={p.id} className={styles.summaryItem} onClick={() => setSelectedProjectForSchedule(p.id)} style={{ cursor: 'pointer', color: 'var(--color-accent)' }}>• {getProjectDisplayName(p, state.clients)} ({p.address || 'No location'})</div>)}
                        </div>
                      )}
                      {completed.length > 0 && (
                        <div className={styles.summaryList}>
                          <span className={styles.summaryListHeader}>Completed</span>
                          {completed.map(p => <div key={p.id} className={styles.summaryItem} onClick={() => setSelectedProjectForSchedule(p.id)} style={{ cursor: 'pointer', color: 'var(--color-accent)' }}>• {getProjectDisplayName(p, state.clients)} ({p.address || 'No location'})</div>)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {isFormOpen && (
        <ClientForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          client={selectedClient}
        />
      )}

      <ConfirmDialog
        isOpen={!!clientToDelete}
        title="Delete Client"
        message={
          clientToDeleteProjectsCount > 0
            ? `This client is linked to ${clientToDeleteProjectsCount} projects. Are you sure you want to delete "${clientToDelete?.name}"?`
            : `Are you sure you want to delete "${clientToDelete?.name}"? This action cannot be undone.`
        }
        onConfirm={confirmDelete}
        onCancel={() => setClientToDelete(null)}
        confirmText={clientToDeleteProjectsCount > 0 ? "Remove Client Link & Delete Client" : "Delete"}
        variant="danger"
      />
    </div>
  );
};

export default ClientsView;
