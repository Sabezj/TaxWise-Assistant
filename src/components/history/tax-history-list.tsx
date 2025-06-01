
"use client";

import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Download, Edit3, History as HistoryIcon, FileSpreadsheet, Receipt, Landmark } from "lucide-react";
import type { TaxHistoryEntry } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Separator } from '@/components/ui/separator';
import { useI18n } from '@/contexts/i18n-context';
import { format, subYears, subMonths, subDays } from 'date-fns';
import { enUS, ru } from 'date-fns/locale';

const mockHistoryData: TaxHistoryEntry[] = [
  {
    id: "1",
    date: subMonths(subYears(new Date(), 1), 3).toISOString(),
    year: new Date().getFullYear() - 1,
    type: "Annual Filing",
    status: "Submitted",
    summaryFileUrl: "#",
    details: { taxableIncome: 75000, deductionsClaimed: 12500, taxLiability: 8000, refundAmount: 500, submissionId: "SUB-2023-Annual-XYZ123", notes: "Standard deduction taken. Included W2 and 1099-INT."}
  },
  {
    id: "2",
    date: subMonths(subYears(new Date(), 1), 9).toISOString(),
    year: new Date().getFullYear() - 1,
    type: "Quarterly Estimate",
    status: "Reviewed",
    details: { estimatedTaxPaid: 2000, paymentMethod: "Online Bank Transfer", confirmationId: "PAY-Q3-2023-ABC789", notes: "Estimate based on YTD income." }
  },
  {
    id: "3",
    date: subMonths(subYears(new Date(), 2), 4).toISOString(),
    year: new Date().getFullYear() - 2,
    type: "Annual Filing",
    status: "Amended",
    summaryFileUrl: "#",
    details: { taxableIncome: 72000, originalTaxLiability: 7800, amendedTaxLiability: 7500, reasonForAmendment: "Forgot to include charitable donations.", submissionId: "AMEND-2022-Annual-DEF456", notes: "Amendment resulted in a small additional refund." }
  },
  {
    id: "4",
    date: subMonths(subYears(new Date(), 3), 10).toISOString(),
    year: new Date().getFullYear() - 3,
    type: "Annual Filing",
    status: "Submitted",
    details: { taxableIncome: 68000, deductionsClaimed: 12000, taxLiability: 7000, amountDue: 200, submissionId: "SUB-2021-Annual-GHI789", notes: "Filed on time."}
  },
  {
    id: "5",
    date: subMonths(subYears(new Date(), 0), 1).toISOString(),
    year: new Date().getFullYear(),
    type: "Quarterly Estimate",
    status: "Draft",
    details: { estimatedTaxPaid: 1800, notes: "Preparing Q1 estimate for current year." }
  },
  {
    id: "6",
    date: subMonths(subYears(new Date(), 2), 1).toISOString(),
    year: new Date().getFullYear() - 2,
    type: "Quarterly Estimate",
    status: "Reviewed",
    details: { estimatedTaxPaid: 2200, paymentMethod: "Check", confirmationId: "PAY-Q4-PREV-JKL012", notes: "Final quarterly payment for that tax year." }
  }
];

const statusColors: Record<TaxHistoryEntry["status"], string> = {
  Draft: "bg-yellow-500 hover:bg-yellow-600",
  Submitted: "bg-green-500 hover:bg-green-600",
  Reviewed: "bg-blue-500 hover:bg-blue-600",
  Amended: "bg-purple-500 hover:bg-purple-600",
};

const getStatusTranslationKey = (status: TaxHistoryEntry["status"]): string => {
  switch (status) {
    case "Draft": return "historyPage.status.draft";
    case "Submitted": return "historyPage.status.submitted";
    case "Reviewed": return "historyPage.status.reviewed";
    case "Amended": return "historyPage.status.amended";
    default: return status;
  }
};

const getHistoryTypeTranslationKey = (type: string): string => {
  switch (type) {
    case "Annual Filing": return "historyPage.type.annualFiling";
    case "Quarterly Estimate": return "historyPage.type.quarterlyEstimate";
    default: return type;
  }
}

