
"use client";

import React, { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { FileArchive, DownloadCloud, ListChecks, Info, Users, BarChartHorizontalBig, HeartPulse, GraduationCap, Home, Package, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
// Removed direct import of server action: import { exportUserDocuments } from "@/lib/actions";
import { useI18n } from '@/contexts/i18n-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { TaxExportCategory, ExportCategoryDetails, UploadedDocument, UserUploadedDocForExport } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getDownloadURL, ref as storageRef } from "firebase/storage";
import { storage } from "@/lib/firebase";

interface ExportDocumentsProps {
  userId: string;
  userName: string;
  hasDataToExport: boolean;
  uploadedDocuments: UploadedDocument[];
  onInitiateExport: (category: TaxExportCategory, documentsToExport: UserUploadedDocForExport[]) => Promise<{ downloadUrl?: string; filename?: string; error?: string; message?: string }>;
}

const exportCategories: ExportCategoryDetails[] = [
  { value: "medical", labelKey: "exportCategories.medical", requiredDocsKey: "exportCategories.medicalDocs", sampleDocName: "medical_KND1151156.pdf.pdf", icon: HeartPulse },
  { value: "educational", labelKey: "exportCategories.educational", requiredDocsKey: "exportCategories.educationalDocs", sampleDocName: "educational_KND1151158.pdf", icon: GraduationCap },
  { value: "property", labelKey: "exportCategories.property", requiredDocsKey: "exportCategories.propertyDocs", sampleDocName: "property_KND1150117.pdf", icon: Home },
  { value: "social", labelKey: "exportCategories.social", requiredDocsKey: "exportCategories.socialDocs", sampleDocName: "social_KND1150130.pdf", icon: Users },
  { value: "investments", labelKey: "exportCategories.investments", requiredDocsKey: "exportCategories.investmentsDocs", sampleDocName: "investments_KND1150145.pdf", icon: BarChartHorizontalBig },
  { value: "general", labelKey: "exportCategories.general", requiredDocsKey: "exportCategories.generalDocs", icon: Package }
];


export function ExportDocuments({ userId, userName, hasDataToExport, uploadedDocuments, onInitiateExport }: ExportDocumentsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isPreparingSignedUrls, setIsPreparingSignedUrls] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<TaxExportCategory | null>(null);
  const { toast } = useToast();
  const { t } = useI18n();

  const handleExport = async () => {
    if (!selectedCategory) {
      toast({
        title: t("dashboard.exportDocuments.toast.noCategorySelectedTitle"),
        description: t("dashboard.exportDocuments.toast.noCategorySelectedDescription"),
        variant: "destructive",
      });
      return;
    }
    
    setIsPreparingSignedUrls(true);
    toast({
      title: t("dashboard.exportDocuments.toast.preparingSignedUrlsTitle"),
      description: t("dashboard.exportDocuments.toast.preparingSignedUrlsDescription"),
    });

    const documentsToExport: UserUploadedDocForExport[] = [];
    try {
      for (const doc of uploadedDocuments) {
        if (doc.storagePath) {
          const fileRef = storageRef(storage, doc.storagePath);
          const signedUrl = await getDownloadURL(fileRef);
          documentsToExport.push({ filename: doc.name, signedUrl });
        }
      }
    } catch (error) {
      console.error("Error generating signed URLs:", error);
      toast({
        title: t("dashboard.exportDocuments.toast.signedUrlErrorTitle"),
        description: t("dashboard.exportDocuments.toast.signedUrlErrorDescription", { error: (error as Error).message }),
        variant: "destructive",
      });
      setIsPreparingSignedUrls(false);
      return;
    }
    setIsPreparingSignedUrls(false);
    setIsExporting(true);

    toast({
      title: t("dashboard.exportDocuments.toast.exportStarted"),
      description: t("dashboard.exportDocuments.toast.exportStartedDescription"),
    });

    try {
      const result = await onInitiateExport(selectedCategory, documentsToExport);

      if (result.downloadUrl && result.filename) {
         toast({
            title: t("dashboard.exportDocuments.toast.exportReady"),
            description: result.message || t("dashboard.exportDocuments.toast.exportReadyDescription"),
            duration: 7000, // Longer duration for download link
            action: (
                <Button variant="outline" size="sm" asChild>
                    <a href={result.downloadUrl} download={result.filename}>
                        <DownloadCloud className="mr-2 h-4 w-4" /> {t("dashboard.exportDocuments.toast.downloadButton")}
                    </a>
                </Button>
            ),
        });
      } else if (result.error) {
         toast({
            title: t("dashboard.exportDocuments.toast.exportFailed"),
            description: result.error,
            variant: "destructive",
        });
      } else {
         toast({
            title: t("dashboard.exportDocuments.toast.exportUnexpectedError"),
            description: result.message || t("dashboard.exportDocuments.toast.exportUnexpectedErrorDescription"),
            variant: "default",
        });
      }

    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: t("dashboard.exportDocuments.toast.exportFailed"),
        description: t("dashboard.exportDocuments.toast.exportFailedDescriptionDefault"),
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const currentCategoryDetails = selectedCategory ? exportCategories.find(cat => cat.value === selectedCategory) : null;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="export-category">{t("dashboard.exportDocuments.selectCategoryLabel")}</Label>
        <Select
          value={selectedCategory || ""}
          onValueChange={(value) => setSelectedCategory(value as TaxExportCategory)}
          disabled={!hasDataToExport || isExporting || isPreparingSignedUrls}
        >
          <SelectTrigger id="export-category" className="w-full">
            <SelectValue placeholder={t("dashboard.exportDocuments.selectCategoryPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {exportCategories.map(cat => {
              const Icon = cat.icon;
              return (
                <SelectItem key={cat.value} value={cat.value}>
                  {Icon && <Icon className="mr-2 h-4 w-4 inline-block text-muted-foreground" />}
                  {t(cat.labelKey)}
                </SelectItem>
              );
            })}
          </SelectContent>
         </Select>
         {!hasDataToExport && (
            <p className="text-xs text-muted-foreground mt-1">
                {t("dashboard.exportDocuments.addDataToEnableCategorySelection")}
            </p>
        )}
      </div>

      {currentCategoryDetails && (
        <Card className="bg-secondary/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center">
                <ListChecks className="mr-2 h-5 w-5 text-primary" />
                {t("dashboard.exportDocuments.requiredDocsTitle")}
            </CardTitle>
            <CardDescription>{t("dashboard.exportDocuments.requiredDocsForCategory", { category: t(currentCategoryDetails.labelKey) })}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              {t(currentCategoryDetails.requiredDocsKey).split(';').map((doc, index) => (
                <li key={index}>{doc.trim()}</li>
              ))}
            </ul>
            {currentCategoryDetails.sampleDocName && (
                <Alert className="mt-3 bg-background">
                    <Info className="h-4 w-4" />
                    <AlertTitle className="text-xs font-semibold">{t("dashboard.exportDocuments.sampleDocInfoTitle")}</AlertTitle>
                    <AlertDescription className="text-xs">
                        {t("dashboard.exportDocuments.sampleDocInfoDescriptionFirebase", { sampleDocName: currentCategoryDetails.sampleDocName })}
                    </AlertDescription>
                </Alert>
            )}
          </CardContent>
        </Card>
      )}

      <Button
        onClick={handleExport}
        disabled={isExporting || isPreparingSignedUrls || !hasDataToExport || !selectedCategory}
        className="w-full"
        size="lg"
      >
        {isPreparingSignedUrls ? (
          <>
            <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
            {t("dashboard.exportDocuments.preparingButton")}
          </>
        ) : isExporting ? (
          <>
            <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
            {t("dashboard.exportDocuments.exportingButton")}
          </>
        ) : (
          <>
            <DownloadCloud className="mr-2 h-5 w-5" /> {t("dashboard.exportDocuments.exportButton")}
          </>
        )}
      </Button>

      {!hasDataToExport && !selectedCategory && (
        <p className="text-xs text-muted-foreground text-center">
          {t("dashboard.exportDocuments.addDataAndSelectCategoryHint")}
        </p>
      )}
    </div>
  );
}
