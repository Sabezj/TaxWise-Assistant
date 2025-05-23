
"use server";

import { suggestDeductions as suggestDeductionsFlow, type SuggestDeductionsInput, type SuggestDeductionsOutput } from "@/ai/flows/suggest-deductions";
import type { FinancialData, TaxExportCategory, Group, CreateGroupInput, AdminCreateUserInput, AdminCreateUserResult, UserRole, UploadedDocument, AuditLogAction, AuditLogEntry, UserUploadedDocForExport } from "@/types";
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc, setDoc, query, orderBy, getDocs, limit as firestoreLimit, arrayUnion } from "firebase/firestore";
import { createUserWithEmailAndPassword, updateProfile as updateFirebaseAuthProfile } from "firebase/auth";
import { db, auth as firebaseAuth } from "./firebase"; // firebaseAuth alias for clarity


export interface SuggestionRequestPayload {
  financialData: FinancialData;
  documentsDataUrls: string[];
}

export async function logUserAction(
  userId: string | null,
  userName: string,
  action: AuditLogAction,
  details?: string
): Promise<void> {
  try {
    const auditLogsCollectionRef = collection(db, "auditLogs");
    await addDoc(auditLogsCollectionRef, {
      timestamp: serverTimestamp(),
      userId: userId || "system",
      userName: userName || "System",
      action,
      details: details || "",
    });
  } catch (error) {
    console.error("Error logging user action:", error);
  }
}


