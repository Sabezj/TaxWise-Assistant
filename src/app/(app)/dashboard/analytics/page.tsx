
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FinancialSummaryChart } from "@/components/dashboard/financial-summary-chart";
import type { FinancialData, MonetaryAmount, CurrencyRates, TransactionViewItem, Currency } from "@/types";
import { useI18n } from '@/contexts/i18n-context';
import { Loader2, PackageOpen, Info, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend as RechartsLegend, Tooltip as RechartsTooltip } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Alert, AlertDescription } from '@/components/ui/alert';

const FINANCIAL_DATA_STORAGE_KEY = "taxwise-financial-data-v3"; // Must match dashboard

const getDefaultMonetaryAmount = (currency: Currency): MonetaryAmount => ({ value: 0, currency });

const getInitialFinancialData = (defaultCurrency: Currency): FinancialData => ({
  income: {
    job: getDefaultMonetaryAmount(defaultCurrency),
    investments: getDefaultMonetaryAmount(defaultCurrency),
    propertyIncome: getDefaultMonetaryAmount(defaultCurrency),
    credits: getDefaultMonetaryAmount(defaultCurrency),
    otherIncomeDetails: "",
  },
  expenses: {
    medical: getDefaultMonetaryAmount(defaultCurrency),
    educational: getDefaultMonetaryAmount(defaultCurrency),
    social: getDefaultMonetaryAmount(defaultCurrency),
    property: getDefaultMonetaryAmount(defaultCurrency),
    otherExpensesDetails: "",
  }
});

