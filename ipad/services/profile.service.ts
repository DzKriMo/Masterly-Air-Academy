import api from '@/lib/api';

export const ProfileService = {
  getProfile: () => api.get('/me/'),

  updateProfile: (data: Record<string, any>) =>
    api.put('/profile/', data),

  getMedicalCertificates: () => api.get('/medical-certificates/'),
};
