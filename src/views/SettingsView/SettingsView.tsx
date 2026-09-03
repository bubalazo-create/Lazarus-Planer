import React, { useState, useRef, useEffect } from 'react';
import styles from './SettingsView.module.css';
import { backupService, BackupData } from '../../services/backup';
import { format, parseISO } from 'date-fns';

export default function SettingsView() {
  const [history, setHistory] = useState<BackupData[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Import backup state
  const [previewBackup, setPreviewBackup] = useState<BackupData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Clear data state
  const [clearState, setClearState] = useState<'idle' | 'confirm1' | 'confirm2'>('idle');
  const [deleteInput, setDeleteInput] = useState('');

  // Theme state
  const [isDarkTheme, setIsDarkTheme] = useState(() => document.body.classList.contains('dark-theme'));

  const toggleTheme = () => {
    if (isDarkTheme) {
      document.body.classList.remove('dark-theme');
      localStorage.setItem('lazarus_theme', 'light');
      setIsDarkTheme(false);
    } else {
      document.body.classList.add('dark-theme');
      localStorage.setItem('lazarus_theme', 'dark');
      setIsDarkTheme(true);
    }
  };


  useEffect(() => {
    setHistory(backupService.getBackupHistory());
  }, []);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setError(null);
    setTimeout(() => setMessage(null), 5000);
  };

  const showError = (err: string) => {
    setError(err);
    setMessage(null);
    setTimeout(() => setError(null), 8000);
  };

  const handleBackupNow = () => {
    try {
      backupService.createAutoBackup();
      setHistory(backupService.getBackupHistory());
      showMessage('Backup created successfully. ' + format(new Date(), 'HH:mm:ss'));
    } catch (e: any) {
      showError(e.message || 'Failed to create backup.');
    }
  };

  const handleExport = () => {
    try {
      backupService.exportBackup();
    } catch (e: any) {
      showError('Failed to export backup.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonStr = event.target?.result as string;
        const backup = JSON.parse(jsonStr);
        if (backupService.validateBackup(backup)) {
          setPreviewBackup(backup);
        } else {
          showError('Invalid Lazarus backup file.');
        }
      } catch (err) {
        showError('Invalid Lazarus backup file.');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset
  };

  const handleRestore = (backup: BackupData) => {
    try {
      if (backupService.restoreBackup(backup)) {
        alert('Backup restored successfully.');
        window.location.reload();
      }
    } catch (e: any) {
      showError(e.message || 'Failed to restore backup.');
    }
  };

  const handleClearContinue = () => {
    try {
      // 1. Create local auto backup as convenience
      backupService.createAutoBackup();
      setHistory(backupService.getBackupHistory());
      
      // 2. Trigger the file download
      backupService.exportBackup('lazarus_pre_delete_backup');
      
      setClearState('confirm2');
    } catch (e) {
      showError('Backup could not be created. No data was deleted.');
      setClearState('idle');
    }
  };

  const handleFinalDelete = () => {
    if (deleteInput === 'DELETE') {
      backupService.clearAllData();
      alert('All application data has been deleted.');
      window.location.reload();
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2>Settings</h2>
      </header>
      
      {message && <div className={styles.successMessage}>{message}</div>}
      {error && <div className={styles.errorMessage}>{error}</div>}

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Appearance</h3>
        <div className={styles.settingRow}>
          <div>
            <h4>Dark Theme</h4>
            <p className={styles.helpText}>Toggle dark mode for the application.</p>
          </div>
          <button 
            className={isDarkTheme ? styles.toggleActive : styles.toggleInactive}
            onClick={toggleTheme}
          >
            {isDarkTheme ? 'Enabled' : 'Disabled'}
          </button>
        </div>
      </div>


      {/* IMPORT PREVIEW MODAL */}
      {previewBackup && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.previewTitle}>BACKUP FOUND</h3>
            <p className={styles.previewMeta}>
              Created: <br/>
              <strong>{format(parseISO(previewBackup.createdAt), 'dd MMM yyyy HH:mm')}</strong>
            </p>
            
            <div className={styles.previewStats}>
              <div className={styles.statRow}><span>Workers:</span> <span>{previewBackup.counts?.['lazarus_workers'] || 0}</span></div>
              <div className={styles.statRow}><span>Projects:</span> <span>{previewBackup.counts?.['lazarus_projects'] || 0}</span></div>
              <div className={styles.statRow}><span>Clients:</span> <span>{previewBackup.counts?.['lazarus_clients'] || 0}</span></div>
              <div className={styles.statRow}><span>Assignments:</span> <span>{previewBackup.counts?.['lazarus_assignments'] || 0}</span></div>
              <div className={styles.statRow}><span>Worker Earnings:</span> <span>{previewBackup.counts?.['lazarus_worker_earnings'] || 0}</span></div>
              <div className={styles.statRow}><span>Worker Payments:</span> <span>{previewBackup.counts?.['lazarus_worker_payments'] || 0}</span></div>
              <div className={styles.statRow}><span>Project Client Payments:</span> <span>{previewBackup.counts?.['lazarus_project_client_payments'] || 0}</span></div>
              <div className={styles.statRow}><span>Subcontractor Invoices:</span> <span>{previewBackup.counts?.['lazarus_subcontractor_invoices'] || 0}</span></div>
              <div className={styles.statRow}><span>Invoice Allocations:</span> <span>{previewBackup.counts?.['lazarus_subcontractor_invoice_allocations'] || 0}</span></div>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.btnSecondary} onClick={() => setPreviewBackup(null)}>Cancel</button>
              <button className={styles.btnPrimary} onClick={() => handleRestore(previewBackup)}>Restore Backup</button>
            </div>
          </div>
        </div>
      )}

      {/* DATA & BACKUP */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>DATA & BACKUP</h3>
        <div className={styles.card}>
          <div className={styles.backupActions}>
            <div className={styles.backupInfo}>
              <span className={styles.label}>Last automatic backup:</span>
              <span className={styles.value}>
                {history.length > 0 ? format(parseISO(history[0].createdAt), 'dd MMM yyyy, HH:mm') : 'None'}
              </span>
            </div>
            <div className={styles.btnGroup}>
              <button className={styles.btnSecondary} onClick={handleBackupNow}>Backup Now</button>
              <button className={styles.btnSecondary} onClick={() => handleExport()}>Export Backup</button>
              <button className={styles.btnSecondary} onClick={() => fileInputRef.current?.click()}>Import Backup</button>
              <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".json" onChange={handleFileChange} />
            </div>
          </div>

          <div className={styles.historySection}>
            <h4>Local Backup History (Browser Storage)</h4>
            <p className={styles.subtext}>
              {history.length} backup(s) available<br/>
              <span className={styles.warningSubtext}>Local backups are stored inside your browser. They will be permanently lost if browser data is cleared. Use Export Backup regularly to keep a safe copy outside the browser.</span>
            </p>
            
            <div className={styles.historyList}>
              {history.map((h, i) => (
                <div key={i} className={styles.historyItem}>
                  <div>
                    <div className={styles.historyTime}>{format(parseISO(h.createdAt), 'dd MMM yyyy HH:mm')}</div>
                    <div className={styles.historyStats}>
                      Workers {h.counts?.['lazarus_workers'] || 0} &middot; Projects {h.counts?.['lazarus_projects'] || 0} &middot; Clients {h.counts?.['lazarus_clients'] || 0}
                    </div>
                  </div>
                  <button className={styles.btnSmall} onClick={() => handleRestore(h)}>Restore</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* DANGER ZONE */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitleDanger}>DANGER ZONE</h3>
        <div className={styles.dangerCard}>
          {clearState === 'idle' && (
            <button className={styles.btnDanger} onClick={() => setClearState('confirm1')}>Clear All Data</button>
          )}

          {clearState === 'confirm1' && (
            <div className={styles.dangerPrompt}>
              <h4>⚠️ DELETE ALL DATA</h4>
              <p>This will permanently delete all Lazarus data stored on this device.</p>
              <p>This includes:<br/>Workers<br/>Projects<br/>Clients<br/>Assignments<br/>Earnings<br/>Payments<br/>Invoices<br/>Financial records</p>
              <div className={styles.modalActions}>
                <button className={styles.btnSecondary} onClick={() => setClearState('idle')}>Cancel</button>
                <button className={styles.btnDanger} onClick={handleClearContinue}>Continue</button>
              </div>
            </div>
          )}

          {clearState === 'confirm2' && (
            <div className={styles.dangerPrompt}>
              <h4>FINAL CONFIRMATION</h4>
              <p className={styles.successText}>A backup has been created successfully.</p>
              <p>All current application data will now be deleted.</p>
              <p>To continue, type: <strong>DELETE</strong></p>
              <input 
                type="text" 
                className={styles.deleteInput}
                value={deleteInput}
                onChange={e => setDeleteInput(e.target.value)}
                placeholder="DELETE"
              />
              <div className={styles.modalActions}>
                <button className={styles.btnSecondary} onClick={() => { setClearState('idle'); setDeleteInput(''); }}>Cancel</button>
                <button 
                  className={styles.btnDanger} 
                  onClick={handleFinalDelete}
                  disabled={deleteInput !== 'DELETE'}
                >
                  Delete Everything
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
