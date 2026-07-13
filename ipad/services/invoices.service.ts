import api from '@/lib/api';
import { API_URL } from '@/constants/config';

export const InvoicesService = {
  list: () => api.get('/invoices/'),

  get: (id: string) => api.get(`/invoices/${id}/`),

  getPdfUrl: (id: string) => `${API_URL}/invoices/${id}/pdf/`,
};