export async function getDeductionSuggestions(userId: string, userName: string, payload: SuggestionRequestPayload): Promise<SuggestDeductionsOutput | { error: string }> {
  try {
    const formatMonetaryAmount = (item: {value: number, currency: string}) => `${item.value} ${item.currency}`;

    const financialDataSummary = `
      Income:
        Job: ${formatMonetaryAmount(payload.financialData.income.job)}
        Investments: ${formatMonetaryAmount(payload.financialData.income.investments)}
        Property Income: ${formatMonetaryAmount(payload.financialData.income.propertyIncome)}
        Credits: ${formatMonetaryAmount(payload.financialData.income.credits)}
        Other Income Details: ${payload.financialData.income.otherIncomeDetails || 'None'}
      Expenses:
        Medical: ${formatMonetaryAmount(payload.financialData.expenses.medical)}
        Educational: ${formatMonetaryAmount(payload.financialData.expenses.educational)}
        Social: ${formatMonetaryAmount(payload.financialData.expenses.social)}
        Property: ${formatMonetaryAmount(payload.financialData.expenses.property)}
        Other Expenses Details: ${payload.financialData.expenses.otherExpensesDetails || 'None'}
    `.trim();

    const aiInput: SuggestDeductionsInput = {
      financialData: financialDataSummary,
      uploadedDocuments: payload.documentsDataUrls,
    };

    const result = await suggestDeductionsFlow(aiInput);
    await logUserAction(userId, userName, "AI Suggestions Requested", `Input categories: ${Object.keys(payload.financialData.income).length} income, ${Object.keys(payload.financialData.expenses).length} expenses. Documents: ${payload.documentsDataUrls.length}`);
    return result;
  } catch (error) {
    console.error("Error getting deduction suggestions:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    await logUserAction(userId, userName, "AI Suggestions Requested", `Error: ${errorMessage}`);
    return { error: `Failed to get deduction suggestions: ${errorMessage}. Please try again.` };
  }
}


export async function exportUserDocuments(
  userId: string,
  userName: string,
  category: TaxExportCategory,
  userDocuments: UserUploadedDocForExport[] // Changed from documentStoragePaths
): Promise<{ downloadUrl?: string; filename?: string; error?: string; message?: string }> {

  const apiUrl = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/export-package` : `/api/export-package`;
  console.log(`[Action] Initiating export via API: ${apiUrl} for user: ${userId}, Category: ${category}`);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, category, userDocuments }), // Pass userDocuments directly
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: `API error: ${response.statusText} (Status: ${response.status})` }));
      console.error("[Action] API call to /api/export-package failed:", errorData.message);
      await logUserAction(userId, userName, "Document Exported", `Failed. Category: ${category}, Error: ${errorData.message}`);
      return { error: errorData.message || "Failed to generate package via API." };
    }

    const result = await response.json();
    
    if (result.success) {
      await logUserAction(userId, userName, "Document Exported", `Success. Category: ${category}, Filename: ${result.filename}`);
      return { downloadUrl: result.downloadUrl, filename: result.filename, message: result.message };
    } else {
      await logUserAction(userId, userName, "Document Exported", `Failed. Category: ${category}, API Message: ${result.message}`);
      return { error: result.message || "API indicated export failure." };
    }

  } catch (error) {
    console.error("[Action] Error calling export API:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during export.";
    await logUserAction(userId, userName, "Document Exported", `Failed. Category: ${category}, Error: ${errorMessage}`);
    return { error: `Export failed: ${errorMessage}` };
  }
}


export async function createGroupAction(input: CreateGroupInput): Promise<{ group?: Group; error?: string }> {
  try {
    const groupsCollectionRef = collection(db, "groups");
    const newGroupDocRef = doc(groupsCollectionRef); // Create a new doc ref to get ID first
    
    const newGroup: Group = {
      id: newGroupDocRef.id,
      name: input.name,
      adminId: input.creatorId,
      memberIds: [input.creatorId],
      createdAt: new Date().toISOString(), // Use ISO string for client consistency
    };
    await setDoc(newGroupDocRef, { ...newGroup, createdAt: serverTimestamp() }); // Use serverTimestamp for Firestore

    const userProfileRef = doc(db, "userProfiles", input.creatorId);
    const userProfileSnap = await getDoc(userProfileRef);
    let userName = "Unknown User";

    if (userProfileSnap.exists()) {
      const userProfileData = userProfileSnap.data() as UserProfile;
      userName = userProfileData.name || userProfileData.email || "User";
      if (userProfileData.role === 'user') {
        await updateDoc(userProfileRef, { role: 'admin' as UserRole });
      }
    } else {
        console.warn(`User profile ${input.creatorId} not found during group creation role update.`);
    }

    await logUserAction(input.creatorId, userName, "Group Created", `Group Name: ${input.name}, Group ID: ${newGroupDocRef.id}`);
    return { group: newGroup };
  } catch (error) {
    console.error("Error creating group:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error creating group";
    return { error: errorMessage };
  }
}

export async function adminCreateUserAction(
  adminUserId: string,
  adminUserName: string,
  newUserDetails: AdminCreateUserInput,
  groupId?: string
): Promise<AdminCreateUserResult> {
  try {
    if (!newUserDetails.password) {
        return { success: false, error: "Password is required to create a new user." };
    }
    // Create user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(firebaseAuth, newUserDetails.email, newUserDetails.password);
    const newUser = userCredential.user;

    // Update Firebase Auth profile
    await updateFirebaseAuthProfile(newUser, { displayName: newUserDetails.name });

    // Create user profile document in Firestore
    const userProfileRef = doc(db, "userProfiles", newUser.uid);
    const userRoleToSet: UserRole = newUserDetails.role || 'user';

    await setDoc(userProfileRef, {
      id: newUser.uid,
      name: newUserDetails.name,
      email: newUser.email,
      avatarUrl: `https://placehold.co/100x100.png?text=${newUserDetails.name.charAt(0).toUpperCase() || 'U'}`,
      role: userRoleToSet,
      createdAt: new Date().toISOString(),
    });

    // Create default settings document in Firestore
    const userSettingsRef = doc(db, "userSettings", newUser.uid);
    await setDoc(userSettingsRef, {
      theme: "system",
      notificationsEnabled: true,
      displayCurrency: "USD",
      language: "en",
    });

    // If a groupId is provided (meaning a group admin created this user), add user to that group
    if (groupId) {
      const groupRef = doc(db, "groups", groupId);
      const groupSnap = await getDoc(groupRef);
      if (groupSnap.exists()) {
         await updateDoc(groupRef, {
            memberIds: arrayUnion(newUser.uid)
        });
      } else {
        console.warn(`Group ${groupId} not found when trying to add user ${newUser.uid}`);
      }
    }

    await logUserAction(adminUserId, adminUserName, "User Created by Admin", `New User: ${newUserDetails.name} (${newUserDetails.email}), Role: ${userRoleToSet}${groupId ? `, Added to Group: ${groupId}` : ''}`);
    return { success: true, userId: newUser.uid };
  } catch (error: any) {
    console.error("Error creating user by admin:", error);
    let errorMessage = "An unknown error occurred during user creation.";
    if (error.code === "auth/email-already-in-use") {
      errorMessage = "This email address is already in use.";
    } else if (error.code === "auth/weak-password") {
      errorMessage = "Password is too weak. It should be at least 6 characters.";
    } else if (error.message) {
      errorMessage = error.message;
    }
    return { success: false, error: errorMessage };
  }
}

export async function getAuditLogs(logLimit: number = 100): Promise<AuditLogEntry[]> {
  try {
    const auditLogsCollectionRef = collection(db, "auditLogs");
    const q = query(auditLogsCollectionRef, orderBy("timestamp", "desc"), firestoreLimit(logLimit));
    const querySnapshot = await getDocs(q);
    const logs: AuditLogEntry[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      logs.push({
        id: docSnap.id,
        timestamp: data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : new Date(data.timestamp || Date.now()).toISOString(),
        userId: data.userId,
        userName: data.userName,
        action: data.action as AuditLogAction,
        details: data.details,
      });
    });
    return logs;
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return [];
  }
}
