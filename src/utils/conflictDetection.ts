import { Assignment, Project, ConflictInfo } from '../models/types';
import { getDatesInRange } from './dateUtils';

export function checkConflicts(
  workerId: string,
  startDate: string,
  endDate: string,
  assignments: Assignment[],
  projects: Project[],
  excludeAssignmentId?: string
): ConflictInfo[] {
  const newDates = getDatesInRange(startDate, endDate);
  const conflicts: ConflictInfo[] = [];

  for (const assignment of assignments) {
    if (assignment.workerId !== workerId) continue;
    if (excludeAssignmentId && assignment.id === excludeAssignmentId) continue;

    const existingDates = getDatesInRange(assignment.startDate, assignment.endDate);
    const overlappingDates = newDates.filter(date => existingDates.includes(date));

    if (overlappingDates.length > 0) {
      const project = projects.find(p => p.id === assignment.projectId);
      if (project) {
        // V1.3: Allow multiple assignments per worker per day.
        // TODO (Future): Add start time, end time, and duration checks here.
        // Only push to conflicts if the ACTUAL time ranges overlap on the same date.
        
        // For now, we do not treat date overlap as a conflict.
        /*
        conflicts.push({
          assignment,
          project,
          dates: overlappingDates,
        });
        */
      }
    }
  }

  return conflicts;
}
