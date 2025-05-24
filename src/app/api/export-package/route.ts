
// src/app/api/export-package/route.ts
import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { getBytes, ref as storageRefFirebase } from 'firebase/storage';
import { storage } from '@/lib/firebase'; // Correctly import storage
import type { TaxExportCategory, UserUploadedDocForExport } from '@/types';

interface ExportRequestBody {
  userId: string;
  category: TaxExportCategory;
  userDocuments: UserUploadedDocForExport[]; // Expecting array of { filename, signedUrl }
}

// This map points to the actual filenames in Firebase Storage for sample documents
const sampleDocumentStoragePathMap: Record<TaxExportCategory, string | undefined> = {
  medical: 'app_resources/sample_documents/medical_KND1151156.pdf.pdf',
  educational: 'app_resources/sample_documents/educational_KND1151158.pdf',
  property: 'app_resources/sample_documents/property_KND1150117.pdf',
  social: 'app_resources/sample_documents/social_KND1150130.pdf',
  investments: 'app_resources/sample_documents/investments_KND1150145.pdf',
  general: undefined, // No specific sample for general export for now
};

// These are the names that will be used INSIDE the ZIP archive for sample documents
const sampleDocumentZipNameMap: Record<TaxExportCategory, string | undefined> = {
  medical: 'sample_medical_KND1151156.pdf',
  educational: 'sample_educational_KND1151158.pdf',
  property: 'sample_property_KND1150117.pdf',
  social: 'sample_social_KND1150130.pdf',
  investments: 'sample_investments_KND1150145.pdf',
  general: undefined,
};


export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ExportRequestBody;
    const { userId, category, userDocuments } = body;

    console.log(`[API Export] Received request for user: ${userId}, category: ${category}`);
    console.log(`[API Export] User documents to fetch via signed URLs:`, userDocuments?.length);

    const zip = new JSZip();
    const userDocumentsFolder = zip.folder("user_documents");
    const sampleDocumentsFolder = zip.folder("sample_documents");
    let overallSuccess = true;
    let issues = "";

    // 1. Fetch user-uploaded documents using Signed URLs
    if (userDocumentsFolder && userDocuments && Array.isArray(userDocuments) && userDocuments.length > 0) {
      for (const docInfo of userDocuments) {
         if (!docInfo.signedUrl || !docInfo.filename) {
          console.warn("[API Export] Encountered an undefined or empty signed URL/filename for user document, skipping.");
          issues += `Skipped a user document due to missing URL/filename.\n`;
          overallSuccess = false;
          continue;
        }
        try {
          console.log(`[API Export] Attempting to fetch user document '${docInfo.filename}' using signed URL.`);
          const response = await fetch(docInfo.signedUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch ${docInfo.filename}: ${response.statusText} (Status: ${response.status})`);
          }
          const arrayBuffer = await response.arrayBuffer();
          userDocumentsFolder.file(docInfo.filename, arrayBuffer);
          console.log(`[API Export] Added user document '${docInfo.filename}' to ZIP.`);
        } catch (error) {
          console.error(`[API Export] Error fetching user document ${docInfo.filename} via signed URL:`, error);
          const errorMessage = `Could not fetch user document: ${docInfo.filename}\nError: ${(error as Error).message}\nVerify the signed URL was valid and accessible.\n\n`;
          userDocumentsFolder.file(
            `ERROR_FETCHING_${docInfo.filename.replace(/[^a-zA-Z0-9.]/g, '_').substring(0,50)}.txt`,
            errorMessage
          );
          issues += errorMessage;
          overallSuccess = false;
        }
      }
    } else {
      console.log("[API Export] No user document signed URLs provided or array is empty.");
      userDocumentsFolder?.file("INFO_NO_USER_DOCS.txt", "No user documents were specified for this export or the list was empty.");
    }


    // 2. Fetch the sample KND PDF from Firebase Storage
    const sampleDocStoragePath = sampleDocumentStoragePathMap[category];
    const zipSampleDocFilename = sampleDocumentZipNameMap[category];
    let sampleDocErrorMessage = "";

    if (sampleDocStoragePath && zipSampleDocFilename && sampleDocumentsFolder) {
      console.log(`[API Export] Attempting to fetch sample document for category '${category}' from Firebase Storage path: ${sampleDocStoragePath}`);
      try {
        const sampleDocRef = storageRefFirebase(storage, sampleDocStoragePath);
        const sampleDocArrayBuffer = await getBytes(sampleDocRef);
        sampleDocumentsFolder.file(zipSampleDocFilename, sampleDocArrayBuffer);
        console.log(`[API Export] Successfully added sample document from Firebase Storage as '${zipSampleDocFilename}' to ZIP.`);
      } catch (error: any) {
        sampleDocErrorMessage = `Could not fetch sample document from Firebase Storage: ${sampleDocStoragePath}\nError: ${(error as Error).message}\n\nVerify that the file exists at this exact path in your Firebase Storage bucket and that the security rules allow read access. Check for typos and case sensitivity in the path.`;
        console.error(`[API Export] Error fetching sample document from Firebase Storage path '${sampleDocStoragePath}':`, error);
        const shortErrorFileName = `ERROR_FETCHING_SAMPLE_${category}.txt`;
        sampleDocumentsFolder.file(shortErrorFileName, sampleDocErrorMessage);
        issues += sampleDocErrorMessage;
        overallSuccess = false;
      }
    } else if (sampleDocumentsFolder) {
        console.log(`[API Export] No specific sample document storage path mapped for category: '${category}'.`);
        const shortInfoFileName = `INFO_NO_SAMPLE_FOR_CATEGORY_${category}.txt`;
        sampleDocumentsFolder.file(
            shortInfoFileName,
            `No specific sample document is configured to be included from Firebase Storage for the category '${category}'. This might be normal for some categories like 'general'.`
        );
    }

    // 3. Add a summary file
    let summaryContent = `TaxWise Export Summary
User ID: ${userId}
Category: ${category}
Export Date: ${new Date().toISOString()}
Number of user documents attempted: ${userDocuments?.length || 0}
Sample document attempted (path in Firebase Storage): ${sampleDocStoragePath || 'None for this category'}
`;
    if (issues) {
      summaryContent += `\n--- Issues Encountered ---\n${issues}\n--- End Issues ---\n`;
    }
    summaryContent += "\nNote: If documents are missing, check for ERROR_FETCHING_...txt files in the ZIP folders for details.";

    zip.file('summary.txt', summaryContent);
    console.log(`[API Export] Added summary.txt to ZIP.`);

    // 4. Generate the ZIP file as a base64 string
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    const base64Zip = zipBuffer.toString('base64');
    const filename = `taxwise_export_${category || 'general'}_${userId.substring(0,8)}_${Date.now()}.zip`;

    return NextResponse.json({
      success: overallSuccess,
      message: overallSuccess ? `Package for category '${category}' generated successfully.` : `Package for category '${category}' generated with some issues. Please check summary.txt and any error files in the ZIP.`,
      downloadUrl: `data:application/zip;base64,${base64Zip}`,
      filename: filename,
    });

  } catch (error) {
    console.error('[API Export] General error processing export request:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    // Ensure a JSON response even for top-level errors
    return NextResponse.json({ success: false, message: `Server error: ${errorMessage}` }, { status: 500 });
  }
}

    