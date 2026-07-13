import api from '@/lib/api';

export const AuthService = {
  login: (email: string, password: string) =>
    api.post('/login/', { email, password }),

  logout: () => api.post('/logout/'),

  getProfile: () => api.get('/me/'),

  updateProfile: (data: Record<string, any>) =>
    api.put('/profile/', data),
};
