import api from '@/lib/api';

export const MessagesService = {
  list: () => api.get('/messages/'),

  getSent: () => api.get('/messages/sent/'),

  get: (id: string) => api.get(`/messages/${id}/`),

  send: (data: { receiver: string; subject: string; body: string }) =>
    api.post('/messages/', data),
};
