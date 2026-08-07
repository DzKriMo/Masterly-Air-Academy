import api from '@/lib/api';

export interface NotificationPreferences {
  id?: string;
  email_enabled: boolean;
  in_app_enabled: boolean;
  muted_types: string[];
  updated_at?: string;
}

export const NotificationPreferencesService = {
  get: async (): Promise<NotificationPreferences> => {
    const { data } = await api.get<NotificationPreferences>('/notifications/preferences/');
    return data as NotificationPreferences;
  },

  update: async (prefs: Partial<NotificationPreferences>): Promise<NotificationPreferences> => {
    const { data } = await api.patch<NotificationPreferences>('/notifications/preferences/', prefs);
    return data as NotificationPreferences;
  },
};
