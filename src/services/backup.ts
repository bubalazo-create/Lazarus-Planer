import { format } from 'date-fns';

export const BACKUP_KEYS = [
  'lazarus_workers',
  'lazarus_projects',
  'lazarus_clients',
  'lazarus_assignments',
  'lazarus_worker_earnings',
  'lazarus_worker_payments',
  'lazarus_project_client_payments',
  'lazarus_subcontractor_invoices',
  'lazarus_subcontractor_invoice_allocations'
];

export const HISTORY_KEY = 'lazarus_auto_backups';
export const APP_VERSION = '2.7';
export const BACKUP_VERSION = 1;

export interface BackupData {
  backupVersion: number;
  appVersion: string;
  createdAt: string;
  data: Record<string, any[]>;
  counts?: Record<string, number>;
}

export const backupService = {
  createBackup(): BackupData {
    const data: Record<string, any[]> = {};
    const counts: Record<string, number> = {};

    BACKUP_KEYS.forEach(key => {
      try {
        const item = localStorage.getItem(key);
        const parsed = item ? JSON.parse(item) : [];
        if (Array.isArray(parsed)) {
          data[key] = parsed;
          counts[key] = parsed.length;
        } else {
          data[key] = [];
          counts[key] = 0;
        }
      } catch (e) {
        data[key] = [];
        counts[key] = 0;
      }
    });

    return {
      backupVersion: BACKUP_VERSION,
      appVersion: APP_VERSION,
      createdAt: new Date().toISOString(),
      data,
      counts
    };
  },

  createAutoBackup(): BackupData {
    const backup = this.createBackup();
    
    try {
      const historyStr = localStorage.getItem(HISTORY_KEY);
      let history: BackupData[] = historyStr ? JSON.parse(historyStr) : [];
      
      if (!Array.isArray(history)) history = [];
      history.unshift(backup);
      if (history.length > 2) history = history.slice(0, 2);
      
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.error('Failed to save auto backup to history:', e);
    }

    return backup;
  },

  getBackupHistory(): BackupData[] {
    try {
      const historyStr = localStorage.getItem(HISTORY_KEY);
      const history = historyStr ? JSON.parse(historyStr) : [];
      return Array.isArray(history) ? history : [];
    } catch (e) {
      return [];
    }
  },

  exportBackup(prefix: string = 'lazarus_backup'): void {
    const backup = this.createBackup();
    const jsonStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    const dateStr = format(new Date(), 'yyyy-MM-dd_HHmm');
    a.download = `${prefix}_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  validateBackup(backup: any): boolean {
    if (!backup || typeof backup !== 'object') return false;
    if (typeof backup.backupVersion !== 'number') return false;
    if (!backup.data || typeof backup.data !== 'object') return false;
    
    let validArrays = true;
    for (const key of Object.keys(backup.data)) {
      if (!Array.isArray(backup.data[key])) {
        validArrays = false;
        break;
      }
    }
    return validArrays;
  },

  restoreBackup(backup: BackupData): boolean {
    if (!this.validateBackup(backup)) {
      throw new Error('Invalid Lazarus backup file.');
    }

    try {
      this.createAutoBackup();
    } catch (e) {
      throw new Error('Backup could not be created. Your current data has not been changed.');
    }

    try {
      Object.keys(backup.data).forEach(key => {
        localStorage.setItem(key, JSON.stringify(backup.data[key]));
      });

      BACKUP_KEYS.forEach(key => {
        if (!backup.data[key]) {
          localStorage.setItem(key, '[]');
        }
      });
      
      return true;
    } catch (e) {
      throw new Error('Critical error during restore. Data may be inconsistent.');
    }
  },

  clearAllData(): void {
    BACKUP_KEYS.forEach(key => {
      localStorage.removeItem(key);
    });
  },
  
  runPeriodicBackupIfNeeded(): void {
    const history = this.getBackupHistory();
    if (history.length === 0) {
      this.createAutoBackup();
      return;
    }
    
    const lastBackup = history[0];
    try {
      const lastDate = new Date(lastBackup.createdAt);
      const now = new Date();
      const diffMs = now.getTime() - lastDate.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      
      if (diffHours > 24) {
        this.createAutoBackup();
      }
    } catch (e) {
      this.createAutoBackup();
    }
  }
};
