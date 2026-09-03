import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Worker, WorkerEarning, WorkerPayment, Project, Client } from '../models/types';
import { formatDate } from './dateUtils';
import { getProjectDisplayName } from './projectUtils';

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export async function generateWorkerStatement(
  worker: Worker,
  earnings: WorkerEarning[],
  payments: WorkerPayment[],
  projects: Project[],
  clients: Client[],
  periodLabel: string,
  totalEarned: number,
  totalPaid: number,
  balance: number
) {
  const doc = new jsPDF();
  let fontName = 'helvetica';
  
  try {
    const regFontReq = await fetch('/Montserrat-Regular.ttf');
    const boldFontReq = await fetch('/Montserrat-Bold.ttf');
    
    if (regFontReq.ok && boldFontReq.ok) {
      const regFontBuffer = await regFontReq.arrayBuffer();
      const boldFontBuffer = await boldFontReq.arrayBuffer();
      
      doc.addFileToVFS('Montserrat-Regular.ttf', arrayBufferToBase64(regFontBuffer));
      doc.addFileToVFS('Montserrat-Bold.ttf', arrayBufferToBase64(boldFontBuffer));
      
      doc.addFont('Montserrat-Regular.ttf', 'Montserrat', 'normal');
      doc.addFont('Montserrat-Bold.ttf', 'Montserrat', 'bold');
      
      fontName = 'Montserrat';
    }
  } catch (e) {
    console.error('Failed to load Montserrat font', e);
  }

  doc.setFont(fontName, 'normal');

  const textDark = '#142238';
  const textMuted = '#6B7280';
  const accentColor = '#F58220';
  const successColor = '#10B981';
  
  const hexToRgb = (hex: string): [number, number, number] => {
    const c = hex.replace('#', '');
    return [parseInt(c.substr(0,2), 16), parseInt(c.substr(2,2), 16), parseInt(c.substr(4,2), 16)];
  };

  try {
    const logoReq = await fetch('/lazarus-logo.png');
    if (logoReq.ok) {
      const logoBlob = await logoReq.blob();
      const logoBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(logoBlob);
      });
      doc.addImage(logoBase64, 'PNG', 14, 14, 40, 40 * (logoBlob.size > 0 ? 0.3 : 1));
    }
  } catch (e) {
    console.error('Failed to load logo', e);
  }

  doc.setTextColor(hexToRgb(textDark)[0], hexToRgb(textDark)[1], hexToRgb(textDark)[2]);
  doc.setFontSize(22);
  doc.setFont(fontName, 'bold');
  doc.text('LAZARUS', 60, 24);
  
  doc.setFontSize(10);
  doc.setFont(fontName, 'normal');
  doc.setTextColor(hexToRgb(accentColor)[0], hexToRgb(accentColor)[1], hexToRgb(accentColor)[2]);
  doc.text('TURNKEY CONTRACTOR', 60, 30);

  doc.setTextColor(hexToRgb(textDark)[0], hexToRgb(textDark)[1], hexToRgb(textDark)[2]);
  doc.setFontSize(16);
  doc.setFont(fontName, 'bold');
  doc.text('Worker Payment Statement', 14, 55);

  doc.setFontSize(10);
  doc.setFont(fontName, 'normal');
  doc.setTextColor(hexToRgb(textMuted)[0], hexToRgb(textMuted)[1], hexToRgb(textMuted)[2]);
  
  doc.text(`Worker:`, 14, 65);
  if (worker.trade) doc.text(`Trade:`, 14, 70);
  doc.text(`Period:`, 14, worker.trade ? 75 : 70);
  doc.text(`Generated:`, 14, worker.trade ? 80 : 75);

  doc.setTextColor(hexToRgb(textDark)[0], hexToRgb(textDark)[1], hexToRgb(textDark)[2]);
  doc.setFont(fontName, 'bold');
  doc.text(worker.name, 35, 65);
  doc.setFont(fontName, 'normal');
  if (worker.trade) doc.text(worker.trade, 35, 70);
  doc.text(periodLabel, 35, worker.trade ? 75 : 70);
  doc.text(formatDate(new Date()), 35, worker.trade ? 80 : 75);

  let currentY = worker.trade ? 95 : 90;

  // Earnings Table
  doc.setTextColor(hexToRgb(accentColor)[0], hexToRgb(accentColor)[1], hexToRgb(accentColor)[2]);
  doc.setFontSize(12);
  doc.setFont(fontName, 'bold');
  doc.text('EARNINGS', 14, currentY);
  currentY += 4;

  if (earnings.length === 0) {
    doc.setTextColor(hexToRgb(textMuted)[0], hexToRgb(textMuted)[1], hexToRgb(textMuted)[2]);
    doc.setFontSize(10);
    doc.setFont(fontName, 'italic');
    doc.text('No earnings recorded for this period.', 14, currentY + 4);
    currentY += 12;
  } else {
    const earningRows = earnings.map(e => {
      let projectName = 'No Project';
      if (e.projectId) {
        const proj = projects.find(p => p.id === e.projectId);
        if (proj) projectName = getProjectDisplayName(proj, clients);
      }
      return [
        formatDate(new Date(e.date)),
        projectName,
        e.description,
        `EUR ${(e.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Date', 'Project', 'Description', 'Amount']],
      body: earningRows,
      foot: [['', '', 'Total Earned', `EUR ${(totalEarned ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]],
      theme: 'grid',
      headStyles: { fillColor: hexToRgb(accentColor), textColor: [255, 255, 255], font: fontName, fontStyle: 'bold' },
      footStyles: { fillColor: [240, 240, 240], textColor: hexToRgb(textDark), font: fontName, fontStyle: 'bold' },
      bodyStyles: { textColor: hexToRgb(textDark), font: fontName },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { left: 14, right: 14 },
      styles: { fontSize: 9 },
    });
    currentY = (doc as any).lastAutoTable.finalY + 12;
  }

  // Payments Table
  doc.setTextColor(hexToRgb(accentColor)[0], hexToRgb(accentColor)[1], hexToRgb(accentColor)[2]);
  doc.setFontSize(12);
  doc.setFont(fontName, 'bold');
  doc.text('PAYMENTS', 14, currentY);
  currentY += 4;

  if (payments.length === 0) {
    doc.setTextColor(hexToRgb(textMuted)[0], hexToRgb(textMuted)[1], hexToRgb(textMuted)[2]);
    doc.setFontSize(10);
    doc.setFont(fontName, 'italic');
    doc.text('No payments recorded for this period.', 14, currentY + 4);
    currentY += 12;
  } else {
    const paymentRows = payments.map(p => {
      let projectName = 'No Project';
      if (p.projectId) {
        const proj = projects.find(proj => proj.id === p.projectId);
        if (proj) projectName = getProjectDisplayName(proj, clients);
      }
      return [
        formatDate(new Date(p.date)),
        projectName,
        p.method || '-',
        p.notes || '-',
        `EUR ${(p.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Date', 'Project', 'Method', 'Notes', 'Amount']],
      body: paymentRows,
      foot: [['', '', '', 'Total Paid', `EUR ${(totalPaid ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]],
      theme: 'grid',
      headStyles: { fillColor: hexToRgb(accentColor), textColor: [255, 255, 255], font: fontName, fontStyle: 'bold' },
      footStyles: { fillColor: [240, 240, 240], textColor: hexToRgb(successColor), font: fontName, fontStyle: 'bold' },
      bodyStyles: { textColor: hexToRgb(textDark), font: fontName },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { left: 14, right: 14 },
      styles: { fontSize: 9 },
    });
    currentY = (doc as any).lastAutoTable.finalY + 12;
  }

  // Balance Due Section
  const balanceColor = balance > 0 ? accentColor : textDark;
  
  doc.setFillColor(247, 248, 250);
  doc.rect(14, currentY, 182, 24, 'F');
  
  doc.setTextColor(hexToRgb(textDark)[0], hexToRgb(textDark)[1], hexToRgb(textDark)[2]);
  doc.setFontSize(14);
  doc.setFont(fontName, 'bold');
  doc.text('BALANCE DUE:', 20, currentY + 15);
  
  doc.setTextColor(hexToRgb(balanceColor)[0], hexToRgb(balanceColor)[1], hexToRgb(balanceColor)[2]);
  doc.setFontSize(16);
  doc.text(`EUR ${(balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 190, currentY + 15, { align: 'right' });

  const safeName = worker.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const safePeriod = periodLabel.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  doc.save(`Worker_Statement_${safeName}_${safePeriod}.pdf`);
}


export async function generateProjectStatement(
  project: Project,
  earnings: WorkerEarning[],
  payments: WorkerPayment[],
  workers: Worker[],
  clients: Client[],
  periodLabel: string,
  totalEarned: number,
  totalPaid: number,
  balance: number,
  activeWorkers: Worker[]
) {
  const doc = new jsPDF();
  let fontName = 'helvetica';
  
  try {
    const regFontReq = await fetch('/Montserrat-Regular.ttf');
    const boldFontReq = await fetch('/Montserrat-Bold.ttf');
    
    if (regFontReq.ok && boldFontReq.ok) {
      const regFontBuffer = await regFontReq.arrayBuffer();
      const boldFontBuffer = await boldFontReq.arrayBuffer();
      
      doc.addFileToVFS('Montserrat-Regular.ttf', arrayBufferToBase64(regFontBuffer));
      doc.addFileToVFS('Montserrat-Bold.ttf', arrayBufferToBase64(boldFontBuffer));
      
      doc.addFont('Montserrat-Regular.ttf', 'Montserrat', 'normal');
      doc.addFont('Montserrat-Bold.ttf', 'Montserrat', 'bold');
      
      fontName = 'Montserrat';
    }
  } catch (e) {
    console.error('Failed to load Montserrat font', e);
  }

  doc.setFont(fontName, 'normal');

  const textDark = '#142238';
  const textMuted = '#6B7280';
  const accentColor = '#F58220';
  const successColor = '#10B981';
  
  const hexToRgb = (hex: string): [number, number, number] => {
    const c = hex.replace('#', '');
    return [parseInt(c.substr(0,2), 16), parseInt(c.substr(2,2), 16), parseInt(c.substr(4,2), 16)];
  };

  try {
    const logoReq = await fetch('/lazarus-logo.png');
    if (logoReq.ok) {
      const logoBlob = await logoReq.blob();
      const logoBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(logoBlob);
      });
      doc.addImage(logoBase64, 'PNG', 14, 14, 40, 40 * (logoBlob.size > 0 ? 0.3 : 1)); // rough aspect
    }
  } catch (e) {
    console.error('Failed to load logo', e);
  }

  doc.setTextColor(hexToRgb(textDark)[0], hexToRgb(textDark)[1], hexToRgb(textDark)[2]);
  doc.setFontSize(22);
  doc.setFont(fontName, 'bold');
  doc.text('LAZARUS', 60, 24);
  
  doc.setFontSize(10);
  doc.setFont(fontName, 'normal');
  doc.setTextColor(hexToRgb(accentColor)[0], hexToRgb(accentColor)[1], hexToRgb(accentColor)[2]);
  doc.text('TURNKEY CONTRACTOR', 60, 30);

  doc.setTextColor(hexToRgb(textDark)[0], hexToRgb(textDark)[1], hexToRgb(textDark)[2]);
  doc.setFontSize(16);
  doc.setFont(fontName, 'bold');
  doc.text('Project Payment Statement', 14, 55);

  const clientName = project.clientId ? clients.find(c => c.id === project.clientId)?.name : project.client;

  doc.setFontSize(10);
  doc.setFont(fontName, 'normal');
  doc.setTextColor(hexToRgb(textMuted)[0], hexToRgb(textMuted)[1], hexToRgb(textMuted)[2]);
  
  doc.text(`Project:`, 14, 65);
  doc.text(`Client:`, 14, 70);
  doc.text(`Location:`, 14, 75);
  doc.text(`Period:`, 14, 80);
  doc.text(`Generated:`, 14, 85);

  doc.setTextColor(hexToRgb(textDark)[0], hexToRgb(textDark)[1], hexToRgb(textDark)[2]);
  doc.setFont(fontName, 'bold');
  doc.text(getProjectDisplayName(project, clients), 35, 65);
  doc.text(clientName || '-', 35, 70);
  doc.text((project as any).location || '-', 35, 75);
  doc.text(periodLabel, 35, 80);
  doc.setFont(fontName, 'normal');
  doc.text(formatDate(new Date()), 35, 85);

  let currentY = 100;

  // Worker Breakdown Table
  doc.setTextColor(hexToRgb(accentColor)[0], hexToRgb(accentColor)[1], hexToRgb(accentColor)[2]);
  doc.setFontSize(12);
  doc.setFont(fontName, 'bold');
  doc.text('WORKER BREAKDOWN', 14, currentY);
  currentY += 4;

  if (activeWorkers.length === 0) {
    doc.setTextColor(hexToRgb(textMuted)[0], hexToRgb(textMuted)[1], hexToRgb(textMuted)[2]);
    doc.setFontSize(10);
    doc.setFont(fontName, 'italic');
    doc.text('No workers recorded for this period.', 14, currentY + 4);
    currentY += 12;
  } else {
    const workerRows = activeWorkers.map(w => {
      const wEarned = earnings.filter(e => e.workerId === w.id).reduce((sum, e) => sum + (e.amount ?? 0), 0);
      const wPaid = payments.filter(p => p.workerId === w.id).reduce((sum, p) => sum + (p.amount ?? 0), 0);
      const wBalance = wEarned - wPaid;
      return [
        w.name,
        `€${wEarned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `€${wPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `€${wBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Worker', 'Earned', 'Paid', 'Balance']],
      body: workerRows,
      theme: 'grid',
      headStyles: { fillColor: hexToRgb(accentColor), textColor: [255, 255, 255], font: fontName, fontStyle: 'bold' },
      bodyStyles: { textColor: hexToRgb(textDark), font: fontName },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { left: 14, right: 14 },
      styles: { fontSize: 9 },
    });
    currentY = (doc as any).lastAutoTable.finalY + 12;
  }

  // Earnings Table
  doc.setTextColor(hexToRgb(accentColor)[0], hexToRgb(accentColor)[1], hexToRgb(accentColor)[2]);
  doc.setFontSize(12);
  doc.setFont(fontName, 'bold');
  doc.text('EARNINGS', 14, currentY);
  currentY += 4;

  if (earnings.length === 0) {
    doc.setTextColor(hexToRgb(textMuted)[0], hexToRgb(textMuted)[1], hexToRgb(textMuted)[2]);
    doc.setFontSize(10);
    doc.setFont(fontName, 'italic');
    doc.text('No earnings recorded for this period.', 14, currentY + 4);
    currentY += 12;
  } else {
    const earningRows = earnings.map(e => {
      const w = workers.find(w => w.id === e.workerId);
      return [
        formatDate(new Date(e.date)),
        w ? w.name : 'Former Worker',
        e.description,
        `€${(e.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Date', 'Worker', 'Description', 'Amount']],
      body: earningRows,
      foot: [['', '', 'Total Earned', `€${(totalEarned ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]],
      theme: 'grid',
      headStyles: { fillColor: hexToRgb(accentColor), textColor: [255, 255, 255], font: fontName, fontStyle: 'bold' },
      footStyles: { fillColor: [240, 240, 240], textColor: hexToRgb(textDark), font: fontName, fontStyle: 'bold' },
      bodyStyles: { textColor: hexToRgb(textDark), font: fontName },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { left: 14, right: 14 },
      styles: { fontSize: 9 },
    });
    currentY = (doc as any).lastAutoTable.finalY + 12;
  }

  // Payments Table
  doc.setTextColor(hexToRgb(accentColor)[0], hexToRgb(accentColor)[1], hexToRgb(accentColor)[2]);
  doc.setFontSize(12);
  doc.setFont(fontName, 'bold');
  doc.text('PAYMENTS', 14, currentY);
  currentY += 4;

  if (payments.length === 0) {
    doc.setTextColor(hexToRgb(textMuted)[0], hexToRgb(textMuted)[1], hexToRgb(textMuted)[2]);
    doc.setFontSize(10);
    doc.setFont(fontName, 'italic');
    doc.text('No payments recorded for this period.', 14, currentY + 4);
  } else {
    const paymentRows = payments.map(p => {
      const w = workers.find(w => w.id === p.workerId);
      return [
        formatDate(new Date(p.date)),
        w ? w.name : 'Former Worker',
        p.method || '-',
        p.notes || '-',
        `€${(p.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Date', 'Worker', 'Method', 'Notes', 'Amount']],
      body: paymentRows,
      foot: [['', '', '', 'Total Paid', `€${(totalPaid ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]],
      theme: 'grid',
      headStyles: { fillColor: hexToRgb(accentColor), textColor: [255, 255, 255], font: fontName, fontStyle: 'bold' },
      footStyles: { fillColor: [240, 240, 240], textColor: hexToRgb(successColor), font: fontName, fontStyle: 'bold' },
      bodyStyles: { textColor: hexToRgb(textDark), font: fontName },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { left: 14, right: 14 },
      styles: { fontSize: 9 },
    });
    currentY = (doc as any).lastAutoTable.finalY + 12;
  }

  if (payments.length === 0) {
    currentY += 12;
  }

  // Balance Due Section
  const balanceColor = balance > 0 ? accentColor : textDark;
  
  doc.setFillColor(247, 248, 250);
  doc.rect(14, currentY, 182, 24, 'F');
  
  doc.setTextColor(hexToRgb(textDark)[0], hexToRgb(textDark)[1], hexToRgb(textDark)[2]);
  doc.setFontSize(14);
  doc.setFont(fontName, 'bold');
  doc.text('PROJECT BALANCE DUE:', 20, currentY + 15);
  
  doc.setTextColor(hexToRgb(balanceColor)[0], hexToRgb(balanceColor)[1], hexToRgb(balanceColor)[2]);
  doc.setFontSize(16);
  doc.text(`€${(balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 190, currentY + 15, { align: 'right' });

  // Safe Filename
  const safeName = getProjectDisplayName(project, clients).replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const safePeriod = periodLabel.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  doc.save(`Project_Statement_${safeName}_${safePeriod}.pdf`);
}
