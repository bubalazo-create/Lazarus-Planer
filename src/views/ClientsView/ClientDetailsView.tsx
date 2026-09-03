import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { getProjectDisplayName } from '../../utils/projectUtils';
import Button from '../../components/common/Button';
import styles from './ClientDetailsView.module.css';

interface ClientDetailsViewProps {
  clientId: string;
  onBack: () => void;
  onProjectClick: (projectId: string) => void;
}

const ClientDetailsView: React.FC<ClientDetailsViewProps> = ({ clientId, onBack, onProjectClick }) => {
  const { state } = useAppContext();
  const client = state.clients.find(c => c.id === clientId);

  if (!client) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <Button variant="secondary" onClick={onBack}>&larr; Back to Clients</Button>
          <h2>Client not found</h2>
        </header>
      </div>
    );
  }

  const clientProjects = state.projects.filter(p => p.clientId === client.id);
  const activeProjects = clientProjects.filter(p => p.status === 'Active' || p.status === 'On Hold');
  const completedProjects = clientProjects.filter(p => p.status === 'Completed');
  
  const clientProjectIds = clientProjects.map(p => p.id);
  const clientInvoices = state.clientInvoices
    .filter(i => clientProjectIds.includes(i.projectId))
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Button variant="secondary" onClick={onBack}>&larr; Back to Clients</Button>
      </header>

      <div className={styles.content}>
        <div className={styles.detailsCard}>
          <h2 className={styles.clientName}>{client.name}</h2>
          
          <div className={styles.infoList}>
            {client.vatNumber && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>VAT No:</span>
                <span>{client.vatNumber}</span>
              </div>
            )}
            {client.contactPerson && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Contact Person:</span>
                <span>{client.contactPerson}</span>
              </div>
            )}
            {client.phone && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Phone:</span>
                <span>{client.phone}</span>
              </div>
            )}
            {client.email && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Email:</span>
                <span>{client.email}</span>
              </div>
            )}
            {client.address && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Address:</span>
                <span>{client.address}</span>
              </div>
            )}
            {client.notes && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Notes:</span>
                <span>{client.notes}</span>
              </div>
            )}
          </div>
        </div>

        <div className={styles.projectsSection}>
          <h3 className={styles.sectionTitle}>ACTIVE PROJECTS</h3>
          {activeProjects.length === 0 ? (
            <p className={styles.emptyText}>No active projects.</p>
          ) : (
            <div className={styles.projectList}>
              {activeProjects.map(p => (
                <div key={p.id} className={styles.projectItem} onClick={() => onProjectClick(p.id)}>
                  <div className={styles.projectColor} style={{ backgroundColor: p.colour }} />
                  <span>{getProjectDisplayName(p, state.clients)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.projectsSection}>
          <h3 className={styles.sectionTitle}>CLIENT INVOICES</h3>
          {clientInvoices.length === 0 ? (
            <p className={styles.emptyText}>No invoices recorded.</p>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Invoice #</th>
                    <th>Project/Object</th>
                    <th style={{ textAlign: 'right' }}>Net</th>
                    <th style={{ textAlign: 'right' }}>VAT</th>
                    <th style={{ textAlign: 'right' }}>Gross</th>
                    <th style={{ textAlign: 'right' }}>Paid</th>
                    <th style={{ textAlign: 'right' }}>Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {clientInvoices.map(inv => {
                    const project = clientProjects.find(p => p.id === inv.projectId);
                    const projectName = project ? getProjectDisplayName(project, state.clients) : 'Unknown';
                    const paidSoFar = state.projectClientPayments
                      .filter(p => p.invoiceId === inv.id)
                      .reduce((sum, p) => sum + p.amount, 0);
                    const gross = (inv.grossAmount || (inv as any).amount || 0);
                    const rem = gross - paidSoFar;
                    return (
                      <tr key={inv.id}>
                        <td>{new Date(inv.date).toLocaleDateString('en-GB')}</td>
                        <td>{inv.invoiceNumber || '-'}</td>
                        <td>{projectName}</td>
                        <td style={{ textAlign: 'right' }}>€{(inv.netAmount || 0).toFixed(2)}</td>
                        <td style={{ textAlign: 'right' }} title={`${(inv.vatRate || 0)}%`}>€{(inv.vatAmount || 0).toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>€{gross.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', color: 'var(--color-success)' }}>€{paidSoFar.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', color: rem > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>€{rem.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className={styles.projectsSection}>
          <h3 className={styles.sectionTitle}>COMPLETED PROJECTS</h3>
          {completedProjects.length === 0 ? (
            <p className={styles.emptyText}>No completed projects.</p>
          ) : (
            <div className={styles.projectList}>
              {completedProjects.map(p => (
                <div key={p.id} className={styles.projectItem} onClick={() => onProjectClick(p.id)}>
                  <div className={styles.projectColor} style={{ backgroundColor: p.colour }} />
                  <span>{getProjectDisplayName(p, state.clients)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientDetailsView;
