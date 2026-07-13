import api from '@/lib/api';

export const ExamsService = {
  list: () => api.get('/exams/'),

  get: (id: string) => api.get(`/exams/${id}/`),

  start: (id: string) => api.post(`/exams/${id}/start/`),

  submit: (examId: string, attemptId: string, answers: Record<string, any>) =>
    api.post(`/exams/${examId}/submit/`, { attempt_id: attemptId, answers }),

  myAttempts: () => api.get('/exams/my_attempts/'),
};
