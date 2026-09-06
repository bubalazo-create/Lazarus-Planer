import React, { useState, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { parsePdfFile, ParsedInvoice } from '../../utils/invoiceParser';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import InvoiceEditModal from './InvoiceEditModal';
import styles from './InvoiceImportView.module.css';
import { v4 as uuidv4 } from 'uuid';
import { Project } from '../../models/types';

export default function InvoiceImportView() {
  const { state, dispatch } = useAppContext();
  const [isParsing, setIsParsing] = useState(false);
  const [parsedFiles, setParsedFiles] = useState<ParsedInvoice[]>([]);
  const [editingInvoice, setEditingInvoice] = useState<ParsedInvoice | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setIsParsing(true);
    const files = Array.from(e.target.files).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    
    const results: ParsedInvoice[] = [];
    for (const file of files) {
      try {
        const parsed = await parsePdfFile(file, state);
        results.push(parsed);
      } catch (err: any) {
        results.push({
          id: uuidv4(),
          filename: file.name,
          status: 'NEEDS REVIEW',
          isLazarus: false,
          isNewClient: false,
          currency: '€',
          errors: [err.message || 'Failed to parse PDF'],
          rawText: ''
        });
      }
    }
    
    setParsedFiles(prev => [...prev, ...results]);
    setIsParsing(false);
    
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NEW': return <Badge status="NEW" />;
      case 'POSSIBLE DUPLICATE': return <Badge status="WARNING - POSSIBLE DUPLICATE" />;
      case 'ALREADY EXISTS': return <Badge status="ERROR - ALREADY EXISTS" />;
      case 'CANCELLED': return <Badge status="HOLD - CANCELLED / REVIEW" />;
      case 'NEEDS REVIEW': return <Badge status="ERROR - NEEDS REVIEW" />;
      case 'IMPORTED': return <Badge status="SUCCESS - IMPORTED" />;
      default: return <Badge status={status} />;
    }
  };

  const handleSaveLocal = (updated: ParsedInvoice) => {
    setParsedFiles(prev => prev.map(inv => inv.id === updated.id ? updated : inv));
    setEditingInvoice(null);
  };

  const handleImportToDatabase = (updated: ParsedInvoice) => {
    let finalClientId = updated.clientId;
    let finalProjectId = updated.projectId;
    
    // Create new client if necessary
    if (updated.clientMode === 'CREATE_NEW' && updated.clientName) {
      finalClientId = uuidv4();
      dispatch({
        type: 'ADD_CLIENT',
        client: {
          id: finalClientId,
          name: updated.clientName,
          vatNumber: updated.clientVat,
        }
      });
    }

    // Create new project if necessary
    if (updated.projectMode === 'CREATE_NEW' && updated.newProjectData) {
      finalProjectId = uuidv4();
      const newProject: Project = {
        id: finalProjectId,
        name: updated.newProjectData.name,
        clientId: finalClientId,
        client: updated.clientName || 'Unknown Client',
        address: updated.newProjectData.address,
        startDate: updated.newProjectData.startDate,
        targetEndDate: updated.newProjectData.targetEndDate,
        status: updated.newProjectData.status,
        colour: updated.newProjectData.colour,
        notes: updated.newProjectData.notes
      };
      dispatch({ type: 'ADD_PROJECT', project: newProject });
    }

    let finalNotes = updated.description || '';
    if (updated.clientMode === 'ONE_TIME') {
       const oneTimeInfo = `[One-Time Client: ${updated.clientName}${updated.clientVat ? ` (VAT: ${updated.clientVat})` : ''}]`;
       finalNotes = finalNotes ? `${oneTimeInfo}\n${finalNotes}` : oneTimeInfo;
    }

    const formatDateForDB = (d: string | undefined) => {
      if (!d) return new Date().toISOString().split('T')[0];
      if (d.includes('/')) {
        const parts = d.split('/');
        if (parts.length === 3) {
          return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
      return d;
    };

    // Create the invoice
    const newInvoice = {
      id: uuidv4(),
      projectId: finalProjectId!,
      date: formatDateForDB(updated.date),
      invoiceNumber: updated.invoiceNumber,
      netAmount: updated.netAmount || 0,
      vatRate: updated.vatRate || 0,
      vatAmount: updated.vatAmount || 0,
      grossAmount: updated.grossAmount || 0,
      notes: finalNotes,
    };

    dispatch({
      type: 'ADD_CLIENT_INVOICE',
      invoice: newInvoice
    });

    // Mark as imported in local view
    const finalInvoice = { 
      ...updated, 
      status: 'IMPORTED' as const, 
      clientId: finalClientId, 
      projectId: finalProjectId,
      clientMode: 'EXISTING' as const,
      projectMode: 'EXISTING' as const,
      isNewClient: false 
    };
    setParsedFiles(prev => prev.map(inv => inv.id === finalInvoice.id ? finalInvoice : inv));
    setEditingInvoice(null);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Invoice Import Centre</h1>
        <p className={styles.subtitle}>Audit, edit, and import historical PDFs securely</p>
      </div>

      <div className={styles.actions}>
        <Button onClick={() => fileInputRef.current?.click()} disabled={isParsing}>
          {isParsing ? 'Parsing...' : 'Select PDFs / Folder'}
        </Button>
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          multiple 
          accept=".pdf"
          onChange={handleFiles} 
          {...{ webkitdirectory: "true", directory: "true" } as any}
        />
        <Button variant="secondary" onClick={() => {
            if (fileInputRef.current) {
                fileInputRef.current.removeAttribute('webkitdirectory');
                fileInputRef.current.removeAttribute('directory');
                fileInputRef.current.click();
                setTimeout(() => {
                    if (fileInputRef.current) {
                        fileInputRef.current.setAttribute('webkitdirectory', 'true');
                        fileInputRef.current.setAttribute('directory', 'true');
                    }
                }, 100);
            }
        }}>Select Single Files</Button>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Status</th>
              <th>Invoice</th>
              <th>Date</th>
              <th>Client</th>
              <th>Net</th>
              <th>VAT</th>
              <th>Gross</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {parsedFiles.length === 0 && (
              <tr>
                <td colSpan={8} className={styles.emptyState}>No invoices parsed yet. Select files to begin.</td>
              </tr>
            )}
            {parsedFiles.map(inv => (
              <tr key={inv.id} className={inv.status === 'CANCELLED' ? styles.cancelledRow : ''}>
                <td>{getStatusBadge(inv.status)}</td>
                <td>{inv.invoiceNumber || '-'}</td>
                <td>{inv.date || '-'}</td>
                <td>
                   {inv.clientName || '-'}
                   {inv.clientMode === 'CREATE_NEW' && <Badge status="NEW CLIENT" className={styles.clientBadge} />}
                   {inv.clientMode === 'ONE_TIME' && <Badge status="ONE TIME" className={styles.clientBadge} />}
                </td>
                <td>{inv.netAmount !== undefined ? `${inv.netAmount.toFixed(2)} ${inv.currency}` : '-'}</td>
                <td>{inv.vatRate !== undefined ? `${inv.vatRate}%` : '-'}</td>
                <td>{inv.grossAmount !== undefined ? `${inv.grossAmount.toFixed(2)} ${inv.currency}` : '-'}</td>
                <td>
                  <Button variant="ghost" size="sm" onClick={() => setEditingInvoice(inv)}>Edit</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <InvoiceEditModal
        invoice={editingInvoice}
        onClose={() => setEditingInvoice(null)}
        onSave={handleSaveLocal}
        onImport={handleImportToDatabase}
      />
    </div>
  );
}
