import { DataService } from '../services/storage';

export function seedData(service: DataService): void {
  if (service.getWorkers().length > 0) return;

  const workers = [
    { id: 'worker-1', name: 'John', colour: '#4A90D9', trade: 'General', active: true, notes: '' },
    { id: 'worker-2', name: 'Mark', colour: '#D4A843', trade: 'Electrician', active: true, notes: '' },
    { id: 'worker-3', name: 'Peter', colour: '#5BA55B', trade: 'Plumber', active: true, notes: '' },
    { id: 'worker-4', name: 'Daniel', colour: '#8B6BB5', trade: 'Carpenter', active: true, notes: '' },
  ];

  const projects = [
    { id: 'project-1', name: 'Burmarrad', client: 'J. Borg', address: '', startDate: '2026-08-01', targetEndDate: '2026-10-01', status: 'Active' as const, colour: '#6B8CAE', notes: '' },
    { id: 'project-2', name: 'Mosta', client: 'M. Vella', address: '', startDate: '2026-08-10', targetEndDate: '2026-09-15', status: 'Active' as const, colour: '#A67B5B', notes: '' },
    { id: 'project-3', name: 'Naxxar', client: 'P. Camilleri', address: '', startDate: '2026-08-15', targetEndDate: '2026-11-20', status: 'Active' as const, colour: '#7BA37B', notes: '' },
    { id: 'project-4', name: 'Mellieha', client: 'S. Grech', address: '', startDate: '2026-09-01', targetEndDate: '2026-12-01', status: 'Planned' as const, colour: '#B07AA1', notes: '' },
  ];

  const assignments = [
    { id: 'assignment-1', workerId: 'worker-1', projectId: 'project-1', title: 'Wall lining', startDate: '2026-08-25', endDate: '2026-08-27', status: 'Planned' as const, notes: '' },
    { id: 'assignment-2', workerId: 'worker-1', projectId: 'project-2', title: 'Tile installation', startDate: '2026-08-28', endDate: '2026-08-28', status: 'Planned' as const, notes: '' },
    { id: 'assignment-3', workerId: 'worker-2', projectId: 'project-3', title: 'Electrical wiring', startDate: '2026-08-25', endDate: '2026-08-27', status: 'Planned' as const, notes: '' },
    { id: 'assignment-4', workerId: 'worker-2', projectId: 'project-4', title: 'Panel installation', startDate: '2026-08-28', endDate: '2026-08-28', status: 'Planned' as const, notes: '' },
    { id: 'assignment-5', workerId: 'worker-3', projectId: 'project-2', title: 'Pipe fitting', startDate: '2026-08-25', endDate: '2026-08-25', status: 'Planned' as const, notes: '' },
    { id: 'assignment-6', workerId: 'worker-3', projectId: 'project-1', title: 'Drainage work', startDate: '2026-08-26', endDate: '2026-08-26', status: 'Planned' as const, notes: '' },
    { id: 'assignment-7', workerId: 'worker-3', projectId: 'project-2', title: 'Pipe fitting', startDate: '2026-08-27', endDate: '2026-08-28', status: 'Planned' as const, notes: '' },
    { id: 'assignment-8', workerId: 'worker-4', projectId: 'project-4', title: 'Door frames', startDate: '2026-08-25', endDate: '2026-08-26', status: 'Planned' as const, notes: '' },
    { id: 'assignment-9', workerId: 'worker-4', projectId: 'project-3', title: 'Cabinet install', startDate: '2026-08-27', endDate: '2026-08-29', status: 'Planned' as const, notes: '' },
    { id: 'assignment-10', workerId: 'worker-1', projectId: 'project-3', title: 'Plastering', startDate: '2026-09-01', endDate: '2026-09-03', status: 'Planned' as const, notes: '' },
    { id: 'assignment-11', workerId: 'worker-2', projectId: 'project-1', title: 'Switch boxes', startDate: '2026-09-01', endDate: '2026-09-05', status: 'Planned' as const, notes: '' },
  ];

  workers.forEach(w => service.saveWorker(w));
  projects.forEach(p => service.saveProject(p));
  assignments.forEach(a => service.saveAssignment(a));
}
