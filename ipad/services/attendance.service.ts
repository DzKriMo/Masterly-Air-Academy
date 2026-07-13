import api from '@/lib/api';

export const AttendanceService = {
  getByCourse: (courseId: string) =>
    api.get(`/courses/${courseId}/attendance/`),
};
