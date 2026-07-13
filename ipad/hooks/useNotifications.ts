import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  body: string;
  is_read: boolean;
  created_at: string;
  data?: Record<string, unknown>;
}

export function useNotifications() {
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await api.get<Notification[]>('/notifications/');
      return data as unknown as Notification[];
    },
    refetchInterval: 30000,
  });

  const unreadCount =
    notifications?.filter((n) => !n.is_read).length ?? 0;

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      await api.put(`/notifications/${id}/mark_read/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await api.put('/notifications/mark_all_read/');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return {
    notifications: notifications ?? [],
    unreadCount,
    isLoading,
    markAsRead: markAsRead.mutate,
    markAllRead: markAllRead.mutate,
  };
}
