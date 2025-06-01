
"use client";

import { TaxHistoryList } from "@/components/history/tax-history-list";

import { useI18n } from "@/contexts/i18n-context";

export default function TaxHistoryPage() {
  const { t } = useI18n();
  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
      <h1 className="text-3xl font-bold mb-8 text-foreground">{t('historyPage.title')}</h1>
      <TaxHistoryList />
    </div>
  );
}
