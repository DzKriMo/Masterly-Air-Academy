import api from '@/lib/api';
import { API_URL } from '@/constants/config';

export const CertificatesService = {
  list: () => api.get('/certificates/'),

  get: (id: string) => api.get(`/certificates/${id}/`),

  getPdfUrl: (id: string) => `${API_URL}/certificates/${id}/pdf/`,

  verify: (number: string) =>
    api.get(`/student/certificates/verify/?number=${number}`),
};
