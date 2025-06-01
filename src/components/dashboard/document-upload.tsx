
"use client";

import React from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UploadCloud, FileText, XCircle, Loader2 } from "lucide-react";
import type { UploadedDocument } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/contexts/i18n-context";

interface DocumentUploadProps {
  uploadedDocuments: UploadedDocument[];
  onNewFiles: (files: File[]) => Promise<void>;
  onRemoveDocument: (document: UploadedDocument) => Promise<void>;
  isUploading: boolean;
  maxFiles?: number;
  maxSize?: number;
}

export function DocumentUpload({
  uploadedDocuments,
  onNewFiles,
  onRemoveDocument,
  isUploading,
  maxFiles = 10,
  maxSize = 5 * 1024 * 1024,
}: DocumentUploadProps) {
  const { toast } = useToast();
  const { t } = useI18n();
  const maxSizeMB = maxSize / (1024 * 1024);

  const onDrop = React.useCallback(
    (acceptedFiles: File[], fileRejections: any[]) => {
      if (fileRejections.length > 0) {
        fileRejections.forEach(({ file, errors }) => {
          errors.forEach((error: any) => {
            let message = error.message;
            if (error.code === "file-too-large") {
                message = t("dashboard.documentUpload.toast.fileTooLarge", {fileName: file.name, maxSizeMB});
            } else if (error.code === "too-many-files") {
                message = t("dashboard.documentUpload.toast.tooManyFiles", {maxFiles});
            } else if (error.code === "file-invalid-type") {
                message = t("dashboard.documentUpload.toast.invalidFileType", {fileName: file.name});
            }
            toast({
              title: t("dashboard.documentUpload.toast.fileUploadError"),
              description: message,
              variant: "destructive",
            });
          });
        });
      }

      if (acceptedFiles.length > 0) {
        if (uploadedDocuments.length + acceptedFiles.length > maxFiles) {
          toast({
            title: t("dashboard.documentUpload.toast.fileLimitReached"),
            description: t("dashboard.documentUpload.toast.fileLimitReachedDescription", { maxFiles }),
            variant: "destructive",
          });

          const filesToUpload = acceptedFiles.slice(0, maxFiles - uploadedDocuments.length);
          if (filesToUpload.length > 0) {
            onNewFiles(filesToUpload);
          }
        } else {
          onNewFiles(acceptedFiles);
        }
      }
    },
    [onNewFiles, maxFiles, maxSizeMB, toast, t, uploadedDocuments.length]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'text/csv': ['.csv'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxSize,

    disabled: uploadedDocuments.length >= maxFiles || isUploading,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors
                    ${isDragActive ? "border-primary bg-primary/10" : "border-border hover:border-primary/70"}
                    ${uploadedDocuments.length >= maxFiles || isUploading ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-2 text-center">
          {isUploading ? (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="font-semibold text-primary">{t("dashboard.documentUpload.uploading")}</p>
            </>
          ) : (
            <>
              <UploadCloud className={`h-12 w-12 ${isDragActive ? "text-primary" : "text-muted-foreground"}`} />
              {isDragActive ? (
                <p className="text-primary font-semibold">{t("dashboard.documentUpload.dropzoneActive")}</p>
              ) : (
                <>
                  <p className="font-semibold">{t("dashboard.documentUpload.dropzoneInstruction")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("dashboard.documentUpload.dropzoneHint", { maxFiles, maxSizeMB })}
                  </p>
                  {uploadedDocuments.length >= maxFiles && (
                    <p className="text-xs text-destructive">{t("dashboard.documentUpload.maxFilesReachedInfo", {maxFiles})}</p>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {uploadedDocuments.length > 0 && (
        <ScrollArea className="h-48 rounded-md border p-2">
          <div className="space-y-2">
            {uploadedDocuments.map(doc => (
              <div key={doc.id} className="flex items-center justify-between p-2 bg-secondary rounded-md">
                <div className="flex items-center space-x-2 overflow-hidden">
                  <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm truncate" title={doc.name}>{doc.name}</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">({(doc.size / 1024).toFixed(1)} KB)</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => onRemoveDocument(doc)} className="h-6 w-6" disabled={isUploading}>
                  <XCircle className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
