import { Assignment } from '../models/types';
import { addDays, formatDate } from './dateUtils';
import { parseISO } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
/**
 * Splits an assignment into its constituent dates, removes a target date, 
 * optionally adds a new target date, and returns the resulting contiguous assignments.
 */
export function removeOrMoveDateFromAssignment(
  originalAssignment: Assignment,
  dateToRemove: string,
  dateToAdd?: string
): Assignment[] {
  const start = parseISO(originalAssignment.startDate);
  const end = parseISO(originalAssignment.endDate);
  const daysDiff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  
  // 1. Expand to individual dates
  let dates: string[] = [];
  for (let i = 0; i <= daysDiff; i++) {
    dates.push(formatDate(addDays(start, i)));
  }

  // 2. Remove date and optionally add new date
  dates = dates.filter(d => d !== dateToRemove);
  if (dateToAdd) {
    dates.push(dateToAdd);
  }

  // 3. Sort dates
  dates.sort((a, b) => parseISO(a).getTime() - parseISO(b).getTime());

  // 4. Group into contiguous ranges
  const ranges: { start: string, end: string }[] = [];
  if (dates.length > 0) {
    let currentStart = dates[0];
    let currentEnd = dates[0];
    
    for (let i = 1; i < dates.length; i++) {
      const date = dates[i];
      const diff = Math.round((parseISO(date).getTime() - parseISO(currentEnd).getTime()) / (1000 * 60 * 60 * 24));
      if (diff <= 1) {
        currentEnd = date;
      } else {
        ranges.push({ start: currentStart, end: currentEnd });
        currentStart = date;
        currentEnd = date;
      }
    }
    ranges.push({ start: currentStart, end: currentEnd });
  }

  // 5. Generate new assignments from ranges, keeping original ID for the first range
  let newAssignments: Assignment[] = [];
  if (ranges.length > 0) {
    newAssignments.push({
      ...originalAssignment,
      startDate: ranges[0].start,
      endDate: ranges[0].end,
    });
    
    for (let i = 1; i < ranges.length; i++) {
      newAssignments.push({
        ...originalAssignment,
        id: uuidv4(),
        startDate: ranges[i].start,
        endDate: ranges[i].end,
      });
    }
  }

  return newAssignments;
}
