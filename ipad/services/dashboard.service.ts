import api from '@/lib/api';

export const DashboardService = {
  get: () => api.get('/student/dashboard/'),
};
