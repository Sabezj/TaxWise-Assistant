
// src/app/api/export-package/route.ts
import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { getBytes, ref as storageRefFirebase, getDownloadURL } from 'firebase/storage'; // getDownloadURL might still be needed for user docs if not pre-signed
import { storage } from '@/lib/firebase'; // Correctly import storage
import type { TaxExportCategory, UserUploadedDocForExport } from '@/types';

interface ExportRequestBody {
  userId: string;
  category: TaxExportCategory;
  userDocuments: UserUploadedDocForExport[]; // Expecting array of { filename, signedUrl }
}

// This map points to the ACTUAL FILENAMES in Firebase Storage
const sampleDocumentStoragePathMap: Record<TaxExportCategory, string | undefined> = {
  medical: 'app_resources/sample_documents/medical_KND1151156.pdf.pdf',
  educational: 'app_resources/sample_documents/educational_KND1151158.pdf',
  property: 'app_resources/sample_documents/property_KND1150117.pdf',
  social: 'app_resources/sample_documents/social_KND1150130.pdf',
  investments: 'app_resources/sample_documents/investments_KND1150145.pdf',
  general: undefined, // No specific sample PDF for general, we can add a generic text file
};

// These are the names that will be used INSIDE the ZIP archive
const sampleDocumentZipNameMap: Record<TaxExportCategory, string | undefined> = {
  medical: 'sample_medical_KND1151156.pdf',
  educational: 'sample_educational_KND1151158.pdf',
  property: 'sample_property_KND1150117.pdf',
  social: 'sample_social_KND1150130.pdf',
  investments: 'sample_investments_KND1150145.pdf',
  general: 'sample_general_guide.txt',
};


