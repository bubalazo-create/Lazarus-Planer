import * as pdfjsLib from 'pdfjs-dist';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface ParsedInvoice {
  id: string;
  filename: string;
  status: 'NEW' | 'POSSIBLE DUPLICATE' | 'ALREADY EXISTS' | 'NEEDS REVIEW' | 'CANCELLED' | 'IMPORTED';
  isLazarus: boolean;
  invoiceNumber?: string;
  date?: string;
  clientName?: string;
  clientVat?: string;
  clientId?: string;
  projectId?: string;
  isNewClient: boolean;
  clientMode?: 'EXISTING' | 'CREATE_NEW' | 'ONE_TIME';
  projectMode?: 'EXISTING' | 'CREATE_NEW';
  newProjectData?: {
    name: string;
    address: string;
    startDate: string;
    targetEndDate: string;
    status: 'Planned' | 'Active' | 'On Hold' | 'Completed';
    colour: string;
    notes: string;
  };
  description?: string;
  netAmount?: number;
  vatRate?: number;
  vatAmount?: number;
  grossAmount?: number;
  currency: string;
  errors: string[];
  rawText: string;
}

export async function parsePdfFile(file: File, appState: any): Promise<ParsedInvoice> {
  const arrayBuffer = await file.arrayBuffer();
  
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDocument = await loadingTask.promise;
  
  let fullText = '';
  for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);
    const textContent = await page.getTextContent();
    const items = textContent.items.map((item: any) => ({
        str: item.str,
        x: item.transform[4],
        y: item.transform[5],
        height: item.height
    }));
    
    items.sort((a, b) => {
        if (Math.abs(a.y - b.y) > 5) {
            return b.y - a.y; // Higher Y first
        }
        return a.x - b.x; // Then left to right
    });
    
    fullText += items.map(i => i.str).join(' ') + '\n';
  }
  
  const result: ParsedInvoice = {
    id: Math.random().toString(36).substring(7),
    filename: file.name,
    status: 'NEW',
    isLazarus: false,
    currency: '€',
    isNewClient: false,
    errors: [],
    rawText: fullText
  };
  
  const text = fullText;
  
  const myVatRaw = import.meta.env.VITE_MY_VAT_NUMBER || 'MT00000000';
  const myVatNormalized = myVatRaw.replace('-', '');
  
  const myIdentifiers = [
    myVatRaw,
    myVatNormalized,
    import.meta.env.VITE_MY_BUSINESS_NAME || 'Demo Business',
    import.meta.env.VITE_MY_BUSINESS_ALIAS || 'Demo Alias',
    import.meta.env.VITE_MY_ADDRESS || 'Demo Address'
  ];

  // 1. Verify Outgoing Invoice
  const isMyInvoice = myIdentifiers.some(id => text.includes(id));
  if (isMyInvoice) {
    result.isLazarus = true;
  } else {
    result.errors.push('Does not appear to be an outgoing invoice (Missing your VAT or company name).');
  }
  
  // 2. Extract Invoice Number
  const invMatch = text.match(/(?:Invoice\s+No:|Invoice\s+#?)\s*(INV-\d+|\d+)/i);
  if (invMatch) {
    result.invoiceNumber = invMatch[1].trim();
  } else {
    result.errors.push('Could not extract Invoice Number.');
  }
  
  // 3. Extract Date
  const dateMatch = text.match(/(?:DATE:|Invoice Date)\s*(\d{2}[\.\/]\d{2}[\.\/]\d{4})/i);
  if (dateMatch) {
    result.date = dateMatch[1].replace(/\./g, '/'); // Normalize to DD/MM/YYYY
  } else {
    result.errors.push('Could not extract Date.');
  }
  
  // 4. Extract VAT and Client
  const allVats = [...text.matchAll(/MT-?\d{8}/gi)].map(m => m[0]);
  const clientVat = allVats.find(v => v.replace('-', '') !== myVatNormalized);
  if (clientVat) {
    result.clientVat = clientVat;
  }

  let extractedClientName = '';
  // Try Format A
  const formatAMatch = text.match(new RegExp(`Invoice Date\\s*\\d{2}[\\.\\/]\\d{2}[\\.\\/]\\d{4}\\s+(.+?)\\s+VAT:`, 'i'));
  if (formatAMatch) {
      extractedClientName = formatAMatch[1].trim();
  } else {
      // Format B fallback
      const formatBMatch = text.match(/BILL TO\s+(.*?)\s+(?:VAT|DESCRIPTION|Trilithon|St\.|www)/is);
      if (formatBMatch) {
          extractedClientName = formatBMatch[1].replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      }
  }

  // Client Database Matching
  const existingClients = appState.clients || [];
  let matchedClient = null;

  if (result.clientVat) {
      matchedClient = existingClients.find((c: any) => c.vatNumber?.replace('-', '') === result.clientVat!.replace('-', ''));
  }
  if (!matchedClient && extractedClientName) {
      matchedClient = existingClients.find((c: any) => c.name.toLowerCase() === extractedClientName.toLowerCase());
  }

  if (matchedClient) {
      result.clientName = matchedClient.name;
      result.clientId = matchedClient.id;
      result.isNewClient = false;
      result.clientMode = 'EXISTING';
  } else {
      result.clientName = extractedClientName || undefined;
      result.isNewClient = true;
      result.clientMode = 'CREATE_NEW';
      if (!result.clientName) {
          result.errors.push('Could not reliably extract Client Name.');
      }
  }

  result.projectMode = 'EXISTING';
  
  // Format dates for new project default (YYYY-MM-DD)
  let isoDate = new Date().toISOString().split('T')[0];
  if (result.date) {
    const parts = result.date.split('/');
    if (parts.length === 3) isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  
  result.newProjectData = {
    name: (result.clientName || 'New Client') + ' Project',
    address: '',
    startDate: isoDate,
    targetEndDate: isoDate,
    status: 'Completed',
    colour: '#3b82f6',
    notes: ''
  };
  
  // 5. Extract Financials
  const parseEuro = (str: string) => {
      const clean = str.replace(/[^\d,\.]/g, '');
      if (clean.includes(',') && clean.includes('.')) {
          return parseFloat(clean.replace(/,/g, ''));
      }
      return parseFloat(clean.replace(',', '.'));
  };
  
  const subtotalMatch = text.match(/(?:SUBTOTAL|Subtotal):?\s*([\d\s\,]+[\.\,]\d{2})/i);
  if (subtotalMatch) {
    result.netAmount = parseEuro(subtotalMatch[1]);
  }
  
  const vatRateMatch = text.match(/VAT\s*(\d{1,2}(?:\.\d+)?)\s*%?:?\s*([\d\s\,]+[\.\,]\d{2})/i);
  if (vatRateMatch) {
    result.vatRate = parseFloat(vatRateMatch[1]);
    result.vatAmount = parseEuro(vatRateMatch[2]);
  }
  
  const totalMatch = text.match(/\b(?:TOTAL|Total)\b:?\s*([\d\s\,]+[\.\,]\d{2})/i);
  if (totalMatch) {
    result.grossAmount = parseEuro(totalMatch[1]);
  }
  
  if (result.netAmount === undefined || result.grossAmount === undefined) {
    result.errors.push('Could not extract Net or Gross amount.');
  }

  if (result.vatRate === undefined && result.vatAmount === undefined) {
     if (result.netAmount !== undefined && result.grossAmount !== undefined) {
        result.vatAmount = Math.round((result.grossAmount - result.netAmount) * 100) / 100;
        if (result.netAmount > 0) {
            result.vatRate = Math.round((result.vatAmount / result.netAmount) * 100);
        }
     }
  }

  // 6. Extract Description
  const descMatch = text.match(/DESCRIPTION\s+(.*?)(?=\s+INVOICE|\s+QTY|\s+SUBTOTAL|\s+Total)/is);
  if (descMatch) {
    result.description = descMatch[1].replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // 7. Determine Final Status (including cancel and duplicate rules)
  const isCanceled = file.name.toLowerCase().includes('cancel') || text.toLowerCase().includes('cancel');

  if (isCanceled) {
      result.status = 'CANCELLED';
  } else if (!result.invoiceNumber) {
      result.status = 'NEEDS REVIEW';
  } else if (result.errors.length > 0) {
      result.status = 'NEEDS REVIEW';
  } else {
      result.status = 'NEW';
      
      const existingInvoices = appState.clientInvoices || [];
      const exactMatch = existingInvoices.find((inv: any) => inv.invoiceNumber === result.invoiceNumber);
      
      if (exactMatch) {
          result.status = 'ALREADY EXISTS';
      } else {
          const possibleMatch = existingInvoices.find((inv: any) => 
              inv.grossAmount === result.grossAmount && 
              (inv.date === result.date || inv.netAmount === result.netAmount)
          );
          if (possibleMatch) {
              result.status = 'POSSIBLE DUPLICATE';
          }
      }
  }

  return result;
}
