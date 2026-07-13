import { useTranslation as useI18nTranslation } from 'react-i18next';
import { useCallback } from 'react';
import { useUIStore } from '@/store/ui-store';
import { I18nManager } from 'react-native';

function isRTL(locale: string): boolean {
  return locale === 'ar';
}

export function useTranslation() {
  const { t, i18n } = useI18nTranslation();
  const { locale: storeLocale, setLocale: storeSetLocale } = useUIStore();

  const switchTo = useCallback(
    (locale: string) => {
      i18n.changeLanguage(locale);

      const shouldBeRTL = isRTL(locale);
      if (I18nManager.isRTL !== shouldBeRTL) {
        I18nManager.forceRTL(shouldBeRTL);
        I18nManager.allowRTL(shouldBeRTL);
      }

      storeSetLocale(locale);
    },
    [i18n, storeSetLocale],
  );

  return {
    t,
    locale: i18n.language || storeLocale,
    switchTo,
  };
}
