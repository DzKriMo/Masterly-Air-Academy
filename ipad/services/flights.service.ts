import api from '@/lib/api';

export const FlightsService = {
  list: () => api.get('/flight-lessons/'),

  get: (id: string) => api.get(`/flight-lessons/${id}/`),
};
