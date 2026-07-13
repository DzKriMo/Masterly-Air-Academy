import api from '@/lib/api';

export const CoursesService = {
  list: () => api.get('/courses/'),

  get: (id: string) => api.get(`/courses/${id}/`),

  getMaterials: (courseId: string) =>
    api.get(`/courses/${courseId}/materials/`),

  getStudents: (courseId: string) =>
    api.get(`/courses/${courseId}/students/`),

  getAttendance: (courseId: string) =>
    api.get(`/attendance/?course=${courseId}`),
};
