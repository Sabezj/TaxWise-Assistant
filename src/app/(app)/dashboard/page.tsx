
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataInputForm } from "@/components/dashboard/data-input-form";
import { DocumentUpload } from "@/components/dashboard/document-upload";
import { DeductionSuggestions } from "@/components/dashboard/deduction-suggestions";
import { ExportDocuments } from "@/components/dashboard/export-documents";
import type { FinancialData, UploadedDocument, MonetaryAmount, Currency, UserProfile, AuditLogAction, UserUploadedDocForExport } from "@/types";
import { getDeductionSuggestions, type SuggestionRequestPayload, logUserAction, exportUserDocuments as exportUserDocumentsAction } from "@/lib/actions";
import type { SuggestDeductionsOutput } from "@/ai/flows/suggest-deductions";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, FileText, DollarSign, FileArchive, Loader2, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useI18n } from '@/contexts/i18n-context';
import { storage, db, auth } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject as deleteFirebaseStorageObject, getBlob } from 'firebase/storage';
import { doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, writeBatch, deleteDoc as deleteFirestoreDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { useRouter } from 'next/navigation';


const FINANCIAL_DATA_COLLECTION = "userFinancialData";
const UPLOADED_DOCS_METADATA_COLLECTION = "userDocumentMetadata";

const getDefaultMonetaryAmount = (value: number = 0, currency: Currency): MonetaryAmount => ({ value, currency });

// This is the definitive "empty" or "new user" state for financial data.
const getEmptyFinancialData = (defaultCurrency: Currency): FinancialData => ({
  income: {
    job: getDefaultMonetaryAmount(0, defaultCurrency),
    investments: getDefaultMonetaryAmount(0, defaultCurrency),
    propertyIncome: getDefaultMonetaryAmount(0, defaultCurrency),
    credits: getDefaultMonetaryAmount(0, defaultCurrency),
    otherIncomeDetails: "",
  },
  expenses: {
    medical: getDefaultMonetaryAmount(0, defaultCurrency),
    educational: getDefaultMonetaryAmount(0, defaultCurrency),
    social: getDefaultMonetaryAmount(0, defaultCurrency),
    property: getDefaultMonetaryAmount(0, defaultCurrency),
    otherExpensesDetails: "",
  }
});


export default function DashboardPage() {
  const { t, currency: globalCurrency } = useI18n();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestDeductionsOutput | undefined>(undefined);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [isSubmittingFinancialData, setIsSubmittingFinancialData] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isClearingData, setIsClearingData] = useState(false);
  const [isUploadingDocs, setIsUploadingDocs] = useState(false);
  const [isLoadingPageData, setIsLoadingPageData] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setIsMounted(true); 
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setCurrentUser(user);
        const userProfileRef = doc(db, "userProfiles", user.uid);
        const docSnap = await getDoc(userProfileRef);
        if (docSnap.exists()) {
          setCurrentUserProfile({ id: docSnap.id, ...docSnap.data() } as UserProfile);
        } else {
          setCurrentUserProfile(null);
          router.push('/login');
        }
      } else {
        setCurrentUser(null);
        setCurrentUserProfile(null);
        setFinancialData(null);
        setDocuments([]);
        setIsLoadingPageData(false);
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const loadData = async () => {
      if (!currentUser || !currentUserProfile) {
        setIsLoadingPageData(false);
        setFinancialData(getEmptyFinancialData(globalCurrency)); // Use empty for non-user or pre-profile load
        setDocuments([]);
        return;
      }
      setIsLoadingPageData(true);
      try {
        // Load Financial Data
        const financialDataRef = doc(db, FINANCIAL_DATA_COLLECTION, currentUser.uid);
        const finDocSnap = await getDoc(financialDataRef);
        if (finDocSnap.exists()) {
          setFinancialData(finDocSnap.data() as FinancialData);
        } else {
          // If no data in Firestore, set to initial EMPTY state AND save it.
          const emptyData = getEmptyFinancialData(globalCurrency);
          await setDoc(financialDataRef, emptyData); 
          setFinancialData(emptyData);
        }

        // Load Documents Metadata
        const userDocsMetaRef = doc(db, UPLOADED_DOCS_METADATA_COLLECTION, currentUser.uid);
        const docsMetaSnap = await getDoc(userDocsMetaRef);
        if (docsMetaSnap.exists() && docsMetaSnap.data()?.documents) {
          setDocuments(docsMetaSnap.data()?.documents as UploadedDocument[]);
        } else {
          setDocuments([]);
          // Create an empty doc metadata if it doesn't exist to avoid issues on first upload
           await setDoc(userDocsMetaRef, { documents: [] });
        }
      } catch (error) {
        console.error("Error loading user data from Firestore:", error);
        setFinancialData(getEmptyFinancialData(globalCurrency)); // Fallback on error
        setDocuments([]);
        toast({ title: t("dashboard.toast.loadErrorFirestore"), description: (error as Error).message, variant: "destructive" });
      }
      setIsLoadingPageData(false);
    };

    if (isMounted && currentUser && currentUserProfile) {
      loadData();
    } else if (!currentUser && isMounted) {
      setIsLoadingPageData(false);
      setFinancialData(getEmptyFinancialData(globalCurrency)); // Ensure empty state if no user but mounted
      setDocuments([]);
    }
  }, [currentUser, currentUserProfile, isMounted, toast, t, globalCurrency]);


  const handleFinancialDataSubmit = useCallback(async (data: FinancialData) => {
    if (!currentUser || !currentUserProfile) {
      toast({ title: t("errors.notAuthenticated"), description: t("errors.notAuthenticatedDescription"), variant: "destructive" });
      return;
    }
    setIsSubmittingFinancialData(true);
    try {
      const financialDataRef = doc(db, FINANCIAL_DATA_COLLECTION, currentUser.uid);
      await setDoc(financialDataRef, data); // This will create if not exists, or overwrite
      setFinancialData(data); 
      await logUserAction(currentUser.uid, currentUserProfile.name || currentUserProfile.email || "User", "Financial Data Saved");
      toast({
        title: t("dashboard.dataInputForm.toast.savedFirestore"),
        description: t("dashboard.dataInputForm.toast.savedDescriptionFirestore"),
      });
    } catch (error) {
      console.error("Error saving financial data to Firestore:", error);
      toast({
        title: t("dashboard.dataInputForm.toast.saveErrorFirestore"),
        description: (error as Error).message,
        variant: "destructive",
      });
    }
    setIsSubmittingFinancialData(false);
  }, [currentUser, currentUserProfile, toast, t]);

  const handleNewDocuments = useCallback(async (newFiles: File[]) => {
    if (!currentUser || !currentUserProfile) {
      toast({ title: t("errors.notAuthenticated"), description: t("errors.notAuthenticatedDescription"), variant: "destructive" });
      return;
    }
    setIsUploadingDocs(true);
    const userDocsMetaRef = doc(db, UPLOADED_DOCS_METADATA_COLLECTION, currentUser.uid);

    let successfulUploadsCount = 0;
    for (const file of newFiles) {
      const uniqueFileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
      const storagePath = `userDocuments/${currentUser.uid}/${uniqueFileName}`;
      const fileRef = ref(storage, storagePath);
      try {
        await uploadBytes(fileRef, file);
        const newDocMetadata: UploadedDocument = {
          id: uniqueFileName,
          name: file.name,
          type: file.type,
          size: file.size,
          storagePath: storagePath,
        };
        await updateDoc(userDocsMetaRef, {
          documents: arrayUnion(newDocMetadata)
        });
        setDocuments(prevDocs => [...prevDocs, newDocMetadata]);
        await logUserAction(currentUser.uid, currentUserProfile.name || currentUserProfile.email || "User", "Document Uploaded", `File: ${file.name}`);
        successfulUploadsCount++;
      } catch (uploadError) {
        console.error(`Error uploading ${file.name}:`, uploadError);
        toast({ title: t("dashboard.documentUpload.toast.fileUploadSingleError", { fileName: file.name }), description: (uploadError as Error).message, variant: "destructive" });
      }
    }

    if (successfulUploadsCount > 0) {
      toast({
        title: t("dashboard.documentUpload.toast.docsUpdated"),
        description: t("dashboard.documentUpload.toast.docsUploadedCount", { count: successfulUploadsCount }),
      });
    }
    setIsUploadingDocs(false);
  }, [currentUser, currentUserProfile, toast, t]);

  const handleRemoveDocument = useCallback(async (docToRemove: UploadedDocument) => {
    if (!currentUser || !currentUserProfile) {
      toast({ title: t("errors.notAuthenticated"), description: t("errors.notAuthenticatedDescription"), variant: "destructive" });
      return;
    }
    if (!docToRemove.storagePath) {
        toast({ title: t("errors.defaultErrorTitle"), description: "Document storage path is missing.", variant: "destructive"});
        return;
    }
    const fileRef = ref(storage, docToRemove.storagePath);
    try {
      await deleteFirebaseStorageObject(fileRef);
      const userDocsMetaRef = doc(db, UPLOADED_DOCS_METADATA_COLLECTION, currentUser.uid);
      // To remove an item from an array in Firestore, we need to fetch the doc, filter the array, and set it again.
      // Or, if the object is exactly the same, arrayRemove might work. For robustness, fetch-filter-set is safer.
      const docSnap = await getDoc(userDocsMetaRef);
      if (docSnap.exists()) {
          const currentDocs = (docSnap.data()?.documents || []) as UploadedDocument[];
          const updatedDocs = currentDocs.filter(d => d.id !== docToRemove.id);
          await updateDoc(userDocsMetaRef, { documents: updatedDocs });
      }
      setDocuments(prevDocs => prevDocs.filter(d => d.id !== docToRemove.id));
      await logUserAction(currentUser.uid, currentUserProfile.name || currentUserProfile.email || "User", "Document Removed", `File: ${docToRemove.name}`);
      toast({ title: t("dashboard.documentUpload.toast.docRemovedTitle"), description: t("dashboard.documentUpload.toast.docRemovedDescription", { name: docToRemove.name }) });
    } catch (error) {
      console.error(`Error removing document ${docToRemove.name}:`, error);
      toast({ title: t("dashboard.documentUpload.toast.docRemoveErrorTitle"), description: (error as Error).message, variant: "destructive" });
    }
  }, [currentUser, currentUserProfile, toast, t]);


  const handleGetSuggestions = async () => {
    if (!currentUser || !currentUserProfile) {
      toast({ title: t("errors.notAuthenticated"), description: t("errors.notAuthenticatedDescription"), variant: "destructive" });
      return;
    }
    if (!financialData) {
      toast({
        title: t("dashboard.deductionSuggestions.toast.missingData"),
        description: t("dashboard.deductionSuggestions.toast.missingDataDescriptionFirestore"),
        variant: "destructive",
      });
      return;
    }

    setIsLoadingSuggestions(true);
    setSuggestionError(null);
    setSuggestions(undefined);

    const documentDataUrls: string[] = [];
    if (documents && documents.length > 0) {
      for (const docMeta of documents) {
        if (!docMeta.storagePath) continue;
        try {
          const fileRef = ref(storage, docMeta.storagePath);
          const blob = await getBlob(fileRef);
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          documentDataUrls.push(dataUrl);
        } catch (error) {
          console.error(`Failed to get data URI for ${docMeta.name}:`, error);
          toast({title: t("dashboard.toast.fetchErrorDocAI", { name: docMeta.name }), description: (error as Error).message, variant: "destructive"})
        }
      }
    }
    

    const payload: SuggestionRequestPayload = {
      financialData,
      documentsDataUrls: documentDataUrls,
    };

    const result = await getDeductionSuggestions(currentUser.uid, currentUserProfile.name || currentUserProfile.email || "User", payload);

    if ('error' in result) {
      setSuggestionError(result.error);
      toast({
        title: t("dashboard.deductionSuggestions.toast.suggestionError"),
        description: result.error,
        variant: "destructive",
      });
    } else {
      setSuggestions(result);
      toast({
        title: t("dashboard.deductionSuggestions.toast.suggestionsGenerated"),
        description: t("dashboard.deductionSuggestions.toast.suggestionsGeneratedDescription"),
      });
    }
    setIsLoadingSuggestions(false);
  };

  const handleClearAllData = async () => {
    if (!currentUser || !currentUserProfile) {
      toast({ title: t("errors.notAuthenticated"), description: t("errors.notAuthenticatedDescription"), variant: "destructive" });
      return;
    }
    setIsClearingData(true);
    
    try {
      const batch = writeBatch(db);

      // Clear Financial Data
      const financialDataRef = doc(db, FINANCIAL_DATA_COLLECTION, currentUser.uid);
      const emptyFinData = getEmptyFinancialData(globalCurrency);
      batch.set(financialDataRef, emptyFinData);
      setFinancialData(emptyFinData); 

      setSuggestions(undefined);
      setSuggestionError(null);

      // Clear Documents Metadata from Firestore
      const userDocsMetaRef = doc(db, UPLOADED_DOCS_METADATA_COLLECTION, currentUser.uid);
      batch.set(userDocsMetaRef, { documents: [] });
      
      // Delete files from Firebase Storage
      for (const docMeta of documents) { 
        if (!docMeta.storagePath) continue;
        const fileRef = ref(storage, docMeta.storagePath);
        try {
          await deleteFirebaseStorageObject(fileRef);
        } catch (error) {
          console.warn(`Could not delete ${docMeta.storagePath} from Firebase Storage during clear all:`, error);
        }
      }
      setDocuments([]); 

      await batch.commit();
      await logUserAction(currentUser.uid, currentUserProfile.name || currentUserProfile.email || "User", "All Data Cleared");
      toast({
        title: t("dashboard.toast.dataCleared"),
        description: t("dashboard.toast.dataClearedDescriptionFirestore"),
      });
    } catch (error) {
      console.error("Error clearing data from Firestore/Storage:", error);
      toast({
        title: t("dashboard.toast.clearErrorFirestore"),
        description: (error as Error).message,
        variant: "destructive",
      });
    }
    setIsClearingData(false);
  };

  const handleExportDocuments = useCallback(async (category: TaxExportCategory, docsToExport: UserUploadedDocForExport[]) => {
    if (!currentUser || !currentUserProfile) {
        toast({ title: t("errors.notAuthenticated"), variant: "destructive" });
        return { error: t("errors.notAuthenticatedDescription") };
    }
    return exportUserDocumentsAction(
        currentUser.uid, 
        currentUserProfile.name || currentUserProfile.email || "User", 
        category, 
        docsToExport
    );
  }, [currentUser, currentUserProfile, toast, t]);


  if (!isMounted || isLoadingPageData || !currentUser || !currentUserProfile) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">{t('loadingText') || "Loading Dashboard..."}</p>
      </div>
    );
  }
  
  if (!financialData) { 
      return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">{t('dashboard.initializing') || "Initializing data..."}</p>
      </div>
    );
  }

  const isFinancialDataEffectivelyEmptyForSave = (data: FinancialData | null): boolean => {
    if (!data) return true;
    const { income, expenses } = data;
    const isIncomeEmpty =
      income.job.value === 0 &&
      income.investments.value === 0 &&
      income.propertyIncome.value === 0 &&
      income.credits.value === 0;
      // We don't check otherIncomeDetails for "emptiness" to disable save
    const isExpensesEmpty =
      expenses.medical.value === 0 &&
      expenses.educational.value === 0 &&
      expenses.social.value === 0 &&
      expenses.property.value === 0;
      // We don't check otherExpensesDetails for "emptiness" to disable save
    return isIncomeEmpty && isExpensesEmpty;
  };
  
  const hasAnyDataForClearButton = !isFinancialDataEffectivelyEmptyForSave(financialData) || documents.length > 0 || !!suggestions;


  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-4 sm:mb-0">{t('taxwiseDashboard')}</h1>
        {hasAnyDataForClearButton && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={isClearingData}>
                {isClearingData ? (
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                {t('dashboard.clearAllData.clearButton')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('confirmClearDataTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('confirmClearDataDescriptionFirestore')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearAllData} className="bg-destructive hover:bg-destructive/90">
                  {t('confirmClearDataAction')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        <div className="lg:col-span-2 space-y-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl">
                <DollarSign className="mr-3 h-7 w-7 text-primary" />
                {t('financialDataInputTitle')}
              </CardTitle>
              <CardDescription>
                {t('financialDataInputDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataInputForm
                onSubmit={handleFinancialDataSubmit}
                initialData={financialData} // This will be the current state from Firestore or empty
                isSubmitting={isSubmittingFinancialData}
                key={JSON.stringify(financialData)} 
              />
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl">
                <FileText className="mr-3 h-7 w-7 text-primary" />
                {t('documentUploadTitle')}
              </CardTitle>
              <CardDescription>
                {t('documentUploadDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentUpload
                uploadedDocuments={documents}
                onNewFiles={handleNewDocuments}
                onRemoveDocument={handleRemoveDocument}
                isUploading={isUploadingDocs}
              />
            </CardContent>
          </Card>
        </div>


        <div className="lg:col-span-1 space-y-8">
           <Card className="shadow-lg sticky top-20">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl">
                <Sparkles className="mr-3 h-7 w-7 text-accent" />
                {t('aiDeductionHelperTitle')}
              </CardTitle>
              <CardDescription>
                {t('aiDeductionHelperDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <Button
                onClick={handleGetSuggestions}
                disabled={isLoadingSuggestions || isFinancialDataEffectivelyEmptyForSave(financialData) || !currentUserProfile}
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                size="lg"
              >
                {isLoadingSuggestions ? (
                   <>
                    <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
                    {t('dashboard.clearAllData.analyzing')}
                   </>
                ) : (
                  <> <Sparkles className="mr-2 h-5 w-5" /> {t('getDeductionSuggestions')} </>
                )}
              </Button>
              <DeductionSuggestions
                suggestions={suggestions}
                isLoading={isLoadingSuggestions}
                error={suggestionError}
              />
            </CardContent>
          </Card>

          <Card className="shadow-lg">
             <CardHeader>
              <CardTitle className="flex items-center text-2xl">
                <FileArchive className="mr-3 h-7 w-7 text-primary" />
                {t('exportDocumentsTitle')}
              </CardTitle>
              <CardDescription>
                {t('exportDocumentsDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExportDocuments
                userId={currentUser?.uid || "unknown-user"} 
                userName={currentUserProfile?.name || currentUserProfile?.email || "Unknown User"}
                // Pass all uploaded documents, ExportDocuments will use storagePath for generating signed URLs
                uploadedDocuments={documents} 
                onInitiateExport={handleExportDocuments}
                 // hasDataToExport prop is removed as ExportDocuments can determine this internally
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

    