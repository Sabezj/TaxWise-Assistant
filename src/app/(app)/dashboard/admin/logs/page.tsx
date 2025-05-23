
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { ShieldAlert, Eye, Filter, Loader2, ArrowDownUp } from "lucide-react";
import type { AuditLogEntry, UserProfile } from "@/types"; // Added UserProfile
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format, subDays, subHours, subMinutes } from 'date-fns';
import { useI18n } from '@/contexts/i18n-context';
import { enUS, ru } from 'date-fns/locale';
import { getAuditLogs, logUserAction } from '@/lib/actions'; // Import getAuditLogs
import { auth, db } from "@/lib/firebase"; // Import auth for current user
import { doc, getDoc } from "firebase/firestore"; // Import getDoc
import type { User as FirebaseUser } from 'firebase/auth';
import { useRouter } from 'next/navigation'; // Import useRouter

// Mock action translations are no longer needed if actions are logged with consistent keys
const getTranslatedAction = (actionKey: string, t: Function): string => {
  const keyMap: Record<string, string> = {
    "Login Success": "auditLogActions.loginSuccess",
    "User Registered": "auditLogActions.userRegistered",
    "Profile Updated": "auditLogActions.profileUpdated",
    "Avatar Changed": "auditLogActions.avatarChanged",
    "Settings Saved": "auditLogActions.settingsSaved",
    "Financial Data Saved": "auditLogActions.financialDataSaved",
    "Document Uploaded": "auditLogActions.documentUploaded",
    "Document Removed": "auditLogActions.documentRemoved",
    "AI Suggestions Requested": "auditLogActions.aiSuggestionsRequested",
    "User Created by Admin": "auditLogActions.userCreatedByAdmin",
    "User Role Changed by Admin": "auditLogActions.userRoleChangedByAdmin",
    "User Deleted by Admin": "auditLogActions.userDeletedByAdmin",
    "Group Created": "auditLogActions.groupCreated",
    "Document Exported": "auditLogActions.documentExported",
  };
  return t(keyMap[actionKey] || actionKey); 
};

const getTranslatedLogDetail = (detailString: string | undefined, t: Function): string => {
  if (!detailString) return t('adminLogsPage.viewDetails.alert.detailsNotAvailable');
  // For dynamic details, direct translation isn't feasible.
  // We can translate prefixes if they are consistent.
  // Example: If details always start "User: John Doe...", you could translate "User:".
  // For now, we return the detail string as is, assuming it's logged in the desired language or is user-generated content.
  return detailString;
};

type SortKey = keyof AuditLogEntry | null;
type SortDirection = 'asc' | 'desc';


