import api from '@/lib/api';

export const NotificationsService = {
  list: () => api.get('/notifications/'),

  markRead: (id: string) =>
    api.put(`/notifications/${id}/mark_read/`),

  markAllRead: () => api.put('/notifications/mark_all_read/'),
};
