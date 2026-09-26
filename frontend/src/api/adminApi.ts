import { apiRequest } from './client';

export const adminApi = {
  getOverview: (): Promise<any> =>
    apiRequest('/admin/overview'),

  getUsers: (): Promise<any[]> =>
    apiRequest('/admin/users'),

  getOrganizations: (): Promise<any[]> =>
    apiRequest('/admin/organizations'),

  getSystemSettings: (): Promise<any> =>
    apiRequest('/admin/system-settings'),
};
