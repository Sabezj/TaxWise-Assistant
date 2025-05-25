
"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { FileArchive, DownloadCloud, ListChecks, Info, Users, BarChartHorizontalBig, HeartPulse, GraduationCap, Home, Package, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from '@/contexts/i18n-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { TaxExportCategory, ExportCategoryDetails, UploadedDocument, UserUploadedDocForExport } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
// Removed direct Firebase imports as they are not directly used here for URL generation anymore.
// URL generation is now expected to be handled by the parent (DashboardPage) via onInitiateExport.

interface ExportDocumentsProps {
  userId: string;
  userName: string;
  uploadedDocuments: UploadedDocument[]; // Used to determine if there's anything to export with
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


export function ExportDocuments({ userId, userName, uploadedDocuments, onInitiateExport }: ExportDocumentsProps) {
  const [isExporting, setIsExporting] = useState(false);
  // isPreparingSignedUrls state is removed as URL prep is now handled by parent via onInitiateExport
  const [selectedCategory, setSelectedCategory] = useState<TaxExportCategory | null>(null);
  const { toast } = useToast();
  const { t } = useI18n();

  // Determine if there's any data for export (e.g., uploaded documents)
  // This component doesn't know about financialData directly, so we rely on uploadedDocuments
  // Parent (DashboardPage) will disable this whole card/component if there's absolutely no financial data.
  const hasDocumentsToExport = uploadedDocuments.length > 0;


  const handleExport = async () => {
    if (!selectedCategory) {
      toast({
        title: t("dashboard.exportDocuments.toast.noCategorySelectedTitle"),
        description: t("dashboard.exportDocuments.toast.noCategorySelectedDescription"),
        variant: "destructive",
      });
      return;
    }
    
    setIsExporting(true);
    toast({
      title: t("dashboard.exportDocuments.toast.exportStarted"),
      description: t("dashboard.exportDocuments.toast.exportStartedDescription"),
    });

    // The parent (DashboardPage) will handle generating signed URLs if needed,
    // and then call the actual exportUserDocumentsAction.
    // For this component, we just need to pass the intent and the category.
    // The `docsToExport` (which are UserUploadedDocForExport[]) will be prepared by onInitiateExport.
    // Here, we assume onInitiateExport expects the raw uploadedDocuments to process.
    // The parent will map these to UserUploadedDocForExport[] with signed URLs.
    // Let's adjust this slightly: onInitiateExport should take just the category,
    // and the parent will prepare the UserUploadedDocForExport[] list.
    // OR, onInitiateExport in DashboardPage is already doing this.
    // This component calls `onInitiateExport` which is `handleExportDocuments` in DashboardPage.
    // That function in DashboardPage will create the UserUploadedDocForExport[].
    // So, this component just needs to call it.

    // The actual `docsToExport` (containing signed URLs) are now prepared by the `onInitiateExport`
    // function passed from `DashboardPage`. This component doesn't need to know about storage paths.
    try {
      const result = await onInitiateExport(selectedCategory, []); // Pass empty array, parent prepares docs with signed URLs

      if (result.downloadUrl && result.filename) {
         toast({
            title: t("dashboard.exportDocuments.toast.exportReady"),
            description: result.message || t("dashboard.exportDocuments.toast.exportReadyDescription"),
            duration: 7000, 
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
            variant: "default", // Changed from "destructive" to "default" for non-critical errors
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
          disabled={isExporting /* No longer disable based on hasDocumentsToExport here, parent handles overall card visibility */}
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
         {/* Simplified hint, actual data check is on DashboardPage for enabling Export card */}
         {!hasDocumentsToExport && !selectedCategory && (
            <p className="text-xs text-muted-foreground mt-1">
                {t("dashboard.exportDocuments.uploadDocsToEnableExport")}
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
        disabled={isExporting || !selectedCategory /* Button is active if category selected, overall card visibility controlled by parent */}
        className="w-full"
        size="lg"
      >
        {isExporting ? (
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

      {!selectedCategory && (
        <p className="text-xs text-muted-foreground text-center">
          {t("dashboard.exportDocuments.selectCategoryHint")}
        </p>
      )}
    </div>
  );
}

    