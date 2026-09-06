import { Project, Client } from '../models/types';

export const getProjectDisplayName = (project: Project, clients: Client[]): string => {
  // 1. If it has a specific project name, use it.
  if (project.name && project.name.trim() !== '') {
    return project.name.trim();
  }

  // 2. Resolve Client Name
  let clientName = '';
  if (project.clientId) {
    const client = clients.find(c => c.id === project.clientId);
    if (client) clientName = client.name;
  } else if (project.client && project.client.trim() !== '') {
    clientName = project.client.trim();
  }

  // 3. Resolve Address
  const address = project.address && project.address.trim() !== '' ? project.address.trim() : '';

  // 4. Combine intelligently to ensure uniqueness when Project Name is missing
  if (clientName && address) {
    return `${clientName} - ${address}`;
  } else if (clientName) {
    // If no address, append the start date to help distinguish identical clients
    if (project.startDate) {
        return `${clientName} (${project.startDate})`;
    }
    return clientName;
  } else if (address) {
    return address;
  }

  return 'Unnamed Project';
};
