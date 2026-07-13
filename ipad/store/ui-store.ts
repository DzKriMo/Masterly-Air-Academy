import { create } from 'zustand';
import { mmkv } from '@/lib/storage';
import i18n from 'i18next';
import { I18nManager } from 'react-native';

const LOCALE_KEY = 'ui_locale';

interface UIState {
  locale: string;
  sidebarOpen: boolean;
}

interface UIActions {
  setLocale: (locale: string) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

type UIStore = UIState & UIActions;

function isRTL(locale: string): boolean {
  return locale === 'ar';
}

export const useUIStore = create<UIStore>((set) => ({
  locale: mmkv.getString(LOCALE_KEY) ?? 'en',
  sidebarOpen: false,

  setLocale: (locale) => {
    mmkv.set(LOCALE_KEY, locale);
    i18n.changeLanguage(locale);

    const shouldBeRTL = isRTL(locale);
    if (I18nManager.isRTL !== shouldBeRTL) {
      I18nManager.forceRTL(shouldBeRTL);
      I18nManager.allowRTL(shouldBeRTL);
    }

    set({ locale });
  },

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
