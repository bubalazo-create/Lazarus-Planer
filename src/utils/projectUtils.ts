import { Project, Client } from '../models/types';

export const getProjectDisplayName = (project: Project, clients: Client[]): string => {
  if (project.name && project.name.trim() !== '') {
    return project.name.trim();
  }

  let clientName = '';
  if (project.clientId) {
    const client = clients.find(c => c.id === project.clientId);
    if (client) clientName = client.name;
  } else if (project.client && project.client.trim() !== '') {
    clientName = project.client.trim();
  }

  if (clientName) return clientName;

  if (project.address && project.address.trim() !== '') {
    return project.address.trim();
  }

  return 'Unnamed Project';
};