export async function POST(request: NextRequest) {
  console.log("[API Export] Received POST request to /api/export-package");
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!projectId) {
    console.error("[API Export] Firebase Project ID (NEXT_PUBLIC_FIREBASE_PROJECT_ID) is not set in environment variables.");
    return NextResponse.json({ success: false, message: "Server configuration error: Missing Firebase Project ID." }, { status: 500 });
  }

  try {
    const body = await request.json() as ExportRequestBody;
    const { userId, category, userDocuments } = body;

    console.log(`[API Export] Processing request for user: ${userId}, category: ${category}`);
    console.log(`[API Export] User documents to fetch via signed URLs: ${userDocuments?.length || 0}`);

    const zip = new JSZip();
    const userDocumentsFolder = zip.folder("user_documents");
    const sampleDocumentsFolder = zip.folder("sample_documents");
    let overallSuccess = true;
    let issuesLog = "";

    // 1. Fetch user-uploaded documents using Signed URLs
    if (userDocumentsFolder && userDocuments && Array.isArray(userDocuments) && userDocuments.length > 0) {
      for (const docInfo of userDocuments) {
         if (!docInfo.signedUrl || !docInfo.filename) {
          console.warn("[API Export] Encountered an undefined or empty signed URL/filename for user document, skipping.");
          issuesLog += `Skipped a user document due to missing URL/filename.\n`;
          overallSuccess = false;
          continue;
        }
        try {
          console.log(`[API Export] Attempting to fetch user document '${docInfo.filename}' using signed URL...`);
          const response = await fetch(docInfo.signedUrl);
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch ${docInfo.filename}: ${response.statusText} (Status: ${response.status}). Response: ${errorText}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          userDocumentsFolder.file(docInfo.filename, arrayBuffer);
          console.log(`[API Export] Added user document '${docInfo.filename}' to ZIP.`);
        } catch (error) {
          const errorMessage = `Could not fetch user document: ${docInfo.filename}\nError: ${(error as Error).message}\nVerify the signed URL was valid and accessible.\n\n`;
          console.error(`[API Export] Error fetching user document ${docInfo.filename} via signed URL:`, (error as Error).message);
          userDocumentsFolder.file(
            `ERROR_FETCHING_${docInfo.filename.replace(/[^a-zA-Z0-9.]/g, '_').substring(0,50)}.txt`,
            errorMessage
          );
          issuesLog += errorMessage;
          overallSuccess = false;
        }
      }
    } else {
      console.log("[API Export] No user document signed URLs provided or array is empty.");
      if (userDocumentsFolder) {
        userDocumentsFolder.file("INFO_NO_USER_DOCS_SPECIFIED.txt", "No user documents were specified for this export or the list was empty.");
      }
    }

    // 2. Fetch the sample KND PDF from Firebase Storage
    const sampleDocStoragePath = sampleDocumentStoragePathMap[category];
    const zipSampleDocFilename = sampleDocumentZipNameMap[category];
    
    if (sampleDocStoragePath && zipSampleDocFilename && sampleDocumentsFolder) {
      console.log(`[API Export] Attempting to fetch sample document for category '${category}' from Firebase Storage path: ${sampleDocStoragePath}`);
      let sampleDocErrorMessage = "";
      try {
        // Construct public URL
        const encodedPath = encodeURIComponent(sampleDocStoragePath);
        const publicSampleUrl = `https://firebasestorage.googleapis.com/v0/b/${projectId}.appspot.com/o/${encodedPath}?alt=media`;
        
        console.log(`[API Export] Constructed public URL for sample document: ${publicSampleUrl}`);
        
        const sampleDocResponse = await fetch(publicSampleUrl);
        if (!sampleDocResponse.ok) {
          const errorText = await sampleDocResponse.text();
          throw new Error(`Failed to fetch sample document from public URL: ${sampleDocResponse.statusText} (Status: ${sampleDocResponse.status}). URL: ${publicSampleUrl}. Response: ${errorText}`);
        }
        const sampleDocArrayBuffer = await sampleDocResponse.arrayBuffer();
        sampleDocumentsFolder.file(zipSampleDocFilename, sampleDocArrayBuffer);
        console.log(`[API Export] Successfully added sample document from Firebase Storage as '${zipSampleDocFilename}' to ZIP.`);
      } catch (error: any) {
        sampleDocErrorMessage = `Could not fetch sample document from Firebase Storage: ${sampleDocStoragePath}\nAttempted public URL method.\nError: ${(error as Error).message}\n\nVerify that the file exists at this exact path in your Firebase Storage bucket and that the security rules allow public read access (e.g., 'allow read: if true;' for app_resources/sample_documents path). Check for typos and case sensitivity in the path. Ensure NEXT_PUBLIC_FIREBASE_PROJECT_ID is correctly set on Vercel.`;
        console.error(`[API Export] Error fetching sample document from Firebase Storage path '${sampleDocStoragePath}':`, (error as Error).message);
        
        const diagnosticContent = `${sampleDocErrorMessage}`;
        
        const shortErrorFileName = `ERROR_FETCHING_SAMPLE_${category}.txt`;
        sampleDocumentsFolder.file(shortErrorFileName, diagnosticContent);
        issuesLog += sampleDocErrorMessage;
        overallSuccess = false;
      }
    } else if (category === 'general' && zipSampleDocFilename && sampleDocumentsFolder) {
        console.log(`[API Export] For 'general' category, adding a generic sample text file.`);
        sampleDocumentsFolder.file(zipSampleDocFilename, "This is a general tax guide. Please consult official resources and your uploaded documents for specific details.");
    } else if (sampleDocumentsFolder) {
        const noSampleMessage = `No specific sample document is configured to be included from Firebase Storage for the category '${category}'. This might be normal for some categories.`;
        console.log(`[API Export] ${noSampleMessage}`);
        const shortInfoFileName = `INFO_NO_SAMPLE_FOR_CATEGORY_${category}.txt`;
        sampleDocumentsFolder.file(shortInfoFileName, noSampleMessage);
    }


    // 3. Add a summary file
    let summaryContent = `TaxWise Export Summary
User ID: ${userId}
Category: ${category}
Export Date: ${new Date().toISOString()}
Number of user documents attempted: ${userDocuments?.length || 0}
Sample document Firebase Storage path attempted: ${sampleDocStoragePath || 'None for this category'}
`;
    if (issuesLog) {
      summaryContent += `\n--- Issues Encountered ---\n${issuesLog}\n--- End Issues ---\n`;
    }
    summaryContent += "\nNote: If documents are missing, check for ERROR_FETCHING_...txt files in the ZIP folders for details.";

    zip.file('summary.txt', summaryContent);
    console.log(`[API Export] Added summary.txt to ZIP.`);

    // 4. Generate the ZIP file as a base64 string
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    const base64Zip = zipBuffer.toString('base64');
    const filename = `taxwise_export_${category || 'general'}_${userId.substring(0,8)}_${Date.now()}.zip`;
    
    console.log(`[API Export] Successfully generated ZIP. Filename: ${filename}, Overall Success Status: ${overallSuccess}`);
    return NextResponse.json({
      success: overallSuccess, // Reflects if all parts were successful
      message: overallSuccess ? `Package for category '${category}' generated successfully.` : `Package for category '${category}' generated with some issues. Please check summary.txt and any error files in the ZIP.`,
      downloadUrl: `data:application/zip;base64,${base64Zip}`,
      filename: filename,
    });

  } catch (error) {
    console.error('[API Export] General error processing export request:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, message: `Server error: ${errorMessage}` }, { status: 500 });
  }
}
    
