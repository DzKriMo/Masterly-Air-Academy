import { create } from 'zustand';
import { storeLocale, getLocale } from '@/lib/storage';
import i18n from 'i18next';
import { I18nManager } from 'react-native';

interface UIState {
  locale: string;
  sidebarOpen: boolean;
  initialized: boolean;
}

interface UIActions {
  setLocale: (locale: string) => void;
  initLocale: () => Promise<void>;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

type UIStore = UIState & UIActions;

function isRTL(locale: string): boolean {
  return locale === 'ar';
}

export const useUIStore = create<UIStore>((set, get) => ({
  locale: 'en',
  sidebarOpen: false,
  initialized: false,

  initLocale: async () => {
    if (get().initialized) return;
    const savedLocale = await getLocale();
    i18n.changeLanguage(savedLocale);
    const shouldBeRTL = isRTL(savedLocale);
    if (I18nManager.isRTL !== shouldBeRTL) {
      I18nManager.forceRTL(shouldBeRTL);
      I18nManager.allowRTL(shouldBeRTL);
    }
    set({ locale: savedLocale, initialized: true });
  },

  setLocale: (locale) => {
    storeLocale(locale);
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
