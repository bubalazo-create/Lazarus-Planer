import { SubcontractorInvoiceAllocation } from '../models/types';

export interface AllocatedPayment extends SubcontractorInvoiceAllocation {
  paid: number;
}

export function calculateAllocationPaid(
  allocations: SubcontractorInvoiceAllocation[],
  totalPaid: number
): AllocatedPayment[] {
  if (totalPaid <= 0 || allocations.length === 0) {
    return allocations.map(a => ({ ...a, paid: 0 }));
  }

  const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);

  if (totalAllocated === 0) {
    return allocations.map(a => ({ ...a, paid: 0 }));
  }

  if (totalPaid >= totalAllocated) {
    return allocations.map(a => ({ ...a, paid: a.amount }));
  }

  let remainingPaid = totalPaid;
  
  return allocations.map((a, index) => {
    if (index === allocations.length - 1) {
      // The last allocation absorbs the rounding difference
      const finalPaid = Math.round(remainingPaid * 100) / 100;
      return { ...a, paid: finalPaid };
    }
    
    const proportion = a.amount / totalAllocated;
    const paid = Math.round(totalPaid * proportion * 100) / 100;
    
    remainingPaid -= paid;
    return { ...a, paid };
  });
}
