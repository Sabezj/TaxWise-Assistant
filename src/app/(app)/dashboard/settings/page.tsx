
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { SettingsIcon, Moon, Sun, Bell, Save, CircleDollarSign, Euro, RussianRuble, Loader2 } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/contexts/i18n-context';
import type { Currency, UserSettings, Theme, UserProfile, AuditLogAction } from '@/types';
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import type { User } from "firebase/auth";
import { logUserAction } from '@/lib/actions';
import { useRouter } from 'next/navigation';


const defaultSettings: UserSettings = {
  theme: "system",
  notificationsEnabled: true,
  displayCurrency: "USD",
  language: "en"
};

export default function SettingsPage() {
  const { 
    t, 
    language: globalLanguage, 
    setLanguage: setGlobalLanguage, 
    currency: globalCurrency, 
    setCurrency: setGlobalDisplayCurrency 
  } = useI18n();
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null); // Store full profile
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true); // For auth check

  const [theme, setTheme] = useState<Theme>(defaultSettings.theme);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(defaultSettings.notificationsEnabled);
  const [selectedDisplayCurrency, setSelectedDisplayCurrency] = useState<Currency>(defaultSettings.displayCurrency);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setCurrentUser(user);
        const userProfileRef = doc(db, "userProfiles", user.uid);
        const docSnap = await getDoc(userProfileRef);
        if (docSnap.exists()) {
          setCurrentUserProfile({ id: docSnap.id, ...docSnap.data() } as UserProfile);
        } else {
          // Fallback or redirect if profile doesn't exist, though it should after login/register
          setCurrentUserProfile(null); // Or handle more gracefully
          router.push('/login'); // Example redirect
        }
      } else {
        setCurrentUser(null);
        setCurrentUserProfile(null);
        router.push('/login'); 
      }
      setIsLoadingPermissions(false);
    });
    return () => unsubscribe();
  }, [router]);


  useEffect(() => {
    if (isLoadingPermissions || !currentUser) {
        setIsLoadingSettings(false);
        return;
    }

    const loadSettings = async () => {
      setIsLoadingSettings(true);
      try {
        const settingsRef = doc(db, "userSettings", currentUser.uid);
        const docSnap = await getDoc(settingsRef);
        if (docSnap.exists()) {
          const firestoreSettings = docSnap.data() as UserSettings;
          setTheme(firestoreSettings.theme || defaultSettings.theme);
          setNotificationsEnabled(firestoreSettings.notificationsEnabled !== undefined ? firestoreSettings.notificationsEnabled : defaultSettings.notificationsEnabled);
          setSelectedDisplayCurrency(firestoreSettings.displayCurrency || globalCurrency || defaultSettings.displayCurrency);
          // Language is set by I18nProvider based on Firestore/localStorage
          if (firestoreSettings.language && firestoreSettings.language !== globalLanguage) {
            setGlobalLanguage(firestoreSettings.language);
          }
          if (firestoreSettings.displayCurrency && firestoreSettings.displayCurrency !== globalCurrency) {
            setGlobalDisplayCurrency(firestoreSettings.displayCurrency);
          }
        } else {
          // User has logged in, but no settings doc yet. Use defaults from context/localStorage and save.
          setTheme(defaultSettings.theme);
          setNotificationsEnabled(defaultSettings.notificationsEnabled);
          setSelectedDisplayCurrency(globalCurrency || defaultSettings.displayCurrency);
          setGlobalLanguage(globalLanguage || defaultSettings.language);
          await setDoc(settingsRef, {
            ...defaultSettings,
            language: globalLanguage || defaultSettings.language, 
            displayCurrency: globalCurrency || defaultSettings.displayCurrency 
          }); 
        }
      } catch (error) {
        console.error("Error loading settings from Firestore:", error);
        toast({ title: t("settingsPage.toast.loadError"), description: (error as Error).message, variant: "destructive" });
        setTheme(defaultSettings.theme);
        setNotificationsEnabled(defaultSettings.notificationsEnabled);
        setSelectedDisplayCurrency(globalCurrency || defaultSettings.displayCurrency);
      }
      setIsLoadingSettings(false);
    };
    loadSettings();
  }, [currentUser, isLoadingPermissions, t, toast, globalCurrency, globalLanguage, setGlobalLanguage, setGlobalDisplayCurrency]);


  useEffect(() => {
    setSelectedDisplayCurrency(globalCurrency);
  }, [globalCurrency]);

  useEffect(() => {
    if (isLoadingSettings || isLoadingPermissions) return; 
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme, isLoadingSettings, isLoadingPermissions]);


  const handleSaveChanges = async () => {
    if (!currentUser || !currentUserProfile) {
      toast({ title: t("errors.notAuthenticated"), description: t("errors.notAuthenticatedDescription"), variant: "destructive" });
      return;
    }
    setIsSaving(true);
    const settingsToSave: UserSettings = {
      theme,
      notificationsEnabled,
      displayCurrency: selectedDisplayCurrency,
      language: globalLanguage, 
    };
    try {
      const settingsRef = doc(db, "userSettings", currentUser.uid);
      await setDoc(settingsRef, settingsToSave, { merge: true });

      setGlobalDisplayCurrency(selectedDisplayCurrency);
      // setGlobalLanguage is handled by I18nProvider for immediate UI, Firestore saves for persistence

      await logUserAction(
        currentUser.uid, 
        currentUserProfile.name || currentUserProfile.email, 
        "Settings Saved", 
        `Theme: ${theme}, Notifications: ${notificationsEnabled}, Currency: ${selectedDisplayCurrency}, Language: ${globalLanguage}`
      );

      toast({
        title: t("settingsPage.toast.saved"),
        description: t("settingsPage.toast.savedDescription"),
      });
    } catch (error) {
      console.error("Error saving settings to Firestore:", error);
      toast({ title: t("settingsPage.toast.saveError"), description: (error as Error).message, variant: "destructive" });
    }
    setIsSaving(false);
  };

  const currencyOptions: { value: Currency; labelKey: string; icon: React.ElementType }[] = [
    { value: "USD", labelKey: "settingsPage.currency.usd", icon: CircleDollarSign },
    { value: "EUR", labelKey: "settingsPage.currency.eur", icon: Euro },
    { value: "RUB", labelKey: "settingsPage.currency.rub", icon: RussianRuble },
  ];

  if (isLoadingPermissions || isLoadingSettings || !currentUserProfile) { // Check currentUserProfile as well
    return (
      <div className="container mx-auto py-8 px-4 md:px-0 flex items-center justify-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">{t('settingsPage.loadingSettings')}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
      <h1 className="text-3xl font-bold mb-8 text-foreground">{t('settingsPage.title')}</h1>
      <Card className="shadow-lg max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <SettingsIcon className="mr-3 h-7 w-7 text-primary" />
            {t('settingsPage.preferencesCard.title')}
          </CardTitle>
          <CardDescription>
            {t('settingsPage.preferencesCard.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">{t('settingsPage.appearance.title')}</h3>
            <RadioGroup value={theme} onValueChange={(value) => setTheme(value as Theme)}>
              <Label className="text-base mb-2">{t('settingsPage.appearance.themeLabel')}</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(["light", "dark", "system"] as Theme[]).map((value) => (
                  <Label
                    key={value}
                    htmlFor={`theme-${value}`}
                    className={`flex flex-col items-center justify-center rounded-md border-2 p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer
                      ${theme === value ? "border-primary ring-2 ring-primary" : "border-muted"}`}
                  >
                    <RadioGroupItem value={value} id={`theme-${value}`} className="sr-only" />
                    {value === "light" && <Sun className="h-8 w-8 mb-2" />}
                    {value === "dark" && <Moon className="h-8 w-8 mb-2" />}
                    {value === "system" && <SettingsIcon className="h-8 w-8 mb-2" />}
                    <span className="capitalize">{t(`settingsPage.appearance.theme.${value}`)}</span>
                  </Label>
                ))}
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">{t('settingsPage.currency.title')}</h3>
            <RadioGroup value={selectedDisplayCurrency} onValueChange={(value) => setSelectedDisplayCurrency(value as Currency)}>
              <Label className="text-base mb-2">{t('settingsPage.currency.currencyLabel')}</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {currencyOptions.map(({ value, labelKey, icon: Icon }) => (
                  <Label
                    key={value}
                    htmlFor={`currency-${value}`}
                    className={`flex flex-col items-center justify-center rounded-md border-2 p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer
                      ${selectedDisplayCurrency === value ? "border-primary ring-2 ring-primary" : "border-muted"}`}
                  >
                    <RadioGroupItem value={value} id={`currency-${value}`} className="sr-only" />
                    <Icon className="h-8 w-8 mb-2" />
                    <span className="capitalize">{t(labelKey)}</span>
                  </Label>
                ))}
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">{t('settingsPage.notifications.title')}</h3>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="notifications-switch" className="text-base flex items-center">
                  <Bell className="mr-2 h-5 w-5 text-muted-foreground" />
                  {t('settingsPage.notifications.enableEmailLabel')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('settingsPage.notifications.enableEmailDescription')}
                </p>
              </div>
              <Switch
                id="notifications-switch"
                checked={notificationsEnabled}
                onCheckedChange={setNotificationsEnabled}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t('settingsPage.notifications.moreSettingsSoon')}
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveChanges} disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? (
               <>
                <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
                {t('settingsPage.savingButton')}
               </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" /> {t('settingsPage.saveButton')}
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