export default function AdminLogsPage() {
  const { t, language } = useI18n();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>('timestamp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);
  const router = useRouter();

  const dateLocale = language === 'ru' ? ru : enUS;

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setCurrentUser(user);
        const userProfileRef = doc(db, "userProfiles", user.uid);
        const docSnap = await getDoc(userProfileRef);
        if (docSnap.exists()) {
          const profile = { id: docSnap.id, ...docSnap.data() } as UserProfile;
          setCurrentUserProfile(profile);
          if (profile.role !== 'admin' && profile.role !== 'superadmin') {
            router.push('/dashboard'); 
          } else {
            fetchLogs(); // Fetch logs only if authorized
          }
        } else {
           router.push('/dashboard');
        }
      } else {
        setCurrentUser(null);
        setCurrentUserProfile(null);
        router.push('/login');
      }
      setIsLoadingPermissions(false);
    });
    return () => unsubscribe();
  }, [router]); // Added router to dependency array

  const fetchLogs = async () => {
    setIsLoading(true);
    const fetchedLogs = await getAuditLogs(100); // Fetch last 100 logs
    setLogs(fetchedLogs);
    setIsLoading(false);
  };

  const handleViewDetails = (log: AuditLogEntry) => {
    const translatedDetail = getTranslatedLogDetail(log.details, t);
    const detailsText = `${t('adminLogsPage.viewDetails.alert.id', {id: log.id})}\n` +
                        `${t('adminLogsPage.viewDetails.alert.user', {userName: log.userName, userId: log.userId})}\n` +
                        `${t('adminLogsPage.viewDetails.alert.action', {action: getTranslatedAction(log.action, t)})}\n` +
                        `${t('adminLogsPage.viewDetails.alert.timestamp', {timestamp: format(new Date(log.timestamp), "PPP p", { locale: dateLocale })})}\n` +
                        `${t('adminLogsPage.viewDetails.alert.detailsLabel')} ${translatedDetail}`;
    alert(`${t('adminLogsPage.viewDetails.alert.title')}\n\n${detailsText}`);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedAndFilteredLogs = logs
    .filter(log =>
        log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getTranslatedAction(log.action, t).toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.details && getTranslatedLogDetail(log.details, t).toLowerCase().includes(searchTerm.toLowerCase())) ||
        log.userId.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
        if (!sortKey) return 0;
        const valA = a[sortKey];
        const valB = b[sortKey];

        if (valA === undefined || valB === undefined) return 0;

        let comparison = 0;
        if (sortKey === 'timestamp') {
          comparison = new Date(valA).getTime() - new Date(valB).getTime();
        } else if (typeof valA === 'string' && typeof valB === 'string') {
          comparison = valA.localeCompare(valB);
        } else {
          if (valA > valB) {
              comparison = 1;
          } else if (valA < valB) {
              comparison = -1;
          }
        }
        return sortDirection === 'desc' ? comparison * -1 : comparison;
    });

  if (isLoadingPermissions || !currentUserProfile) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-0 flex items-center justify-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (currentUserProfile.role !== 'admin' && currentUserProfile.role !== 'superadmin') {
    return (
      <div className="container mx-auto py-8 px-4 md:px-0 text-center">
        <p className="text-muted-foreground">{t('errors.unauthorizedAccess')}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
       <div className="flex flex-col sm:flex-row justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-4 sm:mb-0">{t('adminLogsPage.title')}</h1>
         <div className="relative">
            <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
                type="text"
                placeholder={t('adminLogsPage.filterPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full sm:w-64"
            />
        </div>
      </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <ShieldAlert className="mr-3 h-7 w-7 text-primary" />
            {t('adminLogsPage.loggingCard.title')}
          </CardTitle>
          <CardDescription>
            {t('adminLogsPage.loggingCard.description', { count: sortedAndFilteredLogs.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8 space-x-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-muted-foreground">{t('adminLogsPage.loading')}</p>
            </div>
          ) : sortedAndFilteredLogs.length === 0 && searchTerm ? (
             <p className="text-muted-foreground text-center py-4">{t('adminLogsPage.emptyFilter.message', { searchTerm })}</p>
          ) : sortedAndFilteredLogs.length === 0 ? (
             <p className="text-muted-foreground text-center py-4">{t('adminLogsPage.empty.message')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead onClick={() => handleSort('timestamp')} className="cursor-pointer hover:bg-muted">
                    {t('adminLogsPage.table.header.timestamp')} {sortKey === 'timestamp' && <ArrowDownUp className="inline ml-1 h-4 w-4" />}
                  </TableHead>
                  <TableHead onClick={() => handleSort('userName')} className="cursor-pointer hover:bg-muted">
                    {t('adminLogsPage.table.header.user')} {sortKey === 'userName' && <ArrowDownUp className="inline ml-1 h-4 w-4" />}
                  </TableHead>
                  <TableHead onClick={() => handleSort('action')} className="cursor-pointer hover:bg-muted">
                    {t('adminLogsPage.table.header.action')} {sortKey === 'action' && <ArrowDownUp className="inline ml-1 h-4 w-4" />}
                  </TableHead>
                  <TableHead>{t('adminLogsPage.table.header.details')}</TableHead>
                  <TableHead className="text-right">{t('adminLogsPage.table.header.view')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAndFilteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss", { locale: dateLocale })}</TableCell>
                    <TableCell className="font-medium">{log.userName} <span className="text-xs text-muted-foreground">({log.userId})</span></TableCell>
                    <TableCell>{getTranslatedAction(log.action, t)}</TableCell>
                    <TableCell className="truncate max-w-xs" title={getTranslatedLogDetail(log.details, t)}>{getTranslatedLogDetail(log.details, t)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleViewDetails(log)} title={t('adminLogsPage.viewDetails.title')}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableCaption>{t('adminLogsPage.table.caption')}</TableCaption>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
