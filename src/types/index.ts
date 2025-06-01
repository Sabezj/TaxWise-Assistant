
export type Currency = "USD" | "EUR" | "RUB";
export type Language = "en" | "ru";
export type Theme = "light" | "dark" | "system";
export type UserRole = "user" | "admin" | "superadmin";

export interface MonetaryAmount {
  value: number;
  currency: Currency;
}

export interface IncomeData {
  job: MonetaryAmount;
  investments: MonetaryAmount;
  propertyIncome: MonetaryAmount;
  credits: MonetaryAmount;
  otherIncomeDetails: string;
}

export interface ExpenseData {
  medical: MonetaryAmount;
  educational: MonetaryAmount;
  social: MonetaryAmount;
  property: MonetaryAmount;
  otherExpensesDetails: string;
}

export interface FinancialData {
  income: IncomeData;
  expenses: ExpenseData;
}

export interface CurrencyRates {
  USD: number;
  EUR: number;
  RUB: number;
  [key: string]: number;
}

export interface UploadedDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  storagePath: string;
  downloadURL?: string;
  dataUrl?: string;
}

export interface UserUploadedDocForExport {
  filename: string;
  signedUrl: string;
}

export interface DeductionSuggestion {
  category: string;
  details: string;
  potentialSaving?: string;
}

export interface TaxHistoryEntryDetails {
  taxableIncome?: number;
  deductionsClaimed?: number;
  taxLiability?: number;
  refundAmount?: number;
  amountDue?: number;
  submissionId?: string;
  notes?: string;
  estimatedTaxPaid?: number;
  paymentMethod?: string;
  confirmationId?: string;
  originalTaxLiability?: number;
  amendedTaxLiability?: number;
  reasonForAmendment?: string;
}

export interface TaxHistoryEntry {
  id: string;
  date: string;
  year: number;
  type: string;
  status: "Draft" | "Submitted" | "Reviewed" | "Amended";
  summaryFileUrl?: string;
  details?: TaxHistoryEntryDetails;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: UserRole;
  createdAt?: string;
}

export interface UserSettings {
  theme: Theme;
  language: Language;
  displayCurrency: Currency;
  notificationsEnabled: boolean;
}

export interface DisplayUser extends UserProfile {
  lastLogin?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string | null;
  userName: string;
  action: AuditLogAction;
  details?: string;
}

export type TaxExportCategory = "medical" | "educational" | "property" | "social" | "investments" | "general";

export interface ExportCategoryDetails {
  value: TaxExportCategory;
  labelKey: string;
  requiredDocsKey: string;
  sampleDocName?: string;
  icon?: React.ElementType;
}

export interface TransactionViewItem {
  id: string;
  type: 'income' | 'expense';
  categoryLabelKey: string;
  originalValue: number;
  originalCurrency: Currency;
  convertedValue: number;
  displayCurrency: Currency;
}

export interface Group {
  id: string;
  name: string;
  adminId: string;
  memberIds: string[];
  createdAt: string;
}

export interface CreateGroupInput {
  name: string;
  creatorId: string;
}

export interface AdminCreateUserInput {
  name: string;
  email: string;
  password?: string;
  role?: UserRole;
}

export interface AdminCreateUserResult {
  success: boolean;
  error?: string;
  userId?: string;
}

export type AuditLogAction =
  | "Login Success"
  | "User Registered"
  | "Profile Updated"
  | "Avatar Changed"
  | "Settings Saved"
  | "Financial Data Saved"
  | "Document Uploaded"
  | "Document Removed"
  | "AI Suggestions Requested"
  | "User Created by Admin"
  | "User Role Changed by Admin"
  | "User Deleted by Admin"
  | "Group Created"
  | "Document Exported"
  | "Password Reset Requested"
  | "All Data Cleared";
