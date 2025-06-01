
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { FinancialData, MonetaryAmount, CurrencyRates, TransactionViewItem, Currency, UserProfile } from "@/types";
import { useI18n } from '@/contexts/i18n-context';
import { Loader2, PackageOpen, ListTree } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import type { User } from "firebase/auth";

const getEmptyFinancialData = (defaultCurrency: Currency): FinancialData => ({
  income: {
    job: { value: 0, currency: defaultCurrency },
    investments: { value: 0, currency: defaultCurrency },
    propertyIncome: { value: 0, currency: defaultCurrency },
    credits: { value: 0, currency: defaultCurrency },
    otherIncomeDetails: "",
  },
  expenses: {
    medical: { value: 0, currency: defaultCurrency },
    educational: { value: 0, currency: defaultCurrency },
    social: { value: 0, currency: defaultCurrency },
    property: { value: 0, currency: defaultCurrency },
    otherExpensesDetails: "",
  }
});

export default function TransactionsPage() {
  const { t, currency: displayCurrency, currencyRates, convertCurrency, formatCurrency, isLoadingSettings: isLoadingI18nSettings } = useI18n();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [isLoadingFinancialData, setIsLoadingFinancialData] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser || isLoadingI18nSettings || !isMounted) {
       if (isMounted && !currentUser) setIsLoadingFinancialData(false);
      return;
    }

    const loadFinancialData = async () => {
      setIsLoadingFinancialData(true);
      try {
        const finDataRef = doc(db, "userFinancialData", currentUser.uid);
        const docSnap = await getDoc(finDataRef);
        if (docSnap.exists()) {
          setFinancialData(docSnap.data() as FinancialData);
        } else {
          setFinancialData(getEmptyFinancialData(displayCurrency));
        }
      } catch (error) {
        console.error("Error loading financial data for transactions from Firestore:", error);
        setFinancialData(getEmptyFinancialData(displayCurrency));
      }
      setIsLoadingFinancialData(false);
    };

    loadFinancialData();
  }, [currentUser, displayCurrency, isLoadingI18nSettings, isMounted]);

  const convertedFinancialData = useMemo(() => {
    if (!financialData || !currencyRates) return null;
    const convertCat = (category: MonetaryAmount) => convertCurrency(category, displayCurrency, currencyRates);
    return {
      income: {
        job: { value: convertCat(financialData.income.job), currency: displayCurrency },
        investments: { value: convertCat(financialData.income.investments), currency: displayCurrency },
        propertyIncome: { value: convertCat(financialData.income.propertyIncome), currency: displayCurrency },
        credits: { value: convertCat(financialData.income.credits), currency: displayCurrency },
        otherIncomeDetails: financialData.income.otherIncomeDetails,
      },
      expenses: {
        medical: { value: convertCat(financialData.expenses.medical), currency: displayCurrency },
        educational: { value: convertCat(financialData.expenses.educational), currency: displayCurrency },
        social: { value: convertCat(financialData.expenses.social), currency: displayCurrency },
        property: { value: convertCat(financialData.expenses.property), currency: displayCurrency },
        otherExpensesDetails: financialData.expenses.otherExpensesDetails,
      }
    };
  }, [financialData, displayCurrency, currencyRates, convertCurrency]);

  const transactionHistoryItems: TransactionViewItem[] = useMemo(() => {
    if (!financialData || !convertedFinancialData) return [];
    const items: TransactionViewItem[] = [];
    let idCounter = 0;

    (Object.keys(financialData.income) as Array<keyof FinancialData['income']>).forEach(key => {
      if (key !== 'otherIncomeDetails' && financialData.income[key].value > 0) {
        items.push({
          id: `inc-${idCounter++}`,
          type: 'income',
          categoryLabelKey: `chartLabels.income.${key}`,
          originalValue: financialData.income[key].value,
          originalCurrency: financialData.income[key].currency,
          convertedValue: convertedFinancialData.income[key as keyof typeof convertedFinancialData.income]?.value ?? 0,
          displayCurrency: displayCurrency,
        });
      }
    });

    (Object.keys(financialData.expenses) as Array<keyof FinancialData['expenses']>).forEach(key => {
      if (key !== 'otherExpensesDetails' && financialData.expenses[key].value > 0) {
        items.push({
          id: `exp-${idCounter++}`,
          type: 'expense',
          categoryLabelKey: `chartLabels.expenses.${key}`,
          originalValue: financialData.expenses[key].value,
          originalCurrency: financialData.expenses[key].currency,
          convertedValue: convertedFinancialData.expenses[key as keyof typeof convertedFinancialData.expenses]?.value ?? 0,
          displayCurrency: displayCurrency,
        });
      }
    });
    return items.sort((a, b) => (a.categoryLabelKey.localeCompare(b.categoryLabelKey)));
  }, [financialData, convertedFinancialData, displayCurrency]);

  if (!isMounted || isLoadingFinancialData || isLoadingI18nSettings) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-0 flex items-center justify-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">{t('transactionsPage.loading')}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-0 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2 text-foreground">{t('transactionsPage.title')}</h1>
        <p className="text-muted-foreground">{t('transactionsPage.description', { currency: displayCurrency })}</p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <ListTree className="mr-3 h-6 w-6 text-primary" />
            {t('transactionsPage.card.title')}
          </CardTitle>
          <CardDescription>
            {t('transactionsPage.card.description', { currency: displayCurrency })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactionHistoryItems.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('transactionsPage.table.header.category')}</TableHead>
                  <TableHead className="text-right">{t('transactionsPage.table.header.originalAmount')}</TableHead>
                  <TableHead className="text-right">{t('transactionsPage.table.header.convertedAmount', { currency: displayCurrency })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactionHistoryItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <span className={`font-medium ${item.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {item.type === 'income' ? `+ ${t('analyticsPage.incomeLabel')}: ` : `- ${t('analyticsPage.expenseLabel')}: `}
                      </span>
                       {t(item.categoryLabelKey)}
                    </TableCell>
                    <TableCell className={`text-right ${item.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(item.originalValue, item.originalCurrency)}
                    </TableCell>
                    <TableCell className={`text-right ${item.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(item.convertedValue, displayCurrency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableCaption>{t('transactionsPage.table.caption')}</TableCaption>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-center p-4">
              <PackageOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t('transactionsPage.empty.message')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