export default function AnalyticsPage() {
  const { t, currency: displayCurrency, currencyRates, convertCurrency, formatCurrency } = useI18n();
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      const storedData = localStorage.getItem(FINANCIAL_DATA_STORAGE_KEY);
      if (storedData) {
        const parsedData = JSON.parse(storedData) as FinancialData;
        if (parsedData && parsedData.income && parsedData.expenses) {
          setFinancialData(parsedData);
        } else {
          setFinancialData(getInitialFinancialData(displayCurrency));
        }
      } else {
        setFinancialData(getInitialFinancialData(displayCurrency));
      }
    } catch (error) {
      console.error("Error loading financial data from localStorage:", error);
      setFinancialData(getInitialFinancialData(displayCurrency));
    }
    setIsLoading(false);
  }, [displayCurrency]);

  const convertedFinancialData = useMemo(() => {
    if (!financialData || !currencyRates) return null;

    const convertCategory = (category: MonetaryAmount) => convertCurrency(category, displayCurrency, currencyRates);

    return {
      income: {
        job: { value: convertCategory(financialData.income.job), currency: displayCurrency },
        investments: { value: convertCategory(financialData.income.investments), currency: displayCurrency },
        propertyIncome: { value: convertCategory(financialData.income.propertyIncome), currency: displayCurrency },
        credits: { value: convertCategory(financialData.income.credits), currency: displayCurrency },
        otherIncomeDetails: financialData.income.otherIncomeDetails,
      },
      expenses: {
        medical: { value: convertCategory(financialData.expenses.medical), currency: displayCurrency },
        educational: { value: convertCategory(financialData.expenses.educational), currency: displayCurrency },
        social: { value: convertCategory(financialData.expenses.social), currency: displayCurrency },
        property: { value: convertCategory(financialData.expenses.property), currency: displayCurrency },
        otherExpensesDetails: financialData.expenses.otherExpensesDetails,
      }
    };
  }, [financialData, displayCurrency, currencyRates, convertCurrency]);

  const expensePieChartData = useMemo(() => {
    if (!convertedFinancialData) return [];
    const data = [
      { name: t('chartLabels.expenses.medical'), value: convertedFinancialData.expenses.medical.value, fill: "hsl(var(--chart-1))" },
      { name: t('chartLabels.expenses.educational'), value: convertedFinancialData.expenses.educational.value, fill: "hsl(var(--chart-2))" },
      { name: t('chartLabels.expenses.social'), value: convertedFinancialData.expenses.social.value, fill: "hsl(var(--chart-3))" },
      { name: t('chartLabels.expenses.property'), value: convertedFinancialData.expenses.property.value, fill: "hsl(var(--chart-4))" },
    ].filter(item => item.value > 0);
    return data;
  }, [convertedFinancialData, t]);

  const pieChartConfig: ChartConfig = {
    medical: { label: t('chartLabels.expenses.medical'), color: "hsl(var(--chart-1))" },
    educational: { label: t('chartLabels.expenses.educational'), color: "hsl(var(--chart-2))" },
    social: { label: t('chartLabels.expenses.social'), color: "hsl(var(--chart-3))" },
    property: { label: t('chartLabels.expenses.property'), color: "hsl(var(--chart-4))" },
  };


  if (!isMounted || isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-0 flex items-center justify-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">{t('analyticsPage.loading')}</p>
      </div>
    );
  }

  if (!financialData || !convertedFinancialData) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-0 text-center">
        <h1 className="text-3xl font-bold mb-2 text-foreground">{t('analyticsPage.title')}</h1>
        <p className="text-muted-foreground mb-8">{t('analyticsPage.description', { currency: displayCurrency })}</p>
        <PackageOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <p className="text-lg text-muted-foreground">{t('analyticsPage.noData')}</p>
      </div>
    );
  }
  
  const eurRate = currencyRates ? (1 / currencyRates.EUR * currencyRates.USD).toFixed(2) : 'N/A';
  const rubRate = currencyRates ? (currencyRates.RUB / currencyRates.USD).toFixed(2) : 'N/A';


  return (
    <div className="container mx-auto py-8 px-4 md:px-0 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2 text-foreground">{t('analyticsPage.title')}</h1>
        <p className="text-muted-foreground">{t('analyticsPage.description', { currency: displayCurrency })}</p>
      </div>
      
      <Alert variant="default" className="bg-accent/10 border-accent/30">
        <Info className="h-4 w-4 text-accent" />
        <AlertDescription className="text-accent-foreground/80">
          {t('analyticsPage.mockRateInfo', { eurRate, rubRate })}
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <BarChart3 className="mr-3 h-6 w-6 text-primary" />
              {t('analyticsPage.barChartTitle')}
            </CardTitle>
            <CardDescription>
              {t('financialSummaryChartDescription', { currency: displayCurrency })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FinancialSummaryChart financialData={convertedFinancialData} />
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <PieChartIcon className="mr-3 h-6 w-6 text-primary" />
              {t('analyticsPage.pieChartTitle')}
            </CardTitle>
             <CardDescription>
              {t('chartLabels.expenseDistribution', { currency: displayCurrency })}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            {expensePieChartData.length > 0 ? (
              <ChartContainer config={pieChartConfig} className="min-h-[300px] w-full max-w-md">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <RechartsTooltip
                      cursor={{ fill: 'hsl(var(--muted))' }}
                      content={<ChartTooltipContent 
                        formatter={(value, name) => (
                            <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground">{name}</span>
                                <span className="font-bold">{formatCurrency(Number(value), displayCurrency)}</span>
                            </div>
                        )}
                        indicator="dot" 
                        hideLabel={true}
                      />}
                    />
                    <Pie
                      data={expensePieChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      labelLine={false}
                      label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                        const RADIAN = Math.PI / 180;
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        return ( (percent*100) > 5 ? // Only show label if percent is > 5%
                          <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="10px">
                            {`${(percent * 100).toFixed(0)}%`}
                          </text> : null
                        );
                      }}
                    >
                      {expensePieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} stroke={entry.fill} />
                      ))}
                    </Pie>
                     <RechartsLegend 
                        content={({ payload }) => (
                            <div className="flex items-center justify-center gap-x-2 gap-y-1 flex-wrap mt-2">
                            {payload?.map((entry: any, index) => (
                                <div key={`item-${index}`} className="flex items-center space-x-1 text-xs">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span>{entry.value}</span>
                                </div>
                            ))}
                            </div>
                        )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-60 text-center p-4">
                <PackageOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t('noFinancialDataMessage')}</p>
                 <p className="text-sm text-muted-foreground">
                    {t('chartLabels.noDataInSelectedCurrency', { currency: displayCurrency })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {/* Transaction History Table Removed from here */}
    </div>
  );
}
