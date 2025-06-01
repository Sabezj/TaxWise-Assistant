
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import enTranslations from '@/locales/en.json';
import ruTranslations from '@/locales/ru.json';
import type { Currency, MonetaryAmount, CurrencyRates, UserSettings } from '@/types';
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import type { User } from "firebase/auth";

type Translations = Record<string, string>;
export type Language = 'en' | 'ru';

export const AvailableCurrencies: Record<string, Currency> = {
    USD: 'USD',
    EUR: 'EUR',
    RUB: 'RUB',
};

const MOCK_RATES: CurrencyRates = {
  USD: 1,
  EUR: 0.93,
  RUB: 92.5,
};

interface I18nContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
  translations: Translations;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatCurrency: (value: number, targetCurrency?: Currency) => string;
  currencyRates: CurrencyRates | null;
  convertCurrency: (amount: MonetaryAmount, targetCurrency: Currency, ratesToUse: CurrencyRates | null) => number;
  isLoadingSettings: boolean;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const loadedTranslations: Record<Language, Translations> = {
  en: enTranslations,
  ru: ruTranslations,
};

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('en');
  const [translations, setTranslationsState] = useState<Translations>(loadedTranslations.en);
  const [currency, setCurrencyState] = useState<Currency>('USD');
  const [currencyRates, setCurrencyRatesState] = useState<CurrencyRates | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user);

    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loadInitialSettings = async () => {
      setIsLoadingSettings(true);
      let userLang: Language = 'en';
      let userCurrency: Currency = 'USD';

      if (currentUser) {
        try {
          const settingsRef = doc(db, "userSettings", currentUser.uid);
          const docSnap = await getDoc(settingsRef);
          if (docSnap.exists()) {
            const firestoreSettings = docSnap.data() as UserSettings;
            userLang = firestoreSettings.language || 'en';
            userCurrency = firestoreSettings.displayCurrency || 'USD';
          } else {

            const storedLang = localStorage.getItem('app-language') as Language | null;
            if (storedLang && (storedLang === 'en' || storedLang === 'ru')) {
              userLang = storedLang;
            } else {
              const browserLang = typeof navigator !== 'undefined' ? navigator.language.split('-')[0] : 'en';
              userLang = browserLang === 'ru' ? 'ru' : 'en';
            }
            const storedCurrency = localStorage.getItem('app-currency') as Currency | null;
            if (storedCurrency && Object.values(AvailableCurrencies).includes(storedCurrency)) {
              userCurrency = storedCurrency;
            }

            await setDoc(settingsRef, {
                theme: "system",
                notificationsEnabled: true,
                displayCurrency: userCurrency,
                language: userLang
            });
          }
        } catch (error) {
          console.warn("Failed to load settings from Firestore, falling back to localStorage/defaults:", error);

          const storedLang = localStorage.getItem('app-language') as Language | null;
          if (storedLang && (storedLang === 'en' || storedLang === 'ru')) {
            userLang = storedLang;
          } else {
              const browserLang = typeof navigator !== 'undefined' ? navigator.language.split('-')[0] : 'en';
              userLang = browserLang === 'ru' ? 'ru' : 'en';
          }
          const storedCurrency = localStorage.getItem('app-currency') as Currency | null;
          if (storedCurrency && Object.values(AvailableCurrencies).includes(storedCurrency)) {
            userCurrency = storedCurrency;
          }
        }
      } else {
          const storedLang = localStorage.getItem('app-language') as Language | null;
          if (storedLang && (storedLang === 'en' || storedLang === 'ru')) {
            userLang = storedLang;
          } else {
              const browserLang = typeof navigator !== 'undefined' ? navigator.language.split('-')[0] : 'en';
              userLang = browserLang === 'ru' ? 'ru' : 'en';
          }
          const storedCurrency = localStorage.getItem('app-currency') as Currency | null;
          if (storedCurrency && Object.values(AvailableCurrencies).includes(storedCurrency)) {
            userCurrency = storedCurrency;
          }
      }

      setLanguageState(userLang);
      setTranslationsState(loadedTranslations[userLang] || loadedTranslations.en);
      setCurrencyState(userCurrency);

      setCurrencyRatesState(MOCK_RATES);
      setIsLoadingSettings(false);
    };

    loadInitialSettings();
  }, [currentUser]);

  const setLanguage = useCallback((lang: Language) => {
    if (lang === 'en' || lang === 'ru') {
      setLanguageState(lang);
      setTranslationsState(loadedTranslations[lang]);
      localStorage.setItem('app-language', lang);

    }
  }, []);

  const setCurrency = useCallback((curr: Currency) => {
    if (Object.values(AvailableCurrencies).includes(curr)) {
      setCurrencyState(curr);
      localStorage.setItem('app-currency', curr);

    }
  }, []);

  const t = useCallback((key: string, replacements?: Record<string, string | number>): string => {
    let translation = translations[key] || key;
    if (replacements) {
      Object.keys(replacements).forEach((placeholder) => {
        translation = translation.replace(new RegExp(`{{${placeholder}}}`, 'g'), String(replacements[placeholder]));
      });
    }
    return translation;
  }, [translations]);

  const formatCurrency = useCallback((value: number, targetCurrencyParam?: Currency): string => {
    const effectiveCurrency = targetCurrencyParam || currency;
    const effectiveLanguage = language || 'en';

    try {
      return new Intl.NumberFormat(effectiveLanguage, {
        style: 'currency',
        currency: effectiveCurrency,
      }).format(value);
    } catch (e) {
      return `${value.toFixed(2)} ${effectiveCurrency}`;
    }
  }, [language, currency]);

  const convertCurrency = useCallback((
    amount: MonetaryAmount,
    targetCurrency: Currency,
    ratesToUse: CurrencyRates | null
  ): number => {
    if (!ratesToUse) {
      console.warn("Currency rates not available for conversion. Returning original value.");
      return amount.value;
    }
    if (amount.currency === targetCurrency) {
      return amount.value;
    }
    if (!ratesToUse[amount.currency] || !ratesToUse[targetCurrency]) {
        console.warn(`Rate for ${amount.currency} or ${targetCurrency} not found. Returning original value.`);
        return amount.value;
    }

    const valueInUSD = amount.value / ratesToUse[amount.currency];
    const convertedValue = valueInUSD * ratesToUse[targetCurrency];
    return convertedValue;
  }, []);

  return (
    <I18nContext.Provider value={{
      language,
      setLanguage,
      t,
      translations,
      currency,
      setCurrency,
      formatCurrency,
      currencyRates,
      convertCurrency,
      isLoadingSettings
    }}>
      {children}
    </I18nContext.Provider >
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
