
"use client";

import { TaxHistoryList } from "@/components/history/tax-history-list";
// import type { Metadata } from "next"; // Metadata can't be exported from client components
import { useI18n } from "@/contexts/i18n-context";

// export const metadata: Metadata = {
//   title: "Tax History - TaxWise Assistant",
//   description: "View your past tax activities and filings.",
// };

export default function TaxHistoryPage() {
  const { t } = useI18n();
  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
      <h1 className="text-3xl font-bold mb-8 text-foreground">{t('historyPage.title')}</h1>
      <TaxHistoryList />
    </div>
  );
}