export function TaxHistoryList() {
  const [history, setHistory] = useState<TaxHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<TaxHistoryEntry | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const { t, language, formatCurrency } = useI18n();
  const dateLocale = language === 'ru' ? ru : enUS;

  useEffect(() => {
    console.log("TaxHistoryList: Setting mock history data. If you see this, the component is trying to load its mock data.");
    setTimeout(() => {
       const sortedInitialHistory = mockHistoryData.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setHistory(sortedInitialHistory);
      setIsLoading(false);
    }, 1000);
  }, []);

  const handleViewDetails = (entry: TaxHistoryEntry) => {
    setSelectedEntry(entry);
    setIsDetailModalOpen(true);
  };

  if (isLoading) {
    return (
       <div className="flex items-center justify-center p-8 space-x-2">
        <HistoryIcon className="h-6 w-6 animate-spin text-primary" />
        <p className="text-muted-foreground">{t('historyPage.loading')}</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center p-8 border border-dashed rounded-lg">
        <HistoryIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground font-semibold">{t('historyPage.empty.title')}</p>
        <p className="text-sm text-muted-foreground">
          {t('historyPage.empty.description')}
        </p>
      </div>
    );
  }

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
              <HistoryIcon className="mr-3 h-7 w-7 text-primary" />
              {t('historyPage.card.title')}
          </CardTitle>
          <CardDescription>
              {t('historyPage.card.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('historyPage.table.header.date')}</TableHead>
                <TableHead>{t('historyPage.table.header.year')}</TableHead>
                <TableHead>{t('historyPage.table.header.type')}</TableHead>
                <TableHead>{t('historyPage.table.header.status')}</TableHead>
                <TableHead className="text-right">{t('historyPage.table.header.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{format(new Date(entry.date), 'P', { locale: dateLocale })}</TableCell>
                  <TableCell>{entry.year}</TableCell>
                  <TableCell>{t(getHistoryTypeTranslationKey(entry.type))}</TableCell>
                  <TableCell>
                    <Badge className={`${statusColors[entry.status]} text-white`}>{t(getStatusTranslationKey(entry.status))}</Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="icon" className="h-8 w-8" title={t('historyPage.actions.viewDetails')} onClick={() => handleViewDetails(entry)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {entry.summaryFileUrl && (
                      <Button variant="outline" size="icon" className="h-8 w-8" title={t('historyPage.actions.downloadSummary')} asChild>
                        <a href={entry.summaryFileUrl} download={`tax_summary_${entry.year}_${t(getHistoryTypeTranslationKey(entry.type)).replace(/\s+/g, '_')}.zip`}>
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {entry.status === "Draft" && (
                       <Button variant="outline" size="icon" className="h-8 w-8" title={t('historyPage.actions.edit')}>
                          <Edit3 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableCaption>{t('historyPage.table.caption')}</TableCaption>
          </Table>
        </CardContent>
      </Card>

      {selectedEntry && (
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <FileSpreadsheet className="mr-2 h-5 w-5 text-primary" />
                {t('historyPage.detailsDialog.title', { year: selectedEntry.year, type: t(getHistoryTypeTranslationKey(selectedEntry.type)) })}
              </DialogTitle>
              <DialogDescription>
                 {t('historyPage.detailsDialog.statusOnDate', { status: t(getStatusTranslationKey(selectedEntry.status)), date: format(new Date(selectedEntry.date), 'P', { locale: dateLocale }) })}
              </DialogDescription>
            </DialogHeader>
            <Separator className="my-4" />
            <div className="grid gap-3 text-sm max-h-[60vh] overflow-y-auto pr-2">
              {selectedEntry.details?.submissionId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('historyPage.detailsDialog.submissionId')}</span>
                  <span className="font-medium">{selectedEntry.details.submissionId}</span>
                </div>
              )}
              {selectedEntry.details?.taxableIncome !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('historyPage.detailsDialog.taxableIncome')}</span>
                  <span className="font-medium">{formatCurrency(selectedEntry.details.taxableIncome)}</span>
                </div>
              )}
              {selectedEntry.details?.deductionsClaimed !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('historyPage.detailsDialog.deductionsClaimed')}</span>
                  <span className="font-medium">{formatCurrency(selectedEntry.details.deductionsClaimed)}</span>
                </div>
              )}
              {selectedEntry.details?.taxLiability !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('historyPage.detailsDialog.taxLiability')}</span>
                  <span className="font-medium">{formatCurrency(selectedEntry.details.taxLiability)}</span>
                </div>
              )}
               {selectedEntry.details?.originalTaxLiability !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('historyPage.detailsDialog.originalTaxLiability')}</span>
                  <span className="font-medium">{formatCurrency(selectedEntry.details.originalTaxLiability)}</span>
                </div>
              )}
              {selectedEntry.details?.amendedTaxLiability !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('historyPage.detailsDialog.amendedTaxLiability')}</span>
                  <span className="font-medium">{formatCurrency(selectedEntry.details.amendedTaxLiability)}</span>
                </div>
              )}
              {selectedEntry.details?.refundAmount !== undefined && (
                <div className={`flex justify-between ${selectedEntry.details.refundAmount > 0 ? 'text-green-600' : ''}`}>
                  <span className="text-muted-foreground">{t('historyPage.detailsDialog.refundAmount')}</span>
                  <span className="font-medium">{formatCurrency(selectedEntry.details.refundAmount)}</span>
                </div>
              )}
              {selectedEntry.details?.amountDue !== undefined && (
                <div className={`flex justify-between ${selectedEntry.details.amountDue > 0 ? 'text-red-600' : ''}`}>
                  <span className="text-muted-foreground">{t('historyPage.detailsDialog.amountDue')}</span>
                  <span className="font-medium">{formatCurrency(selectedEntry.details.amountDue)}</span>
                </div>
              )}
               {selectedEntry.details?.estimatedTaxPaid !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('historyPage.detailsDialog.estimatedTaxPaid')}</span>
                  <span className="font-medium">{formatCurrency(selectedEntry.details.estimatedTaxPaid)}</span>
                </div>
              )}
               {selectedEntry.details?.paymentMethod && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('historyPage.detailsDialog.paymentMethod')}</span>
                  <span className="font-medium">{selectedEntry.details.paymentMethod}</span>
                </div>
              )}
               {selectedEntry.details?.confirmationId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('historyPage.detailsDialog.confirmationId')}</span>
                  <span className="font-medium">{selectedEntry.details.confirmationId}</span>
                </div>
              )}
               {selectedEntry.details?.reasonForAmendment && (
                <div>
                  <span className="text-muted-foreground">{t('historyPage.detailsDialog.reasonForAmendment')}</span>
                  <p className="font-medium bg-muted p-2 rounded-md mt-1">{selectedEntry.details.reasonForAmendment}</p>
                </div>
              )}
              {selectedEntry.details?.notes && (
                <div>
                  <span className="text-muted-foreground">{t('historyPage.detailsDialog.notes')}</span>
                  <p className="font-medium bg-muted p-2 rounded-md mt-1">{selectedEntry.details.notes}</p>
                </div>
              )}
               {!Object.keys(selectedEntry.details || {}).length &&
                <p className="text-muted-foreground">{t('historyPage.detailsDialog.noDetails')}</p>}
            </div>
            <DialogFooter className="mt-4">
              <DialogClose asChild>
                <Button variant="outline">{t('historyPage.detailsDialog.close')}</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
